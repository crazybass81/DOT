import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:app_links/app_links.dart';
import 'dart:async';
import 'core/theme/neo_brutal_theme.dart';
import 'presentation/router/app_router.dart';
import 'presentation/providers/auth_provider.dart';
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

  // 앱 초기화
  await AppInitializationService.initializeApp();

  runApp(
    const ProviderScope(
      child: DotAttendanceApp(),
    ),
  );
}

class DotAttendanceApp extends ConsumerStatefulWidget {
  const DotAttendanceApp({super.key});

  @override
  ConsumerState<DotAttendanceApp> createState() => _DotAttendanceAppState();
}

class _DotAttendanceAppState extends ConsumerState<DotAttendanceApp> {
  late AppLinks _appLinks;
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    super.dispose();
  }

  Future<void> _initDeepLinks() async {
    _appLinks = AppLinks();

    // Handle initial link if app was launched from a deep link
    try {
      final initialLink = await _appLinks.getInitialLink();
      if (initialLink != null) {
        _handleDeepLink(initialLink);
      }
    } on PlatformException {
      // Handle exception
      debugPrint('Failed to get initial link');
    }

    // Handle links when app is already running
    _linkSubscription = _appLinks.uriLinkStream.listen((Uri? uri) {
      if (uri != null) {
        _handleDeepLink(uri);
      }
    });
  }

  void _handleDeepLink(Uri uri) {
    debugPrint('Received deep link: $uri');
    
    // Check if it's a QR login link
    if (uri.scheme == 'dot-attendance' || 
        (uri.host == 'attendance.dot.com' && uri.path == '/qr-login')) {
      
      final token = uri.queryParameters['token'];
      final action = uri.queryParameters['action'] ?? 'login';
      
      if (token != null) {
        // Process QR token for auto-login
        WidgetsBinding.instance.addPostFrameCallback((_) {
          ref.read(authProvider.notifier).loginWithQrToken(token, action);
        });
      }
    }
  }

  static TextTheme _buildTextTheme(BuildContext context) {
    // Create a base text theme and then apply fonts
    final baseTheme = Theme.of(context).textTheme;
    return TextTheme(
      displayLarge: baseTheme.displayLarge?.copyWith(fontFamily: 'DoHyeon', color: NeoBrutalTheme.fg),
      displayMedium: baseTheme.displayMedium?.copyWith(fontFamily: 'DoHyeon', color: NeoBrutalTheme.fg),
      displaySmall: baseTheme.displaySmall?.copyWith(fontFamily: 'DoHyeon', color: NeoBrutalTheme.fg),
      headlineLarge: baseTheme.headlineLarge?.copyWith(fontFamily: 'DoHyeon', color: NeoBrutalTheme.fg),
      headlineMedium: baseTheme.headlineMedium?.copyWith(fontFamily: 'DoHyeon', color: NeoBrutalTheme.fg),
      headlineSmall: baseTheme.headlineSmall?.copyWith(fontFamily: 'DoHyeon', color: NeoBrutalTheme.fg),
      titleLarge: baseTheme.titleLarge?.copyWith(fontFamily: 'DoHyeon', color: NeoBrutalTheme.fg),
      titleMedium: baseTheme.titleMedium?.copyWith(fontFamily: 'DoHyeon', color: NeoBrutalTheme.fg),
      titleSmall: baseTheme.titleSmall?.copyWith(fontFamily: 'DoHyeon', color: NeoBrutalTheme.fg),
      bodyLarge: baseTheme.bodyLarge?.copyWith(fontFamily: 'Orbitron', color: NeoBrutalTheme.fg),
      bodyMedium: baseTheme.bodyMedium?.copyWith(fontFamily: 'Orbitron', color: NeoBrutalTheme.fg),
      bodySmall: baseTheme.bodySmall?.copyWith(fontFamily: 'Orbitron', color: NeoBrutalTheme.fg),
      labelLarge: baseTheme.labelLarge?.copyWith(fontFamily: 'Orbitron', color: NeoBrutalTheme.fg),
      labelMedium: baseTheme.labelMedium?.copyWith(fontFamily: 'Orbitron', color: NeoBrutalTheme.fg),
      labelSmall: baseTheme.labelSmall?.copyWith(fontFamily: 'Orbitron', color: NeoBrutalTheme.fg),
    );
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    
    return MaterialApp.router(
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
      routerConfig: router,
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