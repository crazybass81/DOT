import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:flutter/foundation.dart';

import '../constants/app_constants.dart';
import '../errors/exceptions.dart';

class LocationService {
  StreamSubscription<Position>? _positionStream;
  Position? _lastKnownPosition;

  /// Initialize location service and check permissions
  Future<void> initialize() async {
    try {
      await _checkLocationPermissions();
    } catch (e) {
      debugPrint('Location service initialization failed: $e');
    }
  }

  /// Check and request location permissions
  Future<void> _checkLocationPermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationException(
        message: 'Location services are disabled. Please enable location services.',
      );
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw const LocationPermissionException(
          message: 'Location permission denied. Please grant location access.',
        );
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw const LocationPermissionException(
        message: 'Location permissions are permanently denied. Please enable in settings.',
      );
    }
  }

  /// Get current location
  Future<Position> getCurrentLocation({
    bool highAccuracy = true,
    Duration timeout = const Duration(seconds: 30),
  }) async {
    try {
      await _checkLocationPermissions();

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: highAccuracy ? LocationAccuracy.high : LocationAccuracy.medium,
        timeLimit: timeout,
      );

      _lastKnownPosition = position;
      return position;
    } catch (e) {
      if (e is LocationException || e is LocationPermissionException) {
        rethrow;
      }
      
      debugPrint('Failed to get current location: $e');
      throw LocationException(
        message: 'Failed to get current location: ${e.toString()}',
      );
    }
  }

  /// Get last known position
  Position? getLastKnownPosition() {
    return _lastKnownPosition;
  }

  /// Start listening to location changes
  StreamSubscription<Position> startLocationUpdates({
    LocationAccuracy accuracy = LocationAccuracy.high,
    int distanceFilter = 10,
    Duration interval = const Duration(seconds: 30),
  }) {
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10,
    );

    _positionStream = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen(
      (position) {
        _lastKnownPosition = position;
      },
      onError: (error) {
        debugPrint('Location stream error: $error');
      },
    );

    return _positionStream!;
  }

  /// Stop listening to location changes
  void stopLocationUpdates() {
    _positionStream?.cancel();
    _positionStream = null;
  }

  /// Calculate distance between two positions in meters
  double calculateDistance(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
  }

  /// Check if current location is within attendance radius
  Future<bool> isWithinAttendanceRadius(
    double workLatitude,
    double workLongitude, {
    double radius = AppConstants.attendanceRadius,
  }) async {
    try {
      final currentPosition = await getCurrentLocation();
      final distance = calculateDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        workLatitude,
        workLongitude,
      );

      return distance <= radius;
    } catch (e) {
      debugPrint('Failed to check attendance radius: $e');
      return false;
    }
  }

  /// Get address from coordinates (Reverse Geocoding)
  Future<String> getAddressFromCoordinates(
    double latitude,
    double longitude,
  ) async {
    try {
      final placemarks = await placemarkFromCoordinates(latitude, longitude);
      
      if (placemarks.isNotEmpty) {
        final place = placemarks.first;
        final address = [
          place.street,
          place.locality,
          place.administrativeArea,
          place.country,
        ].where((element) => element?.isNotEmpty == true).join(', ');
        
        return address.isNotEmpty ? address : 'Unknown location';
      }
      
      return 'Unknown location';
    } catch (e) {
      debugPrint('Failed to get address from coordinates: $e');
      return 'Unknown location';
    }
  }

  /// Get coordinates from address (Geocoding)
  Future<Position?> getCoordinatesFromAddress(String address) async {
    try {
      final locations = await locationFromAddress(address);
      
      if (locations.isNotEmpty) {
        final location = locations.first;
        return Position(
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: DateTime.now(),
          accuracy: 0,
          altitude: 0,
          altitudeAccuracy: 0,
          heading: 0,
          headingAccuracy: 0,
          speed: 0,
          speedAccuracy: 0,
        );
      }
      
      return null;
    } catch (e) {
      debugPrint('Failed to get coordinates from address: $e');
      return null;
    }
  }

  /// Check if location services are enabled
  Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  /// Open location settings
  Future<void> openLocationSettings() async {
    await Geolocator.openLocationSettings();
  }

  /// Open app settings
  Future<void> openAppSettings() async {
    await Geolocator.openAppSettings();
  }

  /// Get location permission status
  Future<LocationPermission> getLocationPermission() async {
    return await Geolocator.checkPermission();
  }

  /// Format coordinates for display
  String formatCoordinates(double latitude, double longitude) {
    return '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';
  }

  /// Validate coordinates
  bool isValidCoordinates(double latitude, double longitude) {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  /// Dispose resources
  void dispose() {
    stopLocationUpdates();
  }
}