import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../../app/app_scope.dart';
import '../../../app/theme.dart';
import '../../../core/device.dart';
import '../../../l10n/messages.dart';
import '../../notes/data/note.dart';
import '../../notes/logic/format.dart';
import '../screens/speech_models_screen.dart';
import '../state/speech_service.dart';

/// The bar over a voice note: plays its recording, shows where Hohe is with
/// it, transcribes it (again), and shares the WAV.
class AudioBar extends StatefulWidget {
  const AudioBar({super.key, required this.note});

  final Note note;

  @override
  State<AudioBar> createState() => _AudioBarState();
}

class _AudioBarState extends State<AudioBar> {
  final _player = AudioPlayer();
  final _shareKey = GlobalKey();
  late final StreamSubscription<PlayerState> _playerStates;
  String? _openedId;
  String _path = '';
  bool _loaded = false;
  bool _exists = true;
  bool _playing = false;

  /// Told when dictation into this note starts ([_speechChanged]).
  SpeechService? _speech;

  /// Where the thumb is while it is dragged, so it doesn't jump back.
  double? _dragMs;

  @override
  void initState() {
    super.initState();
    _playerStates = _player.playerStateStream.listen(_playerChanged);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final speech = AppScope.of(context).speech;
    if (!identical(speech, _speech)) {
      _speech?.removeListener(_speechChanged);
      _speech = speech..addListener(_speechChanged);
    }
    _openNote();
  }

