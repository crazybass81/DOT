# Security Hardening Guide for DOT ATTENDANCE

## Current Security Assessment

### 🚨 Critical Vulnerabilities Identified
1. **Token Storage**: Insufficient encryption and validation
2. **Network Security**: Missing certificate pinning and request signing
3. **Input Validation**: Inadequate sanitization across layers
4. **Logging**: Debug information exposed in production
5. **Biometric Storage**: Plain text credential storage
6. **Session Management**: Weak token refresh mechanism

### Security Score: 4/10 (Requires Immediate Attention)

---

## 1. Authentication & Authorization Security

### A. Secure Token Management Implementation

```dart
// lib/core/security/secure_token_manager.dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:pointycastle/export.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureTokenManager {
  final FlutterSecureStorage _storage;
  final String _deviceFingerprint;
  
  SecureTokenManager(this._storage) : _deviceFingerprint = _generateDeviceFingerprint();

  static String _generateDeviceFingerprint() {
    // Generate unique device fingerprint
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = Random.secure().nextInt(1000000);
    return sha256.convert(utf8.encode('$timestamp$random')).toString();
  }

  /// Store access token with AES encryption and integrity check
  Future<void> storeAccessToken(String token) async {
    try {
      final encryptionKey = await _getOrCreateEncryptionKey();
      final encryptedData = _encryptAES(token, encryptionKey);
      final hmac = _generateHMAC(encryptedData, encryptionKey);
      
      final secureData = {
        'data': base64.encode(encryptedData),
        'hmac': hmac,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'device': _deviceFingerprint,
        'version': 1,
      };

      await _storage.write(
        key: 'secure_access_token',
        value: json.encode(secureData),
      );
    } catch (e) {
      throw SecurityException('Token storage failed: ${e.toString()}');
    }
  }

  /// Retrieve and decrypt access token with integrity validation
  Future<String?> getAccessToken() async {
    try {
      final storedValue = await _storage.read(key: 'secure_access_token');
      if (storedValue == null) return null;

      final data = json.decode(storedValue) as Map<String, dynamic>;
      
      // Validate device fingerprint
      if (data['device'] != _deviceFingerprint) {
        await _clearTokens();
        throw SecurityException('Device fingerprint mismatch');
      }
      
      // Check token age
      final timestamp = data['timestamp'] as int;
      if (DateTime.now().millisecondsSinceEpoch - timestamp > Duration(hours: 8).inMilliseconds) {
        await _clearTokens();
        return null; // Token expired
      }

      final encryptionKey = await _getOrCreateEncryptionKey();
      final encryptedData = base64.decode(data['data']);
      final storedHMAC = data['hmac'];
      
      // Verify integrity
      final expectedHMAC = _generateHMAC(encryptedData, encryptionKey);
      if (storedHMAC != expectedHMAC) {
        await _clearTokens();
        throw SecurityException('Token integrity check failed');
      }

      return _decryptAES(encryptedData, encryptionKey);
    } catch (e) {
      throw SecurityException('Token retrieval failed: ${e.toString()}');
    }
  }

  Uint8List _encryptAES(String plaintext, Uint8List key) {
    final cipher = AESEngine()..init(true, KeyParameter(key));
    final plaintextBytes = utf8.encode(plaintext);
    
    // Pad to block size
    final padded = _addPKCS7Padding(plaintextBytes, cipher.blockSize);
    final encrypted = Uint8List(padded.length);
    
    for (int i = 0; i < padded.length; i += cipher.blockSize) {
      cipher.processBlock(padded, i, encrypted, i);
    }
    
    return encrypted;
  }

  String _decryptAES(Uint8List ciphertext, Uint8List key) {
    final cipher = AESEngine()..init(false, KeyParameter(key));
    final decrypted = Uint8List(ciphertext.length);
    
    for (int i = 0; i < ciphertext.length; i += cipher.blockSize) {
      cipher.processBlock(ciphertext, i, decrypted, i);
    }
    
    final unpadded = _removePKCS7Padding(decrypted);
    return utf8.decode(unpadded);
  }

  String _generateHMAC(Uint8List data, Uint8List key) {
    final hmac = Hmac(sha256, key);
    return hmac.convert(data).toString();
  }

  Future<Uint8List> _getOrCreateEncryptionKey() async {
    const keyName = 'aes_encryption_key';
    final existingKey = await _storage.read(key: keyName);
    
    if (existingKey != null) {
      return base64.decode(existingKey);
    }
    
    // Generate new 256-bit AES key
    final secureRandom = SecureRandom('Fortuna');
    secureRandom.seed(KeyParameter(Uint8List.fromList(
      List.generate(32, (_) => Random.secure().nextInt(256))
    )));
    
    final key = secureRandom.nextBytes(32);
    await _storage.write(key: keyName, value: base64.encode(key));
    
    return key;
  }

  Future<void> _clearTokens() async {
    await _storage.delete(key: 'secure_access_token');
    await _storage.delete(key: 'secure_refresh_token');
  }
}
```

