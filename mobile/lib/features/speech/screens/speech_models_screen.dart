import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/app_scope.dart';
import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../models/model_store.dart';

/// Where Android's shared storage starts, as a computer sees the phone.
const _androidStorageRoot = '/storage/emulated/0/';

/// Monospace for paths and commands, so they read exactly as typed.
const _codeStyle = TextStyle(fontFamily: 'monospace', fontFamilyFallback: ['Menlo', 'Courier'], fontSize: 13);

/// Speech models: whether Hohe's files are on the phone, and the ways to add
/// them (pick them from the phone's files, download them when the build
/// offers it, or copy them over a cable), or delete them.
class SpeechModelsScreen extends StatefulWidget {
  const SpeechModelsScreen({super.key});

  @override
  State<SpeechModelsScreen> createState() => _SpeechModelsScreenState();
}

class _SpeechModelsScreenState extends State<SpeechModelsScreen> with WidgetsBindingObserver {
  late final ModelStore _models = AppScope.of(context).models;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Files may have arrived over a cable since the app started; an old
    // notice belongs to a visit that is over.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _models.clearNotice();
      if (_models.task == null) unawaited(_models.refresh());
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Back from Finder, Files or a file manager: look again.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _models.task == null) unawaited(_models.refresh());
  }

  @override
  Widget build(BuildContext context) {
    final speech = Messages.of(context).speech;
    return Scaffold(
      appBar: AppBar(title: Text(speech.title)),
      body: SafeArea(
        top: false,
        child: ListenableBuilder(
          listenable: _models,
          builder: (context, _) => ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              Text(speech.intro(formatBytes(_models.totalBytes)), style: Theme.of(context).textTheme.bodyLarge),
              const SizedBox(height: 24),
              _StatusSection(models: _models),
              const SizedBox(height: 24),
              _FilesSection(models: _models),
              const SizedBox(height: 24),
              _ImportSection(models: _models),
              if (_models.canDownload) ...[const SizedBox(height: 24), _DownloadSection(models: _models)],
              const SizedBox(height: 24),
              _CableSection(models: _models),
              const SizedBox(height: 24),
              _Note(icon: Icons.memory_outlined, text: speech.memory),
              if (_models.status.hasAny) ...[const SizedBox(height: 24), _DeleteButton(models: _models)],
              const SizedBox(height: 24),
              const Divider(),
              const SizedBox(height: 8),
              const _Credits(),
            ],
          ),
        ),
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Semantics(header: true, child: Text(text, style: Theme.of(context).textTheme.titleMedium)),
  );
}

/// An icon beside a line of secondary text.
class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.text, this.color});

  final IconData icon;
  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final colors = NotaColors.of(context);
    final tint = color ?? colors.muted;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2, right: 12),
          child: ExcludeSemantics(child: Icon(icon, size: 20, color: tint)),
        ),
        Expanded(
          child: Text(text, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: color ?? colors.muted)),
        ),
      ],
    );
  }
}

/// Ready or not, what is missing, and what the store is doing now.
class _StatusSection extends StatelessWidget {
  const _StatusSection({required this.models});

  final ModelStore models;

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context);
    final colors = NotaColors.of(context);
    final status = models.status;
    final ready = status.isReady;
    final notice = models.notice;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Heading(messages.speech.status),
        _Note(
          icon: ready ? Icons.check_circle_outline : Icons.info_outline,
          text: _statusText(messages.speech, status),
          color: ready ? colors.accentInk : colors.ink,
        ),
        if (models.task case final task?) ...[const SizedBox(height: 16), _TaskProgress(task: task)],
        if (notice != null) ...[
          const SizedBox(height: 16),
          Semantics(
            liveRegion: true,
            child: _Note(
              icon: notice.isProblem ? Icons.error_outline : Icons.done,
              text: _noticeText(messages.speech, notice, models.totalBytes),
              color: notice.isProblem ? colors.warnInk : colors.accentInk,
            ),
          ),
        ],
      ],
    );
  }

  static String _statusText(SpeechMessages speech, ModelStatus status) => switch (status.readiness) {
    ModelReadiness.ready => speech.ready,
    ModelReadiness.missing => speech.notSetUp,
    ModelReadiness.partial when status.wrongSize.isNotEmpty => speech.damaged,
    ModelReadiness.partial => speech.missingFiles(status.missing.length),
  };

  static String _noticeText(SpeechMessages speech, ModelNotice notice, int totalBytes) {
    final name = notice.file ?? '';
    return switch (notice.kind) {
      ModelNoticeKind.imported || ModelNoticeKind.downloaded => speech.imported(notice.count),
      ModelNoticeKind.notModelFile => speech.notModelFile(name),
      ModelNoticeKind.wrongFile => speech.wrongFile(name),
      ModelNoticeKind.copyFailed => speech.importFailed,
      ModelNoticeKind.noSpace => speech.noSpace(formatBytes(totalBytes)),
      ModelNoticeKind.downloadFailed => speech.downloadFailed,
      ModelNoticeKind.downloadNoMatch => speech.downloadNoMatch,
      ModelNoticeKind.downloadStopped => speech.downloadStopped,
      ModelNoticeKind.deleted => speech.deleted,
      ModelNoticeKind.deleteFailed => speech.deleteFailed,
    };
  }
}

