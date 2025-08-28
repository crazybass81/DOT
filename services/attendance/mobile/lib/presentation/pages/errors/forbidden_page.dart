import 'package:flutter/material.dart';
import '../../../core/theme/neo_brutal_theme.dart';

class ForbiddenPage extends StatelessWidget {
  final String? message;
  
  const ForbiddenPage({
    super.key,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: NeoBrutalTheme.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: NeoBrutalTheme.error,
                      width: 2,
                    ),
                  ),
                  child: Icon(
                    Icons.lock_outline,
                    size: 64,
                    color: NeoBrutalTheme.error,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  '403',
                  style: NeoBrutalTheme.title.copyWith(
                    color: NeoBrutalTheme.error,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  '접근 권한이 없습니다',
                  style: NeoBrutalTheme.heading,
                ),
                const SizedBox(height: 8),
                Text(
                  message ?? '이 페이지에 접근할 수 있는 권한이 없습니다.\n관리자에게 문의해주세요.',
                  style: NeoBrutalTheme.body,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pushReplacementNamed('/dashboard');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: NeoBrutalTheme.hi,
                    foregroundColor: NeoBrutalTheme.hiInk,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 32,
                      vertical: 16,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: const BorderSide(
                        color: Colors.black,
                        width: 2,
                      ),
                    ),
                  ),
                  child: const Text(
                    '대시보드로 돌아가기',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}