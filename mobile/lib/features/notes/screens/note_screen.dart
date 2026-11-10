import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../../../app/app_scope.dart';
import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../../speech/widgets/audio_bar.dart';
import '../../speech/widgets/dictation_button.dart';
import '../data/note.dart';
import '../editor/merge_incoming.dart';
import '../editor/note_text_controller.dart';
import '../state/notes_store.dart';
import '../widgets/assist_sheet.dart';
import '../widgets/note_actions.dart';
import '../widgets/note_banner.dart';
import '../widgets/note_info_sheet.dart';

/// One note, open for writing: plain text styled as it is read, saved as you
/// type (after a short pause, and whenever you leave or the app goes to the
/// background). A note in the Trash opens read-only, with Restore and Delete.
class NoteScreen extends StatefulWidget {
  const NoteScreen({super.key, required this.noteId, this.autofocus = false});

  final String noteId;

  /// Opens the keyboard at once, for a note just made to be written in.
  final bool autofocus;

  /// Opens the note with [noteId] over the current screen.
  static Future<void> open(BuildContext context, String noteId, {bool autofocus = false}) => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => NoteScreen(noteId: noteId, autofocus: autofocus),
    ),
  );

  @override
  State<NoteScreen> createState() => _NoteScreenState();
}

/// What the editor menu offers besides [NoteAction]s. (The recording is
/// shared from its audio bar.)
enum _EditorAction { assist, shareText }

class _NoteScreenState extends State<NoteScreen> {
  /// A pause in typing this long saves the note.
  static const _saveDelay = Duration(milliseconds: 400);

  late final NotesStore _store;
  late final NoteTextController _controller;
  late final AppLifecycleListener _lifecycle;
  Timer? _saveTimer;

  /// The editor's focus: the keyboard is up while it has it.
  final _editorFocus = FocusNode(debugLabel: 'NoteScreen editor');

  /// The note as last seen, so the screen still shows it while closing after it was deleted.
  Note? _note;

  /// The text the store holds, as far as this editor knows: typing differs from it until saved.
  String _synced = '';

  /// A note that was empty when opened and is still empty when left is deleted (Bear does the same).
  bool _openedBlank = false;

  /// The microphone button may have started dictation (it was touched or
  /// focused), or a screen reader is on, which could have pressed it unseen.
  /// Words still being transcribed land in the note after it is left, so a
  /// note opened empty is kept then rather than deleted under them.
  bool _micUsed = false;
  bool _screenReader = false;
  bool _started = false;
  bool _left = false;

  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(
      onStateChange: (state) {
        if (state != AppLifecycleState.resumed) _flush();
      },
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _screenReader = MediaQuery.accessibleNavigationOf(context);
    if (_started) return;
    _started = true;
    _store = AppScope.of(context).notes;
    _note = _store.byId(widget.noteId);
    _synced = _note?.text ?? '';
    _openedBlank = _note != null && _isBlank(_note!);
    _controller = NoteTextController(text: _synced, searchTerms: _store.search.terms)..addListener(_onEdited);
    _store.addListener(_onStoreChanged);
  }

  @override
  void dispose() {
    // Leaving without a pop (the route removed some other way): save, a moment later, outside the teardown.
    _leave(later: true);
    _store.removeListener(_onStoreChanged);
    _lifecycle.dispose();
    _saveTimer?.cancel();
    _controller.dispose();
    _editorFocus.dispose();
    super.dispose();
  }

  static bool _isBlank(Note note) => note.text.trim().isEmpty && note.audio == null;

  /// Follows the note: its flags, and its text when it changed somewhere
  /// other than here (a transcription, or the note open in another editor).
  void _onStoreChanged() {
    final note = _store.byId(widget.noteId);
    if (note == null && _note == null) return;
    if (note != null && note.text != _synced) _reload(note.text);
    setState(() => _note = note ?? _note);
  }

  void _onEdited() {
    if (_left || _controller.text == _synced) return;
    _saveTimer?.cancel();
    _saveTimer = Timer(_saveDelay, _flush);
  }

  /// Saves what is typed now, if it differs from what the store holds.
  void _flush() {
    _saveTimer?.cancel();
    _saveTimer = null;
    if (!_left) _saveText();
  }

  void _saveText() {
    final text = _controller.text;
    if (text == _synced || _store.byId(widget.noteId) == null) return;
    _synced = text;
    unawaited(_store.updateText(widget.noteId, text));
  }

