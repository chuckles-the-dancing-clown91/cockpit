import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/widgets/async_value_view.dart';
import '../../core/widgets/domain_action_bar.dart';
import '../../core/widgets/domain_scaffold.dart';
import '../../features/overview/providers.dart';

class ResearchScreen extends ConsumerWidget {
  const ResearchScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final researchItems = ref.watch(researchItemsProvider);
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return DomainScaffold(
      title: 'Research',
      subtitle: 'News, feeds, and clippings ready to attach to ideas and drafts.',
      toolbar: const DomainActionBar(
        searchHint: 'Search research sources or articles',
        primaryLabel: 'Sync feeds',
        secondaryLabel: 'Clip to note',
        tertiaryLabel: 'Star newest',
      ),
      child: AsyncValueView<List<ResearchItem>>(
        value: researchItems,
        emptyLabel: 'No research items yet — sync feed sources to get started.',
        dataBuilder: (items) => ListView.separated(
          padding: const EdgeInsets.only(bottom: 16),
          itemCount: items.length,
          separatorBuilder: (context, _) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final item = items[index];
            return ListTile(
              leading: Icon(
                item.isStarred ? Icons.star : Icons.star_border,
                color: item.isStarred ? colorScheme.primary : colorScheme.onSurfaceVariant,
              ),
              title: Text(item.title, style: textTheme.titleMedium),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 6),
                  Text(
                    item.summary ?? 'No summary available',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.rss_feed, size: 16, color: colorScheme.onSurfaceVariant),
                      const SizedBox(width: 6),
                      Text(
                        item.source,
                        style: textTheme.labelMedium?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                      if (item.publishedAt != null) ...[
                        const SizedBox(width: 12),
                        Icon(Icons.schedule, size: 16, color: colorScheme.onSurfaceVariant),
                        const SizedBox(width: 6),
                        Text(
                          item.publishedAt!,
                          style: textTheme.labelMedium?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
              trailing: Icon(
                item.isRead ? Icons.check_circle : Icons.radio_button_unchecked,
                color: item.isRead ? colorScheme.primary : colorScheme.onSurfaceVariant,
              ),
            );
          },
        ),
      ),
    );
  }
}
