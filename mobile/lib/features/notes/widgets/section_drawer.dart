import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_scope.dart';
import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../../speech/screens/speech_models_screen.dart';
import '../logic/sections.dart';
import '../logic/tags.dart';
import '../screens/settings_screen.dart';
import '../state/notes_store.dart';
import 'section_icons.dart';
import 'tag_tree_tile.dart';

/// The drawer: Bear's sections with how many notes each holds, the tags
/// written in notes as a tree (nested with `/`), then Speech models and Settings.
class SectionDrawer extends StatefulWidget {
  const SectionDrawer({super.key});

  @override
  State<SectionDrawer> createState() => _SectionDrawerState();
}

class _SectionDrawerState extends State<SectionDrawer> {
  /// Tags whose nested tags show. Starts with the chosen tag's parents open.
  final _expanded = <String>{};
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (AppScope.of(context).notes.section case TagSection(:final path)) {
      final parts = path.split(tagSeparator);
      for (var index = 1; index < parts.length; index += 1) {
        _expanded.add(parts.sublist(0, index).join(tagSeparator));
      }
    }
  }

  void _choose(NotesStore store, NoteSection section) {
    store.section = section;
    Navigator.pop(context);
  }

  void _toggle(String path) => setState(() {
    if (!_expanded.remove(path)) _expanded.add(path);
  });

  void _push(Widget screen) {
    final navigator = Navigator.of(context)..pop();
    unawaited(navigator.push(MaterialPageRoute<void>(builder: (_) => screen)));
  }

  @override
  Widget build(BuildContext context) {
    final store = AppScope.of(context).notes;
    final messages = Messages.of(context);
    final textTheme = Theme.of(context).textTheme;
    return Drawer(
      semanticLabel: messages.sections.label,
      child: SafeArea(
        child: ListenableBuilder(
          listenable: store,
          builder: (context, _) {
            final tags = store.tagTree;
            final selectedTag = switch (store.section) {
              TagSection(:final path) => path,
              _ => null,
            };
            return ListView(
              padding: const EdgeInsets.only(bottom: 16),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                  child: Text(messages.common.appName, style: textTheme.headlineSmall),
                ),
                _Heading(messages.sections.library),
                for (final kind in FixedSectionKind.values)
                  _SectionTile(
                    section: kind.section,
                    count: store.counts[kind] ?? 0,
                    selected: store.section == kind.section,
                    onTap: () => _choose(store, kind.section),
                  ),
                _Heading(messages.sections.tags),
                if (tags.isEmpty)
                  const _TagHint()
                else
                  for (final node in tags)
                    TagTreeTile(
                      node: node,
                      selectedPath: selectedTag,
                      expanded: _expanded,
                      onSelect: (path) => _choose(store, TagSection(path)),
                      onToggle: _toggle,
                    ),
                const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider()),
                ListTile(
                  leading: const Icon(Icons.graphic_eq),
                  title: Text(messages.speech.title),
                  onTap: () => _push(const SpeechModelsScreen()),
                ),
                ListTile(
                  leading: const Icon(Icons.settings_outlined),
                  title: Text(messages.settings.title),
                  onTap: () => _push(const SettingsScreen()),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
    child: Semantics(header: true, child: Text(text.toUpperCase(), style: Theme.of(context).textTheme.labelSmall)),
  );
}

class _SectionTile extends StatelessWidget {
  const _SectionTile({required this.section, required this.count, required this.selected, required this.onTap});

  final NoteSection section;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context).sections;
    return ListTile(
      selected: selected,
      leading: Icon(sectionIcon(section)),
      minLeadingWidth: 24,
      horizontalTitleGap: 12,
      contentPadding: const EdgeInsetsDirectional.only(start: 16, end: 20),
      title: Text(sectionTitle(section, messages), maxLines: 1, overflow: TextOverflow.ellipsis),
      trailing: count == 0
          ? null
          : Semantics(
              label: messages.noteCount(count),
              child: ExcludeSemantics(child: Text('$count', style: Theme.of(context).textTheme.bodySmall)),
            ),
      onTap: onTap,
    );
  }
}

/// No tags yet: how to make one, with the example written like a tag.
class _TagHint extends StatelessWidget {
  const _TagHint();

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context).sections;
    final colors = NotaColors.of(context);
    final style = Theme.of(context).textTheme.bodyMedium?.copyWith(color: colors.muted);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(text: '${messages.tagHintBefore} '),
            TextSpan(
              text: messages.tagHintExample,
              style: TextStyle(color: colors.accentInk, backgroundColor: colors.accentSoft),
            ),
            TextSpan(text: ' ${messages.tagHintAfter}'),
          ],
        ),
        style: style,
      ),
    );
  }
}
