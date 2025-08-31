// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'attendance_queue.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$AttendanceQueue {
  String get id => throw _privateConstructorUsedError;
  String get userId => throw _privateConstructorUsedError;
  DateTime get timestamp => throw _privateConstructorUsedError;
  AttendanceActionType get actionType => throw _privateConstructorUsedError;
  String get method => throw _privateConstructorUsedError; // qr, gps, manual
  double? get latitude => throw _privateConstructorUsedError;
  double? get longitude => throw _privateConstructorUsedError;
  String? get locationName => throw _privateConstructorUsedError;
  String? get qrCodeData => throw _privateConstructorUsedError;
  String? get notes => throw _privateConstructorUsedError;
  String? get imageUrl => throw _privateConstructorUsedError;
  QueueStatus get status => throw _privateConstructorUsedError;
  DateTime? get createdAt => throw _privateConstructorUsedError;
  int? get retryCount => throw _privateConstructorUsedError;
  String? get lastError => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $AttendanceQueueCopyWith<AttendanceQueue> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AttendanceQueueCopyWith<$Res> {
  factory $AttendanceQueueCopyWith(
          AttendanceQueue value, $Res Function(AttendanceQueue) then) =
      _$AttendanceQueueCopyWithImpl<$Res, AttendanceQueue>;
  @useResult
  $Res call(
      {String id,
      String userId,
      DateTime timestamp,
      AttendanceActionType actionType,
      String method,
      double? latitude,
      double? longitude,
      String? locationName,
      String? qrCodeData,
      String? notes,
      String? imageUrl,
      QueueStatus status,
      DateTime? createdAt,
      int? retryCount,
      String? lastError});
}

/// @nodoc
class _$AttendanceQueueCopyWithImpl<$Res, $Val extends AttendanceQueue>
    implements $AttendanceQueueCopyWith<$Res> {
  _$AttendanceQueueCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? timestamp = null,
    Object? actionType = null,
    Object? method = null,
    Object? latitude = freezed,
    Object? longitude = freezed,
    Object? locationName = freezed,
    Object? qrCodeData = freezed,
    Object? notes = freezed,
    Object? imageUrl = freezed,
    Object? status = null,
    Object? createdAt = freezed,
    Object? retryCount = freezed,
    Object? lastError = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      userId: null == userId
          ? _value.userId
          : userId // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
      actionType: null == actionType
          ? _value.actionType
          : actionType // ignore: cast_nullable_to_non_nullable
              as AttendanceActionType,
      method: null == method
          ? _value.method
          : method // ignore: cast_nullable_to_non_nullable
              as String,
      latitude: freezed == latitude
          ? _value.latitude
          : latitude // ignore: cast_nullable_to_non_nullable
              as double?,
      longitude: freezed == longitude
          ? _value.longitude
          : longitude // ignore: cast_nullable_to_non_nullable
              as double?,
      locationName: freezed == locationName
          ? _value.locationName
          : locationName // ignore: cast_nullable_to_non_nullable
              as String?,
      qrCodeData: freezed == qrCodeData
          ? _value.qrCodeData
          : qrCodeData // ignore: cast_nullable_to_non_nullable
              as String?,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
      imageUrl: freezed == imageUrl
          ? _value.imageUrl
          : imageUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as QueueStatus,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      retryCount: freezed == retryCount
          ? _value.retryCount
          : retryCount // ignore: cast_nullable_to_non_nullable
              as int?,
      lastError: freezed == lastError
          ? _value.lastError
          : lastError // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AttendanceQueueImplCopyWith<$Res>
    implements $AttendanceQueueCopyWith<$Res> {
  factory _$$AttendanceQueueImplCopyWith(_$AttendanceQueueImpl value,
          $Res Function(_$AttendanceQueueImpl) then) =
      __$$AttendanceQueueImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String userId,
      DateTime timestamp,
      AttendanceActionType actionType,
      String method,
      double? latitude,
      double? longitude,
      String? locationName,
      String? qrCodeData,
      String? notes,
      String? imageUrl,
      QueueStatus status,
      DateTime? createdAt,
      int? retryCount,
      String? lastError});
}

