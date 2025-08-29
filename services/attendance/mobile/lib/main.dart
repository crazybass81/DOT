import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/theme/neo_brutal_theme.dart';
import 'presentation/pages/dashboard/dashboard_page.dart';
import 'core/di/injection_container.dart';
import 'core/services/app_initialization_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 시스템 UI 설정
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: NeoBrutalTheme.bg,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  // 가로 모드 비활성화
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(
    const ProviderScope(
      child: DotAttendanceApp(),
    ),
  );
}

class DotAttendanceApp extends ConsumerWidget {
  const DotAttendanceApp({super.key});

  static TextTheme _buildTextTheme(BuildContext context) {
    try {
      // Try to use Google Fonts
      return GoogleFonts.doHyeonTextTheme(
        Theme.of(context).textTheme,
      ).apply(
        bodyColor: NeoBrutalTheme.fg,
        displayColor: NeoBrutalTheme.fg,
      );
    } catch (e) {
      // Fallback to default text theme if Google Fonts fails
      debugPrint('Google Fonts failed to load, using system fonts: $e');
      return Theme.of(context).textTheme.apply(
        bodyColor: NeoBrutalTheme.fg,
        displayColor: NeoBrutalTheme.fg,
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: 'DOT ATTENDANCE',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: NeoBrutalTheme.hi,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: NeoBrutalTheme.bg,
        textTheme: _buildTextTheme(context),
        appBarTheme: const AppBarTheme(
          backgroundColor: NeoBrutalTheme.bg,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(
            color: NeoBrutalTheme.fg,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
          iconTheme: IconThemeData(
            color: NeoBrutalTheme.fg,
          ),
        ),
      ),
      home: const AppInitializationWrapper(),
    );
  }
}

/// Wrapper widget that ensures proper app initialization before showing main UI
class AppInitializationWrapper extends ConsumerWidget {
  const AppInitializationWrapper({super.key});
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appInitialization = ref.watch(appInitializationProvider);
    
    return appInitialization.when(
      data: (_) => const DashboardPage(),
      loading: () => const AppLoadingScreen(),
      error: (error, stackTrace) => AppErrorScreen(
        error: error,
        onRetry: () => ref.invalidate(appInitializationProvider),
      ),
    );
  }
}

/// Loading screen shown during app initialization
class AppLoadingScreen extends StatelessWidget {
  const AppLoadingScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // App logo
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: NeoBrutalTheme.hi,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: NeoBrutalTheme.hiInk,
                  width: 3,
                ),
                boxShadow: [
                  BoxShadow(
                    offset: const Offset(4, 4),
                    color: NeoBrutalTheme.hiInk,
                  ),
                ],
              ),
              child: Icon(
                Icons.access_time_rounded,
                size: 60,
                color: NeoBrutalTheme.hiInk,
              ),
            ),
            const SizedBox(height: 32),
            Text(
              'DOT 출근부',
              style: NeoBrutalTheme.title,
            ),
            const SizedBox(height: 16),
            CircularProgressIndicator(
              color: NeoBrutalTheme.hi,
              strokeWidth: 3.0,
            ),
            const SizedBox(height: 16),
            Text(
              '앱을 준비하고 있습니다...',
              style: NeoBrutalTheme.body.copyWith(
                color: NeoBrutalTheme.fg.withOpacity(0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Error screen shown if app initialization fails
class AppErrorScreen extends StatelessWidget {
  final Object error;
  final VoidCallback onRetry;
  
  const AppErrorScreen({
    super.key,
    required this.error,
    required this.onRetry,
  });
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline_rounded,
                size: 80,
                color: Colors.red.shade400,
              ),
              const SizedBox(height: 24),
              Text(
                '앱 초기화 실패',
                style: NeoBrutalTheme.heading,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                '앱을 시작하는 중 문제가 발생했습니다.',
                style: NeoBrutalTheme.body,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                error.toString(),
                style: NeoBrutalTheme.caption.copyWith(
                  color: Colors.red.shade600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: onRetry,
                style: ElevatedButton.styleFrom(
                  backgroundColor: NeoBrutalTheme.hi,
                  foregroundColor: NeoBrutalTheme.hiInk,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
                child: const Text('다시 시도'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}