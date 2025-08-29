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

// import 'injection_container.config.dart';

final getIt = GetIt.instance;

// @InjectableInit()
Future<void> configureDependencies() async {
  // Manual registration of dependencies
  // This replaces getIt.init() until build_runner issues are resolved
  
  // External dependencies
  final sharedPreferences = await SharedPreferences.getInstance();
  getIt.registerSingleton<SharedPreferences>(sharedPreferences);
  
  const flutterSecureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );
  getIt.registerSingleton<FlutterSecureStorage>(flutterSecureStorage);
  
  final dio = DioClient().dio;
  getIt.registerSingleton<Dio>(dio);

  // Core Services
  getIt.registerSingleton<SecureStorageService>(
    SecureStorageService(getIt<FlutterSecureStorage>()),
  );
  
  final localStorage = await LocalStorageService.initialize();
  getIt.registerSingleton<LocalStorageService>(localStorage);
  
  getIt.registerSingleton<LocationService>(LocationService());
  getIt.registerSingleton<NotificationService>(NotificationService());
  getIt.registerSingleton<BiometricService>(BiometricService());
  getIt.registerSingleton<CameraService>(CameraService());
  getIt.registerSingleton<QrService>(QrService());

  // Data Sources
  getIt.registerSingleton<AuthLocalDataSource>(
    AuthLocalDataSourceImpl(
      getIt<SecureStorageService>(),
      getIt<LocalStorageService>(),
    ),
  );
  
  getIt.registerSingleton<AuthRemoteDataSource>(
    AuthRemoteDataSourceImpl(getIt<Dio>()),
  );
  
  getIt.registerSingleton<AttendanceLocalDataSource>(
    AttendanceLocalDataSourceImpl(getIt<LocalStorageService>()),
  );
  
  getIt.registerSingleton<AttendanceRemoteDataSource>(
    AttendanceRemoteDataSourceImpl(getIt<Dio>()),
  );
  
  getIt.registerSingleton<UserLocalDataSource>(
    UserLocalDataSourceImpl(getIt<LocalStorageService>()),
  );
  
  getIt.registerSingleton<UserRemoteDataSource>(
    UserRemoteDataSourceImpl(getIt<Dio>()),
  );

  // Repositories
  getIt.registerSingleton<AuthRepository>(
    AuthRepositoryImpl(
      getIt<AuthLocalDataSource>(),
      getIt<AuthRemoteDataSource>(),
    ),
  );
  
  getIt.registerSingleton<AttendanceRepository>(
    AttendanceRepositoryImpl(
      getIt<AttendanceLocalDataSource>(),
      getIt<AttendanceRemoteDataSource>(),
    ),
  );
  
  getIt.registerSingleton<UserRepository>(
    UserRepositoryImpl(
      getIt<UserLocalDataSource>(),
      getIt<UserRemoteDataSource>(),
    ),
  );

  // Use Cases - Auth
  getIt.registerSingleton<LoginUseCase>(
    LoginUseCase(getIt<AuthRepository>()),
  );
  
  getIt.registerSingleton<LogoutUseCase>(
    LogoutUseCase(getIt<AuthRepository>()),
  );
  
  getIt.registerSingleton<RefreshTokenUseCase>(
    RefreshTokenUseCase(getIt<AuthRepository>()),
  );
  
  getIt.registerSingleton<VerifyBiometricUseCase>(
    VerifyBiometricUseCase(getIt<AuthRepository>()),
  );

  // Use Cases - Attendance
  getIt.registerSingleton<CheckInUseCase>(
    CheckInUseCase(getIt<AttendanceRepository>()),
  );
  
  getIt.registerSingleton<CheckOutUseCase>(
    CheckOutUseCase(getIt<AttendanceRepository>()),
  );
  
  getIt.registerSingleton<GetAttendanceHistoryUseCase>(
    GetAttendanceHistoryUseCase(getIt<AttendanceRepository>()),
  );
  
  getIt.registerSingleton<GetAttendanceStatusUseCase>(
    GetAttendanceStatusUseCase(getIt<AttendanceRepository>()),
  );

  // Use Cases - User
  getIt.registerSingleton<GetUserProfileUseCase>(
    GetUserProfileUseCase(getIt<UserRepository>()),
  );
  
  getIt.registerSingleton<UpdateUserProfileUseCase>(
    UpdateUserProfileUseCase(getIt<UserRepository>()),
  );
  
  getIt.registerSingleton<UploadAvatarUseCase>(
    UploadAvatarUseCase(getIt<UserRepository>()),
  );
}

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
  Future<LocalStorageService> localStorageService() async =>
      await LocalStorageService.initialize();

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
  ) => VerifyBiometricUseCase(repository);

  // Use Cases - Attendance
  @singleton
  CheckInUseCase checkInUseCase(
    AttendanceRepository repository,
  ) => CheckInUseCase(repository);

  @singleton
  CheckOutUseCase checkOutUseCase(
    AttendanceRepository repository,
  ) => CheckOutUseCase(repository);

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
  ) => UploadAvatarUseCase(repository);
}