/// @nodoc
class __$$AttendanceQueueImplCopyWithImpl<$Res>
    extends _$AttendanceQueueCopyWithImpl<$Res, _$AttendanceQueueImpl>
    implements _$$AttendanceQueueImplCopyWith<$Res> {
  __$$AttendanceQueueImplCopyWithImpl(
      _$AttendanceQueueImpl _value, $Res Function(_$AttendanceQueueImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? timestamp = null,
    Object? actionType = null,
    Object? method = null,
    Object? latitude = freezed,
    Object? longitude = freezed,
    Object? locationName = freezed,
    Object? qrCodeData = freezed,
    Object? notes = freezed,
    Object? imageUrl = freezed,
    Object? status = null,
    Object? createdAt = freezed,
    Object? retryCount = freezed,
    Object? lastError = freezed,
  }) {
    return _then(_$AttendanceQueueImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      userId: null == userId
          ? _value.userId
          : userId // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
      actionType: null == actionType
          ? _value.actionType
          : actionType // ignore: cast_nullable_to_non_nullable
              as AttendanceActionType,
      method: null == method
          ? _value.method
          : method // ignore: cast_nullable_to_non_nullable
              as String,
      latitude: freezed == latitude
          ? _value.latitude
          : latitude // ignore: cast_nullable_to_non_nullable
              as double?,
      longitude: freezed == longitude
          ? _value.longitude
          : longitude // ignore: cast_nullable_to_non_nullable
              as double?,
      locationName: freezed == locationName
          ? _value.locationName
          : locationName // ignore: cast_nullable_to_non_nullable
              as String?,
      qrCodeData: freezed == qrCodeData
          ? _value.qrCodeData
          : qrCodeData // ignore: cast_nullable_to_non_nullable
              as String?,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
      imageUrl: freezed == imageUrl
          ? _value.imageUrl
          : imageUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as QueueStatus,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      retryCount: freezed == retryCount
          ? _value.retryCount
          : retryCount // ignore: cast_nullable_to_non_nullable
              as int?,
      lastError: freezed == lastError
          ? _value.lastError
          : lastError // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

class _$AttendanceQueueImpl extends _AttendanceQueue {
  const _$AttendanceQueueImpl(
      {required this.id,
      required this.userId,
      required this.timestamp,
      required this.actionType,
      required this.method,
      this.latitude,
      this.longitude,
      this.locationName,
      this.qrCodeData,
      this.notes,
      this.imageUrl,
      this.status = QueueStatus.pending,
      this.createdAt,
      this.retryCount,
      this.lastError})
      : super._();

  @override
  final String id;
  @override
  final String userId;
  @override
  final DateTime timestamp;
  @override
  final AttendanceActionType actionType;
  @override
  final String method;
// qr, gps, manual
  @override
  final double? latitude;
  @override
  final double? longitude;
  @override
  final String? locationName;
  @override
  final String? qrCodeData;
  @override
  final String? notes;
  @override
  final String? imageUrl;
  @override
  @JsonKey()
  final QueueStatus status;
  @override
  final DateTime? createdAt;
  @override
  final int? retryCount;
  @override
  final String? lastError;

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$AttendanceQueueImplCopyWith<_$AttendanceQueueImpl> get copyWith =>
      __$$AttendanceQueueImplCopyWithImpl<_$AttendanceQueueImpl>(
          this, _$identity);
}

abstract class _AttendanceQueue extends AttendanceQueue {
  const factory _AttendanceQueue(
      {required final String id,
      required final String userId,
      required final DateTime timestamp,
      required final AttendanceActionType actionType,
      required final String method,
      final double? latitude,
      final double? longitude,
      final String? locationName,
      final String? qrCodeData,
      final String? notes,
      final String? imageUrl,
      final QueueStatus status,
      final DateTime? createdAt,
      final int? retryCount,
      final String? lastError}) = _$AttendanceQueueImpl;
  const _AttendanceQueue._() : super._();

  @override
  String get id;
  @override
  String get userId;
  @override
  DateTime get timestamp;
  @override
  AttendanceActionType get actionType;
  @override
  String get method;
  @override // qr, gps, manual
  double? get latitude;
  @override
  double? get longitude;
  @override
  String? get locationName;
  @override
  String? get qrCodeData;
  @override
  String? get notes;
  @override
  String? get imageUrl;
  @override
  QueueStatus get status;
  @override
  DateTime? get createdAt;
  @override
  int? get retryCount;
  @override
  String? get lastError;
  @override
  @JsonKey(ignore: true)
  _$$AttendanceQueueImplCopyWith<_$AttendanceQueueImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$AttendanceVerificationResult {
  bool get isValid => throw _privateConstructorUsedError;
  bool get isWithinLocation => throw _privateConstructorUsedError;
  bool get isWithinTimeWindow => throw _privateConstructorUsedError;
  String? get errorMessage => throw _privateConstructorUsedError;
  String? get locationName => throw _privateConstructorUsedError;
  double? get distance => throw _privateConstructorUsedError;
  Map<String, dynamic>? get qrData => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $AttendanceVerificationResultCopyWith<AttendanceVerificationResult>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AttendanceVerificationResultCopyWith<$Res> {
  factory $AttendanceVerificationResultCopyWith(
          AttendanceVerificationResult value,
          $Res Function(AttendanceVerificationResult) then) =
      _$AttendanceVerificationResultCopyWithImpl<$Res,
          AttendanceVerificationResult>;
  @useResult
  $Res call(
      {bool isValid,
      bool isWithinLocation,
      bool isWithinTimeWindow,
      String? errorMessage,
      String? locationName,
      double? distance,
      Map<String, dynamic>? qrData});
}

/// @nodoc
class _$AttendanceVerificationResultCopyWithImpl<$Res,
        $Val extends AttendanceVerificationResult>
    implements $AttendanceVerificationResultCopyWith<$Res> {
  _$AttendanceVerificationResultCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isValid = null,
    Object? isWithinLocation = null,
    Object? isWithinTimeWindow = null,
    Object? errorMessage = freezed,
    Object? locationName = freezed,
    Object? distance = freezed,
    Object? qrData = freezed,
  }) {
    return _then(_value.copyWith(
      isValid: null == isValid
          ? _value.isValid
          : isValid // ignore: cast_nullable_to_non_nullable
              as bool,
      isWithinLocation: null == isWithinLocation
          ? _value.isWithinLocation
          : isWithinLocation // ignore: cast_nullable_to_non_nullable
              as bool,
      isWithinTimeWindow: null == isWithinTimeWindow
          ? _value.isWithinTimeWindow
          : isWithinTimeWindow // ignore: cast_nullable_to_non_nullable
              as bool,
      errorMessage: freezed == errorMessage
          ? _value.errorMessage
          : errorMessage // ignore: cast_nullable_to_non_nullable
              as String?,
      locationName: freezed == locationName
          ? _value.locationName
          : locationName // ignore: cast_nullable_to_non_nullable
              as String?,
      distance: freezed == distance
          ? _value.distance
          : distance // ignore: cast_nullable_to_non_nullable
              as double?,
      qrData: freezed == qrData
          ? _value.qrData
          : qrData // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AttendanceVerificationResultImplCopyWith<$Res>
    implements $AttendanceVerificationResultCopyWith<$Res> {
  factory _$$AttendanceVerificationResultImplCopyWith(
          _$AttendanceVerificationResultImpl value,
          $Res Function(_$AttendanceVerificationResultImpl) then) =
      __$$AttendanceVerificationResultImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool isValid,
      bool isWithinLocation,
      bool isWithinTimeWindow,
      String? errorMessage,
      String? locationName,
      double? distance,
      Map<String, dynamic>? qrData});
}

/// @nodoc
class __$$AttendanceVerificationResultImplCopyWithImpl<$Res>
    extends _$AttendanceVerificationResultCopyWithImpl<$Res,
        _$AttendanceVerificationResultImpl>
    implements _$$AttendanceVerificationResultImplCopyWith<$Res> {
  __$$AttendanceVerificationResultImplCopyWithImpl(
      _$AttendanceVerificationResultImpl _value,
      $Res Function(_$AttendanceVerificationResultImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isValid = null,
    Object? isWithinLocation = null,
    Object? isWithinTimeWindow = null,
    Object? errorMessage = freezed,
    Object? locationName = freezed,
    Object? distance = freezed,
    Object? qrData = freezed,
  }) {
    return _then(_$AttendanceVerificationResultImpl(
      isValid: null == isValid
          ? _value.isValid
          : isValid // ignore: cast_nullable_to_non_nullable
              as bool,
      isWithinLocation: null == isWithinLocation
          ? _value.isWithinLocation
          : isWithinLocation // ignore: cast_nullable_to_non_nullable
              as bool,
      isWithinTimeWindow: null == isWithinTimeWindow
          ? _value.isWithinTimeWindow
          : isWithinTimeWindow // ignore: cast_nullable_to_non_nullable
              as bool,
      errorMessage: freezed == errorMessage
          ? _value.errorMessage
          : errorMessage // ignore: cast_nullable_to_non_nullable
              as String?,
      locationName: freezed == locationName
          ? _value.locationName
          : locationName // ignore: cast_nullable_to_non_nullable
              as String?,
      distance: freezed == distance
          ? _value.distance
          : distance // ignore: cast_nullable_to_non_nullable
              as double?,
      qrData: freezed == qrData
          ? _value._qrData
          : qrData // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc

class _$AttendanceVerificationResultImpl extends _AttendanceVerificationResult {
  const _$AttendanceVerificationResultImpl(
      {required this.isValid,
      required this.isWithinLocation,
      required this.isWithinTimeWindow,
      this.errorMessage,
      this.locationName,
      this.distance,
      final Map<String, dynamic>? qrData})
      : _qrData = qrData,
        super._();

  @override
  final bool isValid;
  @override
  final bool isWithinLocation;
  @override
  final bool isWithinTimeWindow;
  @override
  final String? errorMessage;
  @override
  final String? locationName;
  @override
  final double? distance;
  final Map<String, dynamic>? _qrData;
  @override
  Map<String, dynamic>? get qrData {
    final value = _qrData;
    if (value == null) return null;
    if (_qrData is EqualUnmodifiableMapView) return _qrData;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$AttendanceVerificationResultImplCopyWith<
          _$AttendanceVerificationResultImpl>
      get copyWith => __$$AttendanceVerificationResultImplCopyWithImpl<
          _$AttendanceVerificationResultImpl>(this, _$identity);
}

abstract class _AttendanceVerificationResult
    extends AttendanceVerificationResult {
  const factory _AttendanceVerificationResult(
      {required final bool isValid,
      required final bool isWithinLocation,
      required final bool isWithinTimeWindow,
      final String? errorMessage,
      final String? locationName,
      final double? distance,
      final Map<String, dynamic>? qrData}) = _$AttendanceVerificationResultImpl;
  const _AttendanceVerificationResult._() : super._();

  @override
  bool get isValid;
  @override
  bool get isWithinLocation;
  @override
  bool get isWithinTimeWindow;
  @override
  String? get errorMessage;
  @override
  String? get locationName;
  @override
  double? get distance;
  @override
  Map<String, dynamic>? get qrData;
  @override
  @JsonKey(ignore: true)
  _$$AttendanceVerificationResultImplCopyWith<
          _$AttendanceVerificationResultImpl>
      get copyWith => throw _privateConstructorUsedError;
}
