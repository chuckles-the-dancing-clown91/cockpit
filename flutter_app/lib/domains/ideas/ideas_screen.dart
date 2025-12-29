import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/widgets/async_value_view.dart';
import '../../core/widgets/domain_scaffold.dart';
import '../../features/overview/providers.dart';

class IdeasScreen extends ConsumerWidget {
  const IdeasScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ideas = ref.watch(ideasProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return DomainScaffold(
      title: 'Ideas',
      subtitle: 'Capture and prioritize ideas before they graduate into drafts.',
      child: AsyncValueView<List<IdeaSummary>>(
        value: ideas,
        emptyLabel: 'No ideas yet — start with a quick capture.',
        dataBuilder: (items) => GridView.builder(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 420,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.25,
          ),
          itemCount: items.length,
          itemBuilder: (context, index) {
            final idea = items[index];
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            idea.title,
                            style: Theme.of(context).textTheme.titleMedium,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (idea.isPinned)
                          Icon(Icons.push_pin, size: 18, color: colorScheme.primary),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        Chip(
                          label: Text(
                            idea.status.toUpperCase(),
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: colorScheme.onSecondaryContainer,
                                  letterSpacing: 0.3,
                                ),
                          ),
                          padding: EdgeInsets.zero,
                          backgroundColor: colorScheme.secondaryContainer,
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        Chip(
                          label: Text('Priority ${idea.priority}'),
                          padding: EdgeInsets.zero,
                          backgroundColor: colorScheme.surfaceContainerHighest,
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: Text(
                        idea.summary ?? 'No summary yet — add notes from research.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
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
}
