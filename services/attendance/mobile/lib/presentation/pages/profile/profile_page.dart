import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../providers/auth_provider.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  Map<String, dynamic>? _userData;
  bool _isLoading = true;
  bool _isEditMode = false;

  // Controllers for editing
  final _representativeNameController = TextEditingController();
  final _representativePhoneController = TextEditingController();
  final _businessRegistrationController = TextEditingController();
  
  // Dynamic business location controllers
  final List<Map<String, TextEditingController>> _businessLocationControllers = [];

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  @override
  void dispose() {
    _representativeNameController.dispose();
    _representativePhoneController.dispose();
    _businessRegistrationController.dispose();
    _disposeLocationControllers();
    super.dispose();
  }

  void _disposeLocationControllers() {
    for (var controllerMap in _businessLocationControllers) {
      controllerMap['name']?.dispose();
      controllerMap['address']?.dispose();
      controllerMap['phone']?.dispose();
    }
    _businessLocationControllers.clear();
  }

  Future<void> _loadUserData() async {
    final user = ref.read(currentUserProvider);
    if (user != null) {
      // For now, we'll use the user data we already have
      // In the future, you can fetch additional profile data from Supabase
      if (mounted) {
        setState(() {
          _userData = {
            'name': '${user.firstName} ${user.lastName}'.trim(),
            'email': user.email,
            'role': user.role.name,
            'representativeName': user.firstName,
            'representativePhone': '',
            'businessRegistrationNumber': '',
            'branches': [],
          };
          _isLoading = false;
        });
        _populateControllers();
      }
    } else {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _populateControllers() {
    if (_userData != null) {
      _representativeNameController.text = _userData!['representativeName'] ?? '';
      _representativePhoneController.text = _userData!['representativePhone'] ?? '';
      _businessRegistrationController.text = _userData!['businessRegistrationNumber'] ?? '';
      
      // Populate business location controllers
      final branches = _userData!['branches'] as List<dynamic>? ?? [];
      _disposeLocationControllers();
      
      for (var branch in branches) {
        _businessLocationControllers.add({
          'name': TextEditingController(text: branch['name'] ?? ''),
          'address': TextEditingController(text: branch['address'] ?? ''),
          'phone': TextEditingController(text: branch['phone'] ?? ''),
        });
      }
    }
  }

  void _addBusinessLocation() {
    setState(() {
      _businessLocationControllers.add({
        'name': TextEditingController(),
        'address': TextEditingController(),
        'phone': TextEditingController(),
      });
    });
  }

  void _removeBusinessLocation(int index) {
    if (_businessLocationControllers.length > 1) {
      setState(() {
        _businessLocationControllers[index]['name']?.dispose();
        _businessLocationControllers[index]['address']?.dispose();
        _businessLocationControllers[index]['phone']?.dispose();
        _businessLocationControllers.removeAt(index);
      });
    }
  }

  void _toggleEditMode() {
    setState(() {
      _isEditMode = !_isEditMode;
    });
    if (!_isEditMode) {
      _populateControllers(); // Reset controllers if cancelling edit
    }
  }

  Future<void> _saveProfile() async {
    // TODO: Implement save functionality to Firebase service
    // For now, just toggle edit mode
    setState(() {
      _isEditMode = false;
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Profile updated successfully!',
          style: NeoBrutalTheme.body.copyWith(color: NeoBrutalTheme.white),
        ),
        backgroundColor: NeoBrutalTheme.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.zero,
          side: BorderSide(color: NeoBrutalTheme.fg, width: 2),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
              // Profile Header
              _buildProfileHeader(),
              
              const SizedBox(height: 32),
              
              // Representative Information
              _buildRepresentativeInfo(),
              
              const SizedBox(height: 24),
              
              // Business Information
              _buildBusinessInfo(),
              
              const SizedBox(height: 24),
              
              // Business Locations
              _buildBusinessLocations(),
              
              const SizedBox(height: 32),
              
              // Verification Status
              _buildVerificationStatus(),
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
      toolbarHeight: 80,
      title: Text(
        'PROFILE',
        style: NeoBrutalTheme.headline4.copyWith(
          color: NeoBrutalTheme.fg,
          fontWeight: FontWeight.bold,
        ),
      ),
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 16),
          child: _buildActionButton(
            icon: _isEditMode ? Icons.save : Icons.edit,
            label: _isEditMode ? 'SAVE' : 'EDIT',
            onTap: _isEditMode ? _saveProfile : _toggleEditMode,
            color: _isEditMode ? NeoBrutalTheme.success : NeoBrutalTheme.primary,
          ),
        ),
        if (_isEditMode)
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: _buildActionButton(
              icon: Icons.cancel,
              label: 'CANCEL',
              onTap: _toggleEditMode,
              color: NeoBrutalTheme.error,
            ),
          ),
      ],
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
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color color,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color,
          border: Border.all(color: NeoBrutalTheme.fg, width: 2),
          boxShadow: const [
            BoxShadow(
              color: NeoBrutalTheme.fg,
              offset: Offset(2, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: NeoBrutalTheme.white, size: 16),
            const SizedBox(width: 6),
            Text(
              label,
              style: NeoBrutalTheme.caption.copyWith(
                color: NeoBrutalTheme.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader() {
    final user = ref.watch(currentUserProvider);
    final organizationName = _userData?['organizationName'] ?? 'Organization';
    final userRole = _userData?['role'] ?? 'admin';
    
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
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: NeoBrutalTheme.white.withOpacity(0.2),
              border: Border.all(color: NeoBrutalTheme.white, width: 3),
              borderRadius: BorderRadius.circular(40),
            ),
            child: Icon(
              Icons.person,
              size: 40,
              color: NeoBrutalTheme.white,
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${user?.firstName ?? ''} ${user?.lastName ?? ''}'.trim(),
                  style: NeoBrutalTheme.headline3.copyWith(
                    color: NeoBrutalTheme.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  user?.email ?? '',
                  style: NeoBrutalTheme.body.copyWith(
                    color: NeoBrutalTheme.white.withOpacity(0.9),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: NeoBrutalTheme.white.withOpacity(0.2),
                    border: Border.all(color: NeoBrutalTheme.white, width: 1),
                  ),
                  child: Text(
                    userRole.toUpperCase(),
                    style: NeoBrutalTheme.caption.copyWith(
                      color: NeoBrutalTheme.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  organizationName,
                  style: NeoBrutalTheme.caption.copyWith(
                    color: NeoBrutalTheme.white.withOpacity(0.8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRepresentativeInfo() {
    return _buildSection(
      title: 'REPRESENTATIVE INFORMATION',
      icon: Icons.person_outline,
      children: [
        _buildInfoRow(
          'Name',
          _userData?['representativeName'] ?? 'N/A',
          controller: _representativeNameController,
          isEditable: true,
        ),
        const SizedBox(height: 16),
        _buildInfoRow(
          'Phone',
          _userData?['representativePhone'] ?? 'N/A',
          controller: _representativePhoneController,
          isEditable: true,
        ),
        const SizedBox(height: 16),
        _buildVerificationRow(
          'Phone Verification',
          _userData?['phoneVerified'] == true,
          'Phone number verification via SMS',
        ),
        const SizedBox(height: 12),
        _buildVerificationRow(
          'Identity Verification',
          _userData?['identityVerified'] == true,
          'Real name verification',
        ),
      ],
    );
  }

  Widget _buildBusinessInfo() {
    return _buildSection(
      title: 'BUSINESS INFORMATION',
      icon: Icons.business_outlined,
      children: [
        _buildInfoRow(
          'Registration Number',
          _userData?['businessRegistrationNumber'] ?? 'N/A',
          controller: _businessRegistrationController,
          isEditable: true,
        ),
        const SizedBox(height: 16),
        _buildVerificationRow(
          'Business Number Verification',
          _userData?['businessNumberVerified'] == true,
          'Government API validation',
        ),
        const SizedBox(height: 12),
        _buildVerificationRow(
          'Registration Document',
          _userData?['businessRegistrationUploaded'] == true,
          'Business registration certificate upload',
        ),
      ],
    );
  }

  Widget _buildBusinessLocations() {
    final branches = _userData?['branches'] as List<dynamic>? ?? [];
    
    return _buildSection(
      title: 'BUSINESS LOCATIONS',
      icon: Icons.location_on_outlined,
      children: [
        ..._buildLocationList(branches),
        if (_isEditMode) ...[
          const SizedBox(height: 16),
          _buildAddLocationButton(),
        ],
      ],
    );
  }

  List<Widget> _buildLocationList(List<dynamic> branches) {
    List<Widget> widgets = [];
    
    for (int i = 0; i < branches.length; i++) {
      final branch = branches[i];
      widgets.addAll([
        _buildLocationCard(branch, i),
        if (i < branches.length - 1) const SizedBox(height: 16),
      ]);
    }
    
    return widgets;
  }

  Widget _buildLocationCard(Map<String, dynamic> branch, int index) {
    final isHeadOffice = branch['isHeadOffice'] == true;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NeoBrutalTheme.white,
        border: Border.all(
          color: isHeadOffice ? NeoBrutalTheme.primary : NeoBrutalTheme.fg,
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: isHeadOffice ? NeoBrutalTheme.primary : NeoBrutalTheme.fg,
            offset: const Offset(3, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (isHeadOffice)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: NeoBrutalTheme.primary,
                    border: Border.all(color: NeoBrutalTheme.fg, width: 1),
                  ),
                  child: Text(
                    'HEAD OFFICE',
                    style: NeoBrutalTheme.caption.copyWith(
                      color: NeoBrutalTheme.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
                ),
              const Spacer(),
              if (_isEditMode && !isHeadOffice)
                GestureDetector(
                  onTap: () => _removeBusinessLocation(index),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: NeoBrutalTheme.error,
                      border: Border.all(color: NeoBrutalTheme.fg, width: 1),
                    ),
                    child: const Icon(
                      Icons.delete,
                      color: NeoBrutalTheme.white,
                      size: 16,
                    ),
                  ),
                ),
            ],
          ),
          if (isHeadOffice) const SizedBox(height: 12),
          
          if (_isEditMode) ...[
            _buildEditableField(
              'Location Name',
              _businessLocationControllers.length > index 
                  ? _businessLocationControllers[index]['name']! 
                  : TextEditingController(),
            ),
            const SizedBox(height: 12),
            _buildEditableField(
              'Address',
              _businessLocationControllers.length > index 
                  ? _businessLocationControllers[index]['address']! 
                  : TextEditingController(),
            ),
            const SizedBox(height: 12),
            _buildEditableField(
              'Phone',
              _businessLocationControllers.length > index 
                  ? _businessLocationControllers[index]['phone']! 
                  : TextEditingController(),
            ),
          ] else ...[
            _buildLocationDetail('Name', branch['name'] ?? 'N/A'),
            _buildLocationDetail('Address', branch['address'] ?? 'N/A'),
            _buildLocationDetail('Phone', branch['phone'] ?? 'N/A'),
            _buildLocationDetail('Employees', '${branch['employeeCount'] ?? 0}'),
          ],
        ],
      ),
    );
  }

  Widget _buildLocationDetail(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: NeoBrutalTheme.caption.copyWith(
                color: NeoBrutalTheme.gray600,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: NeoBrutalTheme.body.copyWith(
                color: NeoBrutalTheme.fg,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddLocationButton() {
    return GestureDetector(
      onTap: _addBusinessLocation,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: NeoBrutalTheme.white,
          border: Border.all(color: NeoBrutalTheme.accent, width: 2),
          boxShadow: const [
            BoxShadow(
              color: NeoBrutalTheme.accent,
              offset: Offset(3, 3),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.add,
              color: NeoBrutalTheme.accent,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              'ADD BUSINESS LOCATION',
              style: NeoBrutalTheme.body.copyWith(
                color: NeoBrutalTheme.accent,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerificationStatus() {
    return _buildSection(
      title: 'VERIFICATION STATUS',
      icon: Icons.verified_outlined,
      children: [
        Text(
          'Some verification features are not yet implemented and will be available in future updates.',
          style: NeoBrutalTheme.caption.copyWith(
            color: NeoBrutalTheme.gray600,
            fontStyle: FontStyle.italic,
          ),
        ),
      ],
    );
  }

  Widget _buildSection({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
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
                  color: NeoBrutalTheme.secondary.withOpacity(0.1),
                  border: Border.all(color: NeoBrutalTheme.secondary, width: 2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: NeoBrutalTheme.secondary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: NeoBrutalTheme.body.copyWith(
                  color: NeoBrutalTheme.fg,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildInfoRow(
    String label,
    String value, {
    TextEditingController? controller,
    bool isEditable = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(
            '$label:',
            style: NeoBrutalTheme.caption.copyWith(
              color: NeoBrutalTheme.gray600,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _isEditMode && isEditable
              ? _buildEditableField(label, controller!)
              : Text(
                  value,
                  style: NeoBrutalTheme.body.copyWith(
                    color: NeoBrutalTheme.fg,
                    fontWeight: FontWeight.w500,
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildEditableField(String hint, TextEditingController controller) {
    return Container(
      decoration: BoxDecoration(
        color: NeoBrutalTheme.white,
        border: Border.all(color: NeoBrutalTheme.fg, width: 2),
      ),
      child: TextField(
        controller: controller,
        style: NeoBrutalTheme.body.copyWith(color: NeoBrutalTheme.fg),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: NeoBrutalTheme.body.copyWith(
            color: NeoBrutalTheme.gray400,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildVerificationRow(String label, bool isVerified, String description) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isVerified 
            ? NeoBrutalTheme.success.withOpacity(0.1)
            : NeoBrutalTheme.warning.withOpacity(0.1),
        border: Border.all(
          color: isVerified ? NeoBrutalTheme.success : NeoBrutalTheme.warning,
          width: 2,
        ),
      ),
      child: Row(
        children: [
          Icon(
            isVerified ? Icons.check_circle : Icons.info_outline,
            color: isVerified ? NeoBrutalTheme.success : NeoBrutalTheme.warning,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: NeoBrutalTheme.caption.copyWith(
                    color: NeoBrutalTheme.fg,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  isVerified ? 'Verified' : description,
                  style: NeoBrutalTheme.caption.copyWith(
                    color: NeoBrutalTheme.gray600,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          if (!isVerified)
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
    );
  }
}