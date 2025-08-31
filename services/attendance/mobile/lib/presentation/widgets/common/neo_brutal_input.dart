import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/neo_brutal_theme.dart';

class NeoBrutalInput extends StatefulWidget {
  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final String? errorText;
  final bool obscureText;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onEditingComplete;
  final ValueChanged<String>? onSubmitted;
  final int? maxLines;
  final int? minLines;
  final bool enabled;
  final bool autofocus;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final String? initialValue;
  final FocusNode? focusNode;
  final TextInputAction? textInputAction;
  final bool readOnly;

  const NeoBrutalInput({
    super.key,
    this.controller,
    this.label,
    this.hint,
    this.errorText,
    this.obscureText = false,
    this.keyboardType,
    this.inputFormatters,
    this.onChanged,
    this.onEditingComplete,
    this.onSubmitted,
    this.maxLines = 1,
    this.minLines,
    this.enabled = true,
    this.autofocus = false,
    this.prefixIcon,
    this.suffixIcon,
    this.initialValue,
    this.focusNode,
    this.textInputAction,
    this.readOnly = false,
  });

  @override
  State<NeoBrutalInput> createState() => _NeoBrutalInputState();
}

class _NeoBrutalInputState extends State<NeoBrutalInput> {
  late FocusNode _focusNode;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode = widget.focusNode ?? FocusNode();
    _focusNode.addListener(_handleFocusChange);
  }

  @override
  void dispose() {
    if (widget.focusNode == null) {
      _focusNode.dispose();
    }
    super.dispose();
  }

  void _handleFocusChange() {
    setState(() {
      _isFocused = _focusNode.hasFocus;
    });
  }

  @override
  Widget build(BuildContext context) {
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label != null) ...[
          Text(
            widget.label!,
            style: NeoBrutalTheme.body.copyWith(
              fontWeight: FontWeight.w600,
              color: hasError ? NeoBrutalTheme.error : NeoBrutalTheme.fg,
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
        ],
        Container(
          decoration: BoxDecoration(
            color: widget.enabled ? NeoBrutalTheme.bg : NeoBrutalTheme.muted,
            border: Border.all(
              color: hasError
                  ? NeoBrutalTheme.error
                  : _isFocused
                      ? NeoBrutalTheme.hi
                      : NeoBrutalTheme.fg,
              width: _isFocused || hasError
                  ? NeoBrutalTheme.borderThick
                  : NeoBrutalTheme.borderThin,
            ),
            borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusInput),
            boxShadow: _isFocused || hasError
                ? [
                    BoxShadow(
                      color: hasError 
                          ? NeoBrutalTheme.error.withOpacity(0.3)
                          : NeoBrutalTheme.hi.withOpacity(0.3),
                      offset: const Offset(0, NeoBrutalTheme.shadowOffset),
                      blurRadius: 0,
                    ),
                  ]
                : null,
          ),
          child: TextFormField(
            controller: widget.controller,
            focusNode: _focusNode,
            initialValue: widget.controller == null ? widget.initialValue : null,
            obscureText: widget.obscureText,
            keyboardType: widget.keyboardType,
            inputFormatters: widget.inputFormatters,
            onChanged: widget.onChanged,
            onEditingComplete: widget.onEditingComplete,
            onFieldSubmitted: widget.onSubmitted,
            maxLines: widget.obscureText ? 1 : widget.maxLines,
            minLines: widget.minLines,
            enabled: widget.enabled,
            autofocus: widget.autofocus,
            textInputAction: widget.textInputAction,
            readOnly: widget.readOnly,
            style: NeoBrutalTheme.body.copyWith(
              color: widget.enabled ? NeoBrutalTheme.fg : NeoBrutalTheme.gray600,
            ),
            decoration: InputDecoration(
              hintText: widget.hint,
              hintStyle: NeoBrutalTheme.body.copyWith(
                color: NeoBrutalTheme.gray500,
              ),
              prefixIcon: widget.prefixIcon,
              suffixIcon: widget.suffixIcon,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: NeoBrutalTheme.space4,
                vertical: NeoBrutalTheme.space3,
              ),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              focusedErrorBorder: InputBorder.none,
              disabledBorder: InputBorder.none,
            ),
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: NeoBrutalTheme.space1),
          Text(
            widget.errorText!,
            style: NeoBrutalTheme.caption.copyWith(
              color: NeoBrutalTheme.error,
            ),
          ),
        ],
      ],
    );
  }
}