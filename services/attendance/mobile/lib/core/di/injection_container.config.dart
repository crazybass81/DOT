// dart format width=80
// GENERATED CODE - DO NOT MODIFY BY HAND

// **************************************************************************
// InjectableConfigGenerator
// **************************************************************************

// ignore_for_file: type=lint
// coverage:ignore-file

// ignore_for_file: no_leading_underscores_for_library_prefixes
import 'package:dio/dio.dart' as _i361;
import 'package:dot_attendance/core/di/injection_container.dart' as _i618;
import 'package:dot_attendance/core/services/biometric_service.dart' as _i404;
import 'package:dot_attendance/core/services/camera_service.dart' as _i28;
import 'package:dot_attendance/core/services/location_service.dart' as _i1063;
import 'package:dot_attendance/core/services/notification_service.dart'
    as _i342;
import 'package:dot_attendance/core/services/qr_service.dart' as _i30;
import 'package:dot_attendance/core/storage/local_storage_service.dart'
    as _i897;
import 'package:dot_attendance/core/storage/secure_storage_service.dart'
    as _i609;
import 'package:dot_attendance/data/datasources/attendance/attendance_local_datasource.dart'
    as _i307;
import 'package:dot_attendance/data/datasources/attendance/attendance_remote_datasource.dart'
    as _i648;
import 'package:dot_attendance/data/datasources/auth/auth_local_datasource.dart'
    as _i1017;
import 'package:dot_attendance/data/datasources/auth/auth_remote_datasource.dart'
    as _i1043;
import 'package:dot_attendance/data/datasources/user/user_local_datasource.dart'
    as _i937;
import 'package:dot_attendance/data/datasources/user/user_remote_datasource.dart'
    as _i946;
import 'package:dot_attendance/domain/repositories/attendance_repository.dart'
    as _i301;
import 'package:dot_attendance/domain/repositories/auth_repository.dart'
    as _i543;
import 'package:dot_attendance/domain/repositories/user_repository.dart'
    as _i837;
import 'package:dot_attendance/domain/usecases/attendance/check_in_usecase.dart'
    as _i819;
import 'package:dot_attendance/domain/usecases/attendance/check_out_usecase.dart'
    as _i755;
import 'package:dot_attendance/domain/usecases/attendance/get_attendance_history_usecase.dart'
    as _i895;
import 'package:dot_attendance/domain/usecases/attendance/get_attendance_status_usecase.dart'
    as _i1046;
import 'package:dot_attendance/domain/usecases/auth/login_usecase.dart'
    as _i687;
import 'package:dot_attendance/domain/usecases/auth/logout_usecase.dart'
    as _i364;
import 'package:dot_attendance/domain/usecases/auth/refresh_token_usecase.dart'
    as _i485;
import 'package:dot_attendance/domain/usecases/auth/verify_biometric_usecase.dart'
    as _i172;
import 'package:dot_attendance/domain/usecases/user/get_user_profile_usecase.dart'
    as _i662;
import 'package:dot_attendance/domain/usecases/user/update_user_profile_usecase.dart'
    as _i262;
import 'package:dot_attendance/domain/usecases/user/upload_avatar_usecase.dart'
    as _i155;
import 'package:flutter_secure_storage/flutter_secure_storage.dart' as _i558;
import 'package:get_it/get_it.dart' as _i174;
import 'package:injectable/injectable.dart' as _i526;
import 'package:shared_preferences/shared_preferences.dart' as _i460;

