import 'package:flutter/material.dart';

class AppTheme {
  static final ColorScheme lightScheme = ColorScheme.fromSeed(
    seedColor: const Color(0xFF3A5BFF),
    brightness: Brightness.light,
    surfaceTint: const Color(0xFF11204A),
  );

  static final ColorScheme darkScheme = ColorScheme.fromSeed(
    seedColor: const Color(0xFF9AB7FF),
    brightness: Brightness.dark,
    surfaceTint: const Color(0xFF0E1A36),
  );

  static ThemeData get light => _buildTheme(lightScheme);

  static ThemeData get dark => _buildTheme(darkScheme);

  static ThemeData _buildTheme(ColorScheme colors) {
    final typography = Typography.material2021();
    final textTheme =
        colors.brightness == Brightness.dark ? typography.white : typography.black;
    final baseTextTheme = textTheme.apply(
      bodyColor: colors.onSurface,
      displayColor: colors.onSurface,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colors,
      brightness: colors.brightness,
      typography: typography,
      textTheme: baseTextTheme,
      visualDensity: VisualDensity.adaptivePlatformDensity,
      scaffoldBackgroundColor: colors.surface,
      appBarTheme: AppBarTheme(
        backgroundColor: colors.surface,
        foregroundColor: colors.onSurface,
        elevation: 0,
        centerTitle: false,
        surfaceTintColor: colors.surfaceTint,
        titleTextStyle: baseTextTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w700,
          color: colors.onSurface,
        ),
      ),
      cardTheme: CardTheme(
        color: colors.surfaceContainer,
        elevation: 0,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: colors.outlineVariant),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        labelStyle: baseTextTheme.labelMedium?.copyWith(
          color: colors.onSurfaceVariant,
          fontWeight: FontWeight.w600,
        ),
        backgroundColor: colors.surfaceContainerHigh,
        side: BorderSide(color: colors.outlineVariant),
        selectedColor: colors.secondaryContainer,
        secondarySelectedColor: colors.secondaryContainer,
        disabledColor: colors.surfaceContainer,
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: colors.surfaceContainerLow,
        indicatorColor: colors.secondaryContainer,
        selectedIconTheme: IconThemeData(color: colors.onSecondaryContainer),
        unselectedIconTheme: IconThemeData(color: colors.onSurfaceVariant),
        selectedLabelTextStyle: baseTextTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w700,
          color: colors.onSecondaryContainer,
        ),
        unselectedLabelTextStyle: baseTextTheme.labelLarge?.copyWith(
          color: colors.onSurfaceVariant,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: colors.surfaceContainerHigh,
        indicatorColor: colors.secondaryContainer,
        surfaceTintColor: Colors.transparent,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        elevation: 0,
        height: 68,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surfaceContainerHighest,
        border: OutlineInputBorder(
          borderSide: BorderSide(color: colors.outlineVariant),
          borderRadius: const BorderRadius.all(Radius.circular(12)),
        ),
        enabledBorder: OutlineInputBorder(
          borderSide: BorderSide(color: colors.outlineVariant),
          borderRadius: const BorderRadius.all(Radius.circular(12)),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: BorderSide(color: colors.primary, width: 1.4),
          borderRadius: const BorderRadius.all(Radius.circular(12)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        hintStyle: baseTextTheme.bodyMedium?.copyWith(
          color: colors.onSurfaceVariant,
        ),
        labelStyle: baseTextTheme.bodyLarge?.copyWith(
          color: colors.onSurfaceVariant,
        ),
        prefixIconColor: colors.onSurfaceVariant,
        suffixIconColor: colors.onSurfaceVariant,
      ),
      dividerTheme: DividerThemeData(
        color: colors.outlineVariant,
        thickness: 1,
        space: 24,
      ),
      listTileTheme: ListTileThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        tileColor: colors.surfaceContainerHighest,
        selectedTileColor: colors.secondaryContainer,
        selectedColor: colors.onSecondaryContainer,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: colors.primary,
          foregroundColor: colors.onPrimary,
          textStyle: baseTextTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colors.secondaryContainer,
          foregroundColor: colors.onSecondaryContainer,
          elevation: 0,
          textStyle: baseTextTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colors.primary,
          side: BorderSide(color: colors.outline),
          textStyle: baseTextTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: colors.primary,
          textStyle: baseTextTheme.labelLarge,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: colors.onSurface,
          shape: const CircleBorder(),
          padding: const EdgeInsets.all(12),
          backgroundColor: colors.surfaceContainerHighest,
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: colors.secondaryContainer,
        foregroundColor: colors.onSecondaryContainer,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: colors.surfaceContainerHigh,
        contentTextStyle: baseTextTheme.bodyMedium?.copyWith(
          color: colors.onSurface,
        ),
        actionTextColor: colors.primary,
        elevation: 1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: <TargetPlatform, PageTransitionsBuilder>{
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.windows: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.linux: FadeForwardsPageTransitionsBuilder(),
        },
      ),
    );
  }
}

/// A page transition tuned for desktop form factors to avoid aggressive slide
/// motions when switching shell branches.
class FadeForwardsPageTransitionsBuilder extends PageTransitionsBuilder {
  const FadeForwardsPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return FadeTransition(
      opacity: CurvedAnimation(
        parent: animation,
        curve: Curves.easeInOut,
      ),
      child: child,
    );
  }
}
