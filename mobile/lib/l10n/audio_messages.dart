/// Recordings: the recorder (timer, level meter), the microphone, and the
/// audio bar under a voice note.
class AudioMessages {
  const AudioMessages({
    required this.recorderTitle,
    required this.record,
    required this.stop,
    required this.pause,
    required this.resume,
    required this.discard,
    required this.confirmDiscard,
    required this.starting,
    required this.recording,
    required this.paused,
    required this.saving,
    required this.saved,
    required this.elapsed,
    required this.level,
    required this.limitSoon,
    required this.limitReached,
    required this.tooShort,
    required this.failed,
    required this.micTitle,
    required this.micWhy,
    required this.micBlocked,
    required this.micFailed,
    required this.micSilent,
    required this.micInterrupted,
    required this.play,
    required this.pauseAudio,
    required this.position,
    required this.positionOf,
    required this.transcribe,
    required this.transcribeAgain,
    required this.badgeTranscribing,
    required this.badgePending,
    required this.badgeDone,
    required this.badgeFailed,
    required this.playFailed,
    required this.missing,
  });

  static final en = AudioMessages(
    recorderTitle: 'New voice note',
    record: 'Record a voice note',
    stop: 'Stop recording',
    pause: 'Pause recording',
    resume: 'Resume recording',
    discard: 'Discard the recording',
    confirmDiscard: "Discard this recording? It hasn't been saved.",
    starting: 'Starting microphone…',
    recording: 'Recording',
    paused: 'Paused',
    saving: 'Saving…',
    saved: 'Voice note saved.',
    elapsed: (time) => 'Recorded $time',
    level: 'Microphone level',
    limitSoon: (left) => 'Recording stops in $left',
    limitReached: (max) => 'Recording stopped at the $max limit. It was saved.',
    tooShort: 'That recording was too short. Try again.',
    failed: "Couldn't process the recording. Try again.",
    micTitle: 'Allow the microphone',
    micWhy: 'Nota uses the microphone to record and dictate. Your voice stays on this phone.',
    micBlocked: "Microphone access is blocked. Allow it for Nota in the phone's Settings, then try again.",
    micFailed: "Couldn't start recording. Try again.",
    micSilent: 'No sound was recorded. Check your microphone and try again.',
    micInterrupted: 'Dictation stopped: the microphone was interrupted.',
    play: 'Play',
    pauseAudio: 'Pause',
    position: 'Playback position',
    positionOf: (position, total) => '$position of $total',
    transcribe: 'Transcribe',
    transcribeAgain: 'Transcribe again',
    badgeTranscribing: 'Transcribing…',
    badgePending: 'Not transcribed',
    badgeDone: 'Transcribed',
    badgeFailed: 'Failed',
    playFailed: "Couldn't play the recording.",
    missing: "This note's recording is missing.",
  );

  static final am = AudioMessages(
    recorderTitle: 'አዲስ የድምፅ ማስታወሻ',
    record: 'የድምፅ ማስታወሻ ቅረጽ',
    stop: 'መቅረጽ አቁም',
    pause: 'መቅረጽ ለአፍታ አቁም',
    resume: 'መቅረጽ ቀጥል',
    discard: 'ቅጂውን አስወግድ',
    confirmDiscard: 'ይህ ቅጂ ይወገድ? ገና አልተቀመጠም።',
    starting: 'ማይክሮፎኑን በማስጀመር ላይ…',
    recording: 'በመቅረጽ ላይ',
    paused: 'ለአፍታ ቆሟል',
    saving: 'በማስቀመጥ ላይ…',
    saved: 'የድምፅ ማስታወሻው ተቀምጧል።',
    elapsed: (time) => '$time ተቀርጿል',
    level: 'የማይክሮፎኑ የድምፅ መጠን',
    limitSoon: (left) => 'መቅረጹ በ$left ውስጥ ይቆማል',
    limitReached: (max) => 'መቅረጹ $max ገደብ ላይ ስለደረሰ ቆሟል። ቅጂው ተቀምጧል።',
    tooShort: 'ቅጂው በጣም አጭር ነበር። እንደገና ይሞክሩ።',
    failed: 'ቅጂውን ማስኬድ አልተቻለም። እንደገና ይሞክሩ።',
    micTitle: 'ማይክሮፎኑን ይፍቀዱ',
    micWhy: 'Nota ለመቅረጽ እና በድምፅ ለመጻፍ ማይክሮፎኑን ይጠቀማል። ድምፅዎ ከዚህ ስልክ አይወጣም።',
    micBlocked: 'ማይክሮፎን መጠቀም ታግዷል። በስልኩ ቅንብሮች ውስጥ ለNota ይፍቀዱት፣ ከዚያ እንደገና ይሞክሩ።',
    micFailed: 'መቅረጽ መጀመር አልተቻለም። እንደገና ይሞክሩ።',
    micSilent: 'ምንም ድምፅ አልተቀረጸም። ማይክሮፎንዎን አረጋግጠው እንደገና ይሞክሩ።',
    micInterrupted: 'በድምፅ መጻፍ ቆሟል፤ ማይክሮፎኑ ተቋርጧል።',
    play: 'አጫውት',
    pauseAudio: 'ለአፍታ አቁም',
    position: 'የማጫወቻ ቦታ',
    positionOf: (position, total) => 'ከ$total ውስጥ $position',
    transcribe: 'ወደ ጽሑፍ ቀይር',
    transcribeAgain: 'እንደገና ወደ ጽሑፍ ቀይር',
    badgeTranscribing: 'በመቀየር ላይ…',
    badgePending: 'ወደ ጽሑፍ አልተቀየረም',
    badgeDone: 'ወደ ጽሑፍ ተቀይሯል',
    badgeFailed: 'አልተሳካም',
    playFailed: 'ቅጂውን ማጫወት አልተቻለም።',
    missing: 'የዚህ ማስታወሻ ቅጂ አልተገኘም።',
  );

  /// The recorder sheet's heading.
  final String recorderTitle;
  final String record;
  final String stop;
  final String pause;
  final String resume;
  final String discard;
  final String confirmDiscard;
  final String starting;

  /// The recorder's state, beside its timer.
  final String recording;
  final String paused;
  final String saving;
  final String saved;

  /// The timer, for screen readers: "Recorded 1:05".
  final String Function(String time) elapsed;

  /// The level meter, for screen readers.
  final String level;

  /// Recordings stop at a limit (`maxDurationMs`): time left, then the limit itself.
  final String Function(String left) limitSoon;
  final String Function(String max) limitReached;
  final String tooShort;
  final String failed;

  /// Asking for, or being refused, the microphone.
  final String micTitle;
  final String micWhy;
  final String micBlocked;
  final String micFailed;
  final String micSilent;

  /// Dictation stopped because the microphone went quiet: a call, another
  /// app taking it, or headphones coming off.
  final String micInterrupted;

  /// The audio bar under a voice note.
  final String play;
  final String pauseAudio;
  final String position;
  final String Function(String position, String total) positionOf;
  final String transcribe;
  final String transcribeAgain;

  /// The transcription state shown in the audio bar.
  final String badgeTranscribing;
  final String badgePending;
  final String badgeDone;
  final String badgeFailed;
  final String playFailed;

  /// The note says it has a recording but the WAV isn't there.
  final String missing;
}
