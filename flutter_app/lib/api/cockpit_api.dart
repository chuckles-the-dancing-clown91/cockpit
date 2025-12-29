import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/services.dart';

import 'backend_environment.dart';
import 'command_client.dart';
import 'services/ideas_service.dart';
import 'services/notes_service.dart';
import 'services/research_service.dart';
import 'services/writings_service.dart';

class CockpitApi {
  CockpitApi({
    BackendEnvironment? environment,
    CommandTransport? transport,
    http.Client? httpClient,
    MethodChannel? methodChannel,
  })  : environment = environment ?? BackendEnvironment.fromEnvironment(),
        commandClient = CockpitCommandClient(
          environment: environment,
          transport: transport,
          httpClient: httpClient,
          methodChannel: methodChannel,
        ),
        ideas = IdeasService(commandClient),
        writings = WritingsService(commandClient),
        notes = NotesService(commandClient),
        research = ResearchService(commandClient);

  final BackendEnvironment environment;
  final CockpitCommandClient commandClient;
  final IdeasService ideas;
  final WritingsService writings;
  final NotesService notes;
  final ResearchService research;
}

final cockpitApiProvider = Provider<CockpitApi>((_) => CockpitApi());
