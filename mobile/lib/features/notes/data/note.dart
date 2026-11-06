import 'dart:math';

/// Recordings are capped so a forgotten recorder can't fill the phone.
const maxDurationMs = 30 * 60 * 1000;
const maxNoteTextLength = 200000;

/// What the speech model last did with a note's recording. "Transcribing" is
/// not stored: it only exists while a job runs, so the speech service tracks it.
sealed class Transcription {
  const Transcription();

  factory Transcription.fromJson(Map<String, Object?> json) => switch (json['status']) {
    'done' => TranscriptionDone(
      transcribedAt: DateTime.parse(json['transcribedAt']! as String),
      model: json['model'] as String?,
    ),
    'error' => TranscriptionFailed(json['message'] as String? ?? ''),
    _ => const TranscriptionPending(),
  };

  Map<String, Object?> toJson();
}

final class TranscriptionPending extends Transcription {
  const TranscriptionPending();

  @override
  Map<String, Object?> toJson() => {'status': 'pending'};
}

final class TranscriptionDone extends Transcription {
  const TranscriptionDone({required this.transcribedAt, this.model});

  final DateTime transcribedAt;
  final String? model;

  @override
  Map<String, Object?> toJson() => {
    'status': 'done',
    'transcribedAt': transcribedAt.toUtc().toIso8601String(),
    if (model != null) 'model': model,
  };
}

final class TranscriptionFailed extends Transcription {
  const TranscriptionFailed(this.message);

  /// A message main wrote, never transcript text.
  final String message;

  @override
  Map<String, Object?> toJson() => {'status': 'error', 'message': message};
}

/// The voice recording a note was made from. The WAV lives beside the note.
class NoteAudio {
  const NoteAudio({required this.durationMs, required this.transcription});

  factory NoteAudio.fromJson(Map<String, Object?> json) => NoteAudio(
    durationMs: (json['durationMs']! as num).toInt(),
    transcription: Transcription.fromJson(json['transcription']! as Map<String, Object?>),
  );

  final int durationMs;
  final Transcription transcription;

  NoteAudio withTranscription(Transcription transcription) =>
      NoteAudio(durationMs: durationMs, transcription: transcription);

  Map<String, Object?> toJson() => {'durationMs': durationMs, 'transcription': transcription.toJson()};
}

/// A note, as the desktop app keeps one, less its HTML: on the phone the
/// plain `text` is the note (titles, previews, tags and search read it too).
class Note {
  const Note({
    required this.id,
    required this.createdAt,
    required this.updatedAt,
    required this.text,
    this.favorite = false,
    this.pinned = false,
    this.archivedAt,
    this.trashedAt,
    this.audio,
  });

  /// A new, empty note made now.
  factory Note.create({String text = '', NoteAudio? audio, DateTime? now}) {
    final at = now ?? DateTime.now();
    return Note(id: newNoteId(), createdAt: at, updatedAt: at, text: text, audio: audio);
  }

  /// Reads a note file; fields added after the first version default.
  factory Note.fromJson(Map<String, Object?> json) => Note(
    id: json['id']! as String,
    createdAt: DateTime.parse(json['createdAt']! as String),
    updatedAt: DateTime.parse(json['updatedAt']! as String),
    text: json['text'] as String? ?? '',
    favorite: json['favorite'] as bool? ?? false,
    pinned: json['pinned'] as bool? ?? false,
    archivedAt: _date(json['archivedAt']),
    trashedAt: _date(json['trashedAt']),
    audio: switch (json['audio']) {
      final Map<String, Object?> audio => NoteAudio.fromJson(audio),
      _ => null,
    },
  );

  final String id;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String text;
  final bool favorite;
  final bool pinned;

  /// Set while the note is in the Archive: kept, but out of the way.
  final DateTime? archivedAt;

  /// Set while the note is in the Trash.
  final DateTime? trashedAt;
  final NoteAudio? audio;

  bool get isTrashed => trashedAt != null;
  bool get isArchived => archivedAt != null;

  /// A copy with the given fields changed. Pass `clearArchivedAt`,
  /// `clearTrashedAt` or `clearAudio` to set those back to null.
  Note copyWith({
    DateTime? updatedAt,
    String? text,
    bool? favorite,
    bool? pinned,
    DateTime? archivedAt,
    bool clearArchivedAt = false,
    DateTime? trashedAt,
    bool clearTrashedAt = false,
    NoteAudio? audio,
    bool clearAudio = false,
  }) => Note(
    id: id,
    createdAt: createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    text: text ?? this.text,
    favorite: favorite ?? this.favorite,
    pinned: pinned ?? this.pinned,
    archivedAt: clearArchivedAt ? null : archivedAt ?? this.archivedAt,
    trashedAt: clearTrashedAt ? null : trashedAt ?? this.trashedAt,
    audio: clearAudio ? null : audio ?? this.audio,
  );

  Map<String, Object?> toJson() => {
    'id': id,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'text': text,
    'favorite': favorite,
    'pinned': pinned,
    'archivedAt': archivedAt?.toUtc().toIso8601String(),
    'trashedAt': trashedAt?.toUtc().toIso8601String(),
    'audio': audio?.toJson(),
  };

  static DateTime? _date(Object? value) => value is String ? DateTime.parse(value) : null;
}

final _random = Random.secure();

/// A random (version 4) UUID, the id format the desktop app uses.
String newNoteId() {
  final bytes = List<int>.generate(16, (_) => _random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-'
      '${hex.substring(16, 20)}-${hex.substring(20)}';
}