extension GetItInjectableX on _i174.GetIt {
// initializes the registration of main-scope dependencies inside of GetIt
  Future<_i174.GetIt> init({
    String? environment,
    _i526.EnvironmentFilter? environmentFilter,
  }) async {
    final gh = _i526.GetItHelper(
      this,
      environment,
      environmentFilter,
    );
    final registerModule = _$RegisterModule();
    await gh.factoryAsync<_i460.SharedPreferences>(
      () => registerModule.sharedPreferences,
      preResolve: true,
    );
    gh.singleton<_i558.FlutterSecureStorage>(
        () => registerModule.secureStorage);
    gh.singleton<_i361.Dio>(() => registerModule.dio);
    gh.singleton<_i1063.LocationService>(() => registerModule.locationService);
    gh.singleton<_i342.NotificationService>(
        () => registerModule.notificationService);
    gh.singleton<_i404.BiometricService>(() => registerModule.biometricService);
    gh.singleton<_i28.CameraService>(() => registerModule.cameraService);
    gh.singleton<_i30.QrService>(() => registerModule.qrService);
    gh.singleton<_i897.LocalStorageService>(() =>
        registerModule.localStorageService(gh<_i460.SharedPreferences>()));
    gh.singleton<_i1043.AuthRemoteDataSource>(
        () => registerModule.authRemoteDataSource(gh<_i361.Dio>()));
    gh.singleton<_i648.AttendanceRemoteDataSource>(
        () => registerModule.attendanceRemoteDataSource(gh<_i361.Dio>()));
    gh.singleton<_i946.UserRemoteDataSource>(
        () => registerModule.userRemoteDataSource(gh<_i361.Dio>()));
    gh.singleton<_i609.SecureStorageService>(() =>
        registerModule.secureStorageService(gh<_i558.FlutterSecureStorage>()));
    gh.singleton<_i307.AttendanceLocalDataSource>(() => registerModule
        .attendanceLocalDataSource(gh<_i897.LocalStorageService>()));
    gh.singleton<_i937.UserLocalDataSource>(() =>
        registerModule.userLocalDataSource(gh<_i897.LocalStorageService>()));
    gh.singleton<_i1017.AuthLocalDataSource>(
        () => registerModule.authLocalDataSource(
              gh<_i609.SecureStorageService>(),
              gh<_i897.LocalStorageService>(),
            ));
    gh.singleton<_i543.AuthRepository>(() => registerModule.authRepository(
          gh<_i1017.AuthLocalDataSource>(),
          gh<_i1043.AuthRemoteDataSource>(),
        ));
    gh.singleton<_i837.UserRepository>(() => registerModule.userRepository(
          gh<_i937.UserLocalDataSource>(),
          gh<_i946.UserRemoteDataSource>(),
        ));
    gh.singleton<_i301.AttendanceRepository>(
        () => registerModule.attendanceRepository(
              gh<_i307.AttendanceLocalDataSource>(),
              gh<_i648.AttendanceRemoteDataSource>(),
            ));
    gh.singleton<_i155.UploadAvatarUseCase>(
        () => registerModule.uploadAvatarUseCase(
              gh<_i837.UserRepository>(),
              gh<_i28.CameraService>(),
            ));
    gh.singleton<_i895.GetAttendanceHistoryUseCase>(() => registerModule
        .getAttendanceHistoryUseCase(gh<_i301.AttendanceRepository>()));
    gh.singleton<_i1046.GetAttendanceStatusUseCase>(() => registerModule
        .getAttendanceStatusUseCase(gh<_i301.AttendanceRepository>()));
    gh.singleton<_i172.VerifyBiometricUseCase>(
        () => registerModule.verifyBiometricUseCase(
              gh<_i543.AuthRepository>(),
              gh<_i404.BiometricService>(),
            ));
    gh.singleton<_i687.LoginUseCase>(
        () => registerModule.loginUseCase(gh<_i543.AuthRepository>()));
    gh.singleton<_i364.LogoutUseCase>(
        () => registerModule.logoutUseCase(gh<_i543.AuthRepository>()));
    gh.singleton<_i485.RefreshTokenUseCase>(
        () => registerModule.refreshTokenUseCase(gh<_i543.AuthRepository>()));
    gh.singleton<_i819.CheckInUseCase>(() => registerModule.checkInUseCase(
          gh<_i301.AttendanceRepository>(),
          gh<_i1063.LocationService>(),
        ));
    gh.singleton<_i755.CheckOutUseCase>(() => registerModule.checkOutUseCase(
          gh<_i301.AttendanceRepository>(),
          gh<_i1063.LocationService>(),
        ));
    gh.singleton<_i662.GetUserProfileUseCase>(
        () => registerModule.getUserProfileUseCase(gh<_i837.UserRepository>()));
    gh.singleton<_i262.UpdateUserProfileUseCase>(() =>
        registerModule.updateUserProfileUseCase(gh<_i837.UserRepository>()));
    return this;
  }
}

class _$RegisterModule extends _i618.RegisterModule {}
