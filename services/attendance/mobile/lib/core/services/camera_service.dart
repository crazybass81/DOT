import 'dart:io';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../constants/app_constants.dart';
import '../errors/exceptions.dart' as app_exceptions;

class CameraService {
  static final CameraService _instance = CameraService._internal();
  factory CameraService() => _instance;
  CameraService._internal();

  final ImagePicker _imagePicker = ImagePicker();
  List<CameraDescription>? _cameras;
  CameraController? _cameraController;

  /// Initialize camera service
  Future<void> initialize() async {
    try {
      _cameras = await availableCameras();
    } catch (e) {
      debugPrint('Failed to initialize cameras: $e');
      throw app_exceptions.CameraException(message: 'Failed to initialize camera: $e');
    }
  }

  /// Get available cameras
  Future<List<CameraDescription>> getAvailableCameras() async {
    if (_cameras == null) {
      await initialize();
    }
    return _cameras ?? [];
  }

  /// Initialize camera controller
  Future<CameraController> initializeCameraController({
    CameraLensDirection direction = CameraLensDirection.back,
    ResolutionPreset resolution = ResolutionPreset.high,
  }) async {
    try {
      // Check camera permission
      await _checkCameraPermission();

      if (_cameras == null || _cameras!.isEmpty) {
        throw const app_exceptions.CameraException(message: 'No cameras available');
      }

      // Find camera with specified direction
      CameraDescription? camera;
      try {
        camera = _cameras!.firstWhere((cam) => cam.lensDirection == direction);
      } catch (e) {
        // If specified direction not found, use the first available camera
        camera = _cameras!.first;
      }

      // Dispose existing controller
      await _cameraController?.dispose();

      // Create new controller
      _cameraController = CameraController(
        camera,
        resolution,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _cameraController!.initialize();
      return _cameraController!;
    } catch (e) {
      debugPrint('Failed to initialize camera controller: $e');
      if (e is app_exceptions.CameraException || e is app_exceptions.CameraPermissionException) {
        rethrow;
      }
      throw app_exceptions.CameraException(message: 'Failed to initialize camera: $e');
    }
  }

  /// Take a picture using camera controller
  Future<XFile> takePicture() async {
    try {
      if (_cameraController == null || !_cameraController!.value.isInitialized) {
        throw const app_exceptions.CameraException(message: 'Camera is not initialized');
      }

      if (_cameraController!.value.isTakingPicture) {
        throw const app_exceptions.CameraException(message: 'Camera is already taking a picture');
      }

      final image = await _cameraController!.takePicture();
      return image;
    } catch (e) {
      debugPrint('Failed to take picture: $e');
      if (e is app_exceptions.CameraException) {
        rethrow;
      }
      throw app_exceptions.CameraException(message: 'Failed to take picture: $e');
    }
  }

  /// Pick image from gallery
  Future<XFile?> pickImageFromGallery({
    int imageQuality = AppConstants.imageQuality,
    double? maxWidth = AppConstants.imageMaxWidth,
    double? maxHeight = AppConstants.imageMaxHeight,
  }) async {
    try {
      await _checkStoragePermission();

      final image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: imageQuality,
        maxWidth: maxWidth,
        maxHeight: maxHeight,
      );

      return image;
    } catch (e) {
      debugPrint('Failed to pick image from gallery: $e');
      if (e is app_exceptions.CameraPermissionException) {
        rethrow;
      }
      throw app_exceptions.CameraException(message: 'Failed to pick image from gallery: $e');
    }
  }

