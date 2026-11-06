/// What the editor shows when the note's text changes under it (a
/// transcription arrives, or the same note was edited in another editor).
///
/// [synced] is the text the store held when this editor last saved, [typed]
/// what the editor holds now and [incoming] the store's new text.
/// Transcripts are added after a note's text (`appendTranscript`), so when
/// [incoming] carries [synced] and something after it, that something goes
/// after what was typed, a blank line apart, and nothing typed is lost. Text
/// that doesn't carry [synced] replaced it outright, and wins.
String mergeIncoming({required String typed, required String synced, required String incoming}) {
  if (typed == synced) return incoming;
  final base = synced.trimRight();
  if (!incoming.startsWith(base)) return incoming;
  final added = incoming.substring(base.length).trimLeft();
  if (added.isEmpty) return typed;
  return typed.trim().isEmpty ? added : '${typed.trimRight()}\n\n$added';
}