### B. Enhanced Biometric Security

```dart
// lib/core/security/biometric_security.dart
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:local_auth/local_auth.dart';
import '../storage/secure_storage_service.dart';

class BiometricSecurity {
  final LocalAuthentication _localAuth;
  final SecureStorageService _storage;
  
  BiometricSecurity(this._localAuth, this._storage);

  /// Store biometric credentials with additional security layers
  Future<void> storeBiometricCredentials({
    required String username,
    required String password,
  }) async {
    // Verify biometric authentication first
    final authenticated = await _localAuth.authenticate(
      localizedReason: 'Authenticate to enable biometric login',
      options: const AuthenticationOptions(
        biometricOnly: true,
        stickyAuth: true,
      ),
    );
    
    if (!authenticated) {
      throw BiometricException('Biometric authentication failed');
    }

    // Hash credentials with salt
    final salt = _generateSalt();
    final hashedUsername = _hashWithSalt(username, salt);
    final hashedPassword = _hashWithSalt(password, salt);
    
    final biometricData = {
      'username': hashedUsername,
      'password': hashedPassword,
      'salt': base64.encode(salt),
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };

    await _storage.storeSecureData(
      'biometric_credentials',
      json.encode(biometricData),
    );
  }

  /// Retrieve biometric credentials with authentication
  Future<Map<String, String>?> getBiometricCredentials() async {
    try {
      // Require biometric authentication
      final authenticated = await _localAuth.authenticate(
        localizedReason: 'Authenticate to login with biometrics',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );
      
      if (!authenticated) return null;

      final storedData = await _storage.getSecureData('biometric_credentials');
      if (storedData == null) return null;

      final data = json.decode(storedData) as Map<String, dynamic>;
      
      // Check if credentials are still valid (30 days max)
      final timestamp = data['timestamp'] as int;
      if (DateTime.now().millisecondsSinceEpoch - timestamp > Duration(days: 30).inMilliseconds) {
        await _clearBiometricCredentials();
        return null;
      }

      // Note: In a real implementation, you would need to store the original
      // credentials in a recoverable format, not just hashed
      // This is a simplified example
      return {
        'username': data['username'],
        'password': data['password'],
      };
    } catch (e) {
      throw BiometricException('Failed to retrieve biometric credentials');
    }
  }

  List<int> _generateSalt() {
    return List.generate(16, (_) => Random.secure().nextInt(256));
  }

  String _hashWithSalt(String data, List<int> salt) {
    final bytes = utf8.encode(data) + salt;
    return sha256.convert(bytes).toString();
  }

  Future<void> _clearBiometricCredentials() async {
    await _storage.deleteSecureData('biometric_credentials');
  }
}
```

## 2. Network Security Hardening

### A. Certificate Pinning Implementation

