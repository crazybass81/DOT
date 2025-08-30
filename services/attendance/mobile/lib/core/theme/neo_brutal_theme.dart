import 'package:flutter/material.dart';

/// 네오브루탈리즘 디자인 시스템
/// DOT ATTENDANCE의 시각적 아이덴티티를 정의하는 테마
class NeoBrutalTheme {
  // 색상 시스템
  static const Color bg = Color(0xFFFFFFFF);
  static const Color fg = Color(0xFF000000);
  static const Color line = Color(0xFF000000);
  static const Color hi = Color(0xFFCCFF00); // 형광 옐로
  static const Color hiInk = Color(0xFF000000);
  static const Color muted = Color(0xFFF5F5F5);
  
  // 상태 색상
  static const Color success = Color(0xFF00C853);
  static const Color successInk = Color(0xFFFFFFFF);
  static const Color error = Color(0xFFD32F2F);
  static const Color warning = Color(0xFFFFAB00);
  static const Color warningInk = Color(0xFFFFFFFF);
  static const Color info = Color(0xFF2962FF);
  
  // 추가 색상 (호환성)
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);
  static const Color primary = hi;
  static const Color secondary = pastelMint;
  static const Color accent = pastelPink;
  static const Color lo = muted;
  static const Color loInk = gray600;
  static const Color shadow = Color(0xFF000000);
  
  // Gray scale
  static const Color gray200 = Color(0xFFEEEEEE);
  static const Color gray300 = Color(0xFFE0E0E0);
  static const Color gray400 = Color(0xFFBDBDBD);
  static const Color gray500 = Color(0xFF9E9E9E);
  static const Color gray600 = Color(0xFF757575);
  
  // 파스텔 (사용 제한 10%)
  static const Color pastelMint = Color(0xFF6EE7B7);
  static const Color pastelPink = Color(0xFFF472B6);
  static const Color pastelLilac = Color(0xFFA78BFA);
  static const Color pastelSky = Color(0xFF60A5FA);

  // 테두리 두께
  static const double borderThin = 2.0;
  static const double borderThick = 3.0;

  // 모서리 반경
  static const double radiusButton = 12.0;
  static const double radiusCard = 16.0;
  static const double radiusInput = 8.0;

  // 간격 (8pt 그리드)
  static const double space2 = 8.0;
  static const double space3 = 12.0;
  static const double space4 = 16.0;
  static const double space6 = 24.0;
  static const double space8 = 32.0;
  static const double space10 = 40.0;
  static const double shadowOffset = 4.0;

  // 그림자
  static List<BoxShadow> get shadowElev1 => const [
    BoxShadow(
      color: line,
      offset: Offset(0, 2),
      blurRadius: 0,
    ),
  ];

  static List<BoxShadow> get shadowElev2 => const [
    BoxShadow(
      color: line,
      offset: Offset(4, 4),
      blurRadius: 0,
    ),
  ];

  static List<BoxShadow> get shadowElev3 => const [
    BoxShadow(
      color: line,
      offset: Offset(8, 8),
      blurRadius: 0,
    ),
  ];

  // 타이포그래피
  static const TextStyle display = TextStyle(
    fontFamily: 'DoHyeon',
    fontSize: 28,
    height: 34 / 28,
    fontWeight: FontWeight.w700,
    color: fg,
  );

  static const TextStyle title = TextStyle(
    fontFamily: 'DoHyeon',
    fontSize: 22,
    height: 28 / 22,
    fontWeight: FontWeight.w700,
    color: fg,
  );

  static const TextStyle heading = TextStyle(
    fontFamily: 'Orbitron',
    fontSize: 18,
    height: 24 / 18,
    fontWeight: FontWeight.w700,
    color: fg,
  );

  static const TextStyle body = TextStyle(
    fontFamily: 'Orbitron',
    fontSize: 16,
    height: 22 / 16,
    fontWeight: FontWeight.w400,
    color: fg,
  );

  static const TextStyle caption = TextStyle(
    fontFamily: 'Orbitron',
    fontSize: 13,
    height: 18 / 13,
    fontWeight: FontWeight.w400,
    color: fg,
  );

  static const TextStyle micro = TextStyle(
    fontFamily: 'Orbitron',
    fontSize: 11,
    height: 16 / 11,
    fontWeight: FontWeight.w400,
    color: fg,
  );
  
  // Additional text styles for compatibility
  static const TextStyle headline2 = TextStyle(
    fontFamily: 'DoHyeon',
    fontSize: 32,
    height: 40 / 32,
    fontWeight: FontWeight.w700,
    color: fg,
  );
  
  static const TextStyle headline3 = TextStyle(
    fontFamily: 'DoHyeon',
    fontSize: 26,
    height: 32 / 26,
    fontWeight: FontWeight.w700,
    color: fg,
  );
  
  static const TextStyle headline4 = TextStyle(
    fontFamily: 'DoHyeon',
    fontSize: 20,
    height: 26 / 20,
    fontWeight: FontWeight.w700,
    color: fg,
  );
  
  static const TextStyle button = TextStyle(
    fontFamily: 'Orbitron',
    fontSize: 16,
    height: 22 / 16,
    fontWeight: FontWeight.w600,
    color: fg,
  );
  
  // Aliases for compatibility
  static const TextStyle h1 = headline2;
  static const TextStyle h2 = headline3;
  static const TextStyle h3 = headline4;
  static const TextStyle h4 = heading;
  static const TextStyle small = caption;
  
  // Spacing
  static const double space1 = 4.0;

  // 라이트 테마
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    colorScheme: const ColorScheme.light(
      primary: hi,
      onPrimary: hiInk,
      secondary: fg,
      onSecondary: bg,
      surface: bg,
      onSurface: fg,
      error: error,
      onError: bg,
      outline: line,
    ),
    scaffoldBackgroundColor: bg,
    appBarTheme: AppBarTheme(
      backgroundColor: bg,
      foregroundColor: fg,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: title,
      toolbarHeight: 64,
      shape: const Border(
        bottom: BorderSide(
          color: line,
          width: borderThick,
        ),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: hi,
        foregroundColor: hiInk,
        elevation: 0,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusButton),
          side: const BorderSide(
            color: line,
            width: borderThick,
          ),
        ),
        textStyle: heading,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: fg,
        elevation: 0,
        minimumSize: const Size.fromHeight(48),
        side: const BorderSide(
          color: line,
          width: borderThin,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusButton),
        ),
        textStyle: body.copyWith(fontWeight: FontWeight.w700),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: fg,
        textStyle: body.copyWith(
          fontWeight: FontWeight.w700,
          decoration: TextDecoration.underline,
        ),
      ),
    ),
    cardTheme: CardThemeData(
      color: bg,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusCard),
        side: const BorderSide(
          color: line,
          width: borderThin,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: bg,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: space4,
        vertical: space3,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusInput),
        borderSide: const BorderSide(
          color: line,
          width: borderThin,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusInput),
        borderSide: const BorderSide(
          color: line,
          width: borderThin,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusInput),
        borderSide: const BorderSide(
          color: hi,
          width: borderThick,
        ),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusInput),
        borderSide: const BorderSide(
          color: error,
          width: borderThin,
        ),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusInput),
        borderSide: const BorderSide(
          color: error,
          width: borderThick,
        ),
      ),
      labelStyle: body,
      hintStyle: body.copyWith(color: fg.withOpacity(0.5)),
      errorStyle: caption.copyWith(color: error),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: bg,
      selectedColor: hi,
      disabledColor: muted,
      labelStyle: caption,
      padding: const EdgeInsets.symmetric(
        horizontal: space3,
        vertical: space2,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusButton),
        side: const BorderSide(
          color: line,
          width: borderThin,
        ),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: bg,
      selectedItemColor: fg,
      unselectedItemColor: fg,
      showSelectedLabels: true,
      showUnselectedLabels: true,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
    dividerTheme: const DividerThemeData(
      color: line,
      thickness: borderThin,
      space: 0,
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: fg,
      contentTextStyle: body.copyWith(color: bg),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusButton),
      ),
    ),
  );

  // 다크 테마
  static ThemeData get darkTheme => lightTheme.copyWith(
    colorScheme: const ColorScheme.dark(
      primary: hi,
      onPrimary: hiInk,
      secondary: bg,
      onSecondary: fg,
      surface: Color(0xFF111111),
      onSurface: bg,
      error: error,
      onError: bg,
      outline: bg,
    ),
    scaffoldBackgroundColor: const Color(0xFF111111),
    appBarTheme: lightTheme.appBarTheme.copyWith(
      backgroundColor: const Color(0xFF111111),
      foregroundColor: bg,
      shape: const Border(
        bottom: BorderSide(
          color: bg,
          width: borderThick,
        ),
      ),
    ),
    cardTheme: lightTheme.cardTheme.copyWith(
      color: const Color(0xFF111111),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusCard),
        side: const BorderSide(
          color: bg,
          width: borderThin,
        ),
      ),
    ),
  );
}

/// 커스텀 페인터: 하드 섀도우 효과
class HardShadowPainter extends CustomPainter {
  final Color shadowColor;
  final Offset offset;
  final double borderRadius;

  HardShadowPainter({
    this.shadowColor = NeoBrutalTheme.line,
    this.offset = const Offset(4, 4),
    this.borderRadius = NeoBrutalTheme.radiusCard,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = shadowColor
      ..style = PaintingStyle.fill;

    final shadowRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        offset.dx,
        offset.dy,
        size.width,
        size.height,
      ),
      Radius.circular(borderRadius),
    );

    canvas.drawRRect(shadowRect, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 애니메이션 설정
class NeoBrutalAnimations {
  static const Duration snapDuration = Duration(milliseconds: 180);
  static const Duration toastDuration = Duration(milliseconds: 240);
  static const Duration pageDuration = Duration(milliseconds: 240);
  
  static const Curve snapCurve = Curves.easeOutCubic;
  static const Curve toastCurve = Curves.easeInOutCubic;
  static const Curve pageCurve = Curves.easeInOutCubic;
}