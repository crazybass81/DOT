import 'package:equatable/equatable.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';

@freezed
class User extends Equatable with _$User {
  const factory User({
    required String id,
    required String email,
    required String firstName,
    required String lastName,
    String? phoneNumber,
    String? avatarUrl,
    String? employeeId,
    String? department,
    String? designation,
    String? workLocation,
    DateTime? joiningDate,
    @Default(true) bool isActive,
    @Default(false) bool isBiometricEnabled,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _User;

  const User._();

  String get fullName => '$firstName $lastName';

  String get initials {
    final firstInitial = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final lastInitial = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return '$firstInitial$lastInitial';
  }

  String get displayName {
    if (firstName.isNotEmpty && lastName.isNotEmpty) {
      return fullName;
    } else if (firstName.isNotEmpty) {
      return firstName;
    } else if (lastName.isNotEmpty) {
      return lastName;
    } else {
      return email;
    }
  }

  @override
  List<Object?> get props => [
        id,
        email,
        firstName,
        lastName,
        phoneNumber,
        avatarUrl,
        employeeId,
        department,
        designation,
        workLocation,
        joiningDate,
        isActive,
        isBiometricEnabled,
        createdAt,
        updatedAt,
      ];
}