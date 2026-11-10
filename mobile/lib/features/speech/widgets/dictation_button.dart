import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_scope.dart';
import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../audio/recorder.dart';
import '../screens/speech_models_screen.dart';
import '../state/dictation_controller.dart';

/// Dictate: press, speak, and the words appear at [controller]'s cursor
/// after each pause; press again to stop. Without the speech model it opens
/// the Speech models screen instead. Leaving the note stops dictation, and
/// what is still being transcribed goes to the end of the note.
class DictationButton extends StatefulWidget {
  const DictationButton({super.key, required this.controller, required this.noteId, this.onTyped});

  final TextEditingController controller;
  final String noteId;

  /// Called after each dictated piece is typed, so the editor can bring the
  /// cursor into view (a change made in code doesn't scroll by itself).
  final VoidCallback? onTyped;

  @override
  State<DictationButton> createState() => _DictationButtonState();
}

class _DictationButtonState extends State<DictationButton> with WidgetsBindingObserver {
  DictationController? _dictation;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didUpdateWidget(DictationButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.noteId != widget.noteId || oldWidget.controller != widget.controller) _letGo();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _letGo();
    super.dispose();
  }

  /// The microphone can't be held in the background.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.hidden || state == AppLifecycleState.paused) unawaited(_dictation?.stop());
  }

  /// Hands a running dictation over to the note and forgets it.
  void _letGo() {
    final dictation = _dictation;
    _dictation = null;
    if (dictation == null) return;
    dictation
      ..removeListener(_changed)
      ..dispose();
  }

  Future<void> _toggle() async {
    final dictation = _dictation;
    if (dictation != null && dictation.isActive) return dictation.stop();
    final scope = AppScope.of(context);
    if (!scope.models.status.isReady) {
      await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const SpeechModelsScreen()));
      return;
    }
    final next = _dictation ??= DictationController(
      noteId: widget.noteId,
      speech: scope.speech,
      notes: scope.notes,
      insert: _insert,
    )..addListener(_changed);
    await next.start();
  }

  void _insert(String text) {
    widget.controller.value = insertDictated(widget.controller.value, text);
    widget.onTyped?.call();
  }

  void _changed() {
    final error = _dictation?.error;
    if (error != null && mounted) {
      _dictation?.clearError();
      final messages = Messages.of(context);
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(_errorText(messages, error))));
    }
    if (mounted) setState(() {});
  }

  static String _errorText(Messages messages, String error) => switch (error) {
    RecorderError.permissionDenied => messages.audio.micBlocked,
    RecorderError.startFailed => messages.audio.micFailed,
    RecorderError.silent => messages.audio.micSilent,
    RecorderError.interrupted => messages.audio.micInterrupted,
    _ => messages.translate(error),
  };

  @override
  Widget build(BuildContext context) {
    final editor = Messages.of(context).editor;
    final colors = NotaColors.of(context);
    final phase = _dictation?.phase ?? DictationPhase.idle;
    return switch (phase) {
      DictationPhase.idle => IconButton(
        icon: const Icon(Icons.mic_none),
        tooltip: editor.dictateHint,
        onPressed: () => unawaited(_toggle()),
      ),
      DictationPhase.listening => IconButton(
        icon: const Icon(Icons.stop_rounded),
        tooltip: editor.stopDictating,
        style: IconButton.styleFrom(backgroundColor: colors.record, foregroundColor: colors.onAccent),
        onPressed: () => unawaited(_toggle()),
      ),
      DictationPhase.starting || DictationPhase.finishing => IconButton(
        tooltip: phase == DictationPhase.starting ? editor.dictateStarting : editor.dictateFinishing,
        onPressed: phase == DictationPhase.starting ? () => unawaited(_toggle()) : null,
        icon: const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)),
      ),
    };
  }
}
