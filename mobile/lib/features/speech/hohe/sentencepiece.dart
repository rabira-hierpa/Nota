import 'dart:typed_data';

// The punctuation model's word-piece tokenizer: SentencePiece's unigram
// model, cut to the pieces Amharic text uses (scripts/build_speech_models.py).
// Words are encoded one at a time, as `sp.EncodeAsIds(word)` does. A port of
// the desktop's electron/speech/sentencepiece.ts.

/// The pieces the punctuation model knows, from models/punct.json.
final class PieceTable {
  const PieceTable({required this.pieces, required this.specials, required this.unk});

  /// Reads the `pieces`, `specials` and `unk` fields of punct.json; throws a
  /// [FormatException] if they aren't there.
  factory PieceTable.fromJson(Map<String, Object?> json) {
    final pieces = json['pieces'];
    final specials = json['specials'];
    final unk = json['unk'];
    if (pieces is! List<Object?> || specials is! int || specials < 0 || unk is! int || unk < 0) {
      throw const FormatException('punct.json: bad piece table');
    }
    return PieceTable(pieces: List.unmodifiable(pieces.map(_piece)), specials: specials, unk: unk);
  }

  /// (piece, score) by id; the first [specials] are control pieces and never match text.
  final List<(String, double)> pieces;
  final int specials;
  final int unk;

  static (String, double) _piece(Object? entry) {
    if (entry case [final String piece, final num score]) return (piece, score.toDouble());
    throw const FormatException('punct.json: bad piece');
  }
}

/// SentencePiece's word-start marker (U+2581), which stands for the space before a word.
const _wordStart = 0x2581;

/// What SentencePiece takes off the lowest piece score for a character no piece covers.
const _unknownPenalty = 10;

/// The best way found so far to cut the text up to each position.
final class _Lattice {
  _Lattice(int length)
    : score = Float64List(length + 1)..fillRange(1, length + 1, double.negativeInfinity),
      from = Int32List(length + 1),
      id = Int32List(length + 1);

  /// The best score up to each end position, the piece that ends there and where it starts.
  final Float64List score;
  final Int32List from;
  final Int32List id;
}

/// SentencePiece's unigram tokenizer over a [PieceTable].
///
/// SentencePiece first normalises words to NFKC. Dart has no Unicode
/// normalisation, and NFKC changes none of the characters Hohe writes (none of
/// its 416 tokens), so words are taken as they are: for Hohe's text, the same
/// ids. Text from elsewhere with compatibility characters (full-width Latin,
/// ligatures) may cut differently.
class UnigramTokenizer {
  UnigramTokenizer(this._table) {
    var longest = 1;
    var lowest = double.infinity;
    for (var id = _table.specials; id < _table.pieces.length; id++) {
      final (piece, score) = _table.pieces[id];
      _ids[piece] = (id: id, score: score);
      final length = piece.runes.length;
      if (length > longest) longest = length;
      if (score < lowest) lowest = score;
    }
    _longest = longest;
    _unknownScore = _float32(lowest - _unknownPenalty);
  }

  final PieceTable _table;
  final Map<String, ({int id, double score})> _ids = {};
  late final int _longest;
  late final double _unknownScore;

  /// Rounds to float32, as Math.fround does: scores add up in float32 in SentencePiece's lattice.
  final Float32List _round = Float32List(1);

  double _float32(double value) {
    _round[0] = value;
    return _round[0];
  }

  /// The ids of one word (no spaces), with consecutive unknown characters merged into one unknown id.
  List<int> encodeWord(String word) {
    final chars = [_wordStart, ...word.runes];
    final best = _viterbi(chars);
    final ids = <int>[];
    for (var end = chars.length; end > 0; end = best.from[end]) {
      ids.add(best.id[end]);
    }
    final ordered = ids.reversed.toList();
    final unk = _table.unk;
    return [
      for (var i = 0; i < ordered.length; i++)
        if (ordered[i] != unk || i == 0 || ordered[i - 1] != unk) ordered[i],
    ];
  }

  /// The best-scoring way to cut `chars` (code points) into pieces.
  _Lattice _viterbi(List<int> chars) {
    final best = _Lattice(chars.length)..id.fillRange(1, chars.length + 1, _table.unk);
    for (var begin = 0; begin < chars.length; begin++) {
      var single = false;
      for (var length = 1; length <= _longest && begin + length <= chars.length; length++) {
        final match = _ids[String.fromCharCodes(chars, begin, begin + length)];
        if (match == null) continue;
        if (length == 1) single = true;
        _relax(best, begin, begin + length, match.id, match.score);
      }
      if (!single) _relax(best, begin, begin + 1, _table.unk, _unknownScore);
    }
    return best;
  }

  void _relax(_Lattice best, int from, int end, int id, double score) {
    final total = _float32(best.score[from] + score);
    if (total > best.score[end]) {
      best.score[end] = total;
      best.from[end] = from;
      best.id[end] = id;
    }
  }
}
