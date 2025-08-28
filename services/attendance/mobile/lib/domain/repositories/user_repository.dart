import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/user/user.dart';

abstract class UserRepository {
  Future<Either<Failure, User>> getUserProfile(String userId);
  Future<Either<Failure, User>> updateUserProfile(User user);
  Future<Either<Failure, String>> uploadAvatar(String filePath);
}