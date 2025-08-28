import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/user/user.dart';

abstract class AuthRepository {
  Future<Either<Failure, User>> login(String email, String password);
  Future<Either<Failure, void>> logout();
  Future<Either<Failure, String>> refreshToken();
  Future<Either<Failure, bool>> verifyBiometric();
  Future<Either<Failure, User?>> getCurrentUser();
  Future<Either<Failure, bool>> isLoggedIn();
}