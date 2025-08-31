// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'business_profile.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$BusinessProfile {
  String get id => throw _privateConstructorUsedError;
  String get userId => throw _privateConstructorUsedError; // 연결된 사용자 ID
  BusinessInfo get businessInfo => throw _privateConstructorUsedError; // 사업자 정보
  Representative get representative =>
      throw _privateConstructorUsedError; // 대표자 정보
  List<BusinessLocation> get locations =>
      throw _privateConstructorUsedError; // 사업장 목록
// 미래 확장을 위한 플레이스홀더 필드들
  bool get isPhoneVerificationEnabled =>
      throw _privateConstructorUsedError; // 전화번호 인증 활성화
  bool get isBusinessNumberValidationEnabled =>
      throw _privateConstructorUsedError; // 사업자번호 검증 활성화
  bool get isDocumentUploadEnabled =>
      throw _privateConstructorUsedError; // 서류 업로드 활성화
// 인증 상태 추적
  bool get isProfileComplete => throw _privateConstructorUsedError; // 프로필 완성 여부
  int get verificationScore =>
      throw _privateConstructorUsedError; // 인증 점수 (0-100)
  List<String>? get pendingVerifications =>
      throw _privateConstructorUsedError; // 대기중인 인증 목록
  List<String>? get completedVerifications =>
      throw _privateConstructorUsedError; // 완료된 인증 목록
// 메타 정보
  DateTime? get createdAt => throw _privateConstructorUsedError;
  DateTime? get updatedAt => throw _privateConstructorUsedError;
  String? get notes => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $BusinessProfileCopyWith<BusinessProfile> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $BusinessProfileCopyWith<$Res> {
  factory $BusinessProfileCopyWith(
          BusinessProfile value, $Res Function(BusinessProfile) then) =
      _$BusinessProfileCopyWithImpl<$Res, BusinessProfile>;
  @useResult
  $Res call(
      {String id,
      String userId,
      BusinessInfo businessInfo,
      Representative representative,
      List<BusinessLocation> locations,
      bool isPhoneVerificationEnabled,
      bool isBusinessNumberValidationEnabled,
      bool isDocumentUploadEnabled,
      bool isProfileComplete,
      int verificationScore,
      List<String>? pendingVerifications,
      List<String>? completedVerifications,
      DateTime? createdAt,
      DateTime? updatedAt,
      String? notes});

  $BusinessInfoCopyWith<$Res> get businessInfo;
  $RepresentativeCopyWith<$Res> get representative;
}

