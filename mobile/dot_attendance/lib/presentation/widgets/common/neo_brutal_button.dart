import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/neo_brutal_theme.dart';

enum NeoBrutalButtonVariant {
  primary,
  secondary,
  outline,
}

class NeoBrutalButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final Widget? child;
  final String? text;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final EdgeInsetsGeometry? padding;
  final bool isLoading;
  final bool isOutlined;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;
  final NeoBrutalButtonVariant variant;

  const NeoBrutalButton({
    super.key,
    required this.onPressed,
    this.child,
    this.text,
    this.backgroundColor,
    this.foregroundColor,
    this.padding,
    this.isLoading = false,
    this.isOutlined = false,
    this.width,
    this.height,
    this.borderRadius,
    this.variant = NeoBrutalButtonVariant.primary,
  });

  const NeoBrutalButton.outlined({
    super.key,
    required this.onPressed,
    this.child,
    this.text,
    this.backgroundColor,
    this.foregroundColor,
    this.padding,
    this.isLoading = false,
    this.width,
    this.height,
    this.borderRadius,
  }) : isOutlined = true, variant = NeoBrutalButtonVariant.outline;

  @override
  State<NeoBrutalButton> createState() => _NeoBrutalButtonState();
}

class _NeoBrutalButtonState extends State<NeoBrutalButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: NeoBrutalAnimations.snapDuration,
      vsync: this,
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 0.95,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: NeoBrutalAnimations.snapCurve,
    ));
  }

  void _onTapDown(TapDownDetails details) {
    if (widget.onPressed != null && !widget.isLoading) {
      setState(() => _isPressed = true);
      _animationController.forward();
      HapticFeedback.lightImpact();
    }
  }

  void _onTapUp(TapUpDetails details) {
    _resetPress();
  }

  void _onTapCancel() {
    _resetPress();
  }

  void _resetPress() {
    if (_isPressed) {
      setState(() => _isPressed = false);
      _animationController.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEnabled = widget.onPressed != null && !widget.isLoading;
    
    // Determine colors based on variant
    Color backgroundColor;
    Color foregroundColor;
    Color borderColor;
    
    switch (widget.variant) {
      case NeoBrutalButtonVariant.primary:
        backgroundColor = widget.backgroundColor ?? NeoBrutalTheme.hi;
        foregroundColor = widget.foregroundColor ?? NeoBrutalTheme.hiInk;
        borderColor = NeoBrutalTheme.line;
        break;
      case NeoBrutalButtonVariant.secondary:
        backgroundColor = widget.backgroundColor ?? NeoBrutalTheme.muted;
        foregroundColor = widget.foregroundColor ?? NeoBrutalTheme.fg;
        borderColor = NeoBrutalTheme.line;
        break;
      case NeoBrutalButtonVariant.outline:
        backgroundColor = widget.backgroundColor ?? NeoBrutalTheme.bg;
        foregroundColor = widget.foregroundColor ?? NeoBrutalTheme.fg;
        borderColor = NeoBrutalTheme.line;
        break;
    }
    
    // Handle legacy isOutlined property
    if (widget.isOutlined) {
      backgroundColor = widget.backgroundColor ?? NeoBrutalTheme.bg;
      foregroundColor = widget.foregroundColor ?? NeoBrutalTheme.fg;
      borderColor = NeoBrutalTheme.line;
    }

    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      onTap: widget.onPressed,
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: AnimatedContainer(
              duration: NeoBrutalAnimations.snapDuration,
              curve: NeoBrutalAnimations.snapCurve,
              width: widget.width,
              height: widget.height ?? 48,
              padding: widget.padding ??
                  const EdgeInsets.symmetric(
                    horizontal: NeoBrutalTheme.space4,
                    vertical: NeoBrutalTheme.space3,
                  ),
              decoration: BoxDecoration(
                color: isEnabled
                    ? backgroundColor
                    : NeoBrutalTheme.muted,
                border: Border.all(
                  color: isEnabled ? borderColor : NeoBrutalTheme.line.withOpacity(0.3),
                  width: NeoBrutalTheme.borderThick,
                ),
                borderRadius: widget.borderRadius ??
                    BorderRadius.circular(NeoBrutalTheme.radiusButton),
                boxShadow: isEnabled && !_isPressed
                    ? NeoBrutalTheme.shadowElev2
                    : NeoBrutalTheme.shadowElev1,
              ),
              child: widget.isLoading
                  ? Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: foregroundColor,
                        ),
                      ),
                    )
                  : DefaultTextStyle(
                      style: NeoBrutalTheme.heading.copyWith(
                        color: isEnabled
                            ? foregroundColor
                            : NeoBrutalTheme.fg.withOpacity(0.5),
                        fontSize: 16,
                      ),
                      textAlign: TextAlign.center,
                      child: widget.child ?? Text(widget.text ?? ''),
                    ),
            ),
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
}
