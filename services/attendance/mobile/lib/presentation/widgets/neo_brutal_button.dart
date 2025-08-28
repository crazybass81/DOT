import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/neo_brutal_theme.dart';

/// 네오브루탈리즘 버튼 위젯
/// 굵은 테두리, 하드 섀도우, 터치 피드백을 제공하는 커스텀 버튼
class NeoBrutalButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final String text;
  final IconData? icon;
  final ButtonStyle style;
  final bool isLoading;
  final double? width;
  final double? height;
  final Widget? child;

  const NeoBrutalButton({
    super.key,
    required this.onPressed,
    required this.text,
    this.icon,
    this.style = ButtonStyle.primary,
    this.isLoading = false,
    this.width,
    this.height,
    this.child,
  });

  // 팩토리 생성자들
  factory NeoBrutalButton.primary({
    Key? key,
    required VoidCallback? onPressed,
    required String text,
    IconData? icon,
    bool isLoading = false,
    double? width,
  }) =>
      NeoBrutalButton(
        key: key,
        onPressed: onPressed,
        text: text,
        icon: icon,
        style: ButtonStyle.primary,
        isLoading: isLoading,
        width: width,
      );

  factory NeoBrutalButton.secondary({
    Key? key,
    required VoidCallback? onPressed,
    required String text,
    IconData? icon,
    bool isLoading = false,
    double? width,
  }) =>
      NeoBrutalButton(
        key: key,
        onPressed: onPressed,
        text: text,
        icon: icon,
        style: ButtonStyle.secondary,
        isLoading: isLoading,
        width: width,
      );

  factory NeoBrutalButton.danger({
    Key? key,
    required VoidCallback? onPressed,
    required String text,
    IconData? icon,
    bool isLoading = false,
    double? width,
  }) =>
      NeoBrutalButton(
        key: key,
        onPressed: onPressed,
        text: text,
        icon: icon,
        style: ButtonStyle.danger,
        isLoading: isLoading,
        width: width,
      );

  factory NeoBrutalButton.success({
    Key? key,
    required VoidCallback? onPressed,
    required String text,
    IconData? icon,
    bool isLoading = false,
    double? width,
  }) =>
      NeoBrutalButton(
        key: key,
        onPressed: onPressed,
        text: text,
        icon: icon,
        style: ButtonStyle.success,
        isLoading: isLoading,
        width: width,
      );

  @override
  State<NeoBrutalButton> createState() => _NeoBrutalButtonState();
}

class _NeoBrutalButtonState extends State<NeoBrutalButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<Offset> _offsetAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 120),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 0.98,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
    _offsetAnimation = Tween<Offset>(
      begin: Offset.zero,
      end: const Offset(2, 2),
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails details) {
    if (widget.onPressed != null && !widget.isLoading) {
      setState(() => _isPressed = true);
      _controller.forward();
      HapticFeedback.lightImpact();
    }
  }

  void _handleTapUp(TapUpDetails details) {
    if (_isPressed) {
      setState(() => _isPressed = false);
      _controller.reverse();
    }
  }

  void _handleTapCancel() {
    if (_isPressed) {
      setState(() => _isPressed = false);
      _controller.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDisabled = widget.onPressed == null || widget.isLoading;
    final buttonColors = _getButtonColors();

    return SizedBox(
      width: widget.width,
      height: widget.height ?? 48,
      child: GestureDetector(
        onTapDown: _handleTapDown,
        onTapUp: _handleTapUp,
        onTapCancel: _handleTapCancel,
        onTap: isDisabled ? null : widget.onPressed,
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return Transform.translate(
              offset: _offsetAnimation.value,
              child: Transform.scale(
                scale: _scaleAnimation.value,
                child: Stack(
                  children: [
                    // 그림자 레이어
                    if (!_isPressed && !isDisabled)
                      Positioned(
                        top: widget.style == ButtonStyle.primary ? 4 : 2,
                        left: widget.style == ButtonStyle.primary ? 4 : 2,
                        right: 0,
                        bottom: 0,
                        child: Container(
                          decoration: BoxDecoration(
                            color: NeoBrutalTheme.line,
                            borderRadius:
                                BorderRadius.circular(NeoBrutalTheme.radiusButton),
                          ),
                        ),
                      ),
                    // 버튼 본체
                    Container(
                      decoration: BoxDecoration(
                        color: isDisabled
                            ? NeoBrutalTheme.muted
                            : buttonColors.backgroundColor,
                        borderRadius:
                            BorderRadius.circular(NeoBrutalTheme.radiusButton),
                        border: Border.all(
                          color: isDisabled
                              ? NeoBrutalTheme.line.withOpacity(0.3)
                              : buttonColors.borderColor,
                          width: widget.style == ButtonStyle.primary
                              ? NeoBrutalTheme.borderThick
                              : NeoBrutalTheme.borderThin,
                        ),
                      ),
                      child: Center(
                        child: widget.isLoading
                            ? _buildLoadingIndicator(buttonColors)
                            : widget.child ?? _buildButtonContent(buttonColors),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildButtonContent(ButtonColors colors) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (widget.icon != null) ...[
          Icon(
            widget.icon,
            size: 20,
            color: colors.foregroundColor,
          ),
          const SizedBox(width: NeoBrutalTheme.space2),
        ],
        Text(
          widget.text,
          style: NeoBrutalTheme.heading.copyWith(
            color: colors.foregroundColor,
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingIndicator(ButtonColors colors) {
    return SizedBox(
      width: 20,
      height: 20,
      child: CircularProgressIndicator(
        strokeWidth: 2,
        valueColor: AlwaysStoppedAnimation<Color>(colors.foregroundColor),
      ),
    );
  }

  ButtonColors _getButtonColors() {
    switch (widget.style) {
      case ButtonStyle.primary:
        return const ButtonColors(
          backgroundColor: NeoBrutalTheme.hi,
          foregroundColor: NeoBrutalTheme.hiInk,
          borderColor: NeoBrutalTheme.line,
        );
      case ButtonStyle.secondary:
        return const ButtonColors(
          backgroundColor: NeoBrutalTheme.bg,
          foregroundColor: NeoBrutalTheme.fg,
          borderColor: NeoBrutalTheme.line,
        );
      case ButtonStyle.danger:
        return const ButtonColors(
          backgroundColor: NeoBrutalTheme.bg,
          foregroundColor: NeoBrutalTheme.error,
          borderColor: NeoBrutalTheme.error,
        );
      case ButtonStyle.success:
        return const ButtonColors(
          backgroundColor: NeoBrutalTheme.success,
          foregroundColor: NeoBrutalTheme.bg,
          borderColor: NeoBrutalTheme.line,
        );
    }
  }
}

/// 버튼 스타일 열거형
enum ButtonStyle {
  primary,
  secondary,
  danger,
  success,
}

/// 버튼 색상 설정
class ButtonColors {
  final Color backgroundColor;
  final Color foregroundColor;
  final Color borderColor;

  const ButtonColors({
    required this.backgroundColor,
    required this.foregroundColor,
    required this.borderColor,
  });
}