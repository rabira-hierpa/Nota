interface Phrasing {
  phraseSeconds: number;
  pauseSeconds: number;
}

/**
 * Page init script: getUserMedia returns a "speaker" who says a phrase (a
 * tone), pauses, and repeats, so dictation has pauses to cut at. Chromium's
 * --use-file-for-fake-audio-capture delivers only silence under Electron, so
 * the audio is made in the page instead.
 */
export function speakInPhrases({ phraseSeconds, pauseSeconds }: Phrasing): void {
  const LEVEL = 0.3;
  const TONE_HZ = 220;
  const TOTAL_SECONDS = 120;
  navigator.mediaDevices.getUserMedia = async () => {
    const context = new AudioContext();
    const tone = new OscillatorNode(context, { frequency: TONE_HZ });
    const gate = new GainNode(context, { gain: 0 });
    for (let start = 0; start < TOTAL_SECONDS; start += phraseSeconds + pauseSeconds) {
      gate.gain.setValueAtTime(LEVEL, context.currentTime + start);
      gate.gain.setValueAtTime(0, context.currentTime + start + phraseSeconds);
    }
    const output = context.createMediaStreamDestination();
    tone.connect(gate).connect(output);
    tone.start();
    return output.stream;
  };
}
