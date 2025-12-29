import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/widgets/async_value_view.dart';
import '../../core/widgets/domain_action_bar.dart';
import '../../core/widgets/domain_scaffold.dart';
import '../../features/overview/providers.dart';

class NotesScreen extends ConsumerWidget {
  const NotesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notes = ref.watch(notesProvider);
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return DomainScaffold(
      title: 'Notes',
      subtitle: 'Workspace-level and per-entity notes to keep research attached.',
      toolbar: const DomainActionBar(
        searchHint: 'Search notes by title or entity',
        primaryLabel: 'New note',
        secondaryLabel: 'Attach to idea',
        tertiaryLabel: 'Pin favorite',
      ),
      child: AsyncValueView<List<NoteSummary>>(
        value: notes,
        emptyLabel: 'No notes yet — append snippets from ideas or research.',
        dataBuilder: (items) => ListView.separated(
          padding: const EdgeInsets.only(bottom: 16),
          itemCount: items.length,
          separatorBuilder: (context, _) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final note = items[index];
            return Card(
              margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: colorScheme.secondaryContainer,
                  child: Icon(
                    Icons.notes_rounded,
                    color: colorScheme.onSecondaryContainer,
                  ),
                ),
                title: Text(
                  note.title,
                  style: textTheme.titleMedium,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 6),
                    Text(
                      note.preview ?? 'No content yet',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Linked to ${note.entityType} #${note.entityId}',
                      style: textTheme.labelMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                trailing: Icon(Icons.arrow_forward, color: colorScheme.onSurfaceVariant),
              ),
            );
          },
        ),
      ),
    );
  }
}
