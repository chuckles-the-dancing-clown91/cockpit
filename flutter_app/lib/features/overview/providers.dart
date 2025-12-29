import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/cockpit_api_client.dart';
import '../../core/api/models.dart';

final ideasProvider = FutureProvider<List<IdeaSummary>>((ref) {
  final api = ref.watch(cockpitApiClientProvider);
  return api.listIdeas();
});

final writingsProvider = FutureProvider<List<WritingSummary>>((ref) {
  final api = ref.watch(cockpitApiClientProvider);
  return api.listWritings();
});

final notesProvider = FutureProvider<List<NoteSummary>>((ref) {
  final api = ref.watch(cockpitApiClientProvider);
  return api.listNotes();
});

final researchItemsProvider = FutureProvider<List<ResearchItem>>((ref) {
  final api = ref.watch(cockpitApiClientProvider);
  return api.listResearchItems();
});
