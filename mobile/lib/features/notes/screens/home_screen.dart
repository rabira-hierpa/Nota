import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_scope.dart';
import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../../speech/screens/speech_models_screen.dart';
import '../../speech/widgets/recording_sheet.dart';
import '../data/note.dart';
import '../logic/sections.dart';
import '../state/notes_store.dart';
import '../widgets/capture_buttons.dart';
import '../widgets/empty_notes.dart';
import '../widgets/intro_card.dart';
import '../widgets/note_actions.dart';
import '../widgets/note_actions_sheet.dart';
import '../widgets/note_tile.dart';
import '../widgets/search_field.dart';
import '../widgets/section_drawer.dart';
import '../widgets/sort_menu.dart';
import 'note_screen.dart';

/// The note list: the chosen section from the drawer, narrowed by the
/// search, with record and new-note buttons at the thumb.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final scope = AppScope.of(context);
    final messages = Messages.of(context);
    return ListenableBuilder(
      listenable: Listenable.merge([scope.notes, scope.settings]),
      builder: (context, _) {
        final store = scope.notes;
        final inTrash = store.section is TrashSection;
        return Scaffold(
          drawer: const SectionDrawer(),
          appBar: AppBar(
            title: Text(sectionTitle(store.section, messages.sections), maxLines: 1, overflow: TextOverflow.ellipsis),
            actions: [
              if (inTrash && (store.counts[FixedSectionKind.trash] ?? 0) > 0)
                IconButton(
                  icon: const Icon(Icons.delete_sweep_outlined),
                  tooltip: messages.notes.emptyTrashAction,
                  onPressed: () => unawaited(_emptyTrash(context, store)),
                ),
              const SortMenu(),
              const SizedBox(width: 4),
            ],
          ),
          body: SafeArea(
            top: false,
            bottom: false,
            child: Column(
              children: [
                const Padding(padding: EdgeInsets.fromLTRB(16, 4, 16, 12), child: SearchField()),
                const Divider(),
                Expanded(child: _NoteList(store: store)),
              ],
            ),
          ),
          floatingActionButton: inTrash
              ? null
              : CaptureButtons(
                  onRecord: () => unawaited(_record(context)),
                  onNewNote: () => unawaited(_newNote(context, store)),
                ),
        );
      },
    );
  }

  static Future<void> _newNote(BuildContext context, NotesStore store) async {
    final note = await store.create();
    if (!context.mounted) return;
    await NoteScreen.open(context, note.id, autofocus: true);
  }

  static Future<void> _record(BuildContext context) async {
    final id = await showRecordingSheet(context);
    if (id == null || !context.mounted) return;
    await NoteScreen.open(context, id);
  }

  static Future<void> _emptyTrash(BuildContext context, NotesStore store) async {
    final messages = Messages.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final count = store.counts[FixedSectionKind.trash] ?? 0;
    final confirmed = await confirmDestructive(
      context,
      message: messages.notes.confirmEmptyTrash(count),
      confirmLabel: messages.notes.emptyTrashAction,
    );
    if (!confirmed) return;
    await store.emptyTrash();
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(messages.notes.trashEmptied)));
  }
}

/// The notes themselves, or why there are none, with the welcome on top
/// until it is dismissed.
class _NoteList extends StatelessWidget {
  const _NoteList({required this.store});

  final NotesStore store;

  /// Room under the last note, so the capture buttons never cover it.
  static const _bottomRoom = 168.0;

  @override
  Widget build(BuildContext context) {
    final scope = AppScope.of(context);
    final settings = scope.settings;
    final models = scope.models;
    final notes = store.visible;
    final showIntro = !settings.onboarded && store.section == NoteSection.all && store.query.isEmpty;
    if (store.loadFailed && store.all.isEmpty) return _LoadFailed(onRetry: () => unawaited(store.reload()));

    final header = <Widget>[
      if (showIntro)
        ListenableBuilder(
          listenable: models,
          builder: (context, _) => IntroCard(
            speechReady: models.status.isReady,
            onWrite: () => unawaited(HomeScreen._newNote(context, store)),
            onSetUpSpeech: () => unawaited(
              Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const SpeechModelsScreen())),
            ),
            onDismiss: () => unawaited(settings.setOnboarded(true)),
          ),
        ),
    ];
    if (notes.isEmpty) {
      return ListView(
        padding: const EdgeInsets.only(bottom: _bottomRoom),
        children: [
          ...header,
          if (!showIntro)
            EmptyNotes(section: store.section, query: store.query, onSearchAll: () => store.section = NoteSection.all),
        ],
      );
    }
    final inTrash = store.section is TrashSection;
    return ListView.builder(
      padding: EdgeInsets.only(bottom: _bottomRoom + MediaQuery.paddingOf(context).bottom),
      itemCount: header.length + notes.length,
      itemBuilder: (context, index) {
        if (index < header.length) return header[index];
        final note = notes[index - header.length];
        final tile = _NoteRow(
          child: NoteTile(
            note: note,
            calendar: settings.calendar,
            searchTerms: store.search.terms,
            showCreated: settings.sortOrder == SortOrder.created,
            onTap: () => unawaited(NoteScreen.open(context, note.id)),
            onLongPress: () => unawaited(showNoteActionsSheet(context, note)),
          ),
        );
        return inTrash ? KeyedSubtree(key: ValueKey(note.id), child: tile) : _swipeToTrash(context, note, tile);
      },
    );
  }

  Widget _swipeToTrash(BuildContext context, Note note, Widget tile) => Dismissible(
    key: ValueKey(note.id),
    direction: DismissDirection.endToStart,
    background: const _TrashBehind(),
    onDismissed: (_) => unawaited(runNoteAction(context, note.id, NoteAction.trash)),
    child: tile,
  );
}

/// A note in the list, ruled off from the next. The colour is read here, not
/// in the list's item builder: the builder's context isn't rebuilt on each
/// frame of an animated theme change (iOS turning dark at sunset), so a
/// colour read there stays light.
class _NoteRow extends StatelessWidget {
  const _NoteRow({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      border: Border(bottom: BorderSide(color: NotaColors.of(context).line)),
    ),
    child: child,
  );
}

/// What shows under a note swiped towards the trash; its colours are read
/// here for the reason [_NoteRow] gives.
class _TrashBehind extends StatelessWidget {
  const _TrashBehind();

  @override
  Widget build(BuildContext context) {
    final colors = NotaColors.of(context);
    return ColoredBox(
      color: colors.warnSoft,
      child: Align(
        alignment: AlignmentDirectional.centerEnd,
        child: Padding(
          padding: const EdgeInsetsDirectional.only(end: 24),
          child: Icon(Icons.delete_outline, color: colors.warnInk, semanticLabel: Messages.of(context).editor.trash),
        ),
      ),
    );
  }
}

class _LoadFailed extends StatelessWidget {
  const _LoadFailed({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(messages.notes.loadFailed, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onRetry, child: Text(messages.common.tryAgain)),
          ],
        ),
      ),
    );
  }
}
