import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../router/app_router.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        backgroundColor: NeoBrutalTheme.bg,
        elevation: 0,
        title: const Text(
          'Settings',
          style: TextStyle(
            color: NeoBrutalTheme.fg,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSettingCard(
            title: 'Notification Settings',
            subtitle: 'Configure app notifications',
            icon: Icons.notifications_outlined,
            onTap: () => context.go(RouteNames.notificationSettings),
          ),
          const SizedBox(height: 12),
          _buildSettingCard(
            title: 'Security Settings',
            subtitle: 'Manage security preferences',
            icon: Icons.security_outlined,
            onTap: () => context.go(RouteNames.securitySettings),
          ),
          const SizedBox(height: 12),
          _buildSettingCard(
            title: 'Database Test',
            subtitle: 'Test Firebase & DynamoDB integration',
            icon: Icons.storage_outlined,
            color: NeoBrutalTheme.accent,
            onTap: () => context.go(RouteNames.databaseTest),
          ),
          const SizedBox(height: 24),
          _buildSettingCard(
            title: 'About',
            subtitle: 'Version 1.0.0',
            icon: Icons.info_outline,
            onTap: () {
              showAboutDialog(
                context: context,
                applicationName: 'DOT Attendance',
                applicationVersion: '1.0.0',
                applicationLegalese: '© 2024 DOT Company',
              );
            },
          ),
        ],
      ),
    );
  }
  
  Widget _buildSettingCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
    Color? color,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color ?? NeoBrutalTheme.white,
          border: Border.all(color: NeoBrutalTheme.fg, width: 2),
          boxShadow: const [
            BoxShadow(
              color: NeoBrutalTheme.fg,
              offset: Offset(4, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: NeoBrutalTheme.bg,
                border: Border.all(color: NeoBrutalTheme.fg, width: 2),
              ),
              child: Icon(
                icon,
                color: NeoBrutalTheme.fg,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: NeoBrutalTheme.headline4.copyWith(
                      color: NeoBrutalTheme.fg,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: NeoBrutalTheme.body.copyWith(
                      color: NeoBrutalTheme.gray600,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: NeoBrutalTheme.fg,
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}