import '../command_client.dart';
import '../models.dart';

class WritingsService {
  const WritingsService(this._client);

  final CockpitCommandClient _client;

  Future<WritingDraft> create(CreateWritingDraftInput input) {
    final body = input.toJson();
    return _client.invoke<WritingDraft>(
      'writing_create',
      payload: <String, dynamic>{
        ...body,
        'input': body,
      },
      parser: (data) => mapJson<WritingDraft>(data, WritingDraft.fromJson),
    );
  }

  Future<WritingDraft> get(int id) {
    final payload = <String, dynamic>{
      'writingId': id,
      'writing_id': id,
      'input': <String, dynamic>{
        'writingId': id,
        'writing_id': id,
      },
    };
    return _client.invoke<WritingDraft>(
      'writing_get',
      payload: payload,
      parser: (data) => mapJson<WritingDraft>(data, WritingDraft.fromJson),
    );
  }

  Future<List<WritingDraft>> list({ListWritingsQuery? query}) async {
    final queryMap = query?.toJson() ?? <String, dynamic>{};
    final result = await _client.invoke<dynamic>(
      'writing_list',
      payload: <String, dynamic>{
        ...queryMap,
        'input': queryMap,
      },
    );
    return mapJsonList(result, WritingDraft.fromJson);
  }

  Future<WritingDraft> updateMeta(UpdateWritingMetaInput input) {
    final body = input.toJson();
    return _client.invoke<WritingDraft>(
      'writing_update_meta',
      payload: <String, dynamic>{
        ...body,
        'input': body,
      },
      parser: (data) => mapJson<WritingDraft>(data, WritingDraft.fromJson),
    );
  }

  Future<WritingDraft> saveDraft(SaveDraftInput input) {
    final body = input.toJson();
    return _client.invoke<WritingDraft>(
      'writing_save_draft',
      payload: <String, dynamic>{
        ...body,
        'input': body,
      },
      parser: (data) => mapJson<WritingDraft>(data, WritingDraft.fromJson),
    );
  }

  Future<WritingDraft> publish(int writingId) {
    final body = <String, dynamic>{
      'writingId': writingId,
      'writing_id': writingId,
    };
    return _client.invoke<WritingDraft>(
      'writing_publish',
      payload: <String, dynamic>{
        ...body,
        'input': body,
      },
      parser: (data) => mapJson<WritingDraft>(data, WritingDraft.fromJson),
    );
  }

  Future<void> linkIdea({
    required int writingId,
    required int ideaId,
  }) {
    final body = <String, dynamic>{
      'writingId': writingId,
      'writing_id': writingId,
      'ideaId': ideaId,
      'idea_id': ideaId,
    };
    return _client.invoke<void>(
      'writing_link_idea',
      payload: <String, dynamic>{...body, 'input': body},
    );
  }

  Future<void> unlinkIdea({
    required int writingId,
    required int ideaId,
  }) {
    final body = <String, dynamic>{
      'writingId': writingId,
      'writing_id': writingId,
      'ideaId': ideaId,
      'idea_id': ideaId,
    };
    return _client.invoke<void>(
      'writing_unlink_idea',
      payload: <String, dynamic>{...body, 'input': body},
    );
  }

  Future<List<int>> listLinkedIdeas(int writingId) async {
    final body = <String, dynamic>{
      'writingId': writingId,
      'writing_id': writingId,
    };
    final result = await _client.invoke<dynamic>(
      'writing_list_linked_ideas',
      payload: <String, dynamic>{...body, 'input': body},
    );

    if (result is List) {
      return result.whereType<num>().map((value) => value.toInt()).toList();
    }
    return <int>[];
  }
}
