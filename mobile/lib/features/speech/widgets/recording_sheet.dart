import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:record/record.dart' show RecordState;

import '../../../app/app_scope.dart';
import '../../../app/theme.dart';
import '../../../core/device.dart';
import '../../../core/result.dart';
import '../../../l10n/messages.dart';
import '../../notes/data/note.dart';
import '../../notes/logic/format.dart';
import '../../notes/state/notes_store.dart';
import '../audio/recorder.dart';
import '../state/speech_service.dart';

/// Shorter than this is a slip of the finger, not a recording.
const _minRecordingMs = 500;

/// Below this much time left, the sheet says when recording will stop.
const _warnLeftMs = 60 * 1000;

/// A recording kept this long is worth a question before it is thrown away.
const _confirmDiscardMs = 3000;

const _tick = Duration(milliseconds: 250);

/// Records a voice note: asks for the microphone, shows the time and the
/// level while recording, and on Stop saves the note and queues its
/// transcription. Returns the new note's id, or null when nothing was saved.
Future<String?> showRecordingSheet(BuildContext context) => showModalBottomSheet<String>(
  context: context,
  isScrollControlled: true,
  isDismissible: false,
  enableDrag: false,
  useSafeArea: true,
  builder: (_) => const _RecordingSheet(),
);

enum _Phase { starting, denied, failed, recording, paused, saving }

/// How stopping went.
enum _Kept { saved, tooShort, failed }

class _RecordingSheet extends StatefulWidget {
  const _RecordingSheet();

  @override
  State<_RecordingSheet> createState() => _RecordingSheetState();
}

class _RecordingSheetState extends State<_RecordingSheet> with WidgetsBindingObserver {
  final _recorder = Recorder();
  final _stopwatch = Stopwatch();
  final _id = newNoteId();
  late final NotesStore _notes;
  late final SpeechService _speech;
  late final String _path;
  Timer? _ticker;
  StreamSubscription<double>? _levels;
  StreamSubscription<RecordState>? _states;
  DateTime _startedAt = DateTime.now();
  _Phase _phase = _Phase.starting;
  double _level = 0;
  bool _started = false;

  /// Saved or discarded: the sheet is on its way out.
  bool _finished = false;