  /// The note's text changed under the editor ([mergeIncoming] keeps what
  /// was typed meanwhile). The caret stays where it was, if it still fits;
  /// a merge that differs from [incoming] is saved like typing. It goes on
  /// while the screen closes, so dictated words saved then ([_onDictated])
  /// don't overwrite a transcription that landed meanwhile.
  void _reload(String incoming) {
    final typed = _controller.text;
    final merged = mergeIncoming(typed: typed, synced: _synced, incoming: incoming);
    _synced = incoming;
    if (merged == typed) {
      if (merged != incoming) _onEdited();
      return;
    }
    final selection = _controller.selection;
    _controller.value = TextEditingValue(
      text: merged,
      selection: selection.isValid
          ? TextSelection(
              baseOffset: math.min(selection.baseOffset, merged.length),
              extentOffset: math.min(selection.extentOffset, merged.length),
            )
          : TextSelection.collapsed(offset: merged.length),
    );
  }

  /// Saves on the way out, and deletes a note that was opened empty and left
  /// empty. [later] defers the store calls past the widget tree's teardown,
  /// where listeners must not rebuild anything.
  void _leave({bool later = false}) {
    if (_left) return;
    _left = true;
    _saveTimer?.cancel();
    final store = _store;
    final id = widget.noteId;
    final text = _controller.text;
    final synced = _synced;
    final discardBlank = _openedBlank && !_micUsed && !_screenReader;
    _synced = text;
    void apply() {
      if (text != synced) unawaited(store.updateText(id, text));
      final note = store.byId(id);
      if (discardBlank && note != null && !note.isTrashed && _isBlank(note)) unawaited(store.deleteForever(id));
    }

    later ? scheduleMicrotask(apply) : apply();
  }

  /// Dictated words were typed. They are saved at once rather than after
  /// the typing pause: the recording counts as transcribed as soon as the
  /// last of them is typed, and iOS may end Nota before a pause runs out.
  /// Words that arrive while the screen closes (dictation is handed to the
  /// note only once the editor is gone) are saved the same way.
  void _onDictated() {
    _saveTimer?.cancel();
    _saveTimer = null;
    _saveText();
    if (!_left) _revealCaret();
  }

