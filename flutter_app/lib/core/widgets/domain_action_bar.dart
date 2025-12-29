import 'package:flutter/material.dart';

class DomainActionBar extends StatelessWidget {
  const DomainActionBar({
    super.key,
    required this.searchHint,
    required this.primaryLabel,
    required this.secondaryLabel,
    required this.tertiaryLabel,
  });

  final String searchHint;
  final String primaryLabel;
  final String secondaryLabel;
  final String tertiaryLabel;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 720;
        return Wrap(
          spacing: 12,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            ConstrainedBox(
              constraints: BoxConstraints(
                minWidth: isNarrow ? constraints.maxWidth : 240,
                maxWidth: isNarrow ? constraints.maxWidth : 420,
              ),
              child: TextField(
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search),
                  hintText: searchHint,
                ),
              ),
            ),
            FilledButton.icon(
              onPressed: () => _showToast(context, '$primaryLabel tapped'),
              icon: const Icon(Icons.add_rounded),
              label: Text(primaryLabel),
            ),
            OutlinedButton.icon(
              onPressed: () => _showToast(context, '$secondaryLabel tapped'),
              icon: const Icon(Icons.drive_file_move_outline),
              label: Text(secondaryLabel),
            ),
            TextButton.icon(
              onPressed: () => _showToast(context, '$tertiaryLabel tapped'),
              icon: Icon(Icons.check_circle_outline, color: colorScheme.primary),
              label: Text(
                tertiaryLabel,
                style: TextStyle(color: colorScheme.primary),
              ),
            ),
          ],
        );
      },
    );
  }

  void _showToast(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          duration: const Duration(seconds: 2),
        ),
      );
  }
}
