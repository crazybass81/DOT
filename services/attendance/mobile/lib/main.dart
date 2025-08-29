import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/theme/neo_brutal_theme.dart';
import 'presentation/pages/dashboard/dashboard_page.dart';
import 'core/di/injection_container.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize dependencies
  await configureDependencies();
  
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
      ),
      home: const DashboardPage(),
    );
  }
}