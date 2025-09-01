// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'approval_management_provider.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$ApprovalManagementState {
  bool get isLoading => throw _privateConstructorUsedError;
  List<Map<String, dynamic>> get pendingApprovals =>
      throw _privateConstructorUsedError;
  String? get error => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $ApprovalManagementStateCopyWith<ApprovalManagementState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ApprovalManagementStateCopyWith<$Res> {
  factory $ApprovalManagementStateCopyWith(ApprovalManagementState value,
          $Res Function(ApprovalManagementState) then) =
      _$ApprovalManagementStateCopyWithImpl<$Res, ApprovalManagementState>;
  @useResult
  $Res call(
      {bool isLoading,
      List<Map<String, dynamic>> pendingApprovals,
      String? error});
}

/// @nodoc
class _$ApprovalManagementStateCopyWithImpl<$Res,
        $Val extends ApprovalManagementState>
    implements $ApprovalManagementStateCopyWith<$Res> {
  _$ApprovalManagementStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isLoading = null,
    Object? pendingApprovals = null,
    Object? error = freezed,
  }) {
    return _then(_value.copyWith(
      isLoading: null == isLoading
          ? _value.isLoading
          : isLoading // ignore: cast_nullable_to_non_nullable
              as bool,
      pendingApprovals: null == pendingApprovals
          ? _value.pendingApprovals
          : pendingApprovals // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ApprovalManagementStateImplCopyWith<$Res>
    implements $ApprovalManagementStateCopyWith<$Res> {
  factory _$$ApprovalManagementStateImplCopyWith(
          _$ApprovalManagementStateImpl value,
          $Res Function(_$ApprovalManagementStateImpl) then) =
      __$$ApprovalManagementStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool isLoading,
      List<Map<String, dynamic>> pendingApprovals,
      String? error});
}

/// @nodoc
class __$$ApprovalManagementStateImplCopyWithImpl<$Res>
    extends _$ApprovalManagementStateCopyWithImpl<$Res,
        _$ApprovalManagementStateImpl>
    implements _$$ApprovalManagementStateImplCopyWith<$Res> {
  __$$ApprovalManagementStateImplCopyWithImpl(
      _$ApprovalManagementStateImpl _value,
      $Res Function(_$ApprovalManagementStateImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isLoading = null,
    Object? pendingApprovals = null,
    Object? error = freezed,
  }) {
    return _then(_$ApprovalManagementStateImpl(
      isLoading: null == isLoading
          ? _value.isLoading
          : isLoading // ignore: cast_nullable_to_non_nullable
              as bool,
      pendingApprovals: null == pendingApprovals
          ? _value._pendingApprovals
          : pendingApprovals // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
      error: freezed == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

class _$ApprovalManagementStateImpl implements _ApprovalManagementState {
  const _$ApprovalManagementStateImpl(
      {this.isLoading = false,
      final List<Map<String, dynamic>> pendingApprovals = const [],
      this.error})
      : _pendingApprovals = pendingApprovals;

  @override
  @JsonKey()
  final bool isLoading;
  final List<Map<String, dynamic>> _pendingApprovals;
  @override
  @JsonKey()
  List<Map<String, dynamic>> get pendingApprovals {
    if (_pendingApprovals is EqualUnmodifiableListView)
      return _pendingApprovals;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_pendingApprovals);
  }

  @override
  final String? error;

  @override
  String toString() {
    return 'ApprovalManagementState(isLoading: $isLoading, pendingApprovals: $pendingApprovals, error: $error)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ApprovalManagementStateImpl &&
            (identical(other.isLoading, isLoading) ||
                other.isLoading == isLoading) &&
            const DeepCollectionEquality()
                .equals(other._pendingApprovals, _pendingApprovals) &&
            (identical(other.error, error) || other.error == error));
  }

  @override
  int get hashCode => Object.hash(runtimeType, isLoading,
      const DeepCollectionEquality().hash(_pendingApprovals), error);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ApprovalManagementStateImplCopyWith<_$ApprovalManagementStateImpl>
      get copyWith => __$$ApprovalManagementStateImplCopyWithImpl<
          _$ApprovalManagementStateImpl>(this, _$identity);
}

abstract class _ApprovalManagementState implements ApprovalManagementState {
  const factory _ApprovalManagementState(
      {final bool isLoading,
      final List<Map<String, dynamic>> pendingApprovals,
      final String? error}) = _$ApprovalManagementStateImpl;

  @override
  bool get isLoading;
  @override
  List<Map<String, dynamic>> get pendingApprovals;
  @override
  String? get error;
  @override
  @JsonKey(ignore: true)
  _$$ApprovalManagementStateImplCopyWith<_$ApprovalManagementStateImpl>
      get copyWith => throw _privateConstructorUsedError;
}
