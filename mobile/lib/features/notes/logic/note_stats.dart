import 'package:flutter/widgets.dart' show StringCharacters;

import 'note_text.dart';

/// The counts the note's info shows.
class NoteStats {
  const NoteStats({
    required this.paragraphs,
    required this.words,
    required this.characters,
    required this.charactersWithoutSpaces,
  });

  /// Lines with text: on the phone each line of a note is a paragraph.
  final int paragraphs;
  final int words;

  /// Letters as a reader counts them: each Ge'ez syllable (ፊ, ደ, ል) is one.
  final int characters;
  final int charactersWithoutSpaces;

  @override
  bool operator ==(Object other) =>
      other is NoteStats &&
      other.paragraphs == paragraphs &&
      other.words == words &&
      other.characters == characters &&
      other.charactersWithoutSpaces == charactersWithoutSpaces;

  @override
  int get hashCode => Object.hash(paragraphs, words, characters, charactersWithoutSpaces);

  @override
  String toString() =>
      'NoteStats(paragraphs: $paragraphs, words: $words, characters: $characters, '
      'withoutSpaces: $charactersWithoutSpaces)';
}

final _whitespace = RegExp(r'\s', unicode: true);

/// Counts for a note's plain text (one line per paragraph).
NoteStats noteStats(String text) {
  final blocks = text.split('\n').where((line) => line.trim().isNotEmpty).toList();
  var characters = 0;
  var charactersWithoutSpaces = 0;
  // Grapheme clusters, so a letter with its marks (or an emoji) counts once.
  for (final segment in blocks.join(' ').characters) {
    characters += 1;
    if (!_whitespace.hasMatch(segment)) charactersWithoutSpaces += 1;
  }
  return NoteStats(
    paragraphs: blocks.length,
    words: wordCount(text),
    characters: characters,
    charactersWithoutSpaces: charactersWithoutSpaces,
  );
}
