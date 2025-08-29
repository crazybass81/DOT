import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/firebase_service.dart';
import '../../core/services/dynamodb_service.dart';
import '../../core/theme/neo_brutal_theme.dart';

class DatabaseTestScreen extends ConsumerStatefulWidget {
  const DatabaseTestScreen({super.key});

  @override
  ConsumerState<DatabaseTestScreen> createState() => _DatabaseTestScreenState();
}

class _DatabaseTestScreenState extends ConsumerState<DatabaseTestScreen> {
  final FirebaseService _firebaseService = FirebaseService.instance;
  final DynamoDBService _dynamoDBService = DynamoDBService.instance;
  
  bool _firebaseInitialized = false;
  bool _dynamoDBInitialized = false;
  String _status = 'Not initialized';
  List<String> _logs = [];
  
  @override
  void initState() {
    super.initState();
    _checkInitialization();
  }
  
  void _checkInitialization() {
    setState(() {
      _firebaseInitialized = _firebaseService.isInitialized;
      _dynamoDBInitialized = _dynamoDBService.isInitialized;
      _status = 'Firebase: ${_firebaseInitialized ? "✅" : "❌"} | DynamoDB: ${_dynamoDBInitialized ? "✅" : "❌"}';
    });
  }
  
  void _addLog(String message) {
    setState(() {
      _logs.insert(0, '[${DateTime.now().toIso8601String().split('T')[1].split('.')[0]}] $message');
      if (_logs.length > 50) {
        _logs = _logs.take(50).toList();
      }
    });
  }
  
  Future<void> _initializeFirebase() async {
    try {
      _addLog('Initializing Firebase...');
      await _firebaseService.initialize();
      _addLog('✅ Firebase initialized successfully');
      _checkInitialization();
    } catch (e) {
      _addLog('❌ Firebase initialization failed: $e');
    }
  }
  
  Future<void> _initializeDynamoDB() async {
    try {
      _addLog('Initializing DynamoDB...');
      // Note: In production, these credentials should come from secure storage
      await _dynamoDBService.initialize(
        accessKeyId: 'YOUR_ACCESS_KEY_ID',
        secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
        region: 'us-east-1',
      );
      _addLog('✅ DynamoDB initialized successfully');
      _checkInitialization();
    } catch (e) {
      _addLog('❌ DynamoDB initialization failed: $e');
    }
  }
  
  Future<void> _testFirebaseAuth() async {
    try {
      _addLog('Testing Firebase Auth...');
      final user = await _firebaseService.signInWithEmailPassword(
        'test@example.com',
        'password123',
      );
      if (user != null) {
        _addLog('✅ Signed in as: ${user.email}');
      } else {
        _addLog('⚠️ Sign in returned null');
      }
    } catch (e) {
      _addLog('❌ Auth test failed: $e');
    }
  }
  
  Future<void> _testFirebaseFirestore() async {
    try {
      _addLog('Testing Firestore write...');
      await _firebaseService.createAttendanceRecord({
        'type': 'check_in',
        'location': 'Test Location',
        'latitude': 37.7749,
        'longitude': -122.4194,
      });
      _addLog('✅ Firestore write successful');
      
      _addLog('Testing Firestore read...');
      final stream = _firebaseService.getAttendanceRecords(
        startDate: DateTime.now().subtract(const Duration(days: 7)),
        endDate: DateTime.now(),
      );
      
      stream.listen((snapshot) {
        _addLog('✅ Firestore read: ${snapshot.docs.length} records');
      });
    } catch (e) {
      _addLog('❌ Firestore test failed: $e');
    }
  }
  
  Future<void> _testDynamoDBWrite() async {
    try {
      _addLog('Testing DynamoDB write...');
      await _dynamoDBService.createAttendanceRecord(
        userId: 'test_user_123',
        type: 'check_in',
        timestamp: DateTime.now(),
        latitude: 37.7749,
        longitude: -122.4194,
        metadata: {
          'device': 'Flutter App',
          'version': '1.0.0',
        },
      );
      _addLog('✅ DynamoDB write successful');
    } catch (e) {
      _addLog('❌ DynamoDB write failed: $e');
    }
  }
  
  Future<void> _testDynamoDBRead() async {
    try {
      _addLog('Testing DynamoDB read...');
      final records = await _dynamoDBService.getAttendanceRecords(
        userId: 'test_user_123',
        startDate: DateTime.now().subtract(const Duration(days: 7)),
        endDate: DateTime.now(),
      );
      _addLog('✅ DynamoDB read: ${records.length} records');
      for (var record in records.take(3)) {
        _addLog('  - ${record['type']} at ${record['timestamp']}');
      }
    } catch (e) {
      _addLog('❌ DynamoDB read failed: $e');
    }
  }
  
