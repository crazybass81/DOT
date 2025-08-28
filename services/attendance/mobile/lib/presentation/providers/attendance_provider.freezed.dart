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
  bool get isSyncing => throw _privateConstructorUsedError;

  /// Create a copy of AttendanceState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
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
      bool isSyncing});

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

  /// Create a copy of AttendanceState
  /// with the given fields replaced by the non-null parameter values.
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
    ) as $Val);
  }

  /// Create a copy of AttendanceState
  /// with the given fields replaced by the non-null parameter values.
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

  /// Create a copy of AttendanceState
  /// with the given fields replaced by the non-null parameter values.
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
      bool isSyncing});

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

  /// Create a copy of AttendanceState
  /// with the given fields replaced by the non-null parameter values.
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
      this.isSyncing = false})
      : _offlineQueue = offlineQueue;

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

  @override
  String toString() {
    return 'AttendanceState(isLoading: $isLoading, isScanning: $isScanning, isVerifying: $isVerifying, isMarkingAttendance: $isMarkingAttendance, todayAttendance: $todayAttendance, verificationResult: $verificationResult, error: $error, successMessage: $successMessage, offlineQueue: $offlineQueue, lastSyncTime: $lastSyncTime, isSyncing: $isSyncing)';
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
                other.isSyncing == isSyncing));
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
      isSyncing);

  /// Create a copy of AttendanceState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
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
      final bool isSyncing}) = _$AttendanceStateImpl;

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

  /// Create a copy of AttendanceState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AttendanceStateImplCopyWith<_$AttendanceStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