```dart
// lib/core/network/certificate_pinning.dart
import 'dart:io';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:crypto/crypto.dart';

class CertificatePinning {
  static const List<String> _pinnedCertificates = [
    // SHA-256 fingerprints of your API server certificates
    'YOUR_API_CERT_SHA256_FINGERPRINT_HERE',
    'BACKUP_CERT_SHA256_FINGERPRINT_HERE',
  ];

  static Dio createSecureDio() {
    final dio = Dio();
    
    // Add certificate pinning interceptor
    dio.interceptors.add(InterceptorsWrapper(
      onError: (error, handler) {
        if (error.type == DioExceptionType.connectionError) {
          // Check if it's a certificate error
          if (error.error is HandshakeException) {
            throw SecurityException('Certificate validation failed');
          }
        }
        handler.next(error);
      },
    ));

    // Configure HttpClient with certificate validation
    (dio.httpClientAdapter as IOHttpClientAdapter).createHttpClient = () {
      final client = HttpClient();
      
      client.badCertificateCallback = (cert, host, port) {
        // Verify certificate fingerprint
        final certBytes = cert.der;
        final certHash = sha256.convert(certBytes).toString();
        
        if (!_pinnedCertificates.contains(certHash.toUpperCase())) {
          return false; // Reject certificate
        }
        
        return true; // Accept pinned certificate
      };
      
      return client;
    };

    return dio;
  }
}
```

### B. Request Signing and Verification

```dart
// lib/core/network/request_signer.dart
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';

class RequestSigner {
  final String _apiSecret;
  
  RequestSigner(this._apiSecret);

  /// Sign API requests for integrity and authenticity
  void signRequest(RequestOptions options) {
    final timestamp = DateTime.now().millisecondsSinceEpoch.toString();
    final nonce = _generateNonce();
    
    // Create signature payload
    final signaturePayload = {
      'method': options.method,
      'url': options.uri.toString(),
      'timestamp': timestamp,
      'nonce': nonce,
    };
    
    // Add body hash if present
    if (options.data != null) {
      final bodyString = _serializeData(options.data);
      signaturePayload['body_hash'] = sha256.convert(utf8.encode(bodyString)).toString();
    }

    // Generate HMAC signature
    final payloadString = _canonicalize(signaturePayload);
    final signature = _generateHMAC(payloadString, _apiSecret);

    // Add security headers
    options.headers.addAll({
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
      'X-API-Version': '1.0',
    });
  }

  String _generateNonce() {
    final random = Random.secure();
    final bytes = List.generate(16, (_) => random.nextInt(256));
    return base64.encode(bytes);
  }

  String _serializeData(dynamic data) {
    if (data is String) return data;
    if (data is FormData) {
      // Handle FormData serialization
      return data.fields.map((field) => '${field.key}=${field.value}').join('&');
    }
    return json.encode(data);
  }

  String _canonicalize(Map<String, String> data) {
    final sorted = Map.fromEntries(
      data.entries.toList()..sort((a, b) => a.key.compareTo(b.key))
    );
    return sorted.entries.map((e) => '${e.key}=${e.value}').join('&');
  }

  String _generateHMAC(String data, String secret) {
    final key = utf8.encode(secret);
    final bytes = utf8.encode(data);
    final hmac = Hmac(sha256, key);
    return hmac.convert(bytes).toString();
  }
}
```

## 3. Input Validation and Sanitization

### A. Advanced Input Sanitizer

