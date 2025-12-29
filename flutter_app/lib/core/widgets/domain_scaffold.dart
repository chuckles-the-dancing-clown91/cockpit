import 'package:flutter/material.dart';

class DomainScaffold extends StatelessWidget {
  const DomainScaffold({
    required this.title,
    required this.child,
    this.subtitle,
    this.actions,
    this.toolbar,
    super.key,
  });

  final String title;
  final String? subtitle;
  final Widget child;
  final List<Widget>? actions;
  final Widget? toolbar;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final horizontalPadding = constraints.maxWidth > 1280 ? 48.0 : 24.0;
        final headline = Theme.of(context).textTheme.headlineMedium;
        final body = Theme.of(context).textTheme.bodyLarge;

        return Padding(
          padding: EdgeInsets.fromLTRB(
            horizontalPadding,
            24,
            horizontalPadding,
            12,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: headline),
                        if (subtitle != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            subtitle!,
                            style: body?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (actions != null) ...actions!,
                ],
              ),
              const SizedBox(height: 16),
              if (toolbar != null) ...[
                toolbar!,
                const SizedBox(height: 12),
              ],
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: child,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
