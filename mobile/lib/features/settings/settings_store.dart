import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../notes/logic/format.dart';
import '../notes/logic/sections.dart';

/// What the person chose in Settings, and whether they've seen the intro.
/// Kept in shared preferences, so it survives restarts; each setter changes
/// the value at once and then writes it.
class SettingsStore extends ChangeNotifier {
  SettingsStore._(this._prefs)
    : _locale = _readLocale(_prefs.getString(_Keys.locale)),
      _calendar = _readEnum(CalendarChoice.values, _prefs.getString(_Keys.calendar), CalendarChoice.gregorian),
      _themeMode = _readEnum(ThemeMode.values, _prefs.getString(_Keys.themeMode), ThemeMode.system),
      _sortOrder = _readEnum(SortOrder.values, _prefs.getString(_Keys.sortOrder), SortOrder.edited),
      _onboarded = _prefs.getBool(_Keys.onboarded) ?? false;

  /// Reads the saved settings; a value that is missing or unknown falls back to its default.
  static Future<SettingsStore> load() async => SettingsStore._(await SharedPreferences.getInstance());

  /// The interface languages, by language code; the first is the default.
  static const locales = ['en', 'am'];

  final SharedPreferences _prefs;
  String _locale;
  CalendarChoice _calendar;
  ThemeMode _themeMode;
  SortOrder _sortOrder;
  bool _onboarded;

  /// 'en' or 'am'.
  String get locale => _locale;
  CalendarChoice get calendar => _calendar;
  ThemeMode get themeMode => _themeMode;
  SortOrder get sortOrder => _sortOrder;

  /// Whether the first-launch intro has been dismissed.
  bool get onboarded => _onboarded;

  /// Ignores a code the app doesn't speak.
  Future<void> setLocale(String locale) async {
    if (!locales.contains(locale) || locale == _locale) return;
    _locale = locale;
    notifyListeners();
    await _prefs.setString(_Keys.locale, locale);
  }

  Future<void> setCalendar(CalendarChoice calendar) async {
    if (calendar == _calendar) return;
    _calendar = calendar;
    notifyListeners();
    await _prefs.setString(_Keys.calendar, calendar.name);
  }

  Future<void> setThemeMode(ThemeMode themeMode) async {
    if (themeMode == _themeMode) return;
    _themeMode = themeMode;
    notifyListeners();
    await _prefs.setString(_Keys.themeMode, themeMode.name);
  }

  Future<void> setSortOrder(SortOrder sortOrder) async {
    if (sortOrder == _sortOrder) return;
    _sortOrder = sortOrder;
    notifyListeners();
    await _prefs.setString(_Keys.sortOrder, sortOrder.name);
  }

  /// True once the intro is dismissed; false shows it again.
  Future<void> setOnboarded(bool onboarded) async {
    if (onboarded == _onboarded) return;
    _onboarded = onboarded;
    notifyListeners();
    await _prefs.setBool(_Keys.onboarded, onboarded);
  }

  static String _readLocale(String? saved) => locales.contains(saved) ? saved! : locales.first;

  /// Enums are saved by name, so reordering their values never changes a saved choice.
  static T _readEnum<T extends Enum>(List<T> values, String? saved, T fallback) =>
      saved == null ? fallback : values.asNameMap()[saved] ?? fallback;
}

/// Preference keys. Never rename one: it would forget what people chose.
abstract final class _Keys {
  static const locale = 'settings.locale';
  static const calendar = 'settings.calendar';
  static const themeMode = 'settings.themeMode';
  static const sortOrder = 'settings.sortOrder';
  static const onboarded = 'settings.onboarded';
}
