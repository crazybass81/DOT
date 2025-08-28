import 'package:dartz/dartz.dart';
import '../../../core/errors/failures.dart';
import '../../entities/user/user.dart';
import '../../repositories/user_repository.dart';

class UpdateUserProfileUseCase {
  final UserRepository repository;

  UpdateUserProfileUseCase(this.repository);

  Future<Either<Failure, User>> call(User user) {
    return repository.updateUserProfile(user);
  }
}