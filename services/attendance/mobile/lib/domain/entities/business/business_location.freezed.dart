// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'business_location.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$BusinessLocation {
  String get id => throw _privateConstructorUsedError;
  String get businessInfoId =>
      throw _privateConstructorUsedError; // 연결된 사업자 정보 ID
  String get name => throw _privateConstructorUsedError; // 지점명 (예: 강남지점, 홍대지점)
  String get address => throw _privateConstructorUsedError; // 주소
  String? get detailAddress => throw _privateConstructorUsedError; // 상세주소
  String? get postalCode => throw _privateConstructorUsedError; // 우편번호
  double? get latitude => throw _privateConstructorUsedError; // 위도
  double? get longitude => throw _privateConstructorUsedError; // 경도
  String? get phoneNumber => throw _privateConstructorUsedError; // 지점 전화번호
  String? get managerUserId =>
      throw _privateConstructorUsedError; // 지점 관리자 사용자 ID
  String? get managerName => throw _privateConstructorUsedError; // 지점 관리자 이름
  int get employeeCount => throw _privateConstructorUsedError; // 직원 수
  bool get isActive => throw _privateConstructorUsedError; // 활성 상태
  bool get isHeadOffice => throw _privateConstructorUsedError; // 본사 여부
  String? get businessHours =>
      throw _privateConstructorUsedError; // 운영시간 (JSON 또는 문자열)
  String? get description => throw _privateConstructorUsedError; // 지점 설명
  List<String>? get facilityFeatures =>
      throw _privateConstructorUsedError; // 시설 특징 (예: ['주차가능', 'WiFi', '24시간'])
  DateTime? get createdAt => throw _privateConstructorUsedError;
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $BusinessLocationCopyWith<BusinessLocation> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $BusinessLocationCopyWith<$Res> {
  factory $BusinessLocationCopyWith(
          BusinessLocation value, $Res Function(BusinessLocation) then) =
      _$BusinessLocationCopyWithImpl<$Res, BusinessLocation>;
  @useResult
  $Res call(
      {String id,
      String businessInfoId,
      String name,
      String address,
      String? detailAddress,
      String? postalCode,
      double? latitude,
      double? longitude,
      String? phoneNumber,
      String? managerUserId,
      String? managerName,
      int employeeCount,
      bool isActive,
      bool isHeadOffice,
      String? businessHours,
      String? description,
      List<String>? facilityFeatures,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class _$BusinessLocationCopyWithImpl<$Res, $Val extends BusinessLocation>
    implements $BusinessLocationCopyWith<$Res> {
  _$BusinessLocationCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? businessInfoId = null,
    Object? name = null,
    Object? address = null,
    Object? detailAddress = freezed,
    Object? postalCode = freezed,
    Object? latitude = freezed,
    Object? longitude = freezed,
    Object? phoneNumber = freezed,
    Object? managerUserId = freezed,
    Object? managerName = freezed,
    Object? employeeCount = null,
    Object? isActive = null,
    Object? isHeadOffice = null,
    Object? businessHours = freezed,
    Object? description = freezed,
    Object? facilityFeatures = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      businessInfoId: null == businessInfoId
          ? _value.businessInfoId
          : businessInfoId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      address: null == address
          ? _value.address
          : address // ignore: cast_nullable_to_non_nullable
              as String,
      detailAddress: freezed == detailAddress
          ? _value.detailAddress
          : detailAddress // ignore: cast_nullable_to_non_nullable
              as String?,
      postalCode: freezed == postalCode
          ? _value.postalCode
          : postalCode // ignore: cast_nullable_to_non_nullable
              as String?,
      latitude: freezed == latitude
          ? _value.latitude
          : latitude // ignore: cast_nullable_to_non_nullable
              as double?,
      longitude: freezed == longitude
          ? _value.longitude
          : longitude // ignore: cast_nullable_to_non_nullable
              as double?,
      phoneNumber: freezed == phoneNumber
          ? _value.phoneNumber
          : phoneNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      managerUserId: freezed == managerUserId
          ? _value.managerUserId
          : managerUserId // ignore: cast_nullable_to_non_nullable
              as String?,
      managerName: freezed == managerName
          ? _value.managerName
          : managerName // ignore: cast_nullable_to_non_nullable
              as String?,
      employeeCount: null == employeeCount
          ? _value.employeeCount
          : employeeCount // ignore: cast_nullable_to_non_nullable
              as int,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      isHeadOffice: null == isHeadOffice
          ? _value.isHeadOffice
          : isHeadOffice // ignore: cast_nullable_to_non_nullable
              as bool,
      businessHours: freezed == businessHours
          ? _value.businessHours
          : businessHours // ignore: cast_nullable_to_non_nullable
              as String?,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      facilityFeatures: freezed == facilityFeatures
          ? _value.facilityFeatures
          : facilityFeatures // ignore: cast_nullable_to_non_nullable
              as List<String>?,
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
abstract class _$$BusinessLocationImplCopyWith<$Res>
    implements $BusinessLocationCopyWith<$Res> {
  factory _$$BusinessLocationImplCopyWith(_$BusinessLocationImpl value,
          $Res Function(_$BusinessLocationImpl) then) =
      __$$BusinessLocationImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String businessInfoId,
      String name,
      String address,
      String? detailAddress,
      String? postalCode,
      double? latitude,
      double? longitude,
      String? phoneNumber,
      String? managerUserId,
      String? managerName,
      int employeeCount,
      bool isActive,
      bool isHeadOffice,
      String? businessHours,
      String? description,
      List<String>? facilityFeatures,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class __$$BusinessLocationImplCopyWithImpl<$Res>
    extends _$BusinessLocationCopyWithImpl<$Res, _$BusinessLocationImpl>
    implements _$$BusinessLocationImplCopyWith<$Res> {
  __$$BusinessLocationImplCopyWithImpl(_$BusinessLocationImpl _value,
      $Res Function(_$BusinessLocationImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? businessInfoId = null,
    Object? name = null,
    Object? address = null,
    Object? detailAddress = freezed,
    Object? postalCode = freezed,
    Object? latitude = freezed,
    Object? longitude = freezed,
    Object? phoneNumber = freezed,
    Object? managerUserId = freezed,
    Object? managerName = freezed,
    Object? employeeCount = null,
    Object? isActive = null,
    Object? isHeadOffice = null,
    Object? businessHours = freezed,
    Object? description = freezed,
    Object? facilityFeatures = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$BusinessLocationImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      businessInfoId: null == businessInfoId
          ? _value.businessInfoId
          : businessInfoId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      address: null == address
          ? _value.address
          : address // ignore: cast_nullable_to_non_nullable
              as String,
      detailAddress: freezed == detailAddress
          ? _value.detailAddress
          : detailAddress // ignore: cast_nullable_to_non_nullable
              as String?,
      postalCode: freezed == postalCode
          ? _value.postalCode
          : postalCode // ignore: cast_nullable_to_non_nullable
              as String?,
      latitude: freezed == latitude
          ? _value.latitude
          : latitude // ignore: cast_nullable_to_non_nullable
              as double?,
      longitude: freezed == longitude
          ? _value.longitude
          : longitude // ignore: cast_nullable_to_non_nullable
              as double?,
      phoneNumber: freezed == phoneNumber
          ? _value.phoneNumber
          : phoneNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      managerUserId: freezed == managerUserId
          ? _value.managerUserId
          : managerUserId // ignore: cast_nullable_to_non_nullable
              as String?,
      managerName: freezed == managerName
          ? _value.managerName
          : managerName // ignore: cast_nullable_to_non_nullable
              as String?,
      employeeCount: null == employeeCount
          ? _value.employeeCount
          : employeeCount // ignore: cast_nullable_to_non_nullable
              as int,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      isHeadOffice: null == isHeadOffice
          ? _value.isHeadOffice
          : isHeadOffice // ignore: cast_nullable_to_non_nullable
              as bool,
      businessHours: freezed == businessHours
          ? _value.businessHours
          : businessHours // ignore: cast_nullable_to_non_nullable
              as String?,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      facilityFeatures: freezed == facilityFeatures
          ? _value._facilityFeatures
          : facilityFeatures // ignore: cast_nullable_to_non_nullable
              as List<String>?,
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

class _$BusinessLocationImpl extends _BusinessLocation {
  const _$BusinessLocationImpl(
      {required this.id,
      required this.businessInfoId,
      required this.name,
      required this.address,
      this.detailAddress,
      this.postalCode,
      this.latitude,
      this.longitude,
      this.phoneNumber,
      this.managerUserId,
      this.managerName,
      this.employeeCount = 0,
      this.isActive = true,
      this.isHeadOffice = false,
      this.businessHours,
      this.description,
      final List<String>? facilityFeatures,
      this.createdAt,
      this.updatedAt})
      : _facilityFeatures = facilityFeatures,
        super._();

  @override
  final String id;
  @override
  final String businessInfoId;
// 연결된 사업자 정보 ID
  @override
  final String name;
// 지점명 (예: 강남지점, 홍대지점)
  @override
  final String address;
// 주소
  @override
  final String? detailAddress;
// 상세주소
  @override
  final String? postalCode;
// 우편번호
  @override
  final double? latitude;
// 위도
  @override
  final double? longitude;
// 경도
  @override
  final String? phoneNumber;
// 지점 전화번호
  @override
  final String? managerUserId;
// 지점 관리자 사용자 ID
  @override
  final String? managerName;
// 지점 관리자 이름
  @override
  @JsonKey()
  final int employeeCount;
// 직원 수
  @override
  @JsonKey()
  final bool isActive;
// 활성 상태
  @override
  @JsonKey()
  final bool isHeadOffice;
// 본사 여부
  @override
  final String? businessHours;
// 운영시간 (JSON 또는 문자열)
  @override
  final String? description;
// 지점 설명
  final List<String>? _facilityFeatures;
// 지점 설명
  @override
  List<String>? get facilityFeatures {
    final value = _facilityFeatures;
    if (value == null) return null;
    if (_facilityFeatures is EqualUnmodifiableListView)
      return _facilityFeatures;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

// 시설 특징 (예: ['주차가능', 'WiFi', '24시간'])
  @override
  final DateTime? createdAt;
  @override
  final DateTime? updatedAt;

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$BusinessLocationImplCopyWith<_$BusinessLocationImpl> get copyWith =>
      __$$BusinessLocationImplCopyWithImpl<_$BusinessLocationImpl>(
          this, _$identity);
}

abstract class _BusinessLocation extends BusinessLocation {
  const factory _BusinessLocation(
      {required final String id,
      required final String businessInfoId,
      required final String name,
      required final String address,
      final String? detailAddress,
      final String? postalCode,
      final double? latitude,
      final double? longitude,
      final String? phoneNumber,
      final String? managerUserId,
      final String? managerName,
      final int employeeCount,
      final bool isActive,
      final bool isHeadOffice,
      final String? businessHours,
      final String? description,
      final List<String>? facilityFeatures,
      final DateTime? createdAt,
      final DateTime? updatedAt}) = _$BusinessLocationImpl;
  const _BusinessLocation._() : super._();

  @override
  String get id;
  @override
  String get businessInfoId;
  @override // 연결된 사업자 정보 ID
  String get name;
  @override // 지점명 (예: 강남지점, 홍대지점)
  String get address;
  @override // 주소
  String? get detailAddress;
  @override // 상세주소
  String? get postalCode;
  @override // 우편번호
  double? get latitude;
  @override // 위도
  double? get longitude;
  @override // 경도
  String? get phoneNumber;
  @override // 지점 전화번호
  String? get managerUserId;
  @override // 지점 관리자 사용자 ID
  String? get managerName;
  @override // 지점 관리자 이름
  int get employeeCount;
  @override // 직원 수
  bool get isActive;
  @override // 활성 상태
  bool get isHeadOffice;
  @override // 본사 여부
  String? get businessHours;
  @override // 운영시간 (JSON 또는 문자열)
  String? get description;
  @override // 지점 설명
  List<String>? get facilityFeatures;
  @override // 시설 특징 (예: ['주차가능', 'WiFi', '24시간'])
  DateTime? get createdAt;
  @override
  DateTime? get updatedAt;
  @override
  @JsonKey(ignore: true)
  _$$BusinessLocationImplCopyWith<_$BusinessLocationImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
