// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'representative.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$Representative {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError; // 대표자명 (예: 임태균)
  String get phoneNumber =>
      throw _privateConstructorUsedError; // 연락처 (예: 01093177090)
  String? get email => throw _privateConstructorUsedError; // 이메일
  String? get address => throw _privateConstructorUsedError; // 주소
  String? get residentRegistrationNumber =>
      throw _privateConstructorUsedError; // 주민등록번호 (암호화된 형태)
  bool get isPhoneVerified => throw _privateConstructorUsedError; // 전화번호 인증 여부
  DateTime? get phoneVerifiedAt =>
      throw _privateConstructorUsedError; // 전화번호 인증 일시
  bool get isIdentityVerified => throw _privateConstructorUsedError; // 신분 인증 여부
  DateTime? get identityVerifiedAt =>
      throw _privateConstructorUsedError; // 신분 인증 일시
  String? get identityDocument =>
      throw _privateConstructorUsedError; // 신분증 사본 URL
  DateTime? get createdAt => throw _privateConstructorUsedError;
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $RepresentativeCopyWith<Representative> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $RepresentativeCopyWith<$Res> {
  factory $RepresentativeCopyWith(
          Representative value, $Res Function(Representative) then) =
      _$RepresentativeCopyWithImpl<$Res, Representative>;
  @useResult
  $Res call(
      {String id,
      String name,
      String phoneNumber,
      String? email,
      String? address,
      String? residentRegistrationNumber,
      bool isPhoneVerified,
      DateTime? phoneVerifiedAt,
      bool isIdentityVerified,
      DateTime? identityVerifiedAt,
      String? identityDocument,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class _$RepresentativeCopyWithImpl<$Res, $Val extends Representative>
    implements $RepresentativeCopyWith<$Res> {
  _$RepresentativeCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? phoneNumber = null,
    Object? email = freezed,
    Object? address = freezed,
    Object? residentRegistrationNumber = freezed,
    Object? isPhoneVerified = null,
    Object? phoneVerifiedAt = freezed,
    Object? isIdentityVerified = null,
    Object? identityVerifiedAt = freezed,
    Object? identityDocument = freezed,
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
      phoneNumber: null == phoneNumber
          ? _value.phoneNumber
          : phoneNumber // ignore: cast_nullable_to_non_nullable
              as String,
      email: freezed == email
          ? _value.email
          : email // ignore: cast_nullable_to_non_nullable
              as String?,
      address: freezed == address
          ? _value.address
          : address // ignore: cast_nullable_to_non_nullable
              as String?,
      residentRegistrationNumber: freezed == residentRegistrationNumber
          ? _value.residentRegistrationNumber
          : residentRegistrationNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      isPhoneVerified: null == isPhoneVerified
          ? _value.isPhoneVerified
          : isPhoneVerified // ignore: cast_nullable_to_non_nullable
              as bool,
      phoneVerifiedAt: freezed == phoneVerifiedAt
          ? _value.phoneVerifiedAt
          : phoneVerifiedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      isIdentityVerified: null == isIdentityVerified
          ? _value.isIdentityVerified
          : isIdentityVerified // ignore: cast_nullable_to_non_nullable
              as bool,
      identityVerifiedAt: freezed == identityVerifiedAt
          ? _value.identityVerifiedAt
          : identityVerifiedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      identityDocument: freezed == identityDocument
          ? _value.identityDocument
          : identityDocument // ignore: cast_nullable_to_non_nullable
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
abstract class _$$RepresentativeImplCopyWith<$Res>
    implements $RepresentativeCopyWith<$Res> {
  factory _$$RepresentativeImplCopyWith(_$RepresentativeImpl value,
          $Res Function(_$RepresentativeImpl) then) =
      __$$RepresentativeImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String phoneNumber,
      String? email,
      String? address,
      String? residentRegistrationNumber,
      bool isPhoneVerified,
      DateTime? phoneVerifiedAt,
      bool isIdentityVerified,
      DateTime? identityVerifiedAt,
      String? identityDocument,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class __$$RepresentativeImplCopyWithImpl<$Res>
    extends _$RepresentativeCopyWithImpl<$Res, _$RepresentativeImpl>
    implements _$$RepresentativeImplCopyWith<$Res> {
  __$$RepresentativeImplCopyWithImpl(
      _$RepresentativeImpl _value, $Res Function(_$RepresentativeImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? phoneNumber = null,
    Object? email = freezed,
    Object? address = freezed,
    Object? residentRegistrationNumber = freezed,
    Object? isPhoneVerified = null,
    Object? phoneVerifiedAt = freezed,
    Object? isIdentityVerified = null,
    Object? identityVerifiedAt = freezed,
    Object? identityDocument = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$RepresentativeImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      phoneNumber: null == phoneNumber
          ? _value.phoneNumber
          : phoneNumber // ignore: cast_nullable_to_non_nullable
              as String,
      email: freezed == email
          ? _value.email
          : email // ignore: cast_nullable_to_non_nullable
              as String?,
      address: freezed == address
          ? _value.address
          : address // ignore: cast_nullable_to_non_nullable
              as String?,
      residentRegistrationNumber: freezed == residentRegistrationNumber
          ? _value.residentRegistrationNumber
          : residentRegistrationNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      isPhoneVerified: null == isPhoneVerified
          ? _value.isPhoneVerified
          : isPhoneVerified // ignore: cast_nullable_to_non_nullable
              as bool,
      phoneVerifiedAt: freezed == phoneVerifiedAt
          ? _value.phoneVerifiedAt
          : phoneVerifiedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      isIdentityVerified: null == isIdentityVerified
          ? _value.isIdentityVerified
          : isIdentityVerified // ignore: cast_nullable_to_non_nullable
              as bool,
      identityVerifiedAt: freezed == identityVerifiedAt
          ? _value.identityVerifiedAt
          : identityVerifiedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      identityDocument: freezed == identityDocument
          ? _value.identityDocument
          : identityDocument // ignore: cast_nullable_to_non_nullable
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

class _$RepresentativeImpl extends _Representative {
  const _$RepresentativeImpl(
      {required this.id,
      required this.name,
      required this.phoneNumber,
      this.email,
      this.address,
      this.residentRegistrationNumber,
      this.isPhoneVerified = false,
      this.phoneVerifiedAt,
      this.isIdentityVerified = false,
      this.identityVerifiedAt,
      this.identityDocument,
      this.createdAt,
      this.updatedAt})
      : super._();

  @override
  final String id;
  @override
  final String name;
// 대표자명 (예: 임태균)
  @override
  final String phoneNumber;
// 연락처 (예: 01093177090)
  @override
  final String? email;
// 이메일
  @override
  final String? address;
// 주소
  @override
  final String? residentRegistrationNumber;
// 주민등록번호 (암호화된 형태)
  @override
  @JsonKey()
  final bool isPhoneVerified;
// 전화번호 인증 여부
  @override
  final DateTime? phoneVerifiedAt;
// 전화번호 인증 일시
  @override
  @JsonKey()
  final bool isIdentityVerified;
// 신분 인증 여부
  @override
  final DateTime? identityVerifiedAt;
// 신분 인증 일시
  @override
  final String? identityDocument;
// 신분증 사본 URL
  @override
  final DateTime? createdAt;
  @override
  final DateTime? updatedAt;

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$RepresentativeImplCopyWith<_$RepresentativeImpl> get copyWith =>
      __$$RepresentativeImplCopyWithImpl<_$RepresentativeImpl>(
          this, _$identity);
}

abstract class _Representative extends Representative {
  const factory _Representative(
      {required final String id,
      required final String name,
      required final String phoneNumber,
      final String? email,
      final String? address,
      final String? residentRegistrationNumber,
      final bool isPhoneVerified,
      final DateTime? phoneVerifiedAt,
      final bool isIdentityVerified,
      final DateTime? identityVerifiedAt,
      final String? identityDocument,
      final DateTime? createdAt,
      final DateTime? updatedAt}) = _$RepresentativeImpl;
  const _Representative._() : super._();

  @override
  String get id;
  @override
  String get name;
  @override // 대표자명 (예: 임태균)
  String get phoneNumber;
  @override // 연락처 (예: 01093177090)
  String? get email;
  @override // 이메일
  String? get address;
  @override // 주소
  String? get residentRegistrationNumber;
  @override // 주민등록번호 (암호화된 형태)
  bool get isPhoneVerified;
  @override // 전화번호 인증 여부
  DateTime? get phoneVerifiedAt;
  @override // 전화번호 인증 일시
  bool get isIdentityVerified;
  @override // 신분 인증 여부
  DateTime? get identityVerifiedAt;
  @override // 신분 인증 일시
  String? get identityDocument;
  @override // 신분증 사본 URL
  DateTime? get createdAt;
  @override
  DateTime? get updatedAt;
  @override
  @JsonKey(ignore: true)
  _$$RepresentativeImplCopyWith<_$RepresentativeImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