```dart
// lib/core/security/input_sanitizer.dart
class InputSanitizer {
  // SQL injection patterns
  static final _sqlPatterns = [
    RegExp(r'(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE){0,1}|INSERT( +INTO){0,1}|MERGE|SELECT|UPDATE|UNION( +ALL){0,1})\b)', caseSensitive: false),
    RegExp(r'(\b(AND|OR)\b.*?[>=<\'\"]+)', caseSensitive: false),
    RegExp(r'[\'\";\-\-]'),
  ];

  // XSS patterns
  static final _xssPatterns = [
    RegExp(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', caseSensitive: false),
    RegExp(r'javascript:', caseSensitive: false),
    RegExp(r'on\w+\s*=', caseSensitive: false),
    RegExp(r'<iframe', caseSensitive: false),
  ];

  // Path traversal patterns
  static final _pathTraversalPatterns = [
    RegExp(r'\.\.\/'),
    RegExp(r'\.\.\\'),
    RegExp(r'\.\.\%2f', caseSensitive: false),
    RegExp(r'\.\.\%5c', caseSensitive: false),
  ];

  static String sanitizeInput(String input, {InputType type = InputType.text}) {
    if (input.isEmpty) return input;
    
    String sanitized = input.trim();
    
    // Basic HTML encoding
    sanitized = _encodeHtmlEntities(sanitized);
    
    switch (type) {
      case InputType.email:
        sanitized = _sanitizeEmail(sanitized);
        break;
      case InputType.alphanumeric:
        sanitized = _sanitizeAlphanumeric(sanitized);
        break;
      case InputType.filename:
        sanitized = _sanitizeFilename(sanitized);
        break;
      case InputType.text:
      default:
        sanitized = _sanitizeText(sanitized);
        break;
    }
    
    return sanitized;
  }

  static bool isInputSafe(String input) {
    // Check for SQL injection
    for (final pattern in _sqlPatterns) {
      if (pattern.hasMatch(input)) return false;
    }
    
    // Check for XSS
    for (final pattern in _xssPatterns) {
      if (pattern.hasMatch(input)) return false;
    }
    
    // Check for path traversal
    for (final pattern in _pathTraversalPatterns) {
      if (pattern.hasMatch(input)) return false;
    }
    
    return true;
  }

  static String _encodeHtmlEntities(String input) {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#x27;')
        .replaceAll('/', '&#x2F;');
  }

  static String _sanitizeEmail(String email) {
    // Remove dangerous characters but preserve valid email format
    return email.replaceAll(RegExp(r'[<>"\'\(\)\[\]{}\\]'), '');
  }

  static String _sanitizeAlphanumeric(String input) {
    return input.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');
  }

  static String _sanitizeFilename(String filename) {
    // Remove path separators and dangerous characters
    return filename
        .replaceAll(RegExp(r'[\/\\:*?"<>|]'), '')
        .replaceAll('..', '');
  }

  static String _sanitizeText(String text) {
    // Remove potential script tags and dangerous patterns
    String sanitized = text;
    
    for (final pattern in _xssPatterns) {
      sanitized = sanitized.replaceAll(pattern, '');
    }
    
    return sanitized;
  }
}

enum InputType {
  text,
  email,
  alphanumeric,
  filename,
}
```

### B. Rate Limiting Implementation

```dart
// lib/core/security/rate_limiter.dart
class RateLimiter {
  final Map<String, List<DateTime>> _requests = {};
  final Map<String, DateTime> _blockedUntil = {};
  
  final int maxRequests;
  final Duration timeWindow;
  final Duration blockDuration;

  RateLimiter({
    this.maxRequests = 10,
    this.timeWindow = const Duration(minutes: 1),
    this.blockDuration = const Duration(minutes: 5),
  });

  bool isAllowed(String identifier) {
    final now = DateTime.now();
    
    // Check if currently blocked
    if (_blockedUntil.containsKey(identifier)) {
      if (now.isBefore(_blockedUntil[identifier]!)) {
        return false; // Still blocked
      } else {
        _blockedUntil.remove(identifier); // Unblock
      }
    }

    // Initialize or clean old requests
    _requests.putIfAbsent(identifier, () => []);
    final userRequests = _requests[identifier]!;
    
    // Remove old requests outside time window
    final cutoffTime = now.subtract(timeWindow);
    userRequests.removeWhere((time) => time.isBefore(cutoffTime));

    // Check rate limit
    if (userRequests.length >= maxRequests) {
      // Block user
      _blockedUntil[identifier] = now.add(blockDuration);
      return false;
    }

    // Record this request
    userRequests.add(now);
    return true;
  }

  void reset(String identifier) {
    _requests.remove(identifier);
    _blockedUntil.remove(identifier);
  }

  void blockUser(String identifier, Duration duration) {
    _blockedUntil[identifier] = DateTime.now().add(duration);
  }
}
```

## 4. Secure Logging System

### A. Production-Safe Logger

