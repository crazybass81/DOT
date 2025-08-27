import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/di/injection_container.dart';
import '../../core/storage/local_storage_service.dart';

class ThemeNotifier extends StateNotifier<ThemeMode> {
  final LocalStorageService _localStorage;

  ThemeNotifier(this._localStorage) : super(ThemeMode.system) {
    _loadThemeMode();
  }

  void _loadThemeMode() {
    final themeModeString = _localStorage.getThemeMode();
    if (themeModeString != null) {
      state = _parseThemeMode(themeModeString);
    }
  }

  Future<void> setThemeMode(ThemeMode themeMode) async {
    state = themeMode;
    await _localStorage.setThemeMode(_themeModeToString(themeMode));
  }

  ThemeMode _parseThemeMode(String themeModeString) {
    switch (themeModeString) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
      default:
        return ThemeMode.system;
    }
  }

  String _themeModeToString(ThemeMode themeMode) {
    switch (themeMode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
      default:
        return 'system';
    }
  }
}

// Providers
final themeModeProvider = StateNotifierProvider<ThemeNotifier, ThemeMode>((ref) {
  return ThemeNotifier(getIt<LocalStorageService>());
});

final isDarkModeProvider = Provider<bool>((ref) {
  final themeMode = ref.watch(themeModeProvider);
  final brightness = WidgetsBinding.instance.platformDispatcher.platformBrightness;
  
  switch (themeMode) {
    case ThemeMode.light:
      return false;
    case ThemeMode.dark:
      return true;
    case ThemeMode.system:
      return brightness == Brightness.dark;
  }
});