class _TaskProgress extends StatelessWidget {
  const _TaskProgress({required this.task});

  final ModelTask task;

  @override
  Widget build(BuildContext context) {
    final speech = Messages.of(context).speech;
    final file = task.file ?? '';
    final label = switch (task.kind) {
      ModelTaskKind.picking => speech.opening,
      ModelTaskKind.copying => speech.copying(file),
      ModelTaskKind.checking => speech.checkingFile(file),
      ModelTaskKind.downloading => speech.downloading(formatBytes(task.done), formatBytes(task.total)),
      ModelTaskKind.deleting => speech.deleting,
    };
    final fraction = task.kind == ModelTaskKind.checking ? null : task.fraction;
    return Semantics(
      liveRegion: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 8),
          LinearProgressIndicator(value: fraction, semanticsLabel: label),
        ],
      ),
    );
  }
}

/// Each model file and whether it is in place.
class _FilesSection extends StatelessWidget {
  const _FilesSection({required this.models});

  final ModelStore models;

  @override
  Widget build(BuildContext context) {
    final speech = Messages.of(context).speech;
    final colors = NotaColors.of(context);
    final textTheme = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Heading(speech.files),
        const Divider(),
        for (final file in models.status.files) ...[
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(file.name, style: textTheme.bodyLarge),
            subtitle: Text(formatBytes(file.expectedBytes)),
            trailing: Text(
              switch (file.state) {
                ModelFileState.ready => speech.fileReady,
                ModelFileState.missing => speech.fileMissing,
                ModelFileState.wrongSize => speech.fileWrong,
              },
              style: textTheme.labelMedium?.copyWith(
                color: switch (file.state) {
                  ModelFileState.ready => colors.accentInk,
                  ModelFileState.missing => colors.muted,
                  ModelFileState.wrongSize => colors.warnInk,
                },
              ),
            ),
          ),
          const Divider(),
        ],
      ],
    );
  }
}

/// Picking the files on the phone: from Downloads, a memory card or a USB
/// drive on Android; on iOS, from the Files app's places (no memory card).
class _ImportSection extends StatelessWidget {
  const _ImportSection({required this.models});

  final ModelStore models;

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context);
    final busy = models.task != null;
    final hint = Theme.of(context).platform == TargetPlatform.iOS
        ? messages.speech.importHintIos
        : messages.speech.importHint;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Heading(messages.speech.importFiles),
        Text(hint(models.status.files.map((file) => file.name).join(', '))),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: busy ? null : () => unawaited(models.importFiles()),
          icon: const Icon(Icons.file_open_outlined),
          label: Text(messages.speech.importFiles),
        ),
      ],
    );
  }
}

/// Offered only when the build names a place to download from.
class _DownloadSection extends StatelessWidget {
  const _DownloadSection({required this.models});

  final ModelStore models;

  @override
  Widget build(BuildContext context) {
    final speech = Messages.of(context).speech;
    final downloading = models.task?.kind == ModelTaskKind.downloading;
    final size = formatBytes(models.totalBytes);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Heading(speech.downloadHeading),
        Text(speech.downloadHint(size)),
        const SizedBox(height: 12),
        if (downloading)
          OutlinedButton.icon(
            onPressed: models.stopDownload,
            icon: const Icon(Icons.stop_circle_outlined),
            label: Text(speech.stopDownload),
          )
        else
          OutlinedButton.icon(
            onPressed: models.task != null || models.status.isReady ? null : () => unawaited(models.download()),
            icon: const Icon(Icons.download_outlined),
            label: Text(speech.download(size)),
          ),
      ],
    );
  }
}

