import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/theme/neo_brutal_theme.dart';
import 'presentation/pages/dashboard/dashboard_page.dart';
import 'presentation/pages/auth/login_page.dart';

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

  // 가로 모드 비활성화 (모바일 전용)
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
        textTheme: GoogleFonts.doHyeonTextTheme(
          Theme.of(context).textTheme,
        ).apply(
          bodyColor: NeoBrutalTheme.fg,
          displayColor: NeoBrutalTheme.fg,
        ),
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
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: NeoBrutalTheme.hi,
            foregroundColor: NeoBrutalTheme.hiInk,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusButton),
              side: const BorderSide(
                color: NeoBrutalTheme.line,
                width: NeoBrutalTheme.borderThick,
              ),
            ),
            padding: const EdgeInsets.symmetric(
              horizontal: NeoBrutalTheme.space6,
              vertical: NeoBrutalTheme.space4,
            ),
          ),
        ),
        cardTheme: CardTheme(
          color: NeoBrutalTheme.surface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
            side: const BorderSide(
              color: NeoBrutalTheme.line,
              width: NeoBrutalTheme.borderThin,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: NeoBrutalTheme.surface,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusInput),
            borderSide: const BorderSide(
              color: NeoBrutalTheme.line,
              width: NeoBrutalTheme.borderThin,
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusInput),
            borderSide: const BorderSide(
              color: NeoBrutalTheme.line,
              width: NeoBrutalTheme.borderThin,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusInput),
            borderSide: const BorderSide(
              color: NeoBrutalTheme.hi,
              width: NeoBrutalTheme.borderThick,
            ),
          ),
        ),
      ),
      home: const LoginPage(),  // 로그인 페이지로 시작
    );
  }
}