  /// Pick image from camera
  Future<XFile?> pickImageFromCamera({
    int imageQuality = AppConstants.imageQuality,
    double? maxWidth = AppConstants.imageMaxWidth,
    double? maxHeight = AppConstants.imageMaxHeight,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
  }) async {
    try {
      await _checkCameraPermission();

      final image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: imageQuality,
        maxWidth: maxWidth,
        maxHeight: maxHeight,
        preferredCameraDevice: preferredCameraDevice,
      );

      return image;
    } catch (e) {
      debugPrint('Failed to pick image from camera: $e');
      if (e is app_exceptions.CameraPermissionException) {
        rethrow;
      }
      throw app_exceptions.CameraException(message: 'Failed to pick image from camera: $e');
    }
  }

  /// Show image source selection (camera or gallery)
  Future<XFile?> pickImage({
    ImageSource? source,
    int imageQuality = AppConstants.imageQuality,
    double? maxWidth = AppConstants.imageMaxWidth,
    double? maxHeight = AppConstants.imageMaxHeight,
  }) async {
    if (source != null) {
      switch (source) {
        case ImageSource.camera:
          return await pickImageFromCamera(
            imageQuality: imageQuality,
            maxWidth: maxWidth,
            maxHeight: maxHeight,
          );
        case ImageSource.gallery:
          return await pickImageFromGallery(
            imageQuality: imageQuality,
            maxWidth: maxWidth,
            maxHeight: maxHeight,
          );
      }
    }

    // If no source specified, let the implementation decide
    return await _imagePicker.pickImage(
      source: ImageSource.gallery, // Default to gallery
      imageQuality: imageQuality,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
    );
  }

  /// Crop image
  Future<CroppedFile?> cropImage(
    String imagePath, {
    List<CropAspectRatioPreset> aspectRatioPresets = const [
      CropAspectRatioPreset.original,
      CropAspectRatioPreset.square,
      CropAspectRatioPreset.ratio3x2,
      CropAspectRatioPreset.ratio4x3,
      CropAspectRatioPreset.ratio16x9
    ],
    CropAspectRatio? aspectRatio,
  }) async {
    try {
      final croppedFile = await ImageCropper().cropImage(
        sourcePath: imagePath,
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Crop Image',
            toolbarColor: Color(0xFF2E7D32),
            toolbarWidgetColor: Colors.white,
            backgroundColor: Colors.black,
            activeControlsWidgetColor: Color(0xFF2E7D32),
            initAspectRatio: CropAspectRatioPreset.original,
            lockAspectRatio: false,
            hideBottomControls: false,
            aspectRatioPresets: aspectRatioPresets,
          ),
          IOSUiSettings(
            title: 'Crop Image',
            doneButtonTitle: 'Done',
            cancelButtonTitle: 'Cancel',
            aspectRatioPresets: aspectRatioPresets,
          ),
        ],
      );

      return croppedFile;
    } catch (e) {
      debugPrint('Failed to crop image: $e');
      throw app_exceptions.CameraException(message: 'Failed to crop image: $e');
    }
  }

  /// Get image file size in bytes
  Future<int> getImageSize(String imagePath) async {
    try {
      final file = File(imagePath);
      return await file.length();
    } catch (e) {
      debugPrint('Failed to get image size: $e');
      return 0;
    }
  }

  /// Check if image size is within limits
  Future<bool> isImageSizeValid(String imagePath) async {
    try {
      final size = await getImageSize(imagePath);
      return size <= AppConstants.maxImageSize;
    } catch (e) {
      debugPrint('Failed to validate image size: $e');
      return false;
    }
  }

  /// Validate image file
  Future<bool> isValidImageFile(String imagePath) async {
    try {
      final file = File(imagePath);
      if (!await file.exists()) {
        return false;
      }

      // Check file extension
      final extension = imagePath.toLowerCase().split('.').last;
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      if (!validExtensions.contains(extension)) {
        return false;
      }

      // Check file size
      return await isImageSizeValid(imagePath);
    } catch (e) {
      debugPrint('Failed to validate image file: $e');
      return false;
    }
  }

  /// Check camera permission
  Future<void> _checkCameraPermission() async {
    final status = await Permission.camera.status;
    
    if (status.isDenied) {
      final result = await Permission.camera.request();
      if (!result.isGranted) {
        throw const app_exceptions.CameraPermissionException(
          message: 'Camera permission is required to take photos',
        );
      }
    } else if (status.isPermanentlyDenied) {
      throw const app_exceptions.CameraPermissionException(
        message: 'Camera permission is permanently denied. Please enable it in settings.',
      );
    }
  }

  /// Check storage permission (for Android < 13)
  Future<void> _checkStoragePermission() async {
    if (Platform.isAndroid) {
      final status = await Permission.storage.status;
      
      if (status.isDenied) {
        final result = await Permission.storage.request();
        if (!result.isGranted) {
          throw const app_exceptions.CameraPermissionException(
            message: 'Storage permission is required to access photos',
          );
        }
      } else if (status.isPermanentlyDenied) {
        throw const app_exceptions.CameraPermissionException(
          message: 'Storage permission is permanently denied. Please enable it in settings.',
        );
      }
    }
  }

  /// Dispose camera controller
  Future<void> dispose() async {
    await _cameraController?.dispose();
    _cameraController = null;
  }

  /// Get camera controller
  CameraController? get cameraController => _cameraController;

  /// Check if camera is initialized
  bool get isInitialized => _cameraController?.value.isInitialized ?? false;

  /// Check if camera is recording
  bool get isRecording => _cameraController?.value.isRecordingVideo ?? false;

  /// Get current camera description
  CameraDescription? get currentCamera => _cameraController?.description;
}