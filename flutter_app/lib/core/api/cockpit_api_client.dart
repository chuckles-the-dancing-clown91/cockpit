import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'command_invoker.dart';
import 'models.dart';

enum BackendProtocol { tauriCommands, mock }

final backendProtocolProvider =
    Provider<BackendProtocol>((_) => BackendProtocol.tauriCommands);

final commandInvokerProvider = Provider<CommandInvoker>((ref) {
  final protocol = ref.watch(backendProtocolProvider);
  if (protocol == BackendProtocol.mock) {
    return const MockCommandInvoker();
  }
  return const TauriCommandInvoker();
});

final cockpitApiClientProvider = Provider<CockpitApiClient>((ref) {
  final protocol = ref.watch(backendProtocolProvider);
  if (protocol == BackendProtocol.mock) {
    return MockCockpitApiClient();
  }
  final invoker = ref.watch(commandInvokerProvider);
  return TauriCommandApiClient(
    invoker: invoker,
    fallback: MockCockpitApiClient(),
  );
});

abstract class CockpitApiClient {
  Future<List<IdeaSummary>> listIdeas();

  Future<List<WritingSummary>> listWritings();

  Future<List<NoteSummary>> listNotes({String entityType = 'workspace', int entityId = 0});

  Future<List<ResearchItem>> listResearchItems();
}

class TauriCommandApiClient implements CockpitApiClient {
  TauriCommandApiClient({
    required this.invoker,
    CockpitApiClient? fallback,
  }) : _fallback = fallback;

  final CommandInvoker invoker;
  final CockpitApiClient? _fallback;

  @override
  Future<List<IdeaSummary>> listIdeas() async {
    try {
      final result = await invoker.invokeCommand('list_ideas', payload: const {
        'include_removed': false,
        'includeRemoved': false,
        'limit': 50,
        'offset': 0,
      });

      final ideas = result is List ? result : const [];
      return ideas
          .whereType<Map>()
          .map((item) => IdeaSummary.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on PlatformException catch (error) {
      if (error.code == 'MissingPluginException' && _fallback != null) {
        return _fallback!.listIdeas();
      }
      rethrow;
    }
  }

  @override
  Future<List<WritingSummary>> listWritings() async {
    try {
      final result = await invoker.invokeCommand('writing_list', payload: const {
        'input': {
          'page': 1,
          'perPage': 50,
        }
      });
      final writings = result is List ? result : const [];
      return writings
          .whereType<Map>()
          .map(
            (item) => WritingSummary.fromJson(
              Map<String, dynamic>.from(item),
            ),
          )
          .toList();
    } on PlatformException catch (error) {
      if (error.code == 'MissingPluginException' && _fallback != null) {
        return _fallback!.listWritings();
      }
      rethrow;
    }
  }

  @override
  Future<List<NoteSummary>> listNotes({
    String entityType = 'workspace',
    int entityId = 0,
  }) async {
    try {
      final result = await invoker.invokeCommand('kg_list_notes_for_entity', payload: {
        'entityType': entityType,
        'entity_type': entityType,
        'entityId': entityId,
        'entity_id': entityId,
      });
      final notes = result is List ? result : const [];
      return notes
          .whereType<Map>()
          .map((item) => NoteSummary.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on PlatformException catch (error) {
      if (error.code == 'MissingPluginException' && _fallback != null) {
        return _fallback!.listNotes(entityType: entityType, entityId: entityId);
      }
      rethrow;
    }
  }

  @override
  Future<List<ResearchItem>> listResearchItems() async {
    try {
      final result = await invoker.invokeCommand('list_news_articles', payload: const {
        'offset': 0,
        'limit': 25,
        'includeDismissed': false,
        'include_dismissed': false,
        'starred': false,
      });
      final items = result is List ? result : const [];
      return items
          .whereType<Map>()
          .map(
            (item) => ResearchItem.fromJson(
              Map<String, dynamic>.from(item),
            ),
          )
          .toList();
    } on PlatformException catch (error) {
      if (error.code == 'MissingPluginException' && _fallback != null) {
        return _fallback!.listResearchItems();
      }
      rethrow;
    }
  }
}

class MockCockpitApiClient implements CockpitApiClient {
  @override
  Future<List<IdeaSummary>> listIdeas() async {
    return <IdeaSummary>[
      IdeaSummary(
        id: 1,
        title: 'Voice-first outlining',
        status: 'in_progress',
        summary: 'Prototype capturing voice notes into structured idea cards.',
        priority: 2,
        isPinned: true,
      ),
      IdeaSummary(
        id: 2,
        title: 'Persona-driven drafts',
        status: 'draft',
        summary: 'Spin up drafts based on persona intents and recent research.',
        priority: 1,
      ),
      IdeaSummary(
        id: 3,
        title: 'Notebook sync',
        status: 'completed',
        summary: 'Bi-directional syncing with external notebooks.',
      ),
    ];
  }

  @override
  Future<List<WritingSummary>> listWritings() async {
    return <WritingSummary>[
      WritingSummary(
        id: 11,
        title: 'Deep Work for Indie Makers',
        status: 'draft',
        writingType: 'article',
        excerpt: 'How to keep momentum when toggling between research and drafts.',
        wordCount: 850,
      ),
      WritingSummary(
        id: 12,
        title: 'Cockpit Field Guide',
        status: 'in_progress',
        writingType: 'book',
        excerpt: 'Structuring the knowledge graph and drafting workflow into a guide.',
        wordCount: 4200,
      ),
    ];
  }

  @override
  Future<List<NoteSummary>> listNotes({
    String entityType = 'workspace',
    int entityId = 0,
  }) async {
    return <NoteSummary>[
      NoteSummary(
        id: 21,
        title: 'Reading plan',
        entityType: entityType,
        entityId: entityId,
        preview: 'Queue articles on AI editing, news ingestion, and PKM patterns.',
      ),
      NoteSummary(
        id: 22,
        title: 'Setup decisions',
        entityType: entityType,
        entityId: entityId,
        preview: 'Documented choices around Tauri commands and SQLite migrations.',
      ),
    ];
  }

  @override
  Future<List<ResearchItem>> listResearchItems() async {
    return <ResearchItem>[
      ResearchItem(
        id: 31,
        title: 'NewsData.io launches v3 API',
        source: 'newsdata.io',
        summary: 'API surface changes and rate limits relevant for feed syncs.',
        publishedAt: '2025-01-11T08:00:00Z',
        isStarred: true,
      ),
      ResearchItem(
        id: 32,
        title: 'Offline-first desktop strategies',
        source: 'dev.blog',
        summary: 'Survey of syncing patterns suitable for hybrid desktop apps.',
        publishedAt: '2025-01-10T17:45:00Z',
      ),
    ];
  }
}
