import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 최근 공지사항 프로바이더
final recentAnnouncementsProvider = FutureProvider<List<Announcement>>((ref) async {
  // TODO: 실제 서비스 호출 구현
  await Future.delayed(const Duration(milliseconds: 600));
  
  return [
    Announcement(
      id: '1',
      title: '근무 시간 변경 안내',
      content: '다음 주부터 근무 시간이 변경됩니다.',
      priority: 'important',
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      isNew: true,
    ),
    Announcement(
      id: '2',
      title: '월말 정산 관련 공지',
      content: '월말 정산 처리에 관한 안내사항입니다.',
      priority: 'normal',
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      isNew: false,
    ),
    Announcement(
      id: '3',
      title: '시스템 점검 안내',
      content: '정기 시스템 점검이 예정되어 있습니다.',
      priority: 'urgent',
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      isNew: true,
    ),
  ];
});

/// 공지사항 모델
class Announcement {
  final String id;
  final String title;
  final String content;
  final String priority; // normal, important, urgent
  final DateTime createdAt;
  final bool isNew;

  Announcement({
    required this.id,
    required this.title,
    required this.content,
    required this.priority,
    required this.createdAt,
    required this.isNew,
  });
}
