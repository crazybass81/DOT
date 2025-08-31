import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../router/app_router.dart';
import '../../providers/auth_provider.dart';

class MasterAdminDashboardPage extends ConsumerStatefulWidget {
  const MasterAdminDashboardPage({super.key});

  @override
  ConsumerState<MasterAdminDashboardPage> createState() => _MasterAdminDashboardPageState();
}

class _MasterAdminDashboardPageState extends ConsumerState<MasterAdminDashboardPage> {
  Map<String, dynamic>? _organizationData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadOrganizationData();
  }

  Future<void> _loadOrganizationData() async {
    final user = ref.read(currentUserProvider);
    if (user != null) {
      // For now, we'll use the user data we already have
      // In the future, you can fetch additional organization data from Supabase
      if (mounted) {
        setState(() {
          _organizationData = {
            'name': user.firstName ?? 'Admin',
            'email': user.email,
            'role': user.role.name,
            'organization': 'DOT',
          };
          _isLoading = false;
        });
      }
    } else {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    
    if (_isLoading) {
      return Scaffold(
        backgroundColor: NeoBrutalTheme.bg,
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: _buildAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome Section
              _buildWelcomeSection(_getUserDisplayName()),
              
              const SizedBox(height: 16),
              
              // Organization Info
              _buildOrganizationInfo(),
              
              const SizedBox(height: 32),
              
              // Quick Stats
              _buildQuickStats(),
              
              const SizedBox(height: 32),
              
              // Main Actions Grid
              _buildActionsGrid(),
              
              const SizedBox(height: 32),
              
              // Recent Activities
              _buildRecentActivities(),
            ],
          ),
        ),
      ),
    );
  }
  
  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: NeoBrutalTheme.white,
      elevation: 0,
      automaticallyImplyLeading: false,
      toolbarHeight: 80,
      flexibleSpace: Container(
        decoration: BoxDecoration(
          color: NeoBrutalTheme.white,
          border: Border(
            bottom: BorderSide(color: NeoBrutalTheme.fg, width: 3),
          ),
          boxShadow: const [
            BoxShadow(
              color: NeoBrutalTheme.fg,
              offset: Offset(0, 3),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Logo and Title
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: NeoBrutalTheme.primary,
                        border: Border.all(color: NeoBrutalTheme.fg, width: 2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.admin_panel_settings,
                        color: NeoBrutalTheme.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ADMIN DASHBOARD',
                          style: NeoBrutalTheme.headline4.copyWith(
                            color: NeoBrutalTheme.fg,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          _organizationData?['organizationName'] ?? 'DOT Attendance System',
                          style: NeoBrutalTheme.caption.copyWith(
                            color: NeoBrutalTheme.gray600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                
                // Actions
                Row(
                  children: [
                    // Notifications
                    _buildHeaderButton(
                      icon: Icons.notifications_outlined,
                      badge: '3',
                      onTap: () {},
                    ),
                    const SizedBox(width: 12),
                    // Profile Menu
                    _buildHeaderButton(
                      icon: Icons.account_circle_outlined,
                      onTap: () => _showProfileMenu(context),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  Widget _buildHeaderButton({
    required IconData icon,
    String? badge,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: NeoBrutalTheme.white,
          border: Border.all(color: NeoBrutalTheme.fg, width: 2),
          boxShadow: const [
            BoxShadow(
              color: NeoBrutalTheme.fg,
              offset: Offset(2, 2),
            ),
          ],
        ),
        child: Stack(
          children: [
            Center(
              child: Icon(
                icon,
                color: NeoBrutalTheme.fg,
                size: 24,
              ),
            ),
            if (badge != null)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    color: NeoBrutalTheme.error,
                    border: Border.all(color: NeoBrutalTheme.fg, width: 1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Text(
                      badge,
                      style: NeoBrutalTheme.caption.copyWith(
                        color: NeoBrutalTheme.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildWelcomeSection(String name) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [NeoBrutalTheme.primary, NeoBrutalTheme.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: NeoBrutalTheme.fg, width: 3),
        boxShadow: const [
          BoxShadow(
            color: NeoBrutalTheme.fg,
            offset: Offset(6, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome back,',
                  style: NeoBrutalTheme.body.copyWith(
                    color: NeoBrutalTheme.white.withOpacity(0.9),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  name,
                  style: NeoBrutalTheme.headline3.copyWith(
                    color: NeoBrutalTheme.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: NeoBrutalTheme.white.withOpacity(0.2),
                    border: Border.all(color: NeoBrutalTheme.white, width: 1),
                  ),
                  child: Text(
                    'MASTER ADMIN',
                    style: NeoBrutalTheme.caption.copyWith(
                      color: NeoBrutalTheme.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.shield_outlined,
            size: 64,
            color: NeoBrutalTheme.white.withOpacity(0.3),
          ),
        ],
      ),
    );
  }
  
  Widget _buildQuickStats() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'TODAY\'S OVERVIEW',
          style: NeoBrutalTheme.headline4.copyWith(
            color: NeoBrutalTheme.fg,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                title: 'Total Branches',
                value: _getTotalBranches().toString(),
                icon: Icons.business_outlined,
                color: NeoBrutalTheme.primary,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildStatCard(
                title: 'Active Employees',
                value: 'X',
                icon: Icons.people_outline,
                color: NeoBrutalTheme.success,
                isPlaceholder: true,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                title: 'Present Today',
                value: 'X',
                icon: Icons.check_circle_outline,
                color: NeoBrutalTheme.warning,
                isPlaceholder: true,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildStatCard(
                title: 'Attendance Rate',
                value: 'X%',
                icon: Icons.analytics_outlined,
                color: NeoBrutalTheme.accent,
                isPlaceholder: true,
              ),
            ),
          ],
        ),
      ],
    );
  }
  
  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    bool isPlaceholder = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NeoBrutalTheme.white,
        border: Border.all(color: NeoBrutalTheme.fg, width: 2),
        boxShadow: const [
          BoxShadow(
            color: NeoBrutalTheme.fg,
            offset: Offset(4, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              border: Border.all(color: color, width: 2),
            ),
            child: Icon(
              icon,
              color: color,
              size: 24,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                value,
                style: NeoBrutalTheme.headline2.copyWith(
                  color: isPlaceholder ? NeoBrutalTheme.gray400 : NeoBrutalTheme.fg,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (isPlaceholder) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: NeoBrutalTheme.warning.withOpacity(0.2),
                    border: Border.all(color: NeoBrutalTheme.warning, width: 1),
                  ),
                  child: Text(
                    '미구현',
                    style: NeoBrutalTheme.caption.copyWith(
                      color: NeoBrutalTheme.warning,
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: NeoBrutalTheme.caption.copyWith(
              color: NeoBrutalTheme.gray600,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildActionsGrid() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'QUICK ACTIONS',
          style: NeoBrutalTheme.headline4.copyWith(
            color: NeoBrutalTheme.fg,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          childAspectRatio: 1.2,
          children: [
            _buildActionCard(
              title: 'Login QR Generator',
              subtitle: 'Create login QR codes',
              icon: Icons.qr_code,
              color: NeoBrutalTheme.primary,
              onTap: () => context.go(RouteNames.qrGenerator),
            ),
            _buildActionCard(
              title: 'QR Display',
              subtitle: 'Live login QR display',
              icon: Icons.tv,
              color: NeoBrutalTheme.success,
              onTap: () => _navigateToQrDisplay(),
            ),
            _buildActionCard(
              title: 'View Reports',
              subtitle: 'Attendance analytics',
              icon: Icons.analytics,
              color: NeoBrutalTheme.accent,
              onTap: () => context.push('/admin/reports'),
            ),
            _buildActionCard(
              title: 'Settings',
              subtitle: 'System configuration',
              icon: Icons.settings,
              color: NeoBrutalTheme.gray600,
              onTap: () => context.push('/admin/settings'),
            ),
          ],
        ),
      ],
    );
  }
  
  Widget _buildActionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: NeoBrutalTheme.white,
          border: Border.all(color: NeoBrutalTheme.fg, width: 3),
          boxShadow: const [
            BoxShadow(
              color: NeoBrutalTheme.fg,
              offset: Offset(4, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color,
                border: Border.all(color: NeoBrutalTheme.fg, width: 2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: NeoBrutalTheme.white,
                size: 28,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: NeoBrutalTheme.body.copyWith(
                color: NeoBrutalTheme.fg,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: NeoBrutalTheme.caption.copyWith(
                color: NeoBrutalTheme.gray600,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildRecentActivities() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'RECENT ACTIVITIES',
          style: NeoBrutalTheme.headline4.copyWith(
            color: NeoBrutalTheme.fg,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            color: NeoBrutalTheme.white,
            border: Border.all(color: NeoBrutalTheme.fg, width: 3),
            boxShadow: const [
              BoxShadow(
                color: NeoBrutalTheme.fg,
                offset: Offset(4, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              _buildActivityItem(
                time: 'X',
                title: 'Real-time activities will appear here',
                subtitle: 'Feature not yet implemented',
                icon: Icons.info_outline,
                color: NeoBrutalTheme.warning,
                isPlaceholder: true,
              ),
              _buildDivider(),
              _buildActivityItem(
                time: DateTime.now().toString().substring(11, 16),
                title: '${_getUserDisplayName()} logged in',
                subtitle: _organizationData?['organizationName'] ?? 'Organization',
                icon: Icons.login,
                color: NeoBrutalTheme.success,
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  Widget _buildActivityItem({
    required String time,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    bool isPlaceholder = false,
  }) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              border: Border.all(color: color, width: 2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: color,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: NeoBrutalTheme.body.copyWith(
                          color: isPlaceholder ? NeoBrutalTheme.gray400 : NeoBrutalTheme.fg,
                          fontWeight: FontWeight.bold,
                          fontStyle: isPlaceholder ? FontStyle.italic : FontStyle.normal,
                        ),
                      ),
                    ),
                    if (isPlaceholder)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: NeoBrutalTheme.warning.withOpacity(0.2),
                          border: Border.all(color: NeoBrutalTheme.warning, width: 1),
                        ),
                        child: Text(
                          '미구현',
                          style: NeoBrutalTheme.caption.copyWith(
                            color: NeoBrutalTheme.warning,
                            fontSize: 8,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                  ],
                ),
                Text(
                  subtitle,
                  style: NeoBrutalTheme.caption.copyWith(
                    color: NeoBrutalTheme.gray600,
                  ),
                ),
              ],
            ),
          ),
          Text(
            time,
            style: NeoBrutalTheme.caption.copyWith(
              color: NeoBrutalTheme.gray500,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildDivider() {
    return Container(
      height: 2,
      color: NeoBrutalTheme.gray200,
    );
  }
  
  void _showProfileMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: NeoBrutalTheme.white,
          border: Border.all(color: NeoBrutalTheme.fg, width: 3),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(0),
            topRight: Radius.circular(0),
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildMenuItem(
                icon: Icons.person_outline,
                title: 'Profile',
                onTap: () {
                  Navigator.pop(context);
                  context.push('/admin/profile');
                },
              ),
              _buildDivider(),
              _buildMenuItem(
                icon: Icons.settings_outlined,
                title: 'Settings',
                onTap: () {
                  Navigator.pop(context);
                  context.push('/admin/settings');
                },
              ),
              _buildDivider(),
              _buildMenuItem(
                icon: Icons.logout,
                title: 'Logout',
                color: NeoBrutalTheme.error,
                onTap: () async {
                  Navigator.pop(context);
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) {
                    context.go('/master-admin-login');
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Color? color,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        child: Row(
          children: [
            Icon(
              icon,
              color: color ?? NeoBrutalTheme.fg,
              size: 24,
            ),
            const SizedBox(width: 16),
            Text(
              title,
              style: NeoBrutalTheme.body.copyWith(
                color: color ?? NeoBrutalTheme.fg,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getUserDisplayName() {
    final user = ref.read(currentUserProvider);
    if (_organizationData != null) {
      final firstName = _organizationData!['firstName'] ?? '';
      final lastName = _organizationData!['lastName'] ?? '';
      return '$firstName $lastName'.trim();
    }
    return user?.firstName != null && user?.lastName != null
        ? '${user?.firstName} ${user?.lastName}'
        : user?.email ?? 'Master Admin';
  }

  void _navigateToQrDisplay() {
    final locationId = 'main_office';
    final locationName = _organizationData != null 
        ? (_organizationData!['branches'] as List?)?.isNotEmpty == true
            ? (_organizationData!['branches'][0]['name'] ?? '본사')
            : '본사'
        : '본사';
        
    context.go(
      '${RouteNames.qrDisplay}?locationId=$locationId&locationName=${Uri.encodeComponent(locationName)}'
    );
  }

  int _getTotalBranches() {
    if (_organizationData != null && _organizationData!['branches'] != null) {
      return (_organizationData!['branches'] as List).length;
    }
    return 0;
  }

  Widget _buildOrganizationInfo() {
    if (_organizationData == null) {
      return const SizedBox.shrink();
    }

    final branches = _organizationData!['branches'] as List<dynamic>? ?? [];
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: NeoBrutalTheme.white,
        border: Border.all(color: NeoBrutalTheme.fg, width: 3),
        boxShadow: const [
          BoxShadow(
            color: NeoBrutalTheme.fg,
            offset: Offset(4, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: NeoBrutalTheme.accent.withOpacity(0.1),
                  border: Border.all(color: NeoBrutalTheme.accent, width: 2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.business,
                  color: NeoBrutalTheme.accent,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _organizationData!['organizationName'] ?? 'Unknown Organization',
                      style: NeoBrutalTheme.body.copyWith(
                        color: NeoBrutalTheme.fg,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '${branches.length} branches registered',
                      style: NeoBrutalTheme.caption.copyWith(
                        color: NeoBrutalTheme.gray600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (branches.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Divider(color: NeoBrutalTheme.gray200, thickness: 2),
            const SizedBox(height: 12),
            Text(
              'BRANCH LOCATIONS',
              style: NeoBrutalTheme.caption.copyWith(
                color: NeoBrutalTheme.fg,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            ...branches.map<Widget>((branch) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: NeoBrutalTheme.primary,
                      border: Border.all(color: NeoBrutalTheme.fg, width: 1),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          branch['name'] ?? 'Unknown Branch',
                          style: NeoBrutalTheme.caption.copyWith(
                            color: NeoBrutalTheme.fg,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (branch['address'] != null)
                          Text(
                            branch['address'],
                            style: NeoBrutalTheme.caption.copyWith(
                              color: NeoBrutalTheme.gray500,
                              fontSize: 11,
                            ),
                          ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: NeoBrutalTheme.secondary.withOpacity(0.1),
                      border: Border.all(color: NeoBrutalTheme.secondary, width: 1),
                    ),
                    child: Text(
                      '${branch['employeeCount'] ?? 0} employees',
                      style: NeoBrutalTheme.caption.copyWith(
                        color: NeoBrutalTheme.secondary,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            )).toList(),
          ],
        ],
      ),
    );
  }
}