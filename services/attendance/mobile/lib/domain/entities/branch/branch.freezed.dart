// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'branch.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$Branch {
  String get id => throw _privateConstructorUsedError; // UUID
  String get name => throw _privateConstructorUsedError; // 지점명 (예: 강남지점)
  String get qrCode => throw _privateConstructorUsedError; // 고유 QR 코드
  DateTime get createdAt => throw _privateConstructorUsedError; // 생성 시간
  String? get address => throw _privateConstructorUsedError; // 지점 주소 (선택)
  String? get phoneNumber => throw _privateConstructorUsedError; // 지점 전화번호 (선택)
  double? get latitude => throw _privateConstructorUsedError; // 위도 (위치 기반 체크용)
  double? get longitude => throw _privateConstructorUsedError; // 경도 (위치 기반 체크용)
  bool get isActive => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $BranchCopyWith<Branch> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $BranchCopyWith<$Res> {
  factory $BranchCopyWith(Branch value, $Res Function(Branch) then) =
      _$BranchCopyWithImpl<$Res, Branch>;
  @useResult
  $Res call(
      {String id,
      String name,
      String qrCode,
      DateTime createdAt,
      String? address,
      String? phoneNumber,
      double? latitude,
      double? longitude,
      bool isActive});
}

/// @nodoc
class _$BranchCopyWithImpl<$Res, $Val extends Branch>
    implements $BranchCopyWith<$Res> {
  _$BranchCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? qrCode = null,
    Object? createdAt = null,
    Object? address = freezed,
    Object? phoneNumber = freezed,
    Object? latitude = freezed,
    Object? longitude = freezed,
    Object? isActive = null,
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
      qrCode: null == qrCode
          ? _value.qrCode
          : qrCode // ignore: cast_nullable_to_non_nullable
              as String,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      address: freezed == address
          ? _value.address
          : address // ignore: cast_nullable_to_non_nullable
              as String?,
      phoneNumber: freezed == phoneNumber
          ? _value.phoneNumber
          : phoneNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      latitude: freezed == latitude
          ? _value.latitude
          : latitude // ignore: cast_nullable_to_non_nullable
              as double?,
      longitude: freezed == longitude
          ? _value.longitude
          : longitude // ignore: cast_nullable_to_non_nullable
              as double?,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$BranchImplCopyWith<$Res> implements $BranchCopyWith<$Res> {
  factory _$$BranchImplCopyWith(
          _$BranchImpl value, $Res Function(_$BranchImpl) then) =
      __$$BranchImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String qrCode,
      DateTime createdAt,
      String? address,
      String? phoneNumber,
      double? latitude,
      double? longitude,
      bool isActive});
}

/// @nodoc
class __$$BranchImplCopyWithImpl<$Res>
    extends _$BranchCopyWithImpl<$Res, _$BranchImpl>
    implements _$$BranchImplCopyWith<$Res> {
  __$$BranchImplCopyWithImpl(
      _$BranchImpl _value, $Res Function(_$BranchImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? qrCode = null,
    Object? createdAt = null,
    Object? address = freezed,
    Object? phoneNumber = freezed,
    Object? latitude = freezed,
    Object? longitude = freezed,
    Object? isActive = null,
  }) {
    return _then(_$BranchImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      qrCode: null == qrCode
          ? _value.qrCode
          : qrCode // ignore: cast_nullable_to_non_nullable
              as String,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      address: freezed == address
          ? _value.address
          : address // ignore: cast_nullable_to_non_nullable
              as String?,
      phoneNumber: freezed == phoneNumber
          ? _value.phoneNumber
          : phoneNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      latitude: freezed == latitude
          ? _value.latitude
          : latitude // ignore: cast_nullable_to_non_nullable
              as double?,
      longitude: freezed == longitude
          ? _value.longitude
          : longitude // ignore: cast_nullable_to_non_nullable
              as double?,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc

class _$BranchImpl extends _Branch {
  const _$BranchImpl(
      {required this.id,
      required this.name,
      required this.qrCode,
      required this.createdAt,
      this.address,
      this.phoneNumber,
      this.latitude,
      this.longitude,
      this.isActive = true})
      : super._();

  @override
  final String id;
// UUID
  @override
  final String name;
// 지점명 (예: 강남지점)
  @override
  final String qrCode;
// 고유 QR 코드
  @override
  final DateTime createdAt;
// 생성 시간
  @override
  final String? address;
// 지점 주소 (선택)
  @override
  final String? phoneNumber;
// 지점 전화번호 (선택)
  @override
  final double? latitude;
// 위도 (위치 기반 체크용)
  @override
  final double? longitude;
// 경도 (위치 기반 체크용)
  @override
  @JsonKey()
  final bool isActive;

  @override
  String toString() {
    return 'Branch(id: $id, name: $name, qrCode: $qrCode, createdAt: $createdAt, address: $address, phoneNumber: $phoneNumber, latitude: $latitude, longitude: $longitude, isActive: $isActive)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$BranchImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.qrCode, qrCode) || other.qrCode == qrCode) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.address, address) || other.address == address) &&
            (identical(other.phoneNumber, phoneNumber) ||
                other.phoneNumber == phoneNumber) &&
            (identical(other.latitude, latitude) ||
                other.latitude == latitude) &&
            (identical(other.longitude, longitude) ||
                other.longitude == longitude) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive));
  }

  @override
  int get hashCode => Object.hash(runtimeType, id, name, qrCode, createdAt,
      address, phoneNumber, latitude, longitude, isActive);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$BranchImplCopyWith<_$BranchImpl> get copyWith =>
      __$$BranchImplCopyWithImpl<_$BranchImpl>(this, _$identity);
}

abstract class _Branch extends Branch {
  const factory _Branch(
      {required final String id,
      required final String name,
      required final String qrCode,
      required final DateTime createdAt,
      final String? address,
      final String? phoneNumber,
      final double? latitude,
      final double? longitude,
      final bool isActive}) = _$BranchImpl;
  const _Branch._() : super._();

  @override
  String get id;
  @override // UUID
  String get name;
  @override // 지점명 (예: 강남지점)
  String get qrCode;
  @override // 고유 QR 코드
  DateTime get createdAt;
  @override // 생성 시간
  String? get address;
  @override // 지점 주소 (선택)
  String? get phoneNumber;
  @override // 지점 전화번호 (선택)
  double? get latitude;
  @override // 위도 (위치 기반 체크용)
  double? get longitude;
  @override // 경도 (위치 기반 체크용)
  bool get isActive;
  @override
  @JsonKey(ignore: true)
  _$$BranchImplCopyWith<_$BranchImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