/// Copying the files from a computer: a USB cable or adb on Android, Finder
/// or the Apple Devices app on iOS.
class _CableSection extends StatelessWidget {
  const _CableSection({required this.models});

  final ModelStore models;

  @override
  Widget build(BuildContext context) {
    final speech = Messages.of(context).speech;
    final ios = Theme.of(context).platform == TargetPlatform.iOS;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Heading(speech.usbHeading),
        if (ios) Text(speech.usbIos) else ..._android(context, speech),
        const SizedBox(height: 12),
        Text(speech.usbThen),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: models.task != null ? null : () => unawaited(models.refresh()),
          icon: const Icon(Icons.refresh),
          label: Text(speech.checkAgain),
        ),
      ],
    );
  }

  List<Widget> _android(BuildContext context, SpeechMessages speech) {
    final directory = models.directory;
    final names = models.status.files.map((file) => file.name).join(' ');
    return [
      Text(speech.usbAndroid(_computerPath(directory))),
      const SizedBox(height: 12),
      _CopyableCode(label: speech.folder, text: directory, copyLabel: speech.copyFolder),
      const SizedBox(height: 16),
      Text(speech.adbIntro),
      const SizedBox(height: 8),
      _CopyableCode(text: 'adb push $names $directory/', copyLabel: speech.copyCommand),
    ];
  }

  /// The folder as a computer shows the phone: "Android › data › … › models".
  static String _computerPath(String path) {
    final relative = path.startsWith(_androidStorageRoot) ? path.substring(_androidStorageRoot.length) : path;
    return relative.split('/').where((part) => part.isNotEmpty).join(' › ');
  }
}

/// A path or command, selectable, with a button that copies it.
class _CopyableCode extends StatelessWidget {
  const _CopyableCode({required this.text, required this.copyLabel, this.label});

  final String text;
  final String copyLabel;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final colors = NotaColors.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.list,
        border: Border.all(color: colors.line),
        borderRadius: const BorderRadius.all(Radius.circular(8)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 0, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (label case final label?) Text(label, style: Theme.of(context).textTheme.labelSmall),
                  SelectableText(text, style: _codeStyle.copyWith(color: colors.ink)),
                ],
              ),
            ),
          ),
          IconButton(icon: const Icon(Icons.copy_outlined), tooltip: copyLabel, onPressed: () => _copy(context)),
        ],
      ),
    );
  }

  Future<void> _copy(BuildContext context) async {
    final copied = Messages.of(context).common.copied;
    final messenger = ScaffoldMessenger.of(context);
    await Clipboard.setData(ClipboardData(text: text));
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(copied)));
  }
}

class _DeleteButton extends StatelessWidget {
  const _DeleteButton({required this.models});

  final ModelStore models;

  @override
  Widget build(BuildContext context) {
    final speech = Messages.of(context).speech;
    final error = Theme.of(context).colorScheme.error;
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: OutlinedButton.icon(
        style: OutlinedButton.styleFrom(
          foregroundColor: error,
          side: BorderSide(color: error),
        ),
        onPressed: models.task != null ? null : () => unawaited(_confirmAndDelete(context)),
        icon: const Icon(Icons.delete_outline),
        label: Text(speech.delete),
      ),
    );
  }

  Future<void> _confirmAndDelete(BuildContext context) async {
    final messages = Messages.of(context);
    final error = Theme.of(context).colorScheme.error;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(messages.speech.confirmDelete(formatBytes(models.totalBytes))),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: Text(messages.common.cancel)),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: error),
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(messages.common.delete),
          ),
        ],
      ),
    );
    if (confirmed ?? false) await models.delete();
  }
}

class _Credits extends StatelessWidget {
  const _Credits();

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(messages.speech.credit, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 4),
        TextButton(
          style: TextButton.styleFrom(padding: EdgeInsets.zero),
          onPressed: () => showLicensePage(context: context, applicationName: messages.common.appName),
          child: Text(messages.speech.licences),
        ),
      ],
    );
  }
}
