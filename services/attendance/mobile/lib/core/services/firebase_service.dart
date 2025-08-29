import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';

class FirebaseService {
  static FirebaseService? _instance;
  static FirebaseService get instance => _instance ??= FirebaseService._();
  
  FirebaseService._();
  
  late FirebaseApp _app;
  late FirebaseAuth _auth;
  late FirebaseFirestore _firestore;
  late FirebaseStorage _storage;
  late FirebaseAnalytics _analytics;
  late FirebaseMessaging _messaging;
  late FirebaseFunctions _functions;
  
  bool _initialized = false;
  
  FirebaseApp get app => _app;
  FirebaseAuth get auth => _auth;
  FirebaseFirestore get firestore => _firestore;
  FirebaseStorage get storage => _storage;
  FirebaseAnalytics get analytics => _analytics;
  FirebaseMessaging get messaging => _messaging;
  FirebaseFunctions get functions => _functions;
  
  bool get isInitialized => _initialized;
  
  Future<void> initialize() async {
    if (_initialized) return;
    
    try {
      debugPrint('Initializing Firebase...');
      
      // For now, skip actual Firebase initialization to avoid configuration issues
      // In production, uncomment these lines with proper Firebase configuration
      
      // _app = await Firebase.initializeApp();
      // _auth = FirebaseAuth.instance;
      // _firestore = FirebaseFirestore.instance;
      // _storage = FirebaseStorage.instance;
      // _analytics = FirebaseAnalytics.instance;
      // _messaging = FirebaseMessaging.instance;
      // _functions = FirebaseFunctions.instance;
      
      _initialized = true;
      debugPrint('Firebase initialization skipped (test mode)');
    } catch (e) {
      debugPrint('Firebase initialization error: $e');
      // Don't rethrow to allow app to run without Firebase
    }
  }
  
  // Mock sign in for testing
  Future<User?> signInWithEmailPassword(String email, String password) async {
    debugPrint('Mock sign in: $email');
    // Return null to simulate no Firebase connection
    return null;
  }
  
  Future<void> signOut() async {
    debugPrint('Mock sign out');
  }
  
  User? get currentUser => null;
  
  Stream<User?> get authStateChanges => Stream.value(null);
}