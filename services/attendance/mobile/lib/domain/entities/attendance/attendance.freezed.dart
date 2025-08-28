// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'attendance.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$Attendance {
  String get id => throw _privateConstructorUsedError;
  String get userId => throw _privateConstructorUsedError;
  DateTime get date => throw _privateConstructorUsedError;
  DateTime? get checkInTime => throw _privateConstructorUsedError;
  DateTime? get checkOutTime => throw _privateConstructorUsedError;
  String? get checkInLocation => throw _privateConstructorUsedError;
  String? get checkOutLocation => throw _privateConstructorUsedError;
  double? get checkInLatitude => throw _privateConstructorUsedError;
  double? get checkInLongitude => throw _privateConstructorUsedError;
  double? get checkOutLatitude => throw _privateConstructorUsedError;
  double? get checkOutLongitude => throw _privateConstructorUsedError;
  String? get checkInMethod =>
      throw _privateConstructorUsedError; // manual, qr, location
  String? get checkOutMethod => throw _privateConstructorUsedError;
  String? get checkInNotes => throw _privateConstructorUsedError;
  String? get checkOutNotes => throw _privateConstructorUsedError;
  String? get checkInImageUrl => throw _privateConstructorUsedError;
  String? get checkOutImageUrl => throw _privateConstructorUsedError;
  AttendanceStatus get status => throw _privateConstructorUsedError;
  Duration? get totalWorkingHours => throw _privateConstructorUsedError;
  Duration? get breakDuration => throw _privateConstructorUsedError;
  bool get isLateCheckIn => throw _privateConstructorUsedError;
  bool get isEarlyCheckOut => throw _privateConstructorUsedError;
  DateTime? get createdAt => throw _privateConstructorUsedError;
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  /// Create a copy of Attendance
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AttendanceCopyWith<Attendance> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AttendanceCopyWith<$Res> {
  factory $AttendanceCopyWith(
          Attendance value, $Res Function(Attendance) then) =
      _$AttendanceCopyWithImpl<$Res, Attendance>;
  @useResult
  $Res call(
      {String id,
      String userId,
      DateTime date,
      DateTime? checkInTime,
      DateTime? checkOutTime,
      String? checkInLocation,
      String? checkOutLocation,
      double? checkInLatitude,
      double? checkInLongitude,
      double? checkOutLatitude,
      double? checkOutLongitude,
      String? checkInMethod,
      String? checkOutMethod,
      String? checkInNotes,
      String? checkOutNotes,
      String? checkInImageUrl,
      String? checkOutImageUrl,
      AttendanceStatus status,
      Duration? totalWorkingHours,
      Duration? breakDuration,
      bool isLateCheckIn,
      bool isEarlyCheckOut,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class _$AttendanceCopyWithImpl<$Res, $Val extends Attendance>
    implements $AttendanceCopyWith<$Res> {
  _$AttendanceCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Attendance
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? date = null,
    Object? checkInTime = freezed,
    Object? checkOutTime = freezed,
    Object? checkInLocation = freezed,
    Object? checkOutLocation = freezed,
    Object? checkInLatitude = freezed,
    Object? checkInLongitude = freezed,
    Object? checkOutLatitude = freezed,
    Object? checkOutLongitude = freezed,
    Object? checkInMethod = freezed,
    Object? checkOutMethod = freezed,
    Object? checkInNotes = freezed,
    Object? checkOutNotes = freezed,
    Object? checkInImageUrl = freezed,
    Object? checkOutImageUrl = freezed,
    Object? status = null,
    Object? totalWorkingHours = freezed,
    Object? breakDuration = freezed,
    Object? isLateCheckIn = null,
    Object? isEarlyCheckOut = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
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
      date: null == date
          ? _value.date
          : date // ignore: cast_nullable_to_non_nullable
              as DateTime,
      checkInTime: freezed == checkInTime
          ? _value.checkInTime
          : checkInTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      checkOutTime: freezed == checkOutTime
          ? _value.checkOutTime
          : checkOutTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      checkInLocation: freezed == checkInLocation
          ? _value.checkInLocation
          : checkInLocation // ignore: cast_nullable_to_non_nullable
              as String?,
      checkOutLocation: freezed == checkOutLocation
          ? _value.checkOutLocation
          : checkOutLocation // ignore: cast_nullable_to_non_nullable
              as String?,
      checkInLatitude: freezed == checkInLatitude
          ? _value.checkInLatitude
          : checkInLatitude // ignore: cast_nullable_to_non_nullable
              as double?,
      checkInLongitude: freezed == checkInLongitude
          ? _value.checkInLongitude
          : checkInLongitude // ignore: cast_nullable_to_non_nullable
              as double?,
      checkOutLatitude: freezed == checkOutLatitude
          ? _value.checkOutLatitude
          : checkOutLatitude // ignore: cast_nullable_to_non_nullable
              as double?,
      checkOutLongitude: freezed == checkOutLongitude
          ? _value.checkOutLongitude
          : checkOutLongitude // ignore: cast_nullable_to_non_nullable
              as double?,
      checkInMethod: freezed == checkInMethod
          ? _value.checkInMethod
          : checkInMethod // ignore: cast_nullable_to_non_nullable
              as String?,
      checkOutMethod: freezed == checkOutMethod
          ? _value.checkOutMethod
          : checkOutMethod // ignore: cast_nullable_to_non_nullable
              as String?,
      checkInNotes: freezed == checkInNotes
          ? _value.checkInNotes
          : checkInNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      checkOutNotes: freezed == checkOutNotes
          ? _value.checkOutNotes
          : checkOutNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      checkInImageUrl: freezed == checkInImageUrl
          ? _value.checkInImageUrl
          : checkInImageUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      checkOutImageUrl: freezed == checkOutImageUrl
          ? _value.checkOutImageUrl
          : checkOutImageUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as AttendanceStatus,
      totalWorkingHours: freezed == totalWorkingHours
          ? _value.totalWorkingHours
          : totalWorkingHours // ignore: cast_nullable_to_non_nullable
              as Duration?,
      breakDuration: freezed == breakDuration
          ? _value.breakDuration
          : breakDuration // ignore: cast_nullable_to_non_nullable
              as Duration?,
      isLateCheckIn: null == isLateCheckIn
          ? _value.isLateCheckIn
          : isLateCheckIn // ignore: cast_nullable_to_non_nullable
              as bool,
      isEarlyCheckOut: null == isEarlyCheckOut
          ? _value.isEarlyCheckOut
          : isEarlyCheckOut // ignore: cast_nullable_to_non_nullable
              as bool,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AttendanceImplCopyWith<$Res>
    implements $AttendanceCopyWith<$Res> {
  factory _$$AttendanceImplCopyWith(
          _$AttendanceImpl value, $Res Function(_$AttendanceImpl) then) =
      __$$AttendanceImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String userId,
      DateTime date,
      DateTime? checkInTime,
      DateTime? checkOutTime,
      String? checkInLocation,
      String? checkOutLocation,
      double? checkInLatitude,
      double? checkInLongitude,
      double? checkOutLatitude,
      double? checkOutLongitude,
      String? checkInMethod,
      String? checkOutMethod,
      String? checkInNotes,
      String? checkOutNotes,
      String? checkInImageUrl,
      String? checkOutImageUrl,
      AttendanceStatus status,
      Duration? totalWorkingHours,
      Duration? breakDuration,
      bool isLateCheckIn,
      bool isEarlyCheckOut,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class __$$AttendanceImplCopyWithImpl<$Res>
    extends _$AttendanceCopyWithImpl<$Res, _$AttendanceImpl>
    implements _$$AttendanceImplCopyWith<$Res> {
  __$$AttendanceImplCopyWithImpl(
      _$AttendanceImpl _value, $Res Function(_$AttendanceImpl) _then)
      : super(_value, _then);

  /// Create a copy of Attendance
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? date = null,
    Object? checkInTime = freezed,
    Object? checkOutTime = freezed,
    Object? checkInLocation = freezed,
    Object? checkOutLocation = freezed,
    Object? checkInLatitude = freezed,
    Object? checkInLongitude = freezed,
    Object? checkOutLatitude = freezed,
    Object? checkOutLongitude = freezed,
    Object? checkInMethod = freezed,
    Object? checkOutMethod = freezed,
    Object? checkInNotes = freezed,
    Object? checkOutNotes = freezed,
    Object? checkInImageUrl = freezed,
    Object? checkOutImageUrl = freezed,
    Object? status = null,
    Object? totalWorkingHours = freezed,
    Object? breakDuration = freezed,
    Object? isLateCheckIn = null,
    Object? isEarlyCheckOut = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$AttendanceImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      userId: null == userId
          ? _value.userId
          : userId // ignore: cast_nullable_to_non_nullable
              as String,
      date: null == date
          ? _value.date
          : date // ignore: cast_nullable_to_non_nullable
              as DateTime,
      checkInTime: freezed == checkInTime
          ? _value.checkInTime
          : checkInTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      checkOutTime: freezed == checkOutTime
          ? _value.checkOutTime
          : checkOutTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      checkInLocation: freezed == checkInLocation
          ? _value.checkInLocation
          : checkInLocation // ignore: cast_nullable_to_non_nullable
              as String?,
      checkOutLocation: freezed == checkOutLocation
          ? _value.checkOutLocation
          : checkOutLocation // ignore: cast_nullable_to_non_nullable
              as String?,
      checkInLatitude: freezed == checkInLatitude
          ? _value.checkInLatitude
          : checkInLatitude // ignore: cast_nullable_to_non_nullable
              as double?,
      checkInLongitude: freezed == checkInLongitude
          ? _value.checkInLongitude
          : checkInLongitude // ignore: cast_nullable_to_non_nullable
              as double?,
      checkOutLatitude: freezed == checkOutLatitude
          ? _value.checkOutLatitude
          : checkOutLatitude // ignore: cast_nullable_to_non_nullable
              as double?,
      checkOutLongitude: freezed == checkOutLongitude
          ? _value.checkOutLongitude
          : checkOutLongitude // ignore: cast_nullable_to_non_nullable
              as double?,
      checkInMethod: freezed == checkInMethod
          ? _value.checkInMethod
          : checkInMethod // ignore: cast_nullable_to_non_nullable
              as String?,
      checkOutMethod: freezed == checkOutMethod
          ? _value.checkOutMethod
          : checkOutMethod // ignore: cast_nullable_to_non_nullable
              as String?,
      checkInNotes: freezed == checkInNotes
          ? _value.checkInNotes
          : checkInNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      checkOutNotes: freezed == checkOutNotes
          ? _value.checkOutNotes
          : checkOutNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      checkInImageUrl: freezed == checkInImageUrl
          ? _value.checkInImageUrl
          : checkInImageUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      checkOutImageUrl: freezed == checkOutImageUrl
          ? _value.checkOutImageUrl
          : checkOutImageUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as AttendanceStatus,
      totalWorkingHours: freezed == totalWorkingHours
          ? _value.totalWorkingHours
          : totalWorkingHours // ignore: cast_nullable_to_non_nullable
              as Duration?,
      breakDuration: freezed == breakDuration
          ? _value.breakDuration
          : breakDuration // ignore: cast_nullable_to_non_nullable
              as Duration?,
      isLateCheckIn: null == isLateCheckIn
          ? _value.isLateCheckIn
          : isLateCheckIn // ignore: cast_nullable_to_non_nullable
              as bool,
      isEarlyCheckOut: null == isEarlyCheckOut
          ? _value.isEarlyCheckOut
          : isEarlyCheckOut // ignore: cast_nullable_to_non_nullable
              as bool,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc

class _$AttendanceImpl extends _Attendance {
  const _$AttendanceImpl(
      {required this.id,
      required this.userId,
      required this.date,
      this.checkInTime,
      this.checkOutTime,
      this.checkInLocation,
      this.checkOutLocation,
      this.checkInLatitude,
      this.checkInLongitude,
      this.checkOutLatitude,
      this.checkOutLongitude,
      this.checkInMethod,
      this.checkOutMethod,
      this.checkInNotes,
      this.checkOutNotes,
      this.checkInImageUrl,
      this.checkOutImageUrl,
      this.status = AttendanceStatus.absent,
      this.totalWorkingHours,
      this.breakDuration,
      this.isLateCheckIn = false,
      this.isEarlyCheckOut = false,
      this.createdAt,
      this.updatedAt})
      : super._();

  @override
  final String id;
  @override
  final String userId;
  @override
  final DateTime date;
  @override
  final DateTime? checkInTime;
  @override
  final DateTime? checkOutTime;
  @override
  final String? checkInLocation;
  @override
  final String? checkOutLocation;
  @override
  final double? checkInLatitude;
  @override
  final double? checkInLongitude;
  @override
  final double? checkOutLatitude;
  @override
  final double? checkOutLongitude;
  @override
  final String? checkInMethod;
// manual, qr, location
  @override
  final String? checkOutMethod;
  @override
  final String? checkInNotes;
  @override
  final String? checkOutNotes;
  @override
  final String? checkInImageUrl;
  @override
  final String? checkOutImageUrl;
  @override
  @JsonKey()
  final AttendanceStatus status;
  @override
  final Duration? totalWorkingHours;
  @override
  final Duration? breakDuration;
  @override
  @JsonKey()
  final bool isLateCheckIn;
  @override
  @JsonKey()
  final bool isEarlyCheckOut;
  @override
  final DateTime? createdAt;
  @override
  final DateTime? updatedAt;

  /// Create a copy of Attendance
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AttendanceImplCopyWith<_$AttendanceImpl> get copyWith =>
      __$$AttendanceImplCopyWithImpl<_$AttendanceImpl>(this, _$identity);
}

abstract class _Attendance extends Attendance {
  const factory _Attendance(
      {required final String id,
      required final String userId,
      required final DateTime date,
      final DateTime? checkInTime,
      final DateTime? checkOutTime,
      final String? checkInLocation,
      final String? checkOutLocation,
      final double? checkInLatitude,
      final double? checkInLongitude,
      final double? checkOutLatitude,
      final double? checkOutLongitude,
      final String? checkInMethod,
      final String? checkOutMethod,
      final String? checkInNotes,
      final String? checkOutNotes,
      final String? checkInImageUrl,
      final String? checkOutImageUrl,
      final AttendanceStatus status,
      final Duration? totalWorkingHours,
      final Duration? breakDuration,
      final bool isLateCheckIn,
      final bool isEarlyCheckOut,
      final DateTime? createdAt,
      final DateTime? updatedAt}) = _$AttendanceImpl;
  const _Attendance._() : super._();

  @override
  String get id;
  @override
  String get userId;
  @override
  DateTime get date;
  @override
  DateTime? get checkInTime;
  @override
  DateTime? get checkOutTime;
  @override
  String? get checkInLocation;
  @override
  String? get checkOutLocation;
  @override
  double? get checkInLatitude;
  @override
  double? get checkInLongitude;
  @override
  double? get checkOutLatitude;
  @override
  double? get checkOutLongitude;
  @override
  String? get checkInMethod; // manual, qr, location
  @override
  String? get checkOutMethod;
  @override
  String? get checkInNotes;
  @override
  String? get checkOutNotes;
  @override
  String? get checkInImageUrl;
  @override
  String? get checkOutImageUrl;
  @override
  AttendanceStatus get status;
  @override
  Duration? get totalWorkingHours;
  @override
  Duration? get breakDuration;
  @override
  bool get isLateCheckIn;
  @override
  bool get isEarlyCheckOut;
  @override
  DateTime? get createdAt;
  @override
  DateTime? get updatedAt;

  /// Create a copy of Attendance
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AttendanceImplCopyWith<_$AttendanceImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$AttendanceStats {
  int get totalWorkingDays => throw _privateConstructorUsedError;
  int get presentDays => throw _privateConstructorUsedError;
  int get absentDays => throw _privateConstructorUsedError;
  int get lateDays => throw _privateConstructorUsedError;
  int get halfDays => throw _privateConstructorUsedError;
  int get leaveDays => throw _privateConstructorUsedError;
  Duration get totalWorkingHours => throw _privateConstructorUsedError;
  double get attendancePercentage => throw _privateConstructorUsedError;
  DateTime? get periodStart => throw _privateConstructorUsedError;
  DateTime? get periodEnd => throw _privateConstructorUsedError;

  /// Create a copy of AttendanceStats
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AttendanceStatsCopyWith<AttendanceStats> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AttendanceStatsCopyWith<$Res> {
  factory $AttendanceStatsCopyWith(
          AttendanceStats value, $Res Function(AttendanceStats) then) =
      _$AttendanceStatsCopyWithImpl<$Res, AttendanceStats>;
  @useResult
  $Res call(
      {int totalWorkingDays,
      int presentDays,
      int absentDays,
      int lateDays,
      int halfDays,
      int leaveDays,
      Duration totalWorkingHours,
      double attendancePercentage,
      DateTime? periodStart,
      DateTime? periodEnd});
}

/// @nodoc
class _$AttendanceStatsCopyWithImpl<$Res, $Val extends AttendanceStats>
    implements $AttendanceStatsCopyWith<$Res> {
  _$AttendanceStatsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AttendanceStats
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? totalWorkingDays = null,
    Object? presentDays = null,
    Object? absentDays = null,
    Object? lateDays = null,
    Object? halfDays = null,
    Object? leaveDays = null,
    Object? totalWorkingHours = null,
    Object? attendancePercentage = null,
    Object? periodStart = freezed,
    Object? periodEnd = freezed,
  }) {
    return _then(_value.copyWith(
      totalWorkingDays: null == totalWorkingDays
          ? _value.totalWorkingDays
          : totalWorkingDays // ignore: cast_nullable_to_non_nullable
              as int,
      presentDays: null == presentDays
          ? _value.presentDays
          : presentDays // ignore: cast_nullable_to_non_nullable
              as int,
      absentDays: null == absentDays
          ? _value.absentDays
          : absentDays // ignore: cast_nullable_to_non_nullable
              as int,
      lateDays: null == lateDays
          ? _value.lateDays
          : lateDays // ignore: cast_nullable_to_non_nullable
              as int,
      halfDays: null == halfDays
          ? _value.halfDays
          : halfDays // ignore: cast_nullable_to_non_nullable
              as int,
      leaveDays: null == leaveDays
          ? _value.leaveDays
          : leaveDays // ignore: cast_nullable_to_non_nullable
              as int,
      totalWorkingHours: null == totalWorkingHours
          ? _value.totalWorkingHours
          : totalWorkingHours // ignore: cast_nullable_to_non_nullable
              as Duration,
      attendancePercentage: null == attendancePercentage
          ? _value.attendancePercentage
          : attendancePercentage // ignore: cast_nullable_to_non_nullable
              as double,
      periodStart: freezed == periodStart
          ? _value.periodStart
          : periodStart // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      periodEnd: freezed == periodEnd
          ? _value.periodEnd
          : periodEnd // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AttendanceStatsImplCopyWith<$Res>
    implements $AttendanceStatsCopyWith<$Res> {
  factory _$$AttendanceStatsImplCopyWith(_$AttendanceStatsImpl value,
          $Res Function(_$AttendanceStatsImpl) then) =
      __$$AttendanceStatsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {int totalWorkingDays,
      int presentDays,
      int absentDays,
      int lateDays,
      int halfDays,
      int leaveDays,
      Duration totalWorkingHours,
      double attendancePercentage,
      DateTime? periodStart,
      DateTime? periodEnd});
}

/// @nodoc
class __$$AttendanceStatsImplCopyWithImpl<$Res>
    extends _$AttendanceStatsCopyWithImpl<$Res, _$AttendanceStatsImpl>
    implements _$$AttendanceStatsImplCopyWith<$Res> {
  __$$AttendanceStatsImplCopyWithImpl(
      _$AttendanceStatsImpl _value, $Res Function(_$AttendanceStatsImpl) _then)
      : super(_value, _then);

  /// Create a copy of AttendanceStats
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? totalWorkingDays = null,
    Object? presentDays = null,
    Object? absentDays = null,
    Object? lateDays = null,
    Object? halfDays = null,
    Object? leaveDays = null,
    Object? totalWorkingHours = null,
    Object? attendancePercentage = null,
    Object? periodStart = freezed,
    Object? periodEnd = freezed,
  }) {
    return _then(_$AttendanceStatsImpl(
      totalWorkingDays: null == totalWorkingDays
          ? _value.totalWorkingDays
          : totalWorkingDays // ignore: cast_nullable_to_non_nullable
              as int,
      presentDays: null == presentDays
          ? _value.presentDays
          : presentDays // ignore: cast_nullable_to_non_nullable
              as int,
      absentDays: null == absentDays
          ? _value.absentDays
          : absentDays // ignore: cast_nullable_to_non_nullable
              as int,
      lateDays: null == lateDays
          ? _value.lateDays
          : lateDays // ignore: cast_nullable_to_non_nullable
              as int,
      halfDays: null == halfDays
          ? _value.halfDays
          : halfDays // ignore: cast_nullable_to_non_nullable
              as int,
      leaveDays: null == leaveDays
          ? _value.leaveDays
          : leaveDays // ignore: cast_nullable_to_non_nullable
              as int,
      totalWorkingHours: null == totalWorkingHours
          ? _value.totalWorkingHours
          : totalWorkingHours // ignore: cast_nullable_to_non_nullable
              as Duration,
      attendancePercentage: null == attendancePercentage
          ? _value.attendancePercentage
          : attendancePercentage // ignore: cast_nullable_to_non_nullable
              as double,
      periodStart: freezed == periodStart
          ? _value.periodStart
          : periodStart // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      periodEnd: freezed == periodEnd
          ? _value.periodEnd
          : periodEnd // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc

class _$AttendanceStatsImpl extends _AttendanceStats {
  const _$AttendanceStatsImpl(
      {required this.totalWorkingDays,
      required this.presentDays,
      required this.absentDays,
      required this.lateDays,
      required this.halfDays,
      required this.leaveDays,
      required this.totalWorkingHours,
      required this.attendancePercentage,
      this.periodStart,
      this.periodEnd})
      : super._();

  @override
  final int totalWorkingDays;
  @override
  final int presentDays;
  @override
  final int absentDays;
  @override
  final int lateDays;
  @override
  final int halfDays;
  @override
  final int leaveDays;
  @override
  final Duration totalWorkingHours;
  @override
  final double attendancePercentage;
  @override
  final DateTime? periodStart;
  @override
  final DateTime? periodEnd;

  /// Create a copy of AttendanceStats
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AttendanceStatsImplCopyWith<_$AttendanceStatsImpl> get copyWith =>
      __$$AttendanceStatsImplCopyWithImpl<_$AttendanceStatsImpl>(
          this, _$identity);
}

abstract class _AttendanceStats extends AttendanceStats {
  const factory _AttendanceStats(
      {required final int totalWorkingDays,
      required final int presentDays,
      required final int absentDays,
      required final int lateDays,
      required final int halfDays,
      required final int leaveDays,
      required final Duration totalWorkingHours,
      required final double attendancePercentage,
      final DateTime? periodStart,
      final DateTime? periodEnd}) = _$AttendanceStatsImpl;
  const _AttendanceStats._() : super._();

  @override
  int get totalWorkingDays;
  @override
  int get presentDays;
  @override
  int get absentDays;
  @override
  int get lateDays;
  @override
  int get halfDays;
  @override
  int get leaveDays;
  @override
  Duration get totalWorkingHours;
  @override
  double get attendancePercentage;
  @override
  DateTime? get periodStart;
  @override
  DateTime? get periodEnd;

  /// Create a copy of AttendanceStats
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AttendanceStatsImplCopyWith<_$AttendanceStatsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$AttendanceLocation {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get address => throw _privateConstructorUsedError;
  double get latitude => throw _privateConstructorUsedError;
  double get longitude => throw _privateConstructorUsedError;
  double get radius => throw _privateConstructorUsedError;
  bool get isActive => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  String? get contactNumber => throw _privateConstructorUsedError;
  DateTime? get createdAt => throw _privateConstructorUsedError;
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  /// Create a copy of AttendanceLocation
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AttendanceLocationCopyWith<AttendanceLocation> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AttendanceLocationCopyWith<$Res> {
  factory $AttendanceLocationCopyWith(
          AttendanceLocation value, $Res Function(AttendanceLocation) then) =
      _$AttendanceLocationCopyWithImpl<$Res, AttendanceLocation>;
  @useResult
  $Res call(
      {String id,
      String name,
      String address,
      double latitude,
      double longitude,
      double radius,
      bool isActive,
      String? description,
      String? contactNumber,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class _$AttendanceLocationCopyWithImpl<$Res, $Val extends AttendanceLocation>
    implements $AttendanceLocationCopyWith<$Res> {
  _$AttendanceLocationCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AttendanceLocation
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? address = null,
    Object? latitude = null,
    Object? longitude = null,
    Object? radius = null,
    Object? isActive = null,
    Object? description = freezed,
    Object? contactNumber = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      address: null == address
          ? _value.address
          : address // ignore: cast_nullable_to_non_nullable
              as String,
      latitude: null == latitude
          ? _value.latitude
          : latitude // ignore: cast_nullable_to_non_nullable
              as double,
      longitude: null == longitude
          ? _value.longitude
          : longitude // ignore: cast_nullable_to_non_nullable
              as double,
      radius: null == radius
          ? _value.radius
          : radius // ignore: cast_nullable_to_non_nullable
              as double,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      contactNumber: freezed == contactNumber
          ? _value.contactNumber
          : contactNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AttendanceLocationImplCopyWith<$Res>
    implements $AttendanceLocationCopyWith<$Res> {
  factory _$$AttendanceLocationImplCopyWith(_$AttendanceLocationImpl value,
          $Res Function(_$AttendanceLocationImpl) then) =
      __$$AttendanceLocationImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String address,
      double latitude,
      double longitude,
      double radius,
      bool isActive,
      String? description,
      String? contactNumber,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class __$$AttendanceLocationImplCopyWithImpl<$Res>
    extends _$AttendanceLocationCopyWithImpl<$Res, _$AttendanceLocationImpl>
    implements _$$AttendanceLocationImplCopyWith<$Res> {
  __$$AttendanceLocationImplCopyWithImpl(_$AttendanceLocationImpl _value,
      $Res Function(_$AttendanceLocationImpl) _then)
      : super(_value, _then);

  /// Create a copy of AttendanceLocation
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? address = null,
    Object? latitude = null,
    Object? longitude = null,
    Object? radius = null,
    Object? isActive = null,
    Object? description = freezed,
    Object? contactNumber = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$AttendanceLocationImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      address: null == address
          ? _value.address
          : address // ignore: cast_nullable_to_non_nullable
              as String,
      latitude: null == latitude
          ? _value.latitude
          : latitude // ignore: cast_nullable_to_non_nullable
              as double,
      longitude: null == longitude
          ? _value.longitude
          : longitude // ignore: cast_nullable_to_non_nullable
              as double,
      radius: null == radius
          ? _value.radius
          : radius // ignore: cast_nullable_to_non_nullable
              as double,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      contactNumber: freezed == contactNumber
          ? _value.contactNumber
          : contactNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc

class _$AttendanceLocationImpl extends _AttendanceLocation {
  const _$AttendanceLocationImpl(
      {required this.id,
      required this.name,
      required this.address,
      required this.latitude,
      required this.longitude,
      required this.radius,
      this.isActive = true,
      this.description,
      this.contactNumber,
      this.createdAt,
      this.updatedAt})
      : super._();

  @override
  final String id;
  @override
  final String name;
  @override
  final String address;
  @override
  final double latitude;
  @override
  final double longitude;
  @override
  final double radius;
  @override
  @JsonKey()
  final bool isActive;
  @override
  final String? description;
  @override
  final String? contactNumber;
  @override
  final DateTime? createdAt;
  @override
  final DateTime? updatedAt;

  /// Create a copy of AttendanceLocation
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AttendanceLocationImplCopyWith<_$AttendanceLocationImpl> get copyWith =>
      __$$AttendanceLocationImplCopyWithImpl<_$AttendanceLocationImpl>(
          this, _$identity);
}

abstract class _AttendanceLocation extends AttendanceLocation {
  const factory _AttendanceLocation(
      {required final String id,
      required final String name,
      required final String address,
      required final double latitude,
      required final double longitude,
      required final double radius,
      final bool isActive,
      final String? description,
      final String? contactNumber,
      final DateTime? createdAt,
      final DateTime? updatedAt}) = _$AttendanceLocationImpl;
  const _AttendanceLocation._() : super._();

  @override
  String get id;
  @override
  String get name;
  @override
  String get address;
  @override
  double get latitude;
  @override
  double get longitude;
  @override
  double get radius;
  @override
  bool get isActive;
  @override
  String? get description;
  @override
  String? get contactNumber;
  @override
  DateTime? get createdAt;
  @override
  DateTime? get updatedAt;

  /// Create a copy of AttendanceLocation
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AttendanceLocationImplCopyWith<_$AttendanceLocationImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
