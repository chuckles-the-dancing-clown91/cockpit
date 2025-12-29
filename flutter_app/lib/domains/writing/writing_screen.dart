import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/widgets/async_value_view.dart';
import '../../core/widgets/domain_action_bar.dart';
import '../../core/widgets/domain_scaffold.dart';
import '../../features/overview/providers.dart';

class WritingScreen extends ConsumerWidget {
  const WritingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final writings = ref.watch(writingsProvider);
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return DomainScaffold(
      title: 'Writing',
      subtitle: 'Drafts, chapters, and published work wired to the knowledge graph.',
      toolbar: const DomainActionBar(
        searchHint: 'Search drafts, chapters, or publications',
        primaryLabel: 'New draft',
        secondaryLabel: 'Link reference',
        tertiaryLabel: 'Open outline',
      ),
      child: AsyncValueView<List<WritingSummary>>(
        value: writings,
        emptyLabel: 'No drafts yet — start from an idea or a blank document.',
        dataBuilder: (items) => ListView.separated(
          padding: const EdgeInsets.only(bottom: 16),
          itemCount: items.length,
          separatorBuilder: (context, _) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final draft = items[index];
            return Card(
              margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              child: ListTile(
                title: Text(draft.title, style: textTheme.titleMedium),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        draft.excerpt ?? 'No excerpt yet — sync from notes or drafts.',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          Chip(
                            label: Text(
                              draft.status.toUpperCase(),
                              style: textTheme.labelSmall?.copyWith(
                                letterSpacing: 0.4,
                              ),
                            ),
                            padding: EdgeInsets.zero,
                          ),
                          Chip(
                            label: Text(draft.writingType.toUpperCase()),
                            padding: EdgeInsets.zero,
                            backgroundColor: colorScheme.surfaceContainerHigh,
                          ),
                          Chip(
                            label: Text('${draft.wordCount} words'),
                            padding: EdgeInsets.zero,
                            backgroundColor: colorScheme.surfaceContainerLow,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                trailing: Icon(
                  Icons.chevron_right,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
