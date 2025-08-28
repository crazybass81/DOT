import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
// import 'package:firebase_core/firebase_core.dart'; // Disabled for now
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/config/firebase_config.dart';
// import 'data/services/firestore_service.dart'; // Disabled for now
// import 'data/services/firebase_attendance_service.dart'; // Disabled for now
import 'core/di/injection_container.dart' as di;
import 'core/theme/app_theme.dart';
import 'core/routing/app_router.dart';
import 'core/services/notification_service.dart';
import 'core/storage/local_storage_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  try {
    // Initialize Firebase (dummy implementation)
    await FirebaseConfig.initialize();
    
    // Configure Firestore (disabled for now)
    // await FirestoreService.configure();
    
    // Initialize services
    await _initializeServices();
    
    // Setup dependency injection
    await di.setupDependencyInjection();

    runApp(
      ProviderScope(
        child: DOTAttendanceApp(),
      ),
    );
  } catch (error, stackTrace) {
    // Log initialization error
    await FirebaseConfig.recordError(
      error,
      stackTrace,
      reason: 'App initialization failed',
      fatal: true,
    );

    // Show error screen
    runApp(
      MaterialApp(
        home: InitializationErrorScreen(error: error.toString()),
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}

/// Initialize all required services
Future<void> _initializeServices() async {
  try {
    // Initialize local storage
    await LocalStorageService.initialize();
    
    // Initialize notification service
    await NotificationService.initialize();
    
    // Initialize Firebase attendance service (disabled for now)
    // await FirebaseAttendanceService.initialize();
    
    debugPrint('All services initialized successfully');
  } catch (e, stackTrace) {
    debugPrint('Service initialization failed: $e');
    await FirebaseConfig.recordError(
      e,
      stackTrace,
      reason: 'Service initialization failed',
    );
    rethrow;
  }
}

class DOTAttendanceApp extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    
    return MaterialApp.router(
      title: 'DOT Attendance',
      debugShowCheckedModeBanner: false,
      
      // Theme configuration
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      
      // Localization
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en', 'US'),
        Locale('es', 'ES'),
        Locale('fr', 'FR'),
        // Add more locales as needed
      ],
      
      // Routing
      routerConfig: router,
      
      // Global builders and configurations
      builder: (context, child) {
        // Add global error boundary
        ErrorWidget.builder = (FlutterErrorDetails details) {
          // Log error to Firebase
          FirebaseConfig.recordError(
            details.exception,
            details.stack,
            reason: 'Widget error',
          );
          
          // Return custom error widget
          return Material(
            child: Container(
              color: Colors.red.shade50,
              padding: const EdgeInsets.all(16),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline,
                      size: 64,
                      color: Colors.red.shade700,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Something went wrong',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.red.shade700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Please restart the app',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.red.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        };
        
        return child ?? const SizedBox.shrink();
      },
    );
  }
}

/// Error screen shown when app initialization fails
class InitializationErrorScreen extends StatelessWidget {
  final String error;

  const InitializationErrorScreen({
    super.key,
    required this.error,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.red.shade50,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 80,
                color: Colors.red.shade700,
              ),
              const SizedBox(height: 24),
              Text(
                'Initialization Failed',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.red.shade700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'DOT Attendance failed to start properly. Please try the following:',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.red.shade600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Card(
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildTroubleshootingStep(
                        '1. Check your internet connection',
                        Icons.wifi,
                      ),
                      const SizedBox(height: 12),
                      _buildTroubleshootingStep(
                        '2. Restart the application',
                        Icons.refresh,
                      ),
                      const SizedBox(height: 12),
                      _buildTroubleshootingStep(
                        '3. Update to the latest version',
                        Icons.system_update,
                      ),
                      const SizedBox(height: 12),
                      _buildTroubleshootingStep(
                        '4. Contact support if problem persists',
                        Icons.support_agent,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  // Restart the app
                  SystemChannels.platform.invokeMethod('SystemNavigator.pop');
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade700,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 16,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Restart App',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (error.isNotEmpty) ...[
                const SizedBox(height: 32),
                ExpansionTile(
                  title: Text(
                    'Technical Details',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.red.shade700,
                    ),
                  ),
                  iconColor: Colors.red.shade700,
                  collapsedIconColor: Colors.red.shade700,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      margin: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.red.shade100,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.shade300),
                      ),
                      child: SelectableText(
                        error,
                        style: TextStyle(
                          fontSize: 12,
                          fontFamily: 'monospace',
                          color: Colors.red.shade800,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTroubleshootingStep(String text, IconData icon) {
    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: Colors.blue.shade700,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade800,
            ),
          ),
        ),
      ],
    );
  }
}

/// Router provider for managing app navigation
final routerProvider = Provider<AppRouter>((ref) {
  return AppRouter();
});

/// Global app state provider
final appStateProvider = StateNotifierProvider<AppStateNotifier, AppState>((ref) {
  return AppStateNotifier();
});

/// App state management
class AppState {
  final bool isInitialized;
  final bool isOnline;
  final String? currentUserId;
  final int pendingSync;

  const AppState({
    this.isInitialized = false,
    this.isOnline = true,
    this.currentUserId,
    this.pendingSync = 0,
  });

  AppState copyWith({
    bool? isInitialized,
    bool? isOnline,
    String? currentUserId,
    int? pendingSync,
  }) {
    return AppState(
      isInitialized: isInitialized ?? this.isInitialized,
      isOnline: isOnline ?? this.isOnline,
      currentUserId: currentUserId ?? this.currentUserId,
      pendingSync: pendingSync ?? this.pendingSync,
    );
  }
}

class AppStateNotifier extends StateNotifier<AppState> {
  AppStateNotifier() : super(const AppState()) {
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      // Set initialized state
      state = state.copyWith(isInitialized: true);
      
      // Monitor auth state
      FirebaseConfig.app;  // Ensure Firebase is initialized
      
      // Monitor connectivity
      // You can add network monitoring here
      
    } catch (e) {
      await FirebaseConfig.recordError(
        e,
        StackTrace.current,
        reason: 'App state initialization failed',
      );
    }
  }

  void updateOnlineStatus(bool isOnline) {
    state = state.copyWith(isOnline: isOnline);
  }

  void updateUser(String? userId) {
    state = state.copyWith(currentUserId: userId);
  }

  void updatePendingSync(int count) {
    state = state.copyWith(pendingSync: count);
  }
}