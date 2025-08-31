// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'business_info.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$BusinessInfo {
  String get id => throw _privateConstructorUsedError;
  String get businessRegistrationNumber =>
      throw _privateConstructorUsedError; // 사업자등록번호
  String get businessName => throw _privateConstructorUsedError; // 상호명
  String get businessType => throw _privateConstructorUsedError; // 업종
  String get businessAddress => throw _privateConstructorUsedError; // 사업장 소재지
  String? get businessPhone => throw _privateConstructorUsedError; // 사업장 전화번호
  String? get businessEmail => throw _privateConstructorUsedError; // 사업장 이메일
  String? get representativeName => throw _privateConstructorUsedError; // 대표자명
  String? get representativeAddress =>
      throw _privateConstructorUsedError; // 대표자 주소
  DateTime? get establishedDate => throw _privateConstructorUsedError; // 개업일자
  bool get isVerified => throw _privateConstructorUsedError; // 사업자등록번호 인증 여부
  DateTime? get verifiedAt => throw _privateConstructorUsedError; // 인증 일시
  String? get verificationDocument =>
      throw _privateConstructorUsedError; // 인증서류 URL
  DateTime? get createdAt => throw _privateConstructorUsedError;
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $BusinessInfoCopyWith<BusinessInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $BusinessInfoCopyWith<$Res> {
  factory $BusinessInfoCopyWith(
          BusinessInfo value, $Res Function(BusinessInfo) then) =
      _$BusinessInfoCopyWithImpl<$Res, BusinessInfo>;
  @useResult
  $Res call(
      {String id,
      String businessRegistrationNumber,
      String businessName,
      String businessType,
      String businessAddress,
      String? businessPhone,
      String? businessEmail,
      String? representativeName,
      String? representativeAddress,
      DateTime? establishedDate,
      bool isVerified,
      DateTime? verifiedAt,
      String? verificationDocument,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class _$BusinessInfoCopyWithImpl<$Res, $Val extends BusinessInfo>
    implements $BusinessInfoCopyWith<$Res> {
  _$BusinessInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? businessRegistrationNumber = null,
    Object? businessName = null,
    Object? businessType = null,
    Object? businessAddress = null,
    Object? businessPhone = freezed,
    Object? businessEmail = freezed,
    Object? representativeName = freezed,
    Object? representativeAddress = freezed,
    Object? establishedDate = freezed,
    Object? isVerified = null,
    Object? verifiedAt = freezed,
    Object? verificationDocument = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      businessRegistrationNumber: null == businessRegistrationNumber
          ? _value.businessRegistrationNumber
          : businessRegistrationNumber // ignore: cast_nullable_to_non_nullable
              as String,
      businessName: null == businessName
          ? _value.businessName
          : businessName // ignore: cast_nullable_to_non_nullable
              as String,
      businessType: null == businessType
          ? _value.businessType
          : businessType // ignore: cast_nullable_to_non_nullable
              as String,
      businessAddress: null == businessAddress
          ? _value.businessAddress
          : businessAddress // ignore: cast_nullable_to_non_nullable
              as String,
      businessPhone: freezed == businessPhone
          ? _value.businessPhone
          : businessPhone // ignore: cast_nullable_to_non_nullable
              as String?,
      businessEmail: freezed == businessEmail
          ? _value.businessEmail
          : businessEmail // ignore: cast_nullable_to_non_nullable
              as String?,
      representativeName: freezed == representativeName
          ? _value.representativeName
          : representativeName // ignore: cast_nullable_to_non_nullable
              as String?,
      representativeAddress: freezed == representativeAddress
          ? _value.representativeAddress
          : representativeAddress // ignore: cast_nullable_to_non_nullable
              as String?,
      establishedDate: freezed == establishedDate
          ? _value.establishedDate
          : establishedDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      isVerified: null == isVerified
          ? _value.isVerified
          : isVerified // ignore: cast_nullable_to_non_nullable
              as bool,
      verifiedAt: freezed == verifiedAt
          ? _value.verifiedAt
          : verifiedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      verificationDocument: freezed == verificationDocument
          ? _value.verificationDocument
          : verificationDocument // ignore: cast_nullable_to_non_nullable
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
abstract class _$$BusinessInfoImplCopyWith<$Res>
    implements $BusinessInfoCopyWith<$Res> {
  factory _$$BusinessInfoImplCopyWith(
          _$BusinessInfoImpl value, $Res Function(_$BusinessInfoImpl) then) =
      __$$BusinessInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String businessRegistrationNumber,
      String businessName,
      String businessType,
      String businessAddress,
      String? businessPhone,
      String? businessEmail,
      String? representativeName,
      String? representativeAddress,
      DateTime? establishedDate,
      bool isVerified,
      DateTime? verifiedAt,
      String? verificationDocument,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class __$$BusinessInfoImplCopyWithImpl<$Res>
    extends _$BusinessInfoCopyWithImpl<$Res, _$BusinessInfoImpl>
    implements _$$BusinessInfoImplCopyWith<$Res> {
  __$$BusinessInfoImplCopyWithImpl(
      _$BusinessInfoImpl _value, $Res Function(_$BusinessInfoImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? businessRegistrationNumber = null,
    Object? businessName = null,
    Object? businessType = null,
    Object? businessAddress = null,
    Object? businessPhone = freezed,
    Object? businessEmail = freezed,
    Object? representativeName = freezed,
    Object? representativeAddress = freezed,
    Object? establishedDate = freezed,
    Object? isVerified = null,
    Object? verifiedAt = freezed,
    Object? verificationDocument = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$BusinessInfoImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      businessRegistrationNumber: null == businessRegistrationNumber
          ? _value.businessRegistrationNumber
          : businessRegistrationNumber // ignore: cast_nullable_to_non_nullable
              as String,
      businessName: null == businessName
          ? _value.businessName
          : businessName // ignore: cast_nullable_to_non_nullable
              as String,
      businessType: null == businessType
          ? _value.businessType
          : businessType // ignore: cast_nullable_to_non_nullable
              as String,
      businessAddress: null == businessAddress
          ? _value.businessAddress
          : businessAddress // ignore: cast_nullable_to_non_nullable
              as String,
      businessPhone: freezed == businessPhone
          ? _value.businessPhone
          : businessPhone // ignore: cast_nullable_to_non_nullable
              as String?,
      businessEmail: freezed == businessEmail
          ? _value.businessEmail
          : businessEmail // ignore: cast_nullable_to_non_nullable
              as String?,
      representativeName: freezed == representativeName
          ? _value.representativeName
          : representativeName // ignore: cast_nullable_to_non_nullable
              as String?,
      representativeAddress: freezed == representativeAddress
          ? _value.representativeAddress
          : representativeAddress // ignore: cast_nullable_to_non_nullable
              as String?,
      establishedDate: freezed == establishedDate
          ? _value.establishedDate
          : establishedDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      isVerified: null == isVerified
          ? _value.isVerified
          : isVerified // ignore: cast_nullable_to_non_nullable
              as bool,
      verifiedAt: freezed == verifiedAt
          ? _value.verifiedAt
          : verifiedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      verificationDocument: freezed == verificationDocument
          ? _value.verificationDocument
          : verificationDocument // ignore: cast_nullable_to_non_nullable
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

class _$BusinessInfoImpl extends _BusinessInfo {
  const _$BusinessInfoImpl(
      {required this.id,
      required this.businessRegistrationNumber,
      required this.businessName,
      required this.businessType,
      required this.businessAddress,
      this.businessPhone,
      this.businessEmail,
      this.representativeName,
      this.representativeAddress,
      this.establishedDate,
      this.isVerified = false,
      this.verifiedAt,
      this.verificationDocument,
      this.createdAt,
      this.updatedAt})
      : super._();

  @override
  final String id;
  @override
  final String businessRegistrationNumber;
// 사업자등록번호
  @override
  final String businessName;
// 상호명
  @override
  final String businessType;
// 업종
  @override
  final String businessAddress;
// 사업장 소재지
  @override
  final String? businessPhone;
// 사업장 전화번호
  @override
  final String? businessEmail;
// 사업장 이메일
  @override
  final String? representativeName;
// 대표자명
  @override
  final String? representativeAddress;
// 대표자 주소
  @override
  final DateTime? establishedDate;
// 개업일자
  @override
  @JsonKey()
  final bool isVerified;
// 사업자등록번호 인증 여부
  @override
  final DateTime? verifiedAt;
// 인증 일시
  @override
  final String? verificationDocument;
// 인증서류 URL
  @override
  final DateTime? createdAt;
  @override
  final DateTime? updatedAt;

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$BusinessInfoImplCopyWith<_$BusinessInfoImpl> get copyWith =>
      __$$BusinessInfoImplCopyWithImpl<_$BusinessInfoImpl>(this, _$identity);
}

abstract class _BusinessInfo extends BusinessInfo {
  const factory _BusinessInfo(
      {required final String id,
      required final String businessRegistrationNumber,
      required final String businessName,
      required final String businessType,
      required final String businessAddress,
      final String? businessPhone,
      final String? businessEmail,
      final String? representativeName,
      final String? representativeAddress,
      final DateTime? establishedDate,
      final bool isVerified,
      final DateTime? verifiedAt,
      final String? verificationDocument,
      final DateTime? createdAt,
      final DateTime? updatedAt}) = _$BusinessInfoImpl;
  const _BusinessInfo._() : super._();

  @override
  String get id;
  @override
  String get businessRegistrationNumber;
  @override // 사업자등록번호
  String get businessName;
  @override // 상호명
  String get businessType;
  @override // 업종
  String get businessAddress;
  @override // 사업장 소재지
  String? get businessPhone;
  @override // 사업장 전화번호
  String? get businessEmail;
  @override // 사업장 이메일
  String? get representativeName;
  @override // 대표자명
  String? get representativeAddress;
  @override // 대표자 주소
  DateTime? get establishedDate;
  @override // 개업일자
  bool get isVerified;
  @override // 사업자등록번호 인증 여부
  DateTime? get verifiedAt;
  @override // 인증 일시
  String? get verificationDocument;
  @override // 인증서류 URL
  DateTime? get createdAt;
  @override
  DateTime? get updatedAt;
  @override
  @JsonKey(ignore: true)
  _$$BusinessInfoImplCopyWith<_$BusinessInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
