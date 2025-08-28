import 'package:dartz/dartz.dart';
import '../../../core/errors/failures.dart';
import '../../entities/user/user.dart';
import '../../repositories/auth_repository.dart';

class RefreshTokenUseCase {
  final AuthRepository repository;

  RefreshTokenUseCase(this.repository);

  Future<Either<Failure, User>> call(String refreshToken) async {
    return await repository.refreshToken(refreshToken);
  }
}