  Future<void> _testAnalytics() async {
    try {
      _addLog('Testing analytics logging...');
      
      // Firebase Analytics
      await _firebaseService.logEvent(
        name: 'test_event',
        parameters: {
          'source': 'test_screen',
          'value': 42,
        },
      );
      _addLog('✅ Firebase Analytics event logged');
      
      // DynamoDB Analytics
      await _dynamoDBService.logAnalyticsEvent(
        userId: 'test_user_123',
        eventName: 'test_event',
        parameters: {
          'source': 'test_screen',
          'value': 42,
        },
      );
      _addLog('✅ DynamoDB Analytics event logged');
    } catch (e) {
      _addLog('❌ Analytics test failed: $e');
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        backgroundColor: NeoBrutalTheme.bg,
        elevation: 0,
        title: const Text(
          'Database Integration Test',
          style: TextStyle(
            color: NeoBrutalTheme.fg,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Status Bar
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: NeoBrutalTheme.white,
                border: Border.all(color: NeoBrutalTheme.fg, width: 2),
                boxShadow: const [
                  BoxShadow(
                    color: NeoBrutalTheme.fg,
                    offset: Offset(4, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'System Status',
                    style: NeoBrutalTheme.headline3.copyWith(
                      color: NeoBrutalTheme.fg,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _status,
                    style: NeoBrutalTheme.body.copyWith(
                      color: NeoBrutalTheme.fg,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ),
            
            // Control Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  // Initialization Row
                  Row(
                    children: [
                      Expanded(
                        child: _buildButton(
                          label: 'Init Firebase',
                          onPressed: _firebaseInitialized ? null : _initializeFirebase,
                          color: NeoBrutalTheme.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildButton(
                          label: 'Init DynamoDB',
                          onPressed: _dynamoDBInitialized ? null : _initializeDynamoDB,
                          color: NeoBrutalTheme.secondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  
                  // Firebase Tests
                  Row(
                    children: [
                      Expanded(
                        child: _buildButton(
                          label: 'Test Auth',
                          onPressed: _firebaseInitialized ? _testFirebaseAuth : null,
                          color: NeoBrutalTheme.accent,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildButton(
                          label: 'Test Firestore',
                          onPressed: _firebaseInitialized ? _testFirebaseFirestore : null,
                          color: NeoBrutalTheme.success,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  
                  // DynamoDB Tests
                  Row(
                    children: [
                      Expanded(
                        child: _buildButton(
                          label: 'DDB Write',
                          onPressed: _dynamoDBInitialized ? _testDynamoDBWrite : null,
                          color: NeoBrutalTheme.warning,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildButton(
                          label: 'DDB Read',
                          onPressed: _dynamoDBInitialized ? _testDynamoDBRead : null,
                          color: NeoBrutalTheme.error,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  
                  // Analytics Test
                  _buildButton(
                    label: 'Test Analytics',
                    onPressed: (_firebaseInitialized || _dynamoDBInitialized) 
                        ? _testAnalytics 
                        : null,
                    color: NeoBrutalTheme.primary,
                    fullWidth: true,
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Logs
            Expanded(
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: NeoBrutalTheme.fg,
                  border: Border.all(color: NeoBrutalTheme.fg, width: 2),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Logs',
                          style: NeoBrutalTheme.headline4.copyWith(
                            color: NeoBrutalTheme.white,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.clear_all, color: NeoBrutalTheme.white),
                          onPressed: () => setState(() => _logs.clear()),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView.builder(
                        itemCount: _logs.length,
                        itemBuilder: (context, index) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 2),
                            child: Text(
                              _logs[index],
                              style: const TextStyle(
                                color: NeoBrutalTheme.white,
                                fontFamily: 'monospace',
                                fontSize: 12,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildButton({
    required String label,
    required VoidCallback? onPressed,
    required Color color,
    bool fullWidth = false,
  }) {
    final button = GestureDetector(
      onTap: onPressed,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: onPressed != null ? color : NeoBrutalTheme.gray300,
          border: Border.all(color: NeoBrutalTheme.fg, width: 2),
          boxShadow: onPressed != null
              ? const [
                  BoxShadow(
                    color: NeoBrutalTheme.fg,
                    offset: Offset(3, 3),
                  ),
                ]
              : null,
        ),
        child: Center(
          child: Text(
            label,
            style: NeoBrutalTheme.button.copyWith(
              color: onPressed != null ? NeoBrutalTheme.white : NeoBrutalTheme.gray500,
            ),
          ),
        ),
      ),
    );
    
    return fullWidth ? button : Expanded(child: button);
  }
}