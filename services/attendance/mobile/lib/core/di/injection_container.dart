import 'package:get_it/get_it.dart';
import 'package:injectable/injectable.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../network/dio_client.dart';
import '../storage/secure_storage_service.dart';
import '../storage/local_storage_service.dart';
import '../services/location_service.dart';
import '../services/notification_service.dart';
import '../services/biometric_service.dart';
import '../services/camera_service.dart';
import '../services/qr_service.dart';

import '../../data/datasources/auth/auth_local_datasource.dart';
import '../../data/datasources/auth/auth_remote_datasource.dart';
import '../../data/datasources/attendance/attendance_local_datasource.dart';
import '../../data/datasources/attendance/attendance_remote_datasource.dart';
import '../../data/datasources/user/user_local_datasource.dart';
import '../../data/datasources/user/user_remote_datasource.dart';

import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/attendance_repository_impl.dart';
import '../../data/repositories/user_repository_impl.dart';

import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/attendance_repository.dart';
import '../../domain/repositories/user_repository.dart';

import '../../domain/usecases/auth/login_usecase.dart';
import '../../domain/usecases/auth/logout_usecase.dart';
import '../../domain/usecases/auth/refresh_token_usecase.dart';
import '../../domain/usecases/auth/verify_biometric_usecase.dart';

import '../../domain/usecases/attendance/check_in_usecase.dart';
import '../../domain/usecases/attendance/check_out_usecase.dart';
import '../../domain/usecases/attendance/get_attendance_history_usecase.dart';
import '../../domain/usecases/attendance/get_attendance_status_usecase.dart';

import '../../domain/usecases/user/get_user_profile_usecase.dart';
import '../../domain/usecases/user/update_user_profile_usecase.dart';
import '../../domain/usecases/user/upload_avatar_usecase.dart';

import 'injection_container.config.dart';

final getIt = GetIt.instance;

@InjectableInit()
Future<void> configureDependencies() async => getIt.init();

@module
abstract class RegisterModule {
  @preResolve
  Future<SharedPreferences> get sharedPreferences => SharedPreferences.getInstance();

  @singleton
  FlutterSecureStorage get secureStorage => const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  @singleton
  Dio get dio => DioClient().dio;

  // Core Services
  @singleton
  SecureStorageService secureStorageService(FlutterSecureStorage storage) =>
      SecureStorageService(storage);

  @singleton
  LocalStorageService localStorageService(SharedPreferences prefs) =>
      LocalStorageService(prefs);

  @singleton
  LocationService get locationService => LocationService();

  @singleton
  NotificationService get notificationService => NotificationService();

  @singleton
  BiometricService get biometricService => BiometricService();

  @singleton
  CameraService get cameraService => CameraService();

  @singleton
  QrService get qrService => QrService();

  // Data Sources
  @singleton
  AuthLocalDataSource authLocalDataSource(
    SecureStorageService secureStorage,
    LocalStorageService localStorage,
  ) => AuthLocalDataSourceImpl(secureStorage, localStorage);

  @singleton
  AuthRemoteDataSource authRemoteDataSource(Dio dio) =>
      AuthRemoteDataSourceImpl(dio);

  @singleton
  AttendanceLocalDataSource attendanceLocalDataSource(
    LocalStorageService localStorage,
  ) => AttendanceLocalDataSourceImpl(localStorage);

  @singleton
  AttendanceRemoteDataSource attendanceRemoteDataSource(Dio dio) =>
      AttendanceRemoteDataSourceImpl(dio);

  @singleton
  UserLocalDataSource userLocalDataSource(
    LocalStorageService localStorage,
  ) => UserLocalDataSourceImpl(localStorage);

  @singleton
  UserRemoteDataSource userRemoteDataSource(Dio dio) =>
      UserRemoteDataSourceImpl(dio);

  // Repositories
  @singleton
  AuthRepository authRepository(
    AuthLocalDataSource localDataSource,
    AuthRemoteDataSource remoteDataSource,
  ) => AuthRepositoryImpl(localDataSource, remoteDataSource);

  @singleton
  AttendanceRepository attendanceRepository(
    AttendanceLocalDataSource localDataSource,
    AttendanceRemoteDataSource remoteDataSource,
  ) => AttendanceRepositoryImpl(localDataSource, remoteDataSource);

  @singleton
  UserRepository userRepository(
    UserLocalDataSource localDataSource,
    UserRemoteDataSource remoteDataSource,
  ) => UserRepositoryImpl(localDataSource, remoteDataSource);

  // Use Cases - Auth
  @singleton
  LoginUseCase loginUseCase(AuthRepository repository) =>
      LoginUseCase(repository);

  @singleton
  LogoutUseCase logoutUseCase(AuthRepository repository) =>
      LogoutUseCase(repository);

  @singleton
  RefreshTokenUseCase refreshTokenUseCase(AuthRepository repository) =>
      RefreshTokenUseCase(repository);

  @singleton
  VerifyBiometricUseCase verifyBiometricUseCase(
    AuthRepository repository,
    BiometricService biometricService,
  ) => VerifyBiometricUseCase(repository, biometricService);

  // Use Cases - Attendance
  @singleton
  CheckInUseCase checkInUseCase(
    AttendanceRepository repository,
    LocationService locationService,
  ) => CheckInUseCase(repository, locationService);

  @singleton
  CheckOutUseCase checkOutUseCase(
    AttendanceRepository repository,
    LocationService locationService,
  ) => CheckOutUseCase(repository, locationService);

  @singleton
  GetAttendanceHistoryUseCase getAttendanceHistoryUseCase(
    AttendanceRepository repository,
  ) => GetAttendanceHistoryUseCase(repository);

  @singleton
  GetAttendanceStatusUseCase getAttendanceStatusUseCase(
    AttendanceRepository repository,
  ) => GetAttendanceStatusUseCase(repository);

  // Use Cases - User
  @singleton
  GetUserProfileUseCase getUserProfileUseCase(UserRepository repository) =>
      GetUserProfileUseCase(repository);

  @singleton
  UpdateUserProfileUseCase updateUserProfileUseCase(UserRepository repository) =>
      UpdateUserProfileUseCase(repository);

  @singleton
  UploadAvatarUseCase uploadAvatarUseCase(
    UserRepository repository,
    CameraService cameraService,
  ) => UploadAvatarUseCase(repository, cameraService);
}