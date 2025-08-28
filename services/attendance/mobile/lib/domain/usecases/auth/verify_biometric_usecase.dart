import 'package:dartz/dartz.dart';
import '../../../core/errors/failures.dart';
import '../../repositories/auth_repository.dart';

class VerifyBiometricUseCase {
  final AuthRepository repository;

  VerifyBiometricUseCase(this.repository);

  Future<Either<Failure, bool>> call() async {
    return await repository.verifyBiometric();
  }
}