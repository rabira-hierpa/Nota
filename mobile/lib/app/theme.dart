import 'package:flutter/material.dart';

/// The desktop app's colour tokens (`src/styles/globals.css`), light and dark.
/// Widgets read these by meaning, never raw hex: `NotaColors.of(context).muted`.
@immutable
class NotaColors extends ThemeExtension<NotaColors> {
  const NotaColors({
    required this.paper,
    required this.sidebar,
    required this.list,
    required this.surface,
    required this.ink,
    required this.muted,
    required this.faint,
    required this.line,
    required this.hover,
    required this.selected,
    required this.accent,
    required this.accentInk,
    required this.onAccent,
    required this.accentSoft,
    required this.mark,
    required this.record,
    required this.danger,
    required this.warn,
    required this.warnSoft,
    required this.warnInk,
  });

  static const light = NotaColors(
    paper: Color(0xFFFBFCF9),
    sidebar: Color(0xFFEEF2EC),
    list: Color(0xFFF5F7F3),
    surface: Color(0xFFFFFFFF),
    ink: Color(0xFF1D2A21),
    muted: Color(0xFF5D6B61),
    faint: Color(0xFFA3ADA5),
    line: Color(0xFFDDE4DB),
    hover: Color(0x0D1D2A21),
    selected: Color(0xFFE0E9DE),
    accent: Color(0xFF15803D),
    accentInk: Color(0xFF166534),
    onAccent: Color(0xFFFFFFFF),
    accentSoft: Color(0xFFE2F0E4),
    mark: Color(0xFFF8E7A6),
    record: Color(0xFFDC2626),
    danger: Color(0xFFB91C1C),
    warn: Color(0xFFA16207),
    warnSoft: Color(0xFFFDF3D3),
    warnInk: Color(0xFF713F12),
  );

  static const dark = NotaColors(
    paper: Color(0xFF151B17),
    sidebar: Color(0xFF1A221C),
    list: Color(0xFF171F19),
    surface: Color(0xFF212B24),
    ink: Color(0xFFE5ECE6),
    muted: Color(0xFF9AA89D),
    faint: Color(0xFF56635A),
    line: Color(0xFF2B3630),
    hover: Color(0x0FE5ECE6),
    selected: Color(0xFF25312A),
    accent: Color(0xFF4FBF7A),
    accentInk: Color(0xFF79D39C),
    onAccent: Color(0xFF0C1A10),
    accentSoft: Color(0x294FBF7A),
    mark: Color(0xFF5B4B12),
    // The desktop's #F05252 is 4.2:1 on a dark sheet; this is 5.0:1.
    record: Color(0xFFF36B6B),
    danger: Color(0xFFF87171),
    warn: Color(0xFFEAB308),
    warnSoft: Color(0x24EAB308),
    warnInk: Color(0xFFFDE68A),
  );

  /// The page behind a note and the editor.
  final Color paper;

  /// The drawer of sections and tags.
  final Color sidebar;

  /// The note list.
  final Color list;

  /// Cards, sheets and dialogs that sit on the page.
  final Color surface;
  final Color ink;

  /// Secondary text: 4.9:1 on the sidebar, 5.6:1 on paper.
  final Color muted;

  /// Decoration only (rules, idle icons); never body text.
  final Color faint;

  /// Hairline dividers and borders.
  final Color line;
  final Color hover;
  final Color selected;

  /// Highland green: the fields, and the green of the flag.
  final Color accent;

  /// Accent as text: 6.9:1 on the sidebar and on tag pills.
  final Color accentInk;

  /// Text on a solid accent.
  final Color onAccent;
  final Color accentSoft;

  /// Harvest gold, like Meskel's daisies: highlights and search matches.
  final Color mark;

  /// The record button only (and what is said while recording).
  final Color record;

  /// Destructive actions written as text ("Delete for good"): 4.5:1 or more
  /// on the page, sheets and the warning strip, in both themes.
  final Color danger;
  final Color warn;
  final Color warnSoft;
  final Color warnInk;

  static NotaColors of(BuildContext context) => Theme.of(context).extension<NotaColors>() ?? light;

