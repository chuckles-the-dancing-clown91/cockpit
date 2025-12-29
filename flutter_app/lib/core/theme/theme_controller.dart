import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final themeModeProvider =
    StateNotifierProvider<ThemeModeController, ThemeMode>((ref) {
  return ThemeModeController();
});

class ThemeModeController extends StateNotifier<ThemeMode> {
  ThemeModeController() : super(ThemeMode.system);

  void setThemeMode(ThemeMode mode) => state = mode;

  void toggleLightDark() {
    state = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
  }

  IconData iconFor(Brightness platformBrightness) {
    return isDark(platformBrightness) ? Icons.dark_mode_rounded : Icons.light_mode_rounded;
  }

  bool isDark(Brightness platformBrightness) {
    return state == ThemeMode.dark ||
        (state == ThemeMode.system && platformBrightness == Brightness.dark);
  }
}