  bool get _live => _phase == _Phase.recording || _phase == _Phase.paused;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final scope = AppScope.of(context);
    _notes = scope.notes;
    _speech = scope.speech;
    _path = _notes.audioPath(_id);
    unawaited(_start());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopListening();
    unawaited(Device.keepScreenOn(this, false));
    // Closed some other way while recording: keep what was said.
    if (_live && !_finished) {
      _finished = true;
      unawaited(_keep().whenComplete(_recorder.dispose).whenComplete(() => Device.useAudio(this, false)));
    } else {
      unawaited(_recorder.dispose().whenComplete(() => Device.useAudio(this, false)));
    }
    super.dispose();
  }

  /// Leaving the app ends the recording, and it is saved: the microphone
  /// can't be held in the background.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if ((state == AppLifecycleState.hidden || state == AppLifecycleState.paused) && _live) unawaited(_save());
  }

  Future<void> _start() async {
    setState(() => _phase = _Phase.starting);
    unawaited(Device.useAudio(this, true));
    switch (await _recorder.startFile(_path)) {
      case Err(:final message):
        // The session may have been taken before the microphone failed.
        unawaited(Device.useAudio(this, false));
        if (!mounted) return;
        setState(() => _phase = message == RecorderError.permissionDenied ? _Phase.denied : _Phase.failed);
      case Ok():
        if (!mounted || _finished) return;
        // Auto-Lock would cut the recording short: iOS suspends Nota soon after the screen locks.
        unawaited(Device.keepScreenOn(this, true));
        _startedAt = DateTime.now();
        _stopwatch
          ..reset()
          ..start();
        _ticker = Timer.periodic(_tick, (_) => _onTick());
        _levels = _recorder.levels().listen((level) {
          if (mounted) setState(() => _level = level);
        });
        _states = _recorder.states().listen(_onState);
        setState(() => _phase = _Phase.recording);
    }
  }

  void _onTick() {
    if (_stopwatch.elapsedMilliseconds >= maxDurationMs) {
      unawaited(_save(limitReached: true));
    } else if (mounted) {
      setState(() {});
    }
  }

  /// The system pauses recording for a phone call; the sheet follows.
  void _onState(RecordState state) {
    if (!mounted || !_live) return;
    switch (state) {
      case RecordState.pause:
        _stopwatch.stop();
        setState(() => _phase = _Phase.paused);
      case RecordState.record:
        _stopwatch.start();
        setState(() => _phase = _Phase.recording);
      case RecordState.stop:
        break;
    }
  }

  Future<void> _togglePause() async {
    if (_phase == _Phase.paused) {
      await _recorder.resume();
      _onState(RecordState.record);
    } else {
      await _recorder.pause();
      _onState(RecordState.pause);
    }
  }

  void _stopListening() {
    _ticker?.cancel();
    unawaited(_levels?.cancel());
    unawaited(_states?.cancel());
  }

  /// Stops, saves the note and queues its transcription, then closes.
  Future<void> _save({bool limitReached = false}) async {
    if (_finished || !_live) return;
    _finished = true;
    _stopListening();
    final messages = Messages.of(context).audio;
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    setState(() => _phase = _Phase.saving);
    final kept = await _keep();
    final message = switch (kept) {
      _Kept.saved when limitReached => messages.limitReached(formatDuration(maxDurationMs)),
      _Kept.saved => messages.saved,
      _Kept.tooShort => messages.tooShort,
      _Kept.failed => messages.failed,
    };
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
    if (mounted) navigator.pop(kept == _Kept.saved ? _id : null);
  }

  /// Ends the recording and adds it as a voice note, unless it is too short
  /// to keep or its file can't be read (then the file is removed).
  Future<_Kept> _keep() async {
    await _recorder.stop();
    _letGo();
    _stopwatch.stop();
    final durationMs = await wavDurationMs(_path);
    if (durationMs == null || durationMs < _minRecordingMs) {
      await _deleteFile();
      return durationMs == null ? _Kept.failed : _Kept.tooShort;
    }
    final audio = NoteAudio(
      durationMs: math.min(durationMs, maxDurationMs),
      transcription: const TranscriptionPending(),
    );
    await _notes.add(Note(id: _id, createdAt: _startedAt, updatedAt: DateTime.now(), text: '', audio: audio));
    _speech.transcribeNote(_id);
    return _Kept.saved;
  }

  /// Throws the recording away, asking first when there is something to lose.
  Future<void> _discard() async {
    if (_finished) return;
    if (_live && _stopwatch.elapsedMilliseconds >= _confirmDiscardMs && !await _confirmDiscard()) return;
    if (!mounted || _finished) return;
    _finished = true;
    _stopListening();
    final navigator = Navigator.of(context);
    await _recorder.cancel();
    _letGo();
    await _deleteFile();
    if (mounted) navigator.pop();
  }

  /// The recorder has stopped: the screen may lock again, and the music or
  /// podcast the person paused carries on.
  void _letGo() {
    unawaited(Device.keepScreenOn(this, false));
    unawaited(Device.useAudio(this, false));
  }

  Future<bool> _confirmDiscard() async {
    final messages = Messages.of(context);
    final error = Theme.of(context).colorScheme.error;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(messages.audio.confirmDiscard),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: Text(messages.common.cancel)),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: error),
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(messages.audio.discard),
          ),
        ],
      ),
    );
    return confirmed ?? false;
  }

  Future<void> _deleteFile() async {
    try {
      await File(_path).delete();
    } on FileSystemException {
      // Never written, or already gone.
    }
  }

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_discard());
      },
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(messages.audio.recorderTitle, style: Theme.of(context).textTheme.titleLarge),
            ),
            const SizedBox(height: 24),
            ...switch (_phase) {
              _Phase.denied => _problem(context, messages, messages.audio.micBlocked, explain: true),
              _Phase.failed => _problem(context, messages, messages.audio.micFailed),
              _ => _recording(context, messages),
            },
          ],
        ),
      ),
    );
  }

  List<Widget> _recording(BuildContext context, Messages messages) {
    final colors = NotaColors.of(context);
    final textTheme = Theme.of(context).textTheme;
    final elapsedMs = _stopwatch.elapsedMilliseconds;
    final time = formatDuration(elapsedMs);
    final left = maxDurationMs - elapsedMs;
    final state = switch (_phase) {
      _Phase.starting => messages.audio.starting,
      _Phase.paused => messages.audio.paused,
      _Phase.saving => messages.audio.saving,
      _ => messages.audio.recording,
    };
    return [
      Semantics(
        label: messages.audio.elapsed(time),
        excludeSemantics: true,
        child: Text(
          time,
          textAlign: TextAlign.center,
          style: textTheme.displaySmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
        ),
      ),
      const SizedBox(height: 4),
      Semantics(
        liveRegion: true,
        child: Text(
          state,
          textAlign: TextAlign.center,
          style: textTheme.bodyMedium?.copyWith(color: _phase == _Phase.recording ? colors.record : colors.muted),
        ),
      ),
      const SizedBox(height: 20),
      _LevelMeter(level: _phase == _Phase.recording ? _level : 0, label: messages.audio.level),
      if (_live && left <= _warnLeftMs) ...[
        const SizedBox(height: 12),
        Text(
          messages.audio.limitSoon(formatDuration(math.max(0, left))),
          textAlign: TextAlign.center,
          style: textTheme.bodySmall?.copyWith(color: colors.warnInk),
        ),
      ],
      const SizedBox(height: 24),
      _controls(context, messages),
    ];
  }

  Widget _controls(BuildContext context, Messages messages) {
    final colors = NotaColors.of(context);
    final paused = _phase == _Phase.paused;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        IconButton(
          icon: const Icon(Icons.delete_outline),
          tooltip: messages.audio.discard,
          onPressed: _phase == _Phase.saving ? null : () => unawaited(_discard()),
        ),
        Semantics(
          button: true,
          label: messages.audio.stop,
          excludeSemantics: true,
          child: SizedBox.square(
            dimension: 72,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: colors.record,
                foregroundColor: colors.onAccent,
                shape: const CircleBorder(),
                padding: EdgeInsets.zero,
              ),
              onPressed: _live ? () => unawaited(_save()) : null,
              child: _phase == _Phase.saving || _phase == _Phase.starting
                  ? SizedBox.square(
                      dimension: 24,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: colors.onAccent),
                    )
                  : const Icon(Icons.stop_rounded, size: 36),
            ),
          ),
        ),
        IconButton(
          icon: Icon(paused ? Icons.mic_none : Icons.pause),
          tooltip: paused ? messages.audio.resume : messages.audio.pause,
          onPressed: _live ? () => unawaited(_togglePause()) : null,
        ),
      ],
    );
  }

  List<Widget> _problem(BuildContext context, Messages messages, String text, {bool explain = false}) {
    final textTheme = Theme.of(context).textTheme;
    return [
      if (explain) ...[
        Text(messages.audio.micTitle, style: textTheme.titleMedium),
        const SizedBox(height: 8),
        Text(messages.audio.micWhy, style: textTheme.bodyMedium),
        const SizedBox(height: 12),
      ],
      Semantics(liveRegion: true, child: Text(text, style: textTheme.bodyLarge)),
      const SizedBox(height: 24),
      OverflowBar(
        alignment: MainAxisAlignment.end,
        spacing: 8,
        children: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: Text(messages.common.close)),
          FilledButton(onPressed: () => unawaited(_start()), child: Text(messages.common.tryAgain)),
        ],
      ),
    ];
  }
}

/// The microphone's level as a bar: a sign that the phone hears something.
class _LevelMeter extends StatelessWidget {
  const _LevelMeter({required this.level, required this.label});

  final double level;
  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = NotaColors.of(context);
    return Semantics(
      label: label,
      value: '${(level * 100).round()}%',
      child: ClipRRect(
        borderRadius: const BorderRadius.all(Radius.circular(3)),
        child: SizedBox(
          height: 6,
          child: ColoredBox(
            color: colors.line,
            child: Align(
              alignment: AlignmentDirectional.centerStart,
              child: AnimatedFractionallySizedBox(
                duration: const Duration(milliseconds: 90),
                widthFactor: level,
                heightFactor: 1,
                child: ColoredBox(color: colors.accent),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
