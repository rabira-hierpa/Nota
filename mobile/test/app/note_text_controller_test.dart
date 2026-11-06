import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nota/app/theme.dart';
import 'package:nota/features/notes/editor/note_text_controller.dart';

/// The spans' text, joined: what the field shows, character for character.
String _flatten(InlineSpan span) {
  final buffer = StringBuffer();
  span.visitChildren((child) {
    if (child is TextSpan) buffer.write(child.text ?? '');
    return true;
  });
  return buffer.toString();
}

/// The style of the leaf span holding [part].
TextStyle? _styleOf(InlineSpan span, String part) {
  TextStyle? found;
  span.visitChildren((child) {
    if (child is TextSpan && child.text == part) {
      found = child.style;
      return false;
    }
    return true;
  });
  return found;
}

void main() {
  group('describeMarks', () {
    test('marks a heading line, its marker, tags, links and search words', () {
      const text = '# Plans\nbuy #food at [[Market]] today';
      final marks = describeMarks(text, ['today']);

      String covered(String kind) =>
          [for (final mark in marks.where((mark) => mark.kind == kind)) text.substring(mark.start, mark.end)].join('|');

      expect(covered('heading'), '# Plans');
      expect(covered('headingMarker'), '# ');
      expect(covered('tag'), '#food');
      expect(covered('link'), '[[Market]]');
      expect(covered('match'), 'today');
    });

    test('a #tag at the start of a line is not a heading', () {
      final marks = describeMarks('#work notes', const []);
      expect(marks.map((mark) => mark.kind), ['tag']);
    });

    test('search words match without case, every time they appear', () {
      final marks = describeMarks('Milk, milk, MILK', ['milk']);
      expect(marks.map((mark) => (mark.start, mark.end)), [(0, 4), (6, 10), (12, 16)]);
    });

    test('the composing range is marked', () {
      final marks = describeMarks('ሰላም ዓለም', const [], composing: const TextRange(start: 4, end: 7));
      expect(marks.single, (start: 4, end: 7, kind: 'composing'));
    });
  });

  testWidgets('the styled text is the same text, so the caret maps one to one', (tester) async {
    const text = '# ርዕስ\nዛሬ #ስራ/ስብሰባ ከ[[ቡድኑ]] ጋር። #work';
    final controller = NoteTextController(text: text, searchTerms: ['ጋር']);
    addTearDown(controller.dispose);
    late BuildContext context;
    await tester.pumpWidget(
      MaterialApp(
        theme: NotaTheme.light,
        home: Builder(
          builder: (built) {
            context = built;
            return const SizedBox();
          },
        ),
      ),
    );

    final span = controller.buildTextSpan(context: context, style: NotaText.noteBody, withComposing: false);
    expect(_flatten(span), text);

    final colors = NotaColors.light;
    expect(_styleOf(span, '#ስራ/ስብሰባ')?.backgroundColor, colors.accentSoft);
    expect(_styleOf(span, '#ስራ/ስብሰባ')?.color, colors.accentInk);
    expect(_styleOf(span, '[[ቡድኑ]]')?.color, colors.accentInk);
    expect(_styleOf(span, 'ጋር')?.backgroundColor, colors.mark);
    expect(_styleOf(span, 'ርዕስ')?.fontSize, NotaText.noteHeading.fontSize);
    expect(_styleOf(span, '# ')?.color, colors.muted);
  });

  testWidgets('typing into a field with the controller keeps the text as typed', (tester) async {
    final controller = NoteTextController();
    addTearDown(controller.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: NotaTheme.light,
        home: Material(child: TextField(controller: controller)),
      ),
    );
    expect(find.byType(TextField), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'a #b');
    expect(controller.text, 'a #b');
  });
}