  @override
  void didUpdateWidget(AudioBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.note.id != widget.note.id) {
      unawaited(_player.stop());
      _openNote();
    }
  }

  @override
  void dispose() {
    _speech?.removeListener(_speechChanged);
    unawaited(_playerStates.cancel());
    unawaited(_player.dispose().whenComplete(() => Device.useAudio(this, false)));
    super.dispose();
  }

  /// Paused, stopped or played to the end: the music or podcast the person
  /// was listening to carries on, once nothing else records or plays.
  void _playerChanged(PlayerState state) {
    final playing = _isPlaying(state);
    if (playing != _playing) unawaited(Device.useAudio(this, playing));
    _playing = playing;
  }

  /// Finds the note's WAV; it is loaded into the player only when played.
  void _openNote() {
    if (_openedId == widget.note.id) return;
    _openedId = widget.note.id;
    _loaded = false;
    _dragMs = null;
    _path = AppScope.of(context).notes.audioPath(widget.note.id);
    unawaited(_checkFile(_path));
  }

  Future<void> _checkFile(String path) async {
    final exists = await File(path).exists();
    if (mounted && path == _path && exists != _exists) setState(() => _exists = exists);
  }

  /// Loads the WAV on first use, not when the note opens.
  Future<bool> _ensureLoaded() async {
    if (_loaded) return true;
    final failed = Messages.of(context).audio.playFailed;
    try {
      await _player.setFilePath(_path);
      _loaded = true;
    } on Exception {
      _say(failed);
    }
    return _loaded;
  }

  /// Playing, and not at the end: a recording played to the end stays
  /// `playing` in just_audio until it is paused, but nothing sounds.
  static bool _isPlaying(PlayerState state) => state.playing && state.processingState != ProcessingState.completed;

  /// Dictation into this note is starting: the microphone would hear the
  /// recording, and iOS hands the audio to one of them.
  void _speechChanged() {
    // `playing`, not [_playing]: played to the end, a seek would start it again.
    if (_player.playing && _dictating) unawaited(_player.pause());
  }

  bool get _dictating => _speech?.isDictating(widget.note.id) ?? false;

  Future<void> _togglePlay() async {
    if (_isPlaying(_player.playerState)) return _player.pause();
    if (!await _ensureLoaded() || _dictating) return;
    if (_player.processingState == ProcessingState.completed) await _player.seek(Duration.zero);
    // Dictation may have started while the recording loaded.
    if (_dictating) return _player.pause();
    // play() completes when playback ends, not when it starts.
    unawaited(_player.play());
  }

  Future<void> _seek(double ms) async {
    if (!await _ensureLoaded()) return;
    // Played to the end it still counts as playing, and a seek would resume it.
    if (_dictating && _player.playing) await _player.pause();
    await _player.seek(Duration(milliseconds: ms.round()));
    if (mounted) setState(() => _dragMs = null);
  }

  Future<void> _transcribe() async {
    final scope = AppScope.of(context);
    // Dictation is still typing this recording's words.
    if (scope.speech.isDictating(widget.note.id)) return;
    if (!scope.models.status.isReady) {
      await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const SpeechModelsScreen()));
      return;
    }
    final note = scope.notes.byId(widget.note.id) ?? widget.note;
    if (note.text.trim().isNotEmpty && !await _confirmAppend()) return;
    scope.speech.transcribeNote(note.id);
  }

  Future<bool> _confirmAppend() async {
    final messages = Messages.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(messages.speech.confirmAppend),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: Text(messages.common.cancel)),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: Text(messages.audio.transcribe)),
        ],
      ),
    );
    return confirmed ?? false;
  }

  Future<void> _share() async {
    final failed = Messages.of(context).editor.shareFailed;
    final box = _shareKey.currentContext?.findRenderObject() as RenderBox?;
    final origin = box != null && box.hasSize ? box.localToGlobal(Offset.zero) & box.size : null;
    try {
      final file = await _shareableCopy(_path, widget.note.createdAt);
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file, mimeType: 'audio/wav')],
          sharePositionOrigin: origin,
        ),
      );
    } on Exception {
      _say(failed);
    }
  }

  /// The recording under a name people can recognise ("Nota 2026-11-02
  /// 14.30.wav" rather than the note's id): share_plus sends files under
  /// their own names. Copied to the cache, which the system may clear; the
  /// previous copy is removed first.
  static Future<String> _shareableCopy(String path, DateTime created) async {
    final folder = Directory(p.join((await getTemporaryDirectory()).path, 'shared-recordings'));
    if (await folder.exists()) await folder.delete(recursive: true);
    await folder.create(recursive: true);
    String two(int n) => n.toString().padLeft(2, '0');
    final day = '${created.year}-${two(created.month)}-${two(created.day)}';
    final name = 'Nota $day ${two(created.hour)}.${two(created.minute)}.wav';
    return (await File(path).copy(p.join(folder.path, name))).path;
  }

  void _say(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final audio = widget.note.audio;
    if (audio == null) return const SizedBox.shrink();
    final colors = NotaColors.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.list,
        border: Border(bottom: BorderSide(color: colors.line)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(4, 4, 8, 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_exists) _playback(audio) else _missing(context),
            _TranscriptionRow(
              note: widget.note,
              shareKey: _shareKey,
              canShare: _exists,
              onTranscribe: _exists ? () => unawaited(_transcribe()) : null,
              onShare: () => unawaited(_share()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _missing(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(12, 8, 8, 0),
    child: Text(
      Messages.of(context).audio.missing,
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NotaColors.of(context).warnInk),
    ),
  );

  Widget _playback(NoteAudio audio) => StreamBuilder<PlayerState>(
    stream: _player.playerStateStream,
    builder: (context, state) {
      final playing = state.data != null && _isPlaying(state.data!);
      final messages = Messages.of(context).audio;
      final speech = AppScope.of(context).speech;
      return Row(
        children: [
          ListenableBuilder(
            listenable: speech,
            builder: (context, _) => IconButton(
              icon: Icon(playing ? Icons.pause : Icons.play_arrow),
              tooltip: playing ? messages.pauseAudio : messages.play,
              // Not while dictating into this note: the microphone would hear it.
              onPressed: speech.isDictating(widget.note.id) ? null : () => unawaited(_togglePlay()),
            ),
          ),
          Expanded(child: _position(audio)),
        ],
      );
    },
  );

  Widget _position(NoteAudio audio) => StreamBuilder<Duration>(
    stream: _player.positionStream,
    builder: (context, position) {
      final messages = Messages.of(context).audio;
      final totalMs = math.max(1, (_player.duration ?? Duration(milliseconds: audio.durationMs)).inMilliseconds);
      final atMs = _dragMs ?? (position.data?.inMilliseconds ?? 0).clamp(0, totalMs).toDouble();
      final at = formatDuration(atMs.round());
      final total = formatDuration(totalMs);
      return Row(
        children: [
          Expanded(
            child: Slider(
              value: atMs,
              max: totalMs.toDouble(),
              label: messages.position,
              semanticFormatterCallback: (_) => messages.positionOf(at, total),
              onChanged: (ms) => setState(() => _dragMs = ms),
              onChangeEnd: (ms) => unawaited(_seek(ms)),
            ),
          ),
          ExcludeSemantics(child: Text('$at / $total', style: Theme.of(context).textTheme.bodySmall)),
        ],
      );
    },
  );
}

/// Where Hohe is with the recording, and what can be done with it.
class _TranscriptionRow extends StatelessWidget {
  const _TranscriptionRow({
    required this.note,
    required this.shareKey,
    required this.canShare,
    required this.onTranscribe,
    required this.onShare,
  });

  final Note note;
  final Key shareKey;
  final bool canShare;
  final VoidCallback? onTranscribe;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    final speech = AppScope.of(context).speech;
    return ListenableBuilder(
      listenable: speech,
      builder: (context, _) {
        final messages = Messages.of(context);
        final busy = speech.isTranscribing(note.id);
        final progress = speech.progress(note.id);
        return Padding(
          padding: const EdgeInsets.only(left: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (busy) ...[
                const SizedBox(height: 4),
                LinearProgressIndicator(value: progress == null || speech.isLoadingModel ? null : progress),
              ],
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Semantics(liveRegion: busy, child: _status(context, speech, messages, busy, progress)),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Not while dictation still types this recording's words either.
                      if (!busy && !speech.isDictating(note.id))
                        TextButton(onPressed: onTranscribe, child: Text(_actionLabel(messages))),
                      IconButton(
                        key: shareKey,
                        icon: const Icon(Icons.ios_share),
                        tooltip: messages.editor.shareRecording,
                        onPressed: canShare ? onShare : null,
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  String _actionLabel(Messages messages) => switch (note.audio?.transcription) {
    TranscriptionDone() => messages.audio.transcribeAgain,
    TranscriptionFailed() => messages.common.tryAgain,
    _ => messages.audio.transcribe,
  };

  Widget _status(BuildContext context, SpeechService speech, Messages messages, bool busy, double? progress) {
    final colors = NotaColors.of(context);
    final style = Theme.of(context).textTheme.bodySmall;
    if (busy) {
      final text = switch (progress) {
        null => messages.speech.queued,
        _ when speech.isLoadingModel => messages.speech.loading,
        final done => messages.speech.transcribingPercent((done * 100).floor()),
      };
      return Text(text, style: style?.copyWith(color: colors.accentInk));
    }
    return switch (note.audio?.transcription) {
      TranscriptionFailed(:final message) => Text(
        message.isEmpty ? messages.common.generic : messages.translate(message),
        style: style?.copyWith(color: colors.warnInk),
      ),
      TranscriptionDone() => Text(messages.audio.badgeDone, style: style),
      _ => Text(messages.audio.badgePending, style: style),
    };
  }
}
