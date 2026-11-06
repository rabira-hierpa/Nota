import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../../app/app_scope.dart';
import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../data/note.dart';
import '../logic/assist.dart';
import '../logic/suggest_tags.dart';
import '../logic/summarize.dart';

/// Summarize & organize for the note in [controller]: its key sentences (to
/// add under the title), long paragraphs to cut where the topic changes, and
/// tags to add. Changes go into [controller], so the editor saves them.
Future<void> showAssistSheet(BuildContext context, {required Note note, required TextEditingController controller}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => AssistSheet(note: note, controller: controller),
    );

/// What the sheet offers for one version of the text.
typedef _Analysis = ({List<String> summary, int splittable, List<TagSuggestion> tags});

/// Everything the sheet shows, worked out away from the interface thread:
/// a long transcript takes a moment.
_Analysis _analyze(({Note note, List<TaggedText> library}) input) => (
  summary: summarize(input.note.text),
  splittable: countSplittable(input.note.text),
  tags: suggestTags(input.note, input.library),
);

class AssistSheet extends StatefulWidget {
  const AssistSheet({super.key, required this.note, required this.controller});

  final Note note;
  final TextEditingController controller;

  @override
  State<AssistSheet> createState() => _AssistSheetState();
}

enum _Done { summary, split, tag }

class _AssistSheetState extends State<AssistSheet> {
  Future<_Analysis>? _analysis;
  _Done? _done;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _analysis ??= _start();
  }

  Future<_Analysis> _start() {
    final library = AppScope.of(context).notes.taggedTexts;
    return compute(_analyze, (note: widget.note.copyWith(text: widget.controller.text), library: library));
  }

  /// Puts [text] in the editor, keeping the caret where it was when it still fits.
  void _apply(String text, _Done done) {
    final caret = widget.controller.selection.isValid ? widget.controller.selection.extentOffset : text.length;
    widget.controller.value = TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: math.min(caret, text.length)),
    );
    setState(() {
      _done = done;
      _analysis = _start();
    });
  }

  @override
  Widget build(BuildContext context) {
    final editor = Messages.of(context).editor;
    final textTheme = Theme.of(context).textTheme;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      minChildSize: 0.3,
      maxChildSize: 0.95,
      builder: (context, scroll) => FutureBuilder<_Analysis>(
        future: _analysis,
        builder: (context, snapshot) => ListView(
          controller: scroll,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          children: [
            Semantics(header: true, child: Text(editor.assist, style: textTheme.titleLarge)),
            const SizedBox(height: 4),
            Text(editor.assistSubtitle, style: textTheme.bodySmall),
            const SizedBox(height: 8),
            if (snapshot.data case final analysis?)
              ..._sections(context, analysis)
            else if (snapshot.hasError)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Text(Messages.of(context).common.generic),
              )
            else
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
          ],
        ),
      ),
    );
  }

  List<Widget> _sections(BuildContext context, _Analysis analysis) {
    final editor = Messages.of(context).editor;
    final text = widget.controller.text;
    return [
      _Heading(editor.summary),
      if (analysis.summary.isEmpty)
        _Plain(editor.tooShort)
      else ...[
        Text(editor.keySentences, style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 4),
        for (final sentence in analysis.summary) _Bullet(sentence),
        _Action(
          label: editor.addSummary,
          done: _done == _Done.summary ? editor.added : null,
          onPressed: () => _apply(insertSummary(text, analysis.summary), _Done.summary),
        ),
      ],
      _Heading(editor.paragraphsHeading),
      if (analysis.splittable == 0)
        _Plain(editor.noSplit)
      else ...[
        _Plain(editor.canSplit(analysis.splittable)),
        _Action(
          label: editor.split,
          done: _done == _Done.split ? editor.added : null,
          onPressed: () => _apply(splitLongParagraphs(text).$1, _Done.split),
        ),
      ],
      _Heading(editor.suggestedTags),
      if (analysis.tags.isEmpty)
        _Plain(editor.noTags)
      else
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final suggestion in analysis.tags)
              Tooltip(
                message: suggestion.source == TagSource.library ? editor.fromLibrary : editor.fromKeyword,
                child: ActionChip(
                  avatar: const Icon(Icons.add, size: 18),
                  label: Text(
                    suggestion.source == TagSource.keyword
                        ? '#${suggestion.tag} ${editor.newTag}'
                        : '#${suggestion.tag}',
                  ),
                  tooltip: editor.addTag(suggestion.tag),
                  onPressed: () => _apply(addTags(text, [suggestion.tag]), _Done.tag),
                ),
              ),
          ],
        ),
      if (_done == _Done.tag) Padding(padding: const EdgeInsets.only(top: 8), child: _Plain(editor.added)),
    ];
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 20, bottom: 8),
    child: Semantics(header: true, child: Text(text, style: Theme.of(context).textTheme.titleMedium)),
  );
}

class _Plain extends StatelessWidget {
  const _Plain(this.text);

  final String text;

  @override
  Widget build(BuildContext context) =>
      Text(text, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NotaColors.of(context).muted));
}

/// A key sentence, in the note's own type.
class _Bullet extends StatelessWidget {
  const _Bullet(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final colors = NotaColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: BorderDirectional(start: BorderSide(color: colors.accent, width: 2)),
        ),
        child: Padding(
          padding: const EdgeInsetsDirectional.only(start: 12),
          child: Text(text, style: Theme.of(context).textTheme.bodyMedium),
        ),
      ),
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({required this.label, required this.onPressed, this.done});

  final String label;
  final VoidCallback onPressed;

  /// Said beside the button once it has been used.
  final String? done;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: Wrap(
      spacing: 12,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        OutlinedButton(onPressed: onPressed, child: Text(label)),
        if (done case final done?)
          Semantics(liveRegion: true, child: Text(done, style: Theme.of(context).textTheme.bodySmall)),
      ],
    ),
  );
}