  /// Scrolls the caret into view once dictated words are laid out: a change
  /// made in code doesn't scroll the field the way typing does, so they would
  /// land out of sight, under the keyboard. The focus node is attached whether
  /// or not the editor has focus, so it finds the field either way.
  void _revealCaret() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final caret = _controller.selection;
      final field = _editorFocus.context?.findAncestorStateOfType<EditableTextState>();
      if (!caret.isValid || field == null || !field.renderEditable.hasSize) return;
      field.bringIntoView(caret.extent);
    }, debugLabel: 'NoteScreen.revealCaret');
  }

  void _openNote(String id) => unawaited(NoteScreen.open(context, id));

  Future<void> _runAction(NoteAction action) async {
    _flush();
    final done = await runNoteAction(context, widget.noteId, action);
    if (!done || !mounted) return;
    if (action == NoteAction.trash || action == NoteAction.deleteForever) Navigator.of(context).pop();
  }

  Future<void> _runEditorAction(_EditorAction action, Note note) async {
    _flush();
    switch (action) {
      case _EditorAction.assist:
        await showAssistSheet(context, note: note, controller: _controller);
      case _EditorAction.shareText:
        await _share(ShareParams(text: _controller.text, sharePositionOrigin: _shareOrigin()));
    }
  }

  /// Where an iPad's share popover points: this screen (phones ignore it).
  Rect? _shareOrigin() {
    final box = context.findRenderObject();
    return box is RenderBox && box.hasSize ? box.localToGlobal(Offset.zero) & box.size : null;
  }

  Future<void> _share(ShareParams params) async {
    final failed = Messages.of(context).editor.shareFailed;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await SharePlus.instance.share(params);
    } on Exception {
      messenger.showSnackBar(SnackBar(content: Text(failed)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final note = _note;
    final messages = Messages.of(context);
    if (note == null) return Scaffold(appBar: AppBar());
    final readOnly = note.isTrashed;
    return PopScope(
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) _leave();
      },
      child: Scaffold(
        appBar: AppBar(
          actions: [
            // First, so the buttons after it don't move when it comes and goes.
            if (!readOnly) _HideKeyboardButton(editor: _editorFocus),
            if (!readOnly)
              _MicWatch(
                onUse: () => _micUsed = true,
                child: DictationButton(controller: _controller, noteId: note.id, onTyped: _onDictated),
              ),
            IconButton(
              icon: const Icon(Icons.info_outline),
              tooltip: messages.editor.info,
              onPressed: () {
                _flush();
                unawaited(showNoteInfoSheet(context, noteId: note.id, onOpenNote: _openNote));
              },
            ),
            if (!readOnly) _menu(note, messages),
          ],
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              if (note.isTrashed)
                NoteBanner(
                  icon: Icons.delete_outline,
                  message: messages.editor.trashBanner,
                  actions: [
                    TextButton(
                      onPressed: () => unawaited(_runAction(NoteAction.restore)),
                      child: Text(messages.editor.restore),
                    ),
                    TextButton(
                      style: TextButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
                      onPressed: () => unawaited(_runAction(NoteAction.deleteForever)),
                      child: Text(messages.editor.deleteForever),
                    ),
                  ],
                )
              else if (note.isArchived)
                NoteBanner(
                  icon: Icons.archive_outlined,
                  message: messages.editor.archiveBanner,
                  actions: [
                    TextButton(
                      onPressed: () => unawaited(_runAction(NoteAction.unarchive)),
                      child: Text(messages.editor.unarchive),
                    ),
                  ],
                ),
              Expanded(child: _editor(context, note, readOnly: readOnly)),
              if (note.audio != null) AudioBar(note: note),
            ],
          ),
        ),
      ),
    );
  }

  /// What an empty note says: for a voice note, where its transcription stands.
  String _hint(Note note, EditorMessages editor) {
    final audio = note.audio;
    final speech = AppScope.of(context).speech;
    // Dictation attaches its recording before its last words are typed.
    if (audio == null || speech.isDictating(note.id)) return editor.hint;
    if (speech.isTranscribing(note.id)) return editor.transcribing;
    return audio.transcription is TranscriptionPending ? editor.pending : editor.hint;
  }

  Widget _editor(BuildContext context, Note note, {required bool readOnly}) {
    final colors = NotaColors.of(context);
    final editor = Messages.of(context).editor;
    final speech = AppScope.of(context).speech;
    return ListenableBuilder(
      listenable: speech,
      builder: (context, _) => Semantics(
        label: editor.label,
        child: TextField(
          controller: _controller,
          focusNode: _editorFocus,
          readOnly: readOnly,
          autofocus: widget.autofocus && !readOnly,
          maxLines: null,
          expands: true,
          keyboardType: TextInputType.multiline,
          textCapitalization: TextCapitalization.sentences,
          textAlignVertical: TextAlignVertical.top,
          style: NotaText.noteBody.copyWith(color: colors.ink),
          scrollPadding: const EdgeInsets.only(bottom: 96),
          decoration: InputDecoration(
            hintText: _hint(note, editor),
            hintStyle: NotaText.noteBody.copyWith(color: colors.muted),
            filled: false,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding: const EdgeInsets.fromLTRB(20, 12, 20, 48),
          ),
        ),
      ),
    );
  }

  Widget _menu(Note note, Messages messages) {
    PopupMenuItem<Object> item(Object value, IconData icon, String label, {bool enabled = true}) => PopupMenuItem(
      value: value,
      enabled: enabled,
      child: ListTile(leading: Icon(icon), title: Text(label), contentPadding: EdgeInsets.zero, enabled: enabled),
    );
    return PopupMenuButton<Object>(
      icon: const Icon(Icons.more_vert),
      tooltip: messages.editor.actions,
      onSelected: (value) {
        if (value is NoteAction) unawaited(_runAction(value));
        if (value is _EditorAction) unawaited(_runEditorAction(value, note));
      },
      itemBuilder: (context) {
        final hasText = _controller.text.trim().isNotEmpty;
        return [
          for (final action in noteActionsFor(note).where((action) => action != NoteAction.trash))
            item(action, noteActionIcon(action), noteActionLabel(action, messages)),
          const PopupMenuDivider(),
          item(_EditorAction.assist, Icons.auto_awesome_outlined, messages.editor.assist, enabled: hasText),
          item(_EditorAction.shareText, Icons.ios_share, messages.editor.shareText, enabled: hasText),
          const PopupMenuDivider(),
          item(NoteAction.trash, noteActionIcon(NoteAction.trash), messages.editor.trash),
        ];
      },
    );
  }
}

/// Puts the keyboard away while [editor] has focus: an iPhone has no key for
/// it in a multiline field. Only this button rebuilds as focus comes and goes.
class _HideKeyboardButton extends StatelessWidget {
  const _HideKeyboardButton({required this.editor});

  final FocusNode editor;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: editor,
    builder: (context, _) => editor.hasFocus
        ? IconButton(
            icon: const Icon(Icons.keyboard_hide_outlined),
            tooltip: Messages.of(context).editor.hideKeyboard,
            onPressed: editor.unfocus,
          )
        : const SizedBox.shrink(),
  );
}

/// Tells when [child] (the microphone button) is touched or takes focus.
class _MicWatch extends StatelessWidget {
  const _MicWatch({required this.onUse, required this.child});

  final VoidCallback onUse;
  final Widget child;

  @override
  Widget build(BuildContext context) => Listener(
    onPointerDown: (_) => onUse(),
    child: Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onFocusChange: (focused) {
        if (focused) onUse();
      },
      child: child,
    ),
  );
}
