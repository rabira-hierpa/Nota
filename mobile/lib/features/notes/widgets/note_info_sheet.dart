import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../app/app_scope.dart';
import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../data/note.dart';
import '../logic/format.dart';
import '../logic/note_links.dart';
import '../logic/note_stats.dart';
import '../logic/note_text.dart';
import '../state/notes_store.dart';

/// Shows a note's info: when it was made and changed, its counts, and the
/// notes it links to and that link to it. [onOpenNote] opens one of those.
Future<void> showNoteInfoSheet(
  BuildContext context, {
  required String noteId,
  required ValueChanged<String> onOpenNote,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (_) => NoteInfoSheet(noteId: noteId, onOpenNote: onOpenNote),
);

class NoteInfoSheet extends StatelessWidget {
  const NoteInfoSheet({super.key, required this.noteId, required this.onOpenNote});

  final String noteId;

  /// Called after the sheet has closed.
  final ValueChanged<String> onOpenNote;

  @override
  Widget build(BuildContext context) {
    final scope = AppScope.of(context);
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.95,
      builder: (context, scroll) => ListenableBuilder(
        listenable: scope.notes,
        builder: (context, _) {
          final note = scope.notes.byId(noteId);
          if (note == null) return const SizedBox.shrink();
          return ListView(
            controller: scroll,
            padding: const EdgeInsets.fromLTRB(0, 0, 0, 24),
            children: _rows(context, note, scope.notes, scope.settings.calendar),
          );
        },
      ),
    );
  }

  List<Widget> _rows(BuildContext context, Note note, NotesStore store, CalendarChoice calendar) {
    final messages = Messages.of(context);
    final editor = messages.editor;
    final number = NumberFormat.decimalPattern(messages.dates.gregorianLocale);
    final stats = noteStats(note.text);
    final audio = note.audio;
    return [
      _Title(editor.info),
      _InfoRow(label: editor.created, lines: formatFullDate(note.createdAt, calendar, messages.dates)),
      _InfoRow(label: editor.modified, lines: formatFullDate(note.updatedAt, calendar, messages.dates)),
      if (audio != null) _InfoRow(label: editor.recording, lines: [formatDuration(audio.durationMs)]),
      const SizedBox(height: 8),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Row(
          children: [
            _Count(value: number.format(stats.paragraphs), label: editor.paragraphs(stats.paragraphs)),
            _Count(value: number.format(stats.words), label: editor.wordsLabel(stats.words)),
            _Count(value: number.format(stats.characters), label: editor.characters(stats.characters)),
          ],
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
        child: Text(
          editor.withoutSpaces(number.format(stats.charactersWithoutSpaces)),
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ),
      const Divider(),
      ..._links(context, note, store),
    ];
  }

  List<Widget> _links(BuildContext context, Note note, NotesStore store) {
    final editor = Messages.of(context).editor;
    final all = store.all;
    final seen = <String>{};
    final outgoing = [
      for (final link in findLinks(note.text))
        if (seen.add(linkKey(link.title))) (title: link.title, note: findLinkedNote(all, link.title)),
    ];
    final incoming = backlinksTo(all, note);
    if (outgoing.isEmpty && incoming.isEmpty) {
      return [_Title(editor.linksTo), _Hint('${editor.noLinks} ${editor.linkTip}')];
    }
    return [
      if (outgoing.isNotEmpty) ...[
        _Title(editor.linksTo),
        for (final link in outgoing)
          if (link.note case final linked?)
            _NoteLink(note: linked, onTap: () => _open(context, linked.id))
          else
            _MissingLink(title: link.title, onCreate: () => unawaited(_create(context, store, link.title))),
      ],
      if (incoming.isNotEmpty) ...[
        _Title(editor.linkedFrom),
        for (final from in incoming) _NoteLink(note: from, onTap: () => _open(context, from.id)),
      ],
    ];
  }

  void _open(BuildContext context, String id) {
    Navigator.pop(context);
    onOpenNote(id);
  }

  /// A note for a link that leads nowhere yet, titled with the link's words as a heading.
  Future<void> _create(BuildContext context, NotesStore store, String title) async {
    final navigator = Navigator.of(context);
    final created = await store.create(text: '# $title\n');
    navigator.pop();
    onOpenNote(created.id);
  }
}

class _Title extends StatelessWidget {
  const _Title(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
    child: Semantics(header: true, child: Text(text, style: Theme.of(context).textTheme.titleMedium)),
  );
}

class _Hint extends StatelessWidget {
  const _Hint(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
    child: Text(text, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NotaColors.of(context).muted)),
  );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.lines});

  final String label;
  final List<String> lines;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return MergeSemantics(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: textTheme.labelSmall),
            for (final line in lines) Text(line, style: textTheme.bodyMedium),
          ],
        ),
      ),
    );
  }
}

class _Count extends StatelessWidget {
  const _Count({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Expanded(
      child: MergeSemantics(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: textTheme.titleLarge),
              Text(label, style: textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

class _NoteLink extends StatelessWidget {
  const _NoteLink({required this.note, required this.onTap});

  final Note note;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final title = noteTitle(note.text);
    return ListTile(
      leading: Icon(Icons.link, color: NotaColors.of(context).accentInk),
      title: Text(
        title.isEmpty ? Messages.of(context).common.untitled : title,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      onTap: onTap,
    );
  }
}

class _MissingLink extends StatelessWidget {
  const _MissingLink({required this.title, required this.onCreate});

  final String title;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final editor = Messages.of(context).editor;
    return ListTile(
      leading: Icon(Icons.link_off, color: NotaColors.of(context).faint),
      title: Text(editor.linkMissing(title), maxLines: 2, overflow: TextOverflow.ellipsis),
      trailing: TextButton(onPressed: onCreate, child: Text(editor.createLinked)),
    );
  }
}
