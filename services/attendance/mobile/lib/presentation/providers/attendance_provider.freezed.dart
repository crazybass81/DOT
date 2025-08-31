// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'attendance_provider.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$AttendanceState {
  bool get isLoading => throw _privateConstructorUsedError;
  bool get isScanning => throw _privateConstructorUsedError;
  bool get isVerifying => throw _privateConstructorUsedError;
  bool get isMarkingAttendance => throw _privateConstructorUsedError;
  Attendance? get todayAttendance => throw _privateConstructorUsedError;
  AttendanceVerificationResult? get verificationResult =>
      throw _privateConstructorUsedError;
  String? get error => throw _privateConstructorUsedError;
  String? get successMessage => throw _privateConstructorUsedError;
  List<AttendanceQueue> get offlineQueue => throw _privateConstructorUsedError;
  DateTime? get lastSyncTime => throw _privateConstructorUsedError;
  bool get isSyncing => throw _privateConstructorUsedError; // PLAN-1: 근무 상태 관리
  String get currentStatus =>
      throw _privateConstructorUsedError; // NOT_WORKING, WORKING, ON_BREAK
  int get workingMinutes => throw _privateConstructorUsedError;
  int get breakMinutes => throw _privateConstructorUsedError;
  DateTime? get checkInTime => throw _privateConstructorUsedError;
  DateTime? get checkOutTime => throw _privateConstructorUsedError;
  DateTime? get breakStartTime => throw _privateConstructorUsedError;
  List<Map<String, dynamic>> get todayRecords =>
      throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $AttendanceStateCopyWith<AttendanceState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AttendanceStateCopyWith<$Res> {
  factory $AttendanceStateCopyWith(
          AttendanceState value, $Res Function(AttendanceState) then) =
      _$AttendanceStateCopyWithImpl<$Res, AttendanceState>;
  @useResult
  $Res call(
      {bool isLoading,
      bool isScanning,
      bool isVerifying,
      bool isMarkingAttendance,
      Attendance? todayAttendance,
      AttendanceVerificationResult? verificationResult,
      String? error,
      String? successMessage,
      List<AttendanceQueue> offlineQueue,
      DateTime? lastSyncTime,
      bool isSyncing,
      String currentStatus,
      int workingMinutes,
      int breakMinutes,
      DateTime? checkInTime,
      DateTime? checkOutTime,
      DateTime? breakStartTime,
      List<Map<String, dynamic>> todayRecords});

  $AttendanceCopyWith<$Res>? get todayAttendance;
  $AttendanceVerificationResultCopyWith<$Res>? get verificationResult;
}

