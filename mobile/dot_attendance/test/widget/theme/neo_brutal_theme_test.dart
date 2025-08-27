import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dot_attendance/core/theme/neo_brutal_theme.dart';

void main() {
  group('NeoBrutalTheme', () {
    group('Color System', () {
      test('should have consistent color values', () {
        expect(NeoBrutalTheme.bg, const Color(0xFFFFFFFF));
        expect(NeoBrutalTheme.fg, const Color(0xFF000000));
        expect(NeoBrutalTheme.line, const Color(0xFF000000));
        expect(NeoBrutalTheme.hi, const Color(0xFFCCFF00));
        expect(NeoBrutalTheme.hiInk, const Color(0xFF000000));
        expect(NeoBrutalTheme.muted, const Color(0xFFF5F5F5));
      });

      test('should have correct status colors', () {
        expect(NeoBrutalTheme.success, const Color(0xFF00C853));
        expect(NeoBrutalTheme.error, const Color(0xFFD32F2F));
        expect(NeoBrutalTheme.warning, const Color(0xFFFFAB00));
        expect(NeoBrutalTheme.info, const Color(0xFF2962FF));
      });

      test('should have pastel colors', () {
        expect(NeoBrutalTheme.pastelMint, const Color(0xFF6EE7B7));
        expect(NeoBrutalTheme.pastelPink, const Color(0xFFF472B6));
        expect(NeoBrutalTheme.pastelLilac, const Color(0xFFA78BFA));
        expect(NeoBrutalTheme.pastelSky, const Color(0xFF60A5FA));
      });
    });

    group('Spacing and Measurements', () {
      test('should have consistent spacing values', () {
        expect(NeoBrutalTheme.space2, 8.0);
        expect(NeoBrutalTheme.space3, 12.0);
        expect(NeoBrutalTheme.space4, 16.0);
        expect(NeoBrutalTheme.space6, 24.0);
        expect(NeoBrutalTheme.space8, 32.0);
        expect(NeoBrutalTheme.space10, 40.0);
      });

      test('should have border thickness values', () {
        expect(NeoBrutalTheme.borderThin, 2.0);
        expect(NeoBrutalTheme.borderThick, 3.0);
      });

      test('should have radius values', () {
        expect(NeoBrutalTheme.radiusButton, 12.0);
        expect(NeoBrutalTheme.radiusCard, 16.0);
        expect(NeoBrutalTheme.radiusInput, 8.0);
      });
    });

    group('Shadow System', () {
      test('should have elevation 1 shadow', () {
        final shadow = NeoBrutalTheme.shadowElev1.first;
        expect(shadow.color, NeoBrutalTheme.line);
        expect(shadow.offset, const Offset(0, 2));
        expect(shadow.blurRadius, 0);
      });

      test('should have elevation 2 shadow', () {
        final shadow = NeoBrutalTheme.shadowElev2.first;
        expect(shadow.color, NeoBrutalTheme.line);
        expect(shadow.offset, const Offset(4, 4));
        expect(shadow.blurRadius, 0);
      });

      test('should have elevation 3 shadow', () {
        final shadow = NeoBrutalTheme.shadowElev3.first;
        expect(shadow.color, NeoBrutalTheme.line);
        expect(shadow.offset, const Offset(8, 8));
        expect(shadow.blurRadius, 0);
      });
    });

    group('Typography', () {
      test('should have display text style', () {
        final style = NeoBrutalTheme.display;
        expect(style.fontSize, 28);
        expect(style.fontWeight, FontWeight.w700);
        expect(style.color, NeoBrutalTheme.fg);
      });

      test('should have title text style', () {
        final style = NeoBrutalTheme.title;
        expect(style.fontSize, 22);
        expect(style.fontWeight, FontWeight.w700);
        expect(style.color, NeoBrutalTheme.fg);
      });

      test('should have heading text style', () {
        final style = NeoBrutalTheme.heading;
        expect(style.fontSize, 18);
        expect(style.fontWeight, FontWeight.w700);
        expect(style.color, NeoBrutalTheme.fg);
      });

      test('should have body text style', () {
        final style = NeoBrutalTheme.body;
        expect(style.fontSize, 16);
        expect(style.fontWeight, FontWeight.w400);
        expect(style.color, NeoBrutalTheme.fg);
      });

      test('should have caption text style', () {
        final style = NeoBrutalTheme.caption;
        expect(style.fontSize, 13);
        expect(style.fontWeight, FontWeight.w400);
        expect(style.color, NeoBrutalTheme.fg);
      });

      test('should have micro text style', () {
        final style = NeoBrutalTheme.micro;
        expect(style.fontSize, 11);
        expect(style.fontWeight, FontWeight.w400);
        expect(style.color, NeoBrutalTheme.fg);
      });
    });

    group('Light Theme', () {
      late ThemeData theme;

      setUp(() {
        theme = NeoBrutalTheme.lightTheme;
      });

      test('should have correct color scheme', () {
        final colorScheme = theme.colorScheme;
        expect(colorScheme.primary, NeoBrutalTheme.hi);
        expect(colorScheme.onPrimary, NeoBrutalTheme.hiInk);
        expect(colorScheme.secondary, NeoBrutalTheme.fg);
        expect(colorScheme.onSecondary, NeoBrutalTheme.bg);
        expect(colorScheme.surface, NeoBrutalTheme.bg);
        expect(colorScheme.onSurface, NeoBrutalTheme.fg);
        expect(colorScheme.error, NeoBrutalTheme.error);
        expect(colorScheme.onError, NeoBrutalTheme.bg);
      });

      test('should have correct scaffold background', () {
        expect(theme.scaffoldBackgroundColor, NeoBrutalTheme.bg);
      });

      test('should have correct app bar theme', () {
        final appBarTheme = theme.appBarTheme;
        expect(appBarTheme.backgroundColor, NeoBrutalTheme.bg);
        expect(appBarTheme.foregroundColor, NeoBrutalTheme.fg);
        expect(appBarTheme.elevation, 0);
        expect(appBarTheme.centerTitle, true);
        expect(appBarTheme.toolbarHeight, 64);
      });

      test('should have correct elevated button theme', () {
        final buttonTheme = theme.elevatedButtonTheme.style;
        expect(
          buttonTheme?.backgroundColor?.resolve({}),
          NeoBrutalTheme.hi,
        );
        expect(
          buttonTheme?.foregroundColor?.resolve({}),
          NeoBrutalTheme.hiInk,
        );
        expect(buttonTheme?.elevation?.resolve({}), 0);
      });

      test('should have correct card theme', () {
        final cardTheme = theme.cardTheme;
        expect(cardTheme.color, NeoBrutalTheme.bg);
        expect(cardTheme.elevation, 0);
        expect(cardTheme.shape, isA<RoundedRectangleBorder>());
      });

      test('should have correct input decoration theme', () {
        final inputTheme = theme.inputDecorationTheme;
        expect(inputTheme.filled, true);
        expect(inputTheme.fillColor, NeoBrutalTheme.bg);
        expect(inputTheme.border, isA<OutlineInputBorder>());
      });
    });

    group('Dark Theme', () {
      late ThemeData theme;

      setUp(() {
        theme = NeoBrutalTheme.darkTheme;
      });

      test('should have correct dark color scheme', () {
        final colorScheme = theme.colorScheme;
        expect(colorScheme.primary, NeoBrutalTheme.hi);
        expect(colorScheme.onPrimary, NeoBrutalTheme.hiInk);
        expect(colorScheme.surface, const Color(0xFF111111));
        expect(colorScheme.onSurface, NeoBrutalTheme.bg);
      });

      test('should have correct dark scaffold background', () {
        expect(theme.scaffoldBackgroundColor, const Color(0xFF111111));
      });

      test('should have correct dark app bar theme', () {
        final appBarTheme = theme.appBarTheme;
        expect(appBarTheme.backgroundColor, const Color(0xFF111111));
        expect(appBarTheme.foregroundColor, NeoBrutalTheme.bg);
      });

      test('should have correct dark card theme', () {
        final cardTheme = theme.cardTheme;
        expect(cardTheme.color, const Color(0xFF111111));
      });
    });

    group('Animation Settings', () {
      test('should have correct animation durations', () {
        expect(NeoBrutalAnimations.snapDuration, const Duration(milliseconds: 180));
        expect(NeoBrutalAnimations.toastDuration, const Duration(milliseconds: 240));
        expect(NeoBrutalAnimations.pageDuration, const Duration(milliseconds: 240));
      });

      test('should have correct animation curves', () {
        expect(NeoBrutalAnimations.snapCurve, Curves.easeOutCubic);
        expect(NeoBrutalAnimations.toastCurve, Curves.easeInOutCubic);
        expect(NeoBrutalAnimations.pageCurve, Curves.easeInOutCubic);
      });
    });
  });

  group('HardShadowPainter', () {
    testWidgets('should paint hard shadow correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CustomPaint(
              painter: HardShadowPainter(
                shadowColor: NeoBrutalTheme.line,
                offset: const Offset(4, 4),
                borderRadius: NeoBrutalTheme.radiusCard,
              ),
              size: const Size(100, 100),
            ),
          ),
        ),
      );

      expect(find.byType(CustomPaint), findsOneWidget);
    });

    test('should have default values', () {
      final painter = HardShadowPainter();
      
      expect(painter.shadowColor, NeoBrutalTheme.line);
      expect(painter.offset, const Offset(4, 4));
      expect(painter.borderRadius, NeoBrutalTheme.radiusCard);
    });

    test('should accept custom values', () {
      final customPainter = HardShadowPainter(
        shadowColor: Colors.red,
        offset: const Offset(8, 8),
        borderRadius: 20.0,
      );
      
      expect(customPainter.shadowColor, Colors.red);
      expect(customPainter.offset, const Offset(8, 8));
      expect(customPainter.borderRadius, 20.0);
    });
  });

  group('Theme Widget Integration', () {
    testWidgets('should apply light theme correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: NeoBrutalTheme.lightTheme,
          home: const Scaffold(
            appBar: AppBar(title: Text('Test')),
            body: Column(
              children: [
                ElevatedButton(
                  onPressed: null,
                  child: Text('Button'),
                ),
                OutlinedButton(
                  onPressed: null,
                  child: Text('Outlined'),
                ),
                TextButton(
                  onPressed: null,
                  child: Text('Text'),
                ),
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Card'),
                  ),
                ),
                TextField(
                  decoration: InputDecoration(labelText: 'Input'),
                ),
              ],
            ),
          ),
        ),
      );

      // Verify widgets are rendered with theme
      expect(find.byType(AppBar), findsOneWidget);
      expect(find.byType(ElevatedButton), findsOneWidget);
      expect(find.byType(OutlinedButton), findsOneWidget);
      expect(find.byType(TextButton), findsOneWidget);
      expect(find.byType(Card), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);

      // Test theme application
      final appBar = tester.widget<AppBar>(find.byType(AppBar));
      final scaffoldTheme = Theme.of(tester.element(find.byType(Scaffold)));
      
      expect(scaffoldTheme.scaffoldBackgroundColor, NeoBrutalTheme.bg);
      expect(scaffoldTheme.colorScheme.primary, NeoBrutalTheme.hi);
    });

    testWidgets('should apply dark theme correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: NeoBrutalTheme.darkTheme,
          home: const Scaffold(
            appBar: AppBar(title: Text('Test')),
            body: Text('Dark Theme Test'),
          ),
        ),
      );

      final scaffoldTheme = Theme.of(tester.element(find.byType(Scaffold)));
      
      expect(scaffoldTheme.scaffoldBackgroundColor, const Color(0xFF111111));
      expect(scaffoldTheme.colorScheme.surface, const Color(0xFF111111));
      expect(scaffoldTheme.colorScheme.onSurface, NeoBrutalTheme.bg);
    });

    testWidgets('should handle different screen sizes', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: NeoBrutalTheme.lightTheme,
          home: const Scaffold(
            body: SizedBox(
              width: double.infinity,
              height: double.infinity,
              child: Text('Responsive Test'),
            ),
          ),
        ),
      );

      // Test on different screen sizes
      await tester.binding.setSurfaceSize(const Size(320, 568)); // iPhone SE
      await tester.pump();
      expect(find.text('Responsive Test'), findsOneWidget);

      await tester.binding.setSurfaceSize(const Size(414, 896)); // iPhone 11
      await tester.pump();
      expect(find.text('Responsive Test'), findsOneWidget);

      await tester.binding.setSurfaceSize(const Size(800, 600)); // Tablet
      await tester.pump();
      expect(find.text('Responsive Test'), findsOneWidget);
    });
  });

  group('Theme Consistency', () {
    test('should maintain consistent border styles', () {
      final lightTheme = NeoBrutalTheme.lightTheme;
      final darkTheme = NeoBrutalTheme.darkTheme;

      // Both themes should have same border thickness values
      final lightCard = lightTheme.cardTheme.shape as RoundedRectangleBorder;
      final darkCard = darkTheme.cardTheme.shape as RoundedRectangleBorder;
      
      expect(
        (lightCard.side as BorderSide).width,
        (darkCard.side as BorderSide).width,
      );
    });

    test('should have consistent button heights', () {
      final theme = NeoBrutalTheme.lightTheme;
      final elevatedButtonStyle = theme.elevatedButtonTheme.style;
      final outlinedButtonStyle = theme.outlinedButtonTheme.style;

      expect(
        elevatedButtonStyle?.minimumSize?.resolve({}),
        outlinedButtonStyle?.minimumSize?.resolve({}),
      );
    });

    test('should have consistent primary color across components', () {
      final theme = NeoBrutalTheme.lightTheme;
      
      expect(theme.colorScheme.primary, NeoBrutalTheme.hi);
      expect(
        theme.elevatedButtonTheme.style?.backgroundColor?.resolve({}),
        NeoBrutalTheme.hi,
      );
    });
  });

  group('Edge Cases', () {
    testWidgets('should handle empty content', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: NeoBrutalTheme.lightTheme,
          home: const Scaffold(),
        ),
      );

      expect(find.byType(Scaffold), findsOneWidget);
    });

    testWidgets('should handle disabled components', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: NeoBrutalTheme.lightTheme,
          home: const Scaffold(
            body: Column(
              children: [
                ElevatedButton(onPressed: null, child: Text('Disabled')),
                TextField(enabled: false),
              ],
            ),
          ),
        ),
      );

      expect(find.byType(ElevatedButton), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('should handle theme switching', (tester) async {
      bool isDark = false;

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return MaterialApp(
              theme: isDark ? NeoBrutalTheme.darkTheme : NeoBrutalTheme.lightTheme,
              home: Scaffold(
                body: ElevatedButton(
                  onPressed: () {
                    setState(() {
                      isDark = !isDark;
                    });
                  },
                  child: const Text('Toggle Theme'),
                ),
              ),
            );
          },
        ),
      );

      // Start with light theme
      var theme = Theme.of(tester.element(find.byType(Scaffold)));
      expect(theme.scaffoldBackgroundColor, NeoBrutalTheme.bg);

      // Switch to dark theme
      await tester.tap(find.text('Toggle Theme'));
      await tester.pumpAndSettle();

      theme = Theme.of(tester.element(find.byType(Scaffold)));
      expect(theme.scaffoldBackgroundColor, const Color(0xFF111111));

      // Switch back to light theme
      await tester.tap(find.text('Toggle Theme'));
      await tester.pumpAndSettle();

      theme = Theme.of(tester.element(find.byType(Scaffold)));
      expect(theme.scaffoldBackgroundColor, NeoBrutalTheme.bg);
    });
  });
}