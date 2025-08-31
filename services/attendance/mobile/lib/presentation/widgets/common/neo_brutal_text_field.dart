import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/neo_brutal_theme.dart';

class NeoBrutalTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String? label;
  final String? hintText;
  final IconData? prefixIcon;
  final Widget? suffixIcon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final List<TextInputFormatter>? inputFormatters;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final void Function(String)? onFieldSubmitted;
  final int? maxLength;
  final int? maxLines;
  final bool enabled;
  final bool autofocus;
  final FocusNode? focusNode;

  const NeoBrutalTextField({
    super.key,
    this.controller,
    this.label,
    this.hintText,
    this.prefixIcon,
    this.suffixIcon,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.inputFormatters,
    this.validator,
    this.onChanged,
    this.onFieldSubmitted,
    this.maxLength,
    this.maxLines = 1,
    this.enabled = true,
    this.autofocus = false,
    this.focusNode,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: NeoBrutalTheme.body.copyWith(
              fontWeight: FontWeight.w600,
              color: NeoBrutalTheme.fg,
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
        ],
        Container(
          decoration: BoxDecoration(
            color: NeoBrutalTheme.bg,
            border: Border.all(
              color: NeoBrutalTheme.fg,
              width: NeoBrutalTheme.borderThick,
            ),
            borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
            boxShadow: const [
              BoxShadow(
                color: NeoBrutalTheme.shadow,
                offset: Offset(
                  NeoBrutalTheme.shadowOffset,
                  NeoBrutalTheme.shadowOffset,
                ),
              ),
            ],
          ),
          child: TextFormField(
            controller: controller,
            focusNode: focusNode,
            obscureText: obscureText,
            keyboardType: keyboardType,
            textInputAction: textInputAction,
            inputFormatters: inputFormatters,
            validator: validator,
            onChanged: onChanged,
            onFieldSubmitted: onFieldSubmitted,
            maxLength: maxLength,
            maxLines: obscureText ? 1 : maxLines,
            enabled: enabled,
            autofocus: autofocus,
            style: NeoBrutalTheme.body.copyWith(
              color: enabled ? NeoBrutalTheme.fg : NeoBrutalTheme.loInk,
            ),
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: NeoBrutalTheme.body.copyWith(
                color: NeoBrutalTheme.loInk,
              ),
              prefixIcon: prefixIcon != null
                  ? Icon(
                      prefixIcon,
                      color: NeoBrutalTheme.hi,
                    )
                  : null,
              suffixIcon: suffixIcon,
              counterText: '', // Hide character counter
              contentPadding: const EdgeInsets.symmetric(
                horizontal: NeoBrutalTheme.space4,
                vertical: NeoBrutalTheme.space3,
              ),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              focusedErrorBorder: InputBorder.none,
              filled: true,
              fillColor: enabled ? NeoBrutalTheme.bg : NeoBrutalTheme.lo,
            ),
          ),
        ),
      ],
    );
  }
}