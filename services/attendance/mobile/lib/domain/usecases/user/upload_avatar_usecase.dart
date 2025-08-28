import 'package:dartz/dartz.dart';
import '../../../core/errors/failures.dart';
import '../../repositories/user_repository.dart';

class UploadAvatarUseCase {
  final UserRepository repository;

  UploadAvatarUseCase(this.repository);

  Future<Either<Failure, String>> call(String filePath) {
    return repository.uploadAvatar(filePath);
  }
}