  @override
  NotaColors copyWith({
    Color? paper,
    Color? sidebar,
    Color? list,
    Color? surface,
    Color? ink,
    Color? muted,
    Color? faint,
    Color? line,
    Color? hover,
    Color? selected,
    Color? accent,
    Color? accentInk,
    Color? onAccent,
    Color? accentSoft,
    Color? mark,
    Color? record,
    Color? danger,
    Color? warn,
    Color? warnSoft,
    Color? warnInk,
  }) => NotaColors(
    paper: paper ?? this.paper,
    sidebar: sidebar ?? this.sidebar,
    list: list ?? this.list,
    surface: surface ?? this.surface,
    ink: ink ?? this.ink,
    muted: muted ?? this.muted,
    faint: faint ?? this.faint,
    line: line ?? this.line,
    hover: hover ?? this.hover,
    selected: selected ?? this.selected,
    accent: accent ?? this.accent,
    accentInk: accentInk ?? this.accentInk,
    onAccent: onAccent ?? this.onAccent,
    accentSoft: accentSoft ?? this.accentSoft,
    mark: mark ?? this.mark,
    record: record ?? this.record,
    danger: danger ?? this.danger,
    warn: warn ?? this.warn,
    warnSoft: warnSoft ?? this.warnSoft,
    warnInk: warnInk ?? this.warnInk,
  );

  @override
  NotaColors lerp(NotaColors? other, double t) {
    if (other == null) return this;
    Color mix(Color a, Color b) => Color.lerp(a, b, t)!;
    return NotaColors(
      paper: mix(paper, other.paper),
      sidebar: mix(sidebar, other.sidebar),
      list: mix(list, other.list),
      surface: mix(surface, other.surface),
      ink: mix(ink, other.ink),
      muted: mix(muted, other.muted),
      faint: mix(faint, other.faint),
      line: mix(line, other.line),
      hover: mix(hover, other.hover),
      selected: mix(selected, other.selected),
      accent: mix(accent, other.accent),
      accentInk: mix(accentInk, other.accentInk),
      onAccent: mix(onAccent, other.onAccent),
      accentSoft: mix(accentSoft, other.accentSoft),
      mark: mix(mark, other.mark),
      record: mix(record, other.record),
      danger: mix(danger, other.danger),
      warn: mix(warn, other.warn),
      warnSoft: mix(warnSoft, other.warnSoft),
      warnInk: mix(warnInk, other.warnInk),
    );
  }
}

/// The two font families pubspec.yaml declares.
abstract final class NotaFonts {
  /// The interface font; Ge'ez falls back to Noto Sans Ethiopic.
  static const ui = 'PlusJakartaSans';

  /// Note text: Ethiopic first so Ge'ez and its punctuation share one face.
  static const ethiopic = 'NotoSansEthiopic';
}

/// Text styles for a note's own text, larger and looser than the interface:
/// Ge'ez syllables are dense and read better with room between lines.
/// Colour comes from the theme where they are used.
abstract final class NotaText {
  static const noteBody = TextStyle(
    fontFamily: NotaFonts.ethiopic,
    fontFamilyFallback: [NotaFonts.ui],
    fontSize: 18,
    height: 1.7,
  );

  /// A line that starts with '# '.
  static const noteHeading = TextStyle(
    fontFamily: NotaFonts.ethiopic,
    fontFamilyFallback: [NotaFonts.ui],
    fontSize: 24,
    height: 1.35,
    fontWeight: FontWeight.w700,
  );
}

/// Material 3 themes built from [NotaColors]: "Minimalism & Swiss", warm ink
/// on paper, flat surfaces with hairline borders instead of shadows.
abstract final class NotaTheme {
  static final ThemeData light = _build(NotaColors.light, NotaColors.dark, Brightness.light);
  static final ThemeData dark = _build(NotaColors.dark, NotaColors.light, Brightness.dark);

  /// Smallest touch target, per the platform guidelines.
  static const minTouch = Size(48, 48);
  static const _radius = BorderRadius.all(Radius.circular(8));
  static const _sheetRadius = BorderRadius.vertical(top: Radius.circular(16));