/// @nodoc
class _$AttendanceStateCopyWithImpl<$Res, $Val extends AttendanceState>
    implements $AttendanceStateCopyWith<$Res> {
  _$AttendanceStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isLoading = null,
    Object? isScanning = null,
    Object? isVerifying = null,
    Object? isMarkingAttendance = null,
    Object? todayAttendance = freezed,
    Object? verificationResult = freezed,
    Object? error = freezed,
    Object? successMessage = freezed,
    Object? offlineQueue = null,
    Object? lastSyncTime = freezed,
    Object? isSyncing = null,
    Object? currentStatus = null,
    Object? workingMinutes = null,
    Object? breakMinutes = null,
    Object? checkInTime = freezed,
    Object? checkOutTime = freezed,
    Object? breakStartTime = freezed,
    Object? todayRecords = null,
  }) {
    return _then(_value.copyWith(
      isLoading: null == isLoading
          ? _value.isLoading
          : isLoading // ignore: cast_nullable_to_non_nullable
              as bool,
      isScanning: null == isScanning
          ? _value.isScanning
          : isScanning // ignore: cast_nullable_to_non_nullable
              as bool,
      isVerifying: null == isVerifying
          ? _value.isVerifying
          : isVerifying // ignore: cast_nullable_to_non_nullable
              as bool,
      isMarkingAttendance: null == isMarkingAttendance
          ? _value.isMarkingAttendance
          : isMarkingAttendance // ignore: cast_nullable_to_non_nullable
              as bool,
      todayAttendance: freezed == todayAttendance
          ? _value.todayAttendance
          : todayAttendance // ignore: cast_nullable_to_non_nullable
              as Attendance?,
      verificationResult: freezed == verificationResult
          ? _value.verificationResult
          : verificationResult // ignore: cast_nullable_to_non_nullable
              as AttendanceVerificationResult?,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
      successMessage: freezed == successMessage
          ? _value.successMessage
          : successMessage // ignore: cast_nullable_to_non_nullable
              as String?,
      offlineQueue: null == offlineQueue
          ? _value.offlineQueue
          : offlineQueue // ignore: cast_nullable_to_non_nullable
              as List<AttendanceQueue>,
      lastSyncTime: freezed == lastSyncTime
          ? _value.lastSyncTime
          : lastSyncTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      isSyncing: null == isSyncing
          ? _value.isSyncing
          : isSyncing // ignore: cast_nullable_to_non_nullable
              as bool,
      currentStatus: null == currentStatus
          ? _value.currentStatus
          : currentStatus // ignore: cast_nullable_to_non_nullable
              as String,
      workingMinutes: null == workingMinutes
          ? _value.workingMinutes
          : workingMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      breakMinutes: null == breakMinutes
          ? _value.breakMinutes
          : breakMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      checkInTime: freezed == checkInTime
          ? _value.checkInTime
          : checkInTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      checkOutTime: freezed == checkOutTime
          ? _value.checkOutTime
          : checkOutTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      breakStartTime: freezed == breakStartTime
          ? _value.breakStartTime
          : breakStartTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      todayRecords: null == todayRecords
          ? _value.todayRecords
          : todayRecords // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $AttendanceCopyWith<$Res>? get todayAttendance {
    if (_value.todayAttendance == null) {
      return null;
    }

    return $AttendanceCopyWith<$Res>(_value.todayAttendance!, (value) {
      return _then(_value.copyWith(todayAttendance: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $AttendanceVerificationResultCopyWith<$Res>? get verificationResult {
    if (_value.verificationResult == null) {
      return null;
    }

    return $AttendanceVerificationResultCopyWith<$Res>(
        _value.verificationResult!, (value) {
      return _then(_value.copyWith(verificationResult: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$AttendanceStateImplCopyWith<$Res>
    implements $AttendanceStateCopyWith<$Res> {
  factory _$$AttendanceStateImplCopyWith(_$AttendanceStateImpl value,
          $Res Function(_$AttendanceStateImpl) then) =
      __$$AttendanceStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool isLoading,
      bool isScanning,
      bool isVerifying,
      bool isMarkingAttendance,
      Attendance? todayAttendance,
      AttendanceVerificationResult? verificationResult,
      String? error,
      String? successMessage,
      List<AttendanceQueue> offlineQueue,
      DateTime? lastSyncTime,
      bool isSyncing,
      String currentStatus,
      int workingMinutes,
      int breakMinutes,
      DateTime? checkInTime,
      DateTime? checkOutTime,
      DateTime? breakStartTime,
      List<Map<String, dynamic>> todayRecords});

  @override
  $AttendanceCopyWith<$Res>? get todayAttendance;
  @override
  $AttendanceVerificationResultCopyWith<$Res>? get verificationResult;
}

/// @nodoc
class __$$AttendanceStateImplCopyWithImpl<$Res>
    extends _$AttendanceStateCopyWithImpl<$Res, _$AttendanceStateImpl>
    implements _$$AttendanceStateImplCopyWith<$Res> {
  __$$AttendanceStateImplCopyWithImpl(
      _$AttendanceStateImpl _value, $Res Function(_$AttendanceStateImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isLoading = null,
    Object? isScanning = null,
    Object? isVerifying = null,
    Object? isMarkingAttendance = null,
    Object? todayAttendance = freezed,
    Object? verificationResult = freezed,
    Object? error = freezed,
    Object? successMessage = freezed,
    Object? offlineQueue = null,
    Object? lastSyncTime = freezed,
    Object? isSyncing = null,
    Object? currentStatus = null,
    Object? workingMinutes = null,
    Object? breakMinutes = null,
    Object? checkInTime = freezed,
    Object? checkOutTime = freezed,
    Object? breakStartTime = freezed,
    Object? todayRecords = null,
  }) {
    return _then(_$AttendanceStateImpl(
      isLoading: null == isLoading
          ? _value.isLoading
          : isLoading // ignore: cast_nullable_to_non_nullable
              as bool,
      isScanning: null == isScanning
          ? _value.isScanning
          : isScanning // ignore: cast_nullable_to_non_nullable
              as bool,
      isVerifying: null == isVerifying
          ? _value.isVerifying
          : isVerifying // ignore: cast_nullable_to_non_nullable
              as bool,
      isMarkingAttendance: null == isMarkingAttendance
          ? _value.isMarkingAttendance
          : isMarkingAttendance // ignore: cast_nullable_to_non_nullable
              as bool,
      todayAttendance: freezed == todayAttendance
          ? _value.todayAttendance
          : todayAttendance // ignore: cast_nullable_to_non_nullable
              as Attendance?,
      verificationResult: freezed == verificationResult
          ? _value.verificationResult
          : verificationResult // ignore: cast_nullable_to_non_nullable
              as AttendanceVerificationResult?,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
      successMessage: freezed == successMessage
          ? _value.successMessage
          : successMessage // ignore: cast_nullable_to_non_nullable
              as String?,
      offlineQueue: null == offlineQueue
          ? _value._offlineQueue
          : offlineQueue // ignore: cast_nullable_to_non_nullable
              as List<AttendanceQueue>,
      lastSyncTime: freezed == lastSyncTime
          ? _value.lastSyncTime
          : lastSyncTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      isSyncing: null == isSyncing
          ? _value.isSyncing
          : isSyncing // ignore: cast_nullable_to_non_nullable
              as bool,
      currentStatus: null == currentStatus
          ? _value.currentStatus
          : currentStatus // ignore: cast_nullable_to_non_nullable
              as String,
      workingMinutes: null == workingMinutes
          ? _value.workingMinutes
          : workingMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      breakMinutes: null == breakMinutes
          ? _value.breakMinutes
          : breakMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      checkInTime: freezed == checkInTime
          ? _value.checkInTime
          : checkInTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      checkOutTime: freezed == checkOutTime
          ? _value.checkOutTime
          : checkOutTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      breakStartTime: freezed == breakStartTime
          ? _value.breakStartTime
          : breakStartTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      todayRecords: null == todayRecords
          ? _value._todayRecords
          : todayRecords // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
    ));
  }
}

/// @nodoc

class _$AttendanceStateImpl implements _AttendanceState {
  const _$AttendanceStateImpl(
      {this.isLoading = false,
      this.isScanning = false,
      this.isVerifying = false,
      this.isMarkingAttendance = false,
      this.todayAttendance,
      this.verificationResult,
      this.error,
      this.successMessage,
      final List<AttendanceQueue> offlineQueue = const [],
      this.lastSyncTime,
      this.isSyncing = false,
      this.currentStatus = 'NOT_WORKING',
      this.workingMinutes = 0,
      this.breakMinutes = 0,
      this.checkInTime,
      this.checkOutTime,
      this.breakStartTime,
      final List<Map<String, dynamic>> todayRecords = const []})
      : _offlineQueue = offlineQueue,
        _todayRecords = todayRecords;

  @override
  @JsonKey()
  final bool isLoading;
  @override
  @JsonKey()
  final bool isScanning;
  @override
  @JsonKey()
  final bool isVerifying;
  @override
  @JsonKey()
  final bool isMarkingAttendance;
  @override
  final Attendance? todayAttendance;
  @override
  final AttendanceVerificationResult? verificationResult;
  @override
  final String? error;
  @override
  final String? successMessage;
  final List<AttendanceQueue> _offlineQueue;
  @override
  @JsonKey()
  List<AttendanceQueue> get offlineQueue {
    if (_offlineQueue is EqualUnmodifiableListView) return _offlineQueue;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_offlineQueue);
  }

  @override
  final DateTime? lastSyncTime;
  @override
  @JsonKey()
  final bool isSyncing;
// PLAN-1: 근무 상태 관리
  @override
  @JsonKey()
  final String currentStatus;
// NOT_WORKING, WORKING, ON_BREAK
  @override
  @JsonKey()
  final int workingMinutes;
  @override
  @JsonKey()
  final int breakMinutes;
  @override
  final DateTime? checkInTime;
  @override
  final DateTime? checkOutTime;
  @override
  final DateTime? breakStartTime;
  final List<Map<String, dynamic>> _todayRecords;
  @override
  @JsonKey()
  List<Map<String, dynamic>> get todayRecords {
    if (_todayRecords is EqualUnmodifiableListView) return _todayRecords;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_todayRecords);
  }

  @override
  String toString() {
    return 'AttendanceState(isLoading: $isLoading, isScanning: $isScanning, isVerifying: $isVerifying, isMarkingAttendance: $isMarkingAttendance, todayAttendance: $todayAttendance, verificationResult: $verificationResult, error: $error, successMessage: $successMessage, offlineQueue: $offlineQueue, lastSyncTime: $lastSyncTime, isSyncing: $isSyncing, currentStatus: $currentStatus, workingMinutes: $workingMinutes, breakMinutes: $breakMinutes, checkInTime: $checkInTime, checkOutTime: $checkOutTime, breakStartTime: $breakStartTime, todayRecords: $todayRecords)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AttendanceStateImpl &&
            (identical(other.isLoading, isLoading) ||
                other.isLoading == isLoading) &&
            (identical(other.isScanning, isScanning) ||
                other.isScanning == isScanning) &&
            (identical(other.isVerifying, isVerifying) ||
                other.isVerifying == isVerifying) &&
            (identical(other.isMarkingAttendance, isMarkingAttendance) ||
                other.isMarkingAttendance == isMarkingAttendance) &&
            (identical(other.todayAttendance, todayAttendance) ||
                other.todayAttendance == todayAttendance) &&
            (identical(other.verificationResult, verificationResult) ||
                other.verificationResult == verificationResult) &&
            (identical(other.error, error) || other.error == error) &&
            (identical(other.successMessage, successMessage) ||
                other.successMessage == successMessage) &&
            const DeepCollectionEquality()
                .equals(other._offlineQueue, _offlineQueue) &&
            (identical(other.lastSyncTime, lastSyncTime) ||
                other.lastSyncTime == lastSyncTime) &&
            (identical(other.isSyncing, isSyncing) ||
                other.isSyncing == isSyncing) &&
            (identical(other.currentStatus, currentStatus) ||
                other.currentStatus == currentStatus) &&
            (identical(other.workingMinutes, workingMinutes) ||
                other.workingMinutes == workingMinutes) &&
            (identical(other.breakMinutes, breakMinutes) ||
                other.breakMinutes == breakMinutes) &&
            (identical(other.checkInTime, checkInTime) ||
                other.checkInTime == checkInTime) &&
            (identical(other.checkOutTime, checkOutTime) ||
                other.checkOutTime == checkOutTime) &&
            (identical(other.breakStartTime, breakStartTime) ||
                other.breakStartTime == breakStartTime) &&
            const DeepCollectionEquality()
                .equals(other._todayRecords, _todayRecords));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      isLoading,
      isScanning,
      isVerifying,
      isMarkingAttendance,
      todayAttendance,
      verificationResult,
      error,
      successMessage,
      const DeepCollectionEquality().hash(_offlineQueue),
      lastSyncTime,
      isSyncing,
      currentStatus,
      workingMinutes,
      breakMinutes,
      checkInTime,
      checkOutTime,
      breakStartTime,
      const DeepCollectionEquality().hash(_todayRecords));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$AttendanceStateImplCopyWith<_$AttendanceStateImpl> get copyWith =>
      __$$AttendanceStateImplCopyWithImpl<_$AttendanceStateImpl>(
          this, _$identity);
}

abstract class _AttendanceState implements AttendanceState {
  const factory _AttendanceState(
      {final bool isLoading,
      final bool isScanning,
      final bool isVerifying,
      final bool isMarkingAttendance,
      final Attendance? todayAttendance,
      final AttendanceVerificationResult? verificationResult,
      final String? error,
      final String? successMessage,
      final List<AttendanceQueue> offlineQueue,
      final DateTime? lastSyncTime,
      final bool isSyncing,
      final String currentStatus,
      final int workingMinutes,
      final int breakMinutes,
      final DateTime? checkInTime,
      final DateTime? checkOutTime,
      final DateTime? breakStartTime,
      final List<Map<String, dynamic>> todayRecords}) = _$AttendanceStateImpl;

  @override
  bool get isLoading;
  @override
  bool get isScanning;
  @override
  bool get isVerifying;
  @override
  bool get isMarkingAttendance;
  @override
  Attendance? get todayAttendance;
  @override
  AttendanceVerificationResult? get verificationResult;
  @override
  String? get error;
  @override
  String? get successMessage;
  @override
  List<AttendanceQueue> get offlineQueue;
  @override
  DateTime? get lastSyncTime;
  @override
  bool get isSyncing;
  @override // PLAN-1: 근무 상태 관리
  String get currentStatus;
  @override // NOT_WORKING, WORKING, ON_BREAK
  int get workingMinutes;
  @override
  int get breakMinutes;
  @override
  DateTime? get checkInTime;
  @override
  DateTime? get checkOutTime;
  @override
  DateTime? get breakStartTime;
  @override
  List<Map<String, dynamic>> get todayRecords;
  @override
  @JsonKey(ignore: true)
  _$$AttendanceStateImplCopyWith<_$AttendanceStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
