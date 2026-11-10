import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app/licenses.dart';
import 'app/nota_app.dart';
import 'features/notes/data/notes_repo.dart';
import 'features/notes/state/notes_store.dart';
import 'features/settings/settings_store.dart';
import 'features/speech/models/model_store.dart';
import 'features/speech/state/speech_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Dates are written in English (en_GB) or Amharic (am), whichever the interface speaks.
  await initializeDateFormatting();
  registerLicenses();

  final settings = await SettingsStore.load();
  installErrorScreen(settings);
  final notes = await NotesStore.open(await NotesRepo.open(), settings: settings);
  final models = await ModelStore.open();
  final speech = SpeechService(models: models, notes: notes);

  runApp(NotaApp(settings: settings, notes: notes, models: models, speech: speech));
}
