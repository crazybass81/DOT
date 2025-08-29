import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../common/neo_brutal_card.dart';

/// 공지사항을 보여주는 카드 위젯
class AnnouncementCard extends ConsumerWidget {
  final AsyncValue announcements;
  final int maxItems;

  const AnnouncementCard({
    super.key,
    required this.announcements,
    this.maxItems = 3,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return announcements.when(
      data: (announcementList) => _buildAnnouncementList(announcementList),
      loading: () => _buildLoadingCard(),
      error: (error, stack) => _buildErrorCard(error.toString()),
    );
  }

  Widget _buildAnnouncementList(List<dynamic> announcementList) {
    if (announcementList.isEmpty) {
      return _buildEmptyCard();
    }

    final displayList = announcementList.take(maxItems).toList();

    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        children: [
          ...displayList.asMap().entries.map((entry) {
            final index = entry.key;
            final announcement = entry.value;
            return Column(
              children: [
                _buildAnnouncementItem(announcement),
                if (index < displayList.length - 1)
                  const Padding(
                    padding: EdgeInsets.symmetric(
                      vertical: NeoBrutalTheme.space2,
                    ),
                    child: Divider(
                      height: 1,
                      color: NeoBrutalTheme.line,
                    ),
                  ),
              ],
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildAnnouncementItem(dynamic announcement) {
    final priority = announcement.priority ?? 'normal';
    final isImportant = priority == 'important' || priority == 'urgent';
    final isUrgent = priority == 'urgent';
    
    Color priorityColor = NeoBrutalTheme.fg.withOpacity(0.7);
    IconData priorityIcon = Icons.info_outline;
    
    if (isUrgent) {
      priorityColor = NeoBrutalTheme.error;
      priorityIcon = Icons.priority_high;
    } else if (isImportant) {
      priorityColor = NeoBrutalTheme.warning;
      priorityIcon = Icons.notification_important;
    }

    return InkWell(
      onTap: () {
        _showAnnouncementDetail(announcement);
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(
          vertical: NeoBrutalTheme.space2,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 우선도 아이콘
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: priorityColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Icon(
                priorityIcon,
                size: 16,
                color: priorityColor,
              ),
            ),
            const SizedBox(width: NeoBrutalTheme.space2),
            
            // 공지 내용
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    announcement.title ?? '제목 없음',
                    style: NeoBrutalTheme.body.copyWith(
                      fontWeight: isImportant ? FontWeight.w700 : FontWeight.w400,
                      color: isUrgent ? NeoBrutalTheme.error : NeoBrutalTheme.fg,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Text(
                        _formatDate(announcement.createdAt),
                        style: NeoBrutalTheme.caption.copyWith(
                          color: NeoBrutalTheme.fg.withOpacity(0.6),
                        ),
                      ),
                      if (announcement.isNew == true) ...[
                        const SizedBox(width: NeoBrutalTheme.space2),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: NeoBrutalTheme.hi,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'NEW',
                            style: NeoBrutalTheme.micro.copyWith(
                              color: NeoBrutalTheme.hiInk,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            
            // 상세 보기 아이콘
            Icon(
              Icons.chevron_right,
              size: 16,
              color: NeoBrutalTheme.fg.withOpacity(0.5),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyCard() {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space6),
      child: Column(
        children: [
          Icon(
            Icons.campaign_outlined,
            size: 48,
            color: NeoBrutalTheme.fg.withOpacity(0.3),
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          Text(
            '새로운 공지사항이 없습니다',
            style: NeoBrutalTheme.body.copyWith(
              color: NeoBrutalTheme.fg.withOpacity(0.6),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingCard() {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space6),
      child: Column(
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: NeoBrutalTheme.space3),
          Text(
            '공지사항을 불러오는 중...',
            style: NeoBrutalTheme.body,
          ),
        ],
      ),
    );
  }

  Widget _buildErrorCard(String error) {
    return NeoBrutalCard(
      borderColor: NeoBrutalTheme.error,
      padding: const EdgeInsets.all(NeoBrutalTheme.space6),
      child: Column(
        children: [
          Icon(
            Icons.error_outline,
            color: NeoBrutalTheme.error,
            size: 48,
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          Text(
            '공지사항을 불러올 수 없습니다',
            style: NeoBrutalTheme.body,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  void _showAnnouncementDetail(dynamic announcement) {
    // TODO: 공지사항 상세 대화상자 또는 페이지 표시
    print('Show announcement detail: ${announcement.id}');
  }

  String _formatDate(DateTime? dateTime) {
    if (dateTime == null) return '날짜 없음';
    
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inDays == 0) {
      // 오늘
      final hour = dateTime.hour.toString().padLeft(2, '0');
      final minute = dateTime.minute.toString().padLeft(2, '0');
      return '오늘 $hour:$minute';
    } else if (difference.inDays == 1) {
      return '어제';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}일 전';
    } else {
      return '${dateTime.month}.${dateTime.day}';
    }
  }
}