```dart
// lib/core/security/secure_logger.dart
import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';

class SecureLogger {
  static const List<String> _sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'credential',
    'pin',
    'otp',
    'ssn',
    'credit_card',
  ];

  static void log(String message, {
    String? tag,
    LogLevel level = LogLevel.info,
    Object? error,
    StackTrace? stackTrace,
  }) {
    // Only log in debug mode or for critical errors
    if (!kDebugMode && level != LogLevel.error && level != LogLevel.critical) {
      return;
    }

    final sanitizedMessage = _sanitizeLogMessage(message);
    final timestamp = DateTime.now().toIso8601String();
    final logEntry = '[$timestamp] ${level.name.toUpperCase()}: $sanitizedMessage';

    if (kDebugMode) {
      // Development logging
      developer.log(
        logEntry,
        name: tag ?? 'DOT_ATTENDANCE',
        error: error,
        stackTrace: stackTrace,
      );
    } else {
      // Production logging - send to crash reporting service
      _sendToCrashReporting(logEntry, error, stackTrace);
    }
  }

  static String _sanitizeLogMessage(String message) {
    String sanitized = message;
    
    // Mask sensitive information
    for (final key in _sensitiveKeys) {
      final pattern = RegExp('$key[\'\"\\s]*[:=][\'\"\\s]*[^\\s,}\\]]+', caseSensitive: false);
      sanitized = sanitized.replaceAllMapped(pattern, (match) {
        return '${match.group(0)?.substring(0, match.group(0)!.indexOf(':') + 1)}***MASKED***';
      });
    }
    
    // Mask tokens and keys
    sanitized = sanitized.replaceAll(RegExp(r'\b[A-Za-z0-9]{20,}\b'), '***TOKEN***');
    
    return sanitized;
  }

  static void _sendToCrashReporting(String message, Object? error, StackTrace? stackTrace) {
    // Implement crash reporting service integration
    // e.g., Firebase Crashlytics, Sentry, etc.
  }
}

enum LogLevel {
  debug,
  info,
  warning,
  error,
  critical,
}
```

## 5. Device Security Checks

### A. Root/Jailbreak Detection

```dart
// lib/core/security/device_security.dart
import 'dart:io';
import 'package:flutter/services.dart';

class DeviceSecurity {
  static const MethodChannel _channel = MethodChannel('device_security');

  static Future<SecurityCheckResult> performSecurityChecks() async {
    final results = SecurityCheckResult();

    // Check for root/jailbreak
    results.isRooted = await _checkForRoot();
    results.isJailbroken = await _checkForJailbreak();

    // Check for debugging
    results.isDebuggingEnabled = await _checkDebugging();

    // Check for hooking frameworks
    results.hasHookingFramework = await _checkHookingFrameworks();

    // Check app integrity
    results.isAppTampered = await _checkAppIntegrity();

    return results;
  }

  static Future<bool> _checkForRoot() async {
    if (!Platform.isAndroid) return false;

    try {
      // Check for common root indicators
      final rootIndicators = [
        '/system/app/Superuser.apk',
        '/sbin/su',
        '/system/bin/su',
        '/system/xbin/su',
        '/data/local/xbin/su',
        '/data/local/bin/su',
        '/system/sd/xbin/su',
        '/system/bin/failsafe/su',
        '/data/local/su',
      ];

      for (final path in rootIndicators) {
        if (await File(path).exists()) {
          return true;
        }
      }

      // Check for root management apps
      return await _channel.invokeMethod('checkRootApps') ?? false;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> _checkForJailbreak() async {
    if (!Platform.isIOS) return false;

    try {
      // Check for jailbreak indicators
      final jailbreakPaths = [
        '/Applications/Cydia.app',
        '/Library/MobileSubstrate/MobileSubstrate.dylib',
        '/bin/bash',
        '/usr/sbin/sshd',
        '/etc/apt',
        '/private/var/lib/apt/',
      ];

      for (final path in jailbreakPaths) {
        if (await File(path).exists()) {
          return true;
        }
      }

      return await _channel.invokeMethod('checkJailbreak') ?? false;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> _checkDebugging() async {
    try {
      return await _channel.invokeMethod('isDebugging') ?? false;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> _checkHookingFrameworks() async {
    try {
      return await _channel.invokeMethod('checkHookingFrameworks') ?? false;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> _checkAppIntegrity() async {
    try {
      return await _channel.invokeMethod('checkAppIntegrity') ?? false;
    } catch (e) {
      return false;
    }
  }
}

class SecurityCheckResult {
  bool isRooted = false;
  bool isJailbroken = false;
  bool isDebuggingEnabled = false;
  bool hasHookingFramework = false;
  bool isAppTampered = false;

  bool get isSecure =>
      !isRooted &&
      !isJailbroken &&
      !isDebuggingEnabled &&
      !hasHookingFramework &&
      !isAppTampered;

  List<String> get securityIssues {
    final issues = <String>[];
    if (isRooted) issues.add('Device is rooted');
    if (isJailbroken) issues.add('Device is jailbroken');
    if (isDebuggingEnabled) issues.add('Debugging is enabled');
    if (hasHookingFramework) issues.add('Hooking framework detected');
    if (isAppTampered) issues.add('App integrity compromised');
    return issues;
  }
}
```