  static ThemeData _build(NotaColors c, NotaColors inverse, Brightness brightness) {
    final scheme = _scheme(c, inverse, brightness);
    final text = _textTheme(c);
    final hairline = BorderSide(color: c.line);
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      extensions: [c],
      fontFamily: NotaFonts.ui,
      fontFamilyFallback: const [NotaFonts.ethiopic],
      textTheme: text,
      scaffoldBackgroundColor: c.paper,
      canvasColor: c.paper,
      dividerColor: c.line,
      hoverColor: c.hover,
      highlightColor: c.hover,
      splashFactory: InkRipple.splashFactory,
      materialTapTargetSize: MaterialTapTargetSize.padded,
      visualDensity: VisualDensity.standard,
      iconTheme: IconThemeData(color: c.ink, size: 24),
      appBarTheme: AppBarThemeData(
        backgroundColor: c.paper,
        foregroundColor: c.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleSpacing: 4,
        titleTextStyle: text.titleLarge,
        iconTheme: IconThemeData(color: c.ink),
        actionsIconTheme: IconThemeData(color: c.ink),
      ),
      dividerTheme: DividerThemeData(color: c.line, thickness: 1, space: 1),
      drawerTheme: DrawerThemeData(
        backgroundColor: c.sidebar,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: const RoundedRectangleBorder(),
        endShape: const RoundedRectangleBorder(),
      ),
      navigationDrawerTheme: NavigationDrawerThemeData(
        backgroundColor: c.sidebar,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        indicatorColor: c.selected,
        indicatorShape: const RoundedRectangleBorder(borderRadius: _radius),
        tileHeight: 48,
        labelTextStyle: WidgetStatePropertyAll(text.bodyLarge),
        iconTheme: WidgetStatePropertyAll(IconThemeData(color: c.muted)),
      ),
      listTileTheme: ListTileThemeData(
        iconColor: c.muted,
        textColor: c.ink,
        selectedColor: c.ink,
        selectedTileColor: c.selected,
        minTileHeight: 48,
        minVerticalPadding: 10,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16),
        titleTextStyle: text.bodyLarge,
        subtitleTextStyle: text.bodyMedium?.copyWith(color: c.muted),
        leadingAndTrailingTextStyle: text.bodySmall?.copyWith(color: c.muted),
      ),
      cardTheme: CardThemeData(
        color: c.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: _radius, side: hairline),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: const BorderRadius.all(Radius.circular(16)), side: hairline),
        titleTextStyle: text.titleLarge,
        contentTextStyle: text.bodyLarge?.copyWith(color: c.ink),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.surface,
        modalBackgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        modalElevation: 0,
        showDragHandle: true,
        dragHandleColor: c.faint,
        shape: const RoundedRectangleBorder(borderRadius: _sheetRadius),
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: c.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 1,
        shadowColor: Colors.black26,
        shape: RoundedRectangleBorder(borderRadius: _radius, side: hairline),
        textStyle: text.bodyLarge,
        labelTextStyle: WidgetStatePropertyAll(text.bodyLarge),
      ),
      menuTheme: MenuThemeData(
        style: MenuStyle(
          backgroundColor: WidgetStatePropertyAll(c.surface),
          surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
          elevation: const WidgetStatePropertyAll(1),
          shape: WidgetStatePropertyAll(RoundedRectangleBorder(borderRadius: _radius, side: hairline)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: c.ink,
        contentTextStyle: text.bodyMedium?.copyWith(color: c.paper),
        actionTextColor: inverse.accentInk,
        elevation: 0,
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: _radius),
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(color: c.ink, borderRadius: const BorderRadius.all(Radius.circular(6))),
        textStyle: text.bodySmall?.copyWith(color: c.paper),
        waitDuration: const Duration(milliseconds: 400),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: c.accent,
        foregroundColor: c.onAccent,
        elevation: 0,
        focusElevation: 0,
        hoverElevation: 0,
        highlightElevation: 0,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: c.accent,
          foregroundColor: c.onAccent,
          minimumSize: minTouch,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          shape: const RoundedRectangleBorder(borderRadius: _radius),
          textStyle: text.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: c.ink,
          minimumSize: minTouch,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          side: BorderSide(color: c.faint),
          shape: const RoundedRectangleBorder(borderRadius: _radius),
          textStyle: text.labelLarge,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: c.accentInk,
          minimumSize: minTouch,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          shape: const RoundedRectangleBorder(borderRadius: _radius),
          textStyle: text.labelLarge,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(foregroundColor: c.ink, minimumSize: minTouch),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(
          backgroundColor: c.surface,
          foregroundColor: c.ink,
          selectedBackgroundColor: c.accentSoft,
          selectedForegroundColor: c.accentInk,
          side: BorderSide(color: c.line),
          minimumSize: minTouch,
          textStyle: text.labelLarge,
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: c.accentSoft,
        labelStyle: text.labelMedium?.copyWith(color: c.accentInk),
        side: BorderSide.none,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(6))),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
      inputDecorationTheme: InputDecorationThemeData(
        filled: true,
        fillColor: c.surface,
        hintStyle: text.bodyLarge?.copyWith(color: c.muted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(borderRadius: _radius, borderSide: hairline),
        enabledBorder: OutlineInputBorder(borderRadius: _radius, borderSide: hairline),
        focusedBorder: OutlineInputBorder(
          borderRadius: _radius,
          borderSide: BorderSide(color: c.accent, width: 1.5),
        ),
      ),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: c.accent,
        selectionColor: brightness == Brightness.light ? c.accentSoft : c.accent.withValues(alpha: 0.35),
        selectionHandleColor: c.accent,
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: c.accent,
        linearTrackColor: c.line,
        circularTrackColor: Colors.transparent,
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: c.accent,
        inactiveTrackColor: c.line,
        thumbColor: c.accent,
        overlayColor: c.accent.withValues(alpha: 0.12),
        trackHeight: 3,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? c.onAccent : c.muted,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? c.accent : c.line,
        ),
        trackOutlineColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? c.accent : c.faint,
        ),
      ),
      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? c.accent : c.muted,
        ),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? c.accent : Colors.transparent,
        ),
        checkColor: WidgetStatePropertyAll(c.onAccent),
        side: BorderSide(color: c.muted, width: 1.5),
      ),
    );
  }

  static ColorScheme _scheme(NotaColors c, NotaColors inverse, Brightness brightness) => ColorScheme(
    brightness: brightness,
    primary: c.accent,
    onPrimary: c.onAccent,
    primaryContainer: c.accentSoft,
    onPrimaryContainer: c.accentInk,
    secondary: c.accentInk,
    onSecondary: c.onAccent,
    secondaryContainer: c.selected,
    onSecondaryContainer: c.ink,
    tertiary: c.warn,
    onTertiary: c.paper,
    tertiaryContainer: c.warnSoft,
    onTertiaryContainer: c.warnInk,
    error: c.danger,
    onError: brightness == Brightness.light ? Colors.white : c.paper,
    errorContainer: c.warnSoft,
    onErrorContainer: c.warnInk,
    surface: c.paper,
    onSurface: c.ink,
    onSurfaceVariant: c.muted,
    surfaceDim: c.list,
    surfaceBright: c.surface,
    surfaceContainerLowest: c.surface,
    surfaceContainerLow: c.list,
    surfaceContainer: c.sidebar,
    surfaceContainerHigh: c.selected,
    surfaceContainerHighest: c.line,
    outline: c.muted,
    outlineVariant: c.line,
    shadow: Colors.black,
    scrim: Colors.black,
    inverseSurface: c.ink,
    onInverseSurface: c.paper,
    inversePrimary: inverse.accent,
    surfaceTint: Colors.transparent,
  );

  /// Sizes a step above Material's defaults, for reading Ge'ez on a phone.
  static TextTheme _textTheme(NotaColors c) {
    TextStyle style(double size, FontWeight weight, double height, {Color? color, double spacing = 0}) =>
        TextStyle(fontSize: size, fontWeight: weight, height: height, letterSpacing: spacing, color: color ?? c.ink);
    return TextTheme(
      displaySmall: style(34, FontWeight.w700, 1.2, spacing: -0.4),
      headlineMedium: style(28, FontWeight.w700, 1.25, spacing: -0.3),
      headlineSmall: style(24, FontWeight.w700, 1.3, spacing: -0.2),
      titleLarge: style(20, FontWeight.w700, 1.3, spacing: -0.1),
      titleMedium: style(17, FontWeight.w600, 1.4),
      titleSmall: style(15, FontWeight.w600, 1.4),
      bodyLarge: style(17, FontWeight.w400, 1.55),
      bodyMedium: style(15, FontWeight.w400, 1.5),
      bodySmall: style(13, FontWeight.w400, 1.45, color: c.muted),
      labelLarge: style(15, FontWeight.w600, 1.3),
      labelMedium: style(13, FontWeight.w500, 1.3),
      labelSmall: style(12, FontWeight.w500, 1.3, color: c.muted, spacing: 0.2),
    );
  }
}
