import 'package:flutter/material.dart';

import '../../../core/theme/neo_brutal_theme.dart';

class NeoBrutalCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? backgroundColor;
  final Color? borderColor;
  final double? borderWidth;
  final BorderRadius? borderRadius;
  final List<BoxShadow>? boxShadow;
  final double? width;
  final double? height;
  final VoidCallback? onTap;

  const NeoBrutalCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.backgroundColor,
    this.borderColor,
    this.borderWidth,
    this.borderRadius,
    this.boxShadow,
    this.width,
    this.height,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget cardWidget = Container(
      width: width,
      height: height,
      margin: margin,
      padding: padding ?? const EdgeInsets.all(NeoBrutalTheme.space4),
      decoration: BoxDecoration(
        color: backgroundColor ?? NeoBrutalTheme.bg,
        border: Border.all(
          color: borderColor ?? NeoBrutalTheme.line,
          width: borderWidth ?? NeoBrutalTheme.borderThin,
        ),
        borderRadius: borderRadius ?? BorderRadius.circular(NeoBrutalTheme.radiusCard),
        boxShadow: boxShadow ?? NeoBrutalTheme.shadowElev1,
      ),
      child: child,
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: cardWidget,
      );
    }

    return cardWidget;
  }
}

class NeoBrutalElevatedCard extends StatefulWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? backgroundColor;
  final Color? borderColor;
  final double? borderWidth;
  final BorderRadius? borderRadius;
  final double? width;
  final double? height;
  final VoidCallback? onTap;
  final int elevation;

  const NeoBrutalElevatedCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.backgroundColor,
    this.borderColor,
    this.borderWidth,
    this.borderRadius,
    this.width,
    this.height,
    this.onTap,
    this.elevation = 2,
  });

  @override
  State<NeoBrutalElevatedCard> createState() => _NeoBrutalElevatedCardState();
}

class _NeoBrutalElevatedCardState extends State<NeoBrutalElevatedCard>
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
      end: 0.98,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: NeoBrutalAnimations.snapCurve,
    ));
  }

  void _onTapDown(TapDownDetails details) {
    if (widget.onTap != null) {
      setState(() => _isPressed = true);
      _animationController.forward();
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

  List<BoxShadow> _getShadowForElevation(int elevation) {
    switch (elevation) {
      case 1:
        return NeoBrutalTheme.shadowElev1;
      case 2:
        return NeoBrutalTheme.shadowElev2;
      case 3:
        return NeoBrutalTheme.shadowElev3;
      default:
        return NeoBrutalTheme.shadowElev2;
    }
  }

  @override
  Widget build(BuildContext context) {
    Widget cardWidget = AnimatedBuilder(
      animation: _scaleAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: AnimatedContainer(
            duration: NeoBrutalAnimations.snapDuration,
            curve: NeoBrutalAnimations.snapCurve,
            width: widget.width,
            height: widget.height,
            margin: widget.margin,
            padding: widget.padding ?? const EdgeInsets.all(NeoBrutalTheme.space4),
            decoration: BoxDecoration(
              color: widget.backgroundColor ?? NeoBrutalTheme.bg,
              border: Border.all(
                color: widget.borderColor ?? NeoBrutalTheme.line,
                width: widget.borderWidth ?? NeoBrutalTheme.borderThin,
              ),
              borderRadius: widget.borderRadius ?? BorderRadius.circular(NeoBrutalTheme.radiusCard),
              boxShadow: _isPressed
                  ? NeoBrutalTheme.shadowElev1
                  : _getShadowForElevation(widget.elevation),
            ),
            child: widget.child,
          ),
        );
      },
    );

    if (widget.onTap != null) {
      return GestureDetector(
        onTapDown: _onTapDown,
        onTapUp: _onTapUp,
        onTapCancel: _onTapCancel,
        onTap: widget.onTap,
        child: cardWidget,
      );
    }

    return cardWidget;
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
}