## 6. Security Configuration

### A. Production Security Configuration

```dart
// lib/core/config/security_config.dart
class SecurityConfig {
  // Network security
  static const bool enableCertificatePinning = true;
  static const bool requireRequestSigning = true;
  static const Duration networkTimeout = Duration(seconds: 30);
  
  // Authentication
  static const Duration tokenLifetime = Duration(minutes: 15);
  static const Duration refreshTokenLifetime = Duration(days: 7);
  static const int maxLoginAttempts = 5;
  static const Duration lockoutDuration = Duration(minutes: 15);
  
  // Biometric security
  static const Duration biometricCredentialExpiry = Duration(days: 30);
  static const bool requireBiometricReauth = true;
  
  // Device security
  static const bool blockRootedDevices = true;
  static const bool blockJailbrokenDevices = true;
  static const bool blockDebuggingDevices = false; // Development only
  
  // Data protection
  static const bool enableDataEncryption = true;
  static const bool enableDatabaseEncryption = true;
  static const bool enableLogEncryption = false; // Performance impact
  
  // Rate limiting
  static const int maxRequestsPerMinute = 60;
  static const int maxLoginAttemptsPerMinute = 5;
  static const Duration rateLimitWindow = Duration(minutes: 1);
  
  // Security headers
  static const Map<String, String> securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
  };
}
```

## Security Implementation Checklist

### Immediate Actions (Week 1)
- [ ] Implement secure token storage with AES encryption
- [ ] Add certificate pinning for API calls
- [ ] Remove all debug logging from production builds
- [ ] Implement input sanitization across all forms
- [ ] Add request signing for critical operations

### Short-term (Weeks 2-3)
- [ ] Implement biometric security enhancements
- [ ] Add rate limiting for API endpoints
- [ ] Implement device security checks
- [ ] Add security headers to all requests
- [ ] Create secure logging system

### Medium-term (Weeks 4-6)
- [ ] Add SQL injection prevention
- [ ] Implement XSS protection
- [ ] Add session management security
- [ ] Create security monitoring dashboard
- [ ] Implement automated security testing

### Long-term (Months 2-3)
- [ ] Security audit by third party
- [ ] Penetration testing
- [ ] Security certification compliance
- [ ] Advanced threat protection
- [ ] Security incident response plan

## Security Monitoring

### Key Metrics to Track
1. Failed login attempts
2. Token refresh failures
3. Device security violations
4. Network security events
5. Input validation failures
6. Rate limiting triggers
7. Biometric authentication failures
8. Certificate pinning failures

### Alerting Thresholds
- **Critical**: Root/jailbreak detection, app tampering
- **High**: Multiple failed logins, certificate failures
- **Medium**: Rate limiting triggers, input validation failures
- **Low**: Normal security events, successful authentications

This security hardening guide provides a comprehensive approach to securing the DOT ATTENDANCE application against common threats and vulnerabilities. Implementation should be prioritized based on risk assessment and business requirements.