/// @nodoc
class _$BusinessProfileCopyWithImpl<$Res, $Val extends BusinessProfile>
    implements $BusinessProfileCopyWith<$Res> {
  _$BusinessProfileCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? businessInfo = null,
    Object? representative = null,
    Object? locations = null,
    Object? isPhoneVerificationEnabled = null,
    Object? isBusinessNumberValidationEnabled = null,
    Object? isDocumentUploadEnabled = null,
    Object? isProfileComplete = null,
    Object? verificationScore = null,
    Object? pendingVerifications = freezed,
    Object? completedVerifications = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? notes = freezed,
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
      businessInfo: null == businessInfo
          ? _value.businessInfo
          : businessInfo // ignore: cast_nullable_to_non_nullable
              as BusinessInfo,
      representative: null == representative
          ? _value.representative
          : representative // ignore: cast_nullable_to_non_nullable
              as Representative,
      locations: null == locations
          ? _value.locations
          : locations // ignore: cast_nullable_to_non_nullable
              as List<BusinessLocation>,
      isPhoneVerificationEnabled: null == isPhoneVerificationEnabled
          ? _value.isPhoneVerificationEnabled
          : isPhoneVerificationEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      isBusinessNumberValidationEnabled: null ==
              isBusinessNumberValidationEnabled
          ? _value.isBusinessNumberValidationEnabled
          : isBusinessNumberValidationEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      isDocumentUploadEnabled: null == isDocumentUploadEnabled
          ? _value.isDocumentUploadEnabled
          : isDocumentUploadEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      isProfileComplete: null == isProfileComplete
          ? _value.isProfileComplete
          : isProfileComplete // ignore: cast_nullable_to_non_nullable
              as bool,
      verificationScore: null == verificationScore
          ? _value.verificationScore
          : verificationScore // ignore: cast_nullable_to_non_nullable
              as int,
      pendingVerifications: freezed == pendingVerifications
          ? _value.pendingVerifications
          : pendingVerifications // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      completedVerifications: freezed == completedVerifications
          ? _value.completedVerifications
          : completedVerifications // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $BusinessInfoCopyWith<$Res> get businessInfo {
    return $BusinessInfoCopyWith<$Res>(_value.businessInfo, (value) {
      return _then(_value.copyWith(businessInfo: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $RepresentativeCopyWith<$Res> get representative {
    return $RepresentativeCopyWith<$Res>(_value.representative, (value) {
      return _then(_value.copyWith(representative: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$BusinessProfileImplCopyWith<$Res>
    implements $BusinessProfileCopyWith<$Res> {
  factory _$$BusinessProfileImplCopyWith(_$BusinessProfileImpl value,
          $Res Function(_$BusinessProfileImpl) then) =
      __$$BusinessProfileImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String userId,
      BusinessInfo businessInfo,
      Representative representative,
      List<BusinessLocation> locations,
      bool isPhoneVerificationEnabled,
      bool isBusinessNumberValidationEnabled,
      bool isDocumentUploadEnabled,
      bool isProfileComplete,
      int verificationScore,
      List<String>? pendingVerifications,
      List<String>? completedVerifications,
      DateTime? createdAt,
      DateTime? updatedAt,
      String? notes});

  @override
  $BusinessInfoCopyWith<$Res> get businessInfo;
  @override
  $RepresentativeCopyWith<$Res> get representative;
}

/// @nodoc
class __$$BusinessProfileImplCopyWithImpl<$Res>
    extends _$BusinessProfileCopyWithImpl<$Res, _$BusinessProfileImpl>
    implements _$$BusinessProfileImplCopyWith<$Res> {
  __$$BusinessProfileImplCopyWithImpl(
      _$BusinessProfileImpl _value, $Res Function(_$BusinessProfileImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? businessInfo = null,
    Object? representative = null,
    Object? locations = null,
    Object? isPhoneVerificationEnabled = null,
    Object? isBusinessNumberValidationEnabled = null,
    Object? isDocumentUploadEnabled = null,
    Object? isProfileComplete = null,
    Object? verificationScore = null,
    Object? pendingVerifications = freezed,
    Object? completedVerifications = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? notes = freezed,
  }) {
    return _then(_$BusinessProfileImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      userId: null == userId
          ? _value.userId
          : userId // ignore: cast_nullable_to_non_nullable
              as String,
      businessInfo: null == businessInfo
          ? _value.businessInfo
          : businessInfo // ignore: cast_nullable_to_non_nullable
              as BusinessInfo,
      representative: null == representative
          ? _value.representative
          : representative // ignore: cast_nullable_to_non_nullable
              as Representative,
      locations: null == locations
          ? _value._locations
          : locations // ignore: cast_nullable_to_non_nullable
              as List<BusinessLocation>,
      isPhoneVerificationEnabled: null == isPhoneVerificationEnabled
          ? _value.isPhoneVerificationEnabled
          : isPhoneVerificationEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      isBusinessNumberValidationEnabled: null ==
              isBusinessNumberValidationEnabled
          ? _value.isBusinessNumberValidationEnabled
          : isBusinessNumberValidationEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      isDocumentUploadEnabled: null == isDocumentUploadEnabled
          ? _value.isDocumentUploadEnabled
          : isDocumentUploadEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      isProfileComplete: null == isProfileComplete
          ? _value.isProfileComplete
          : isProfileComplete // ignore: cast_nullable_to_non_nullable
              as bool,
      verificationScore: null == verificationScore
          ? _value.verificationScore
          : verificationScore // ignore: cast_nullable_to_non_nullable
              as int,
      pendingVerifications: freezed == pendingVerifications
          ? _value._pendingVerifications
          : pendingVerifications // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      completedVerifications: freezed == completedVerifications
          ? _value._completedVerifications
          : completedVerifications // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

class _$BusinessProfileImpl extends _BusinessProfile {
  const _$BusinessProfileImpl(
      {required this.id,
      required this.userId,
      required this.businessInfo,
      required this.representative,
      final List<BusinessLocation> locations = const [],
      this.isPhoneVerificationEnabled = false,
      this.isBusinessNumberValidationEnabled = false,
      this.isDocumentUploadEnabled = false,
      this.isProfileComplete = false,
      this.verificationScore = 0,
      final List<String>? pendingVerifications,
      final List<String>? completedVerifications,
      this.createdAt,
      this.updatedAt,
      this.notes})
      : _locations = locations,
        _pendingVerifications = pendingVerifications,
        _completedVerifications = completedVerifications,
        super._();

  @override
  final String id;
  @override
  final String userId;
// 연결된 사용자 ID
  @override
  final BusinessInfo businessInfo;
// 사업자 정보
  @override
  final Representative representative;
// 대표자 정보
  final List<BusinessLocation> _locations;
// 대표자 정보
  @override
  @JsonKey()
  List<BusinessLocation> get locations {
    if (_locations is EqualUnmodifiableListView) return _locations;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_locations);
  }

// 사업장 목록
// 미래 확장을 위한 플레이스홀더 필드들
  @override
  @JsonKey()
  final bool isPhoneVerificationEnabled;
// 전화번호 인증 활성화
  @override
  @JsonKey()
  final bool isBusinessNumberValidationEnabled;
// 사업자번호 검증 활성화
  @override
  @JsonKey()
  final bool isDocumentUploadEnabled;
// 서류 업로드 활성화
// 인증 상태 추적
  @override
  @JsonKey()
  final bool isProfileComplete;
// 프로필 완성 여부
  @override
  @JsonKey()
  final int verificationScore;
// 인증 점수 (0-100)
  final List<String>? _pendingVerifications;
// 인증 점수 (0-100)
  @override
  List<String>? get pendingVerifications {
    final value = _pendingVerifications;
    if (value == null) return null;
    if (_pendingVerifications is EqualUnmodifiableListView)
      return _pendingVerifications;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

// 대기중인 인증 목록
  final List<String>? _completedVerifications;
// 대기중인 인증 목록
  @override
  List<String>? get completedVerifications {
    final value = _completedVerifications;
    if (value == null) return null;
    if (_completedVerifications is EqualUnmodifiableListView)
      return _completedVerifications;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

// 완료된 인증 목록
// 메타 정보
  @override
  final DateTime? createdAt;
  @override
  final DateTime? updatedAt;
  @override
  final String? notes;

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$BusinessProfileImplCopyWith<_$BusinessProfileImpl> get copyWith =>
      __$$BusinessProfileImplCopyWithImpl<_$BusinessProfileImpl>(
          this, _$identity);
}

abstract class _BusinessProfile extends BusinessProfile {
  const factory _BusinessProfile(
      {required final String id,
      required final String userId,
      required final BusinessInfo businessInfo,
      required final Representative representative,
      final List<BusinessLocation> locations,
      final bool isPhoneVerificationEnabled,
      final bool isBusinessNumberValidationEnabled,
      final bool isDocumentUploadEnabled,
      final bool isProfileComplete,
      final int verificationScore,
      final List<String>? pendingVerifications,
      final List<String>? completedVerifications,
      final DateTime? createdAt,
      final DateTime? updatedAt,
      final String? notes}) = _$BusinessProfileImpl;
  const _BusinessProfile._() : super._();

  @override
  String get id;
  @override
  String get userId;
  @override // 연결된 사용자 ID
  BusinessInfo get businessInfo;
  @override // 사업자 정보
  Representative get representative;
  @override // 대표자 정보
  List<BusinessLocation> get locations;
  @override // 사업장 목록
// 미래 확장을 위한 플레이스홀더 필드들
  bool get isPhoneVerificationEnabled;
  @override // 전화번호 인증 활성화
  bool get isBusinessNumberValidationEnabled;
  @override // 사업자번호 검증 활성화
  bool get isDocumentUploadEnabled;
  @override // 서류 업로드 활성화
// 인증 상태 추적
  bool get isProfileComplete;
  @override // 프로필 완성 여부
  int get verificationScore;
  @override // 인증 점수 (0-100)
  List<String>? get pendingVerifications;
  @override // 대기중인 인증 목록
  List<String>? get completedVerifications;
  @override // 완료된 인증 목록
// 메타 정보
  DateTime? get createdAt;
  @override
  DateTime? get updatedAt;
  @override
  String? get notes;
  @override
  @JsonKey(ignore: true)
  _$$BusinessProfileImplCopyWith<_$BusinessProfileImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
