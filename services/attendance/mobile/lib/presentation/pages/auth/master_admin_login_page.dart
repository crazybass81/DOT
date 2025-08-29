import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../providers/auth_provider.dart';
import '../../router/app_router.dart';

class MasterAdminLoginPage extends ConsumerStatefulWidget {
  const MasterAdminLoginPage({super.key});

  @override
  ConsumerState<MasterAdminLoginPage> createState() => _MasterAdminLoginPageState();
}

class _MasterAdminLoginPageState extends ConsumerState<MasterAdminLoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _adminIdController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _adminIdController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo and Title
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: NeoBrutalTheme.white,
                    border: Border.all(color: NeoBrutalTheme.fg, width: 3),
                    boxShadow: const [
                      BoxShadow(
                        color: NeoBrutalTheme.fg,
                        offset: Offset(6, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          color: NeoBrutalTheme.primary,
                          border: Border.all(color: NeoBrutalTheme.fg, width: 3),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Icon(
                          Icons.admin_panel_settings,
                          size: 50,
                          color: NeoBrutalTheme.white,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'DOT ATTENDANCE',
                        style: NeoBrutalTheme.headline2.copyWith(
                          color: NeoBrutalTheme.fg,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: NeoBrutalTheme.error,
                          border: Border.all(color: NeoBrutalTheme.fg, width: 2),
                        ),
                        child: Text(
                          'MASTER ADMIN ACCESS',
                          style: NeoBrutalTheme.caption.copyWith(
                            color: NeoBrutalTheme.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 32),
                
                // Login Form
                Container(
                  constraints: const BoxConstraints(maxWidth: 400),
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: NeoBrutalTheme.white,
                    border: Border.all(color: NeoBrutalTheme.fg, width: 3),
                    boxShadow: const [
                      BoxShadow(
                        color: NeoBrutalTheme.fg,
                        offset: Offset(6, 6),
                      ),
                    ],
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Admin ID Field
                        _buildTextField(
                          controller: _adminIdController,
                          label: 'Admin ID',
                          hintText: 'Enter master admin ID',
                          icon: Icons.badge,
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Admin ID is required';
                            }
                            if (value.length < 4) {
                              return 'Admin ID must be at least 4 characters';
                            }
                            return null;
                          },
                        ),
                        
                        const SizedBox(height: 16),
                        
                        // Password Field
                        _buildTextField(
                          controller: _passwordController,
                          label: 'Password',
                          hintText: 'Enter admin password',
                          icon: Icons.lock,
                          obscureText: _obscurePassword,
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off : Icons.visibility,
                              color: NeoBrutalTheme.fg,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Password is required';
                            }
                            if (value.length < 8) {
                              return 'Password must be at least 8 characters';
                            }
                            return null;
                          },
                        ),
                        
                        const SizedBox(height: 24),
                        
                        // Login Button
                        GestureDetector(
                          onTap: _isLoading ? null : _handleAdminLogin,
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            decoration: BoxDecoration(
                              color: _isLoading ? NeoBrutalTheme.gray300 : NeoBrutalTheme.primary,
                              border: Border.all(color: NeoBrutalTheme.fg, width: 3),
                              boxShadow: _isLoading ? [] : const [
                                BoxShadow(
                                  color: NeoBrutalTheme.fg,
                                  offset: Offset(4, 4),
                                ),
                              ],
                            ),
                            child: Center(
                              child: _isLoading
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        color: NeoBrutalTheme.white,
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : Text(
                                      'LOGIN AS MASTER ADMIN',
                                      style: NeoBrutalTheme.button.copyWith(
                                        color: NeoBrutalTheme.white,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Divider
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 2,
                        color: NeoBrutalTheme.gray300,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'OR',
                        style: NeoBrutalTheme.body.copyWith(
                          color: NeoBrutalTheme.gray600,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Container(
                        height: 2,
                        color: NeoBrutalTheme.gray300,
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 24),
                
                // Employee Access Info
                Container(
                  constraints: const BoxConstraints(maxWidth: 400),
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
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: NeoBrutalTheme.secondary,
                              border: Border.all(color: NeoBrutalTheme.fg, width: 2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.qr_code,
                              color: NeoBrutalTheme.white,
                              size: 32,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'EMPLOYEE ACCESS',
                                  style: NeoBrutalTheme.headline4.copyWith(
                                    color: NeoBrutalTheme.fg,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Use your phone camera to scan the QR code provided by your administrator',
                                  style: NeoBrutalTheme.caption.copyWith(
                                    color: NeoBrutalTheme.gray600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: NeoBrutalTheme.accent.withOpacity(0.1),
                          border: Border.all(color: NeoBrutalTheme.accent, width: 2),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.info_outline,
                              color: NeoBrutalTheme.accent,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Scanning the QR code will automatically log you in and redirect to your dashboard',
                                style: NeoBrutalTheme.caption.copyWith(
                                  color: NeoBrutalTheme.fg,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 32),
                
                // Version Info
                Text(
                  'Version 1.0.0 | © 2024 DOT Company',
                  style: NeoBrutalTheme.caption.copyWith(
                    color: NeoBrutalTheme.gray500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hintText,
    required IconData icon,
    bool obscureText = false,
    Widget? suffixIcon,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: NeoBrutalTheme.body.copyWith(
            color: NeoBrutalTheme.fg,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: NeoBrutalTheme.white,
            border: Border.all(color: NeoBrutalTheme.fg, width: 2),
          ),
          child: TextFormField(
            controller: controller,
            obscureText: obscureText,
            validator: validator,
            style: NeoBrutalTheme.body.copyWith(color: NeoBrutalTheme.fg),
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: NeoBrutalTheme.body.copyWith(
                color: NeoBrutalTheme.gray400,
              ),
              prefixIcon: Icon(icon, color: NeoBrutalTheme.fg),
              suffixIcon: suffixIcon,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 16,
              ),
              errorStyle: NeoBrutalTheme.caption.copyWith(
                color: NeoBrutalTheme.error,
              ),
            ),
          ),
        ),
      ],
    );
  }
  
  Future<void> _handleAdminLogin() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      // Simulate API call
      await Future.delayed(const Duration(seconds: 2));
      
      // Check credentials (in production, this would be an API call)
      if (_adminIdController.text == 'admin' && _passwordController.text == 'admin1234') {
        // Save admin session
        await ref.read(authProvider.notifier).loginAsAdmin(
          adminId: _adminIdController.text,
          password: _passwordController.text,
        );
        
        if (mounted) {
          // Navigate to admin dashboard
          context.go('/admin/dashboard');
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Invalid admin credentials',
                style: NeoBrutalTheme.body.copyWith(color: NeoBrutalTheme.white),
              ),
              backgroundColor: NeoBrutalTheme.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.zero,
                side: BorderSide(color: NeoBrutalTheme.fg, width: 2),
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Login failed: $e',
              style: NeoBrutalTheme.body.copyWith(color: NeoBrutalTheme.white),
            ),
            backgroundColor: NeoBrutalTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
}