import '../command_client.dart';
import '../models.dart';

class IdeasService {
  const IdeasService(this._client);

  final CockpitCommandClient _client;

  Future<List<Idea>> list({
    String? status,
    String? search,
    bool includeRemoved = false,
    int? limit,
    int? offset,
  }) async {
    final payload = <String, dynamic>{
      if (status != null) 'status': status,
      if (search != null && search.isNotEmpty) 'search': search,
      if (includeRemoved)
        ...{
          'includeRemoved': includeRemoved,
          'include_removed': includeRemoved,
        },
      if (limit != null) 'limit': limit,
      if (offset != null) 'offset': offset,
    };

    final result = await _client.invoke<dynamic>(
      'list_ideas',
      payload: payload,
    );
    return mapJsonList(result, Idea.fromJson);
  }

  Future<Idea> get(int id) {
    return _client.invoke<Idea>(
      'get_idea',
      payload: <String, dynamic>{'id': id},
      parser: (data) => mapJson<Idea>(data, Idea.fromJson),
    );
  }

  Future<Idea> create(CreateIdeaInput input) {
    final body = input.toJson();
    return _client.invoke<Idea>(
      'create_idea',
      payload: <String, dynamic>{
        ...body,
        'input': body,
      },
      parser: (data) => mapJson<Idea>(data, Idea.fromJson),
    );
  }

  Future<Idea> createForArticle(int articleId) {
    final body = <String, dynamic>{
      'articleId': articleId,
      'article_id': articleId,
    };
    return _client.invoke<Idea>(
      'create_idea_for_article',
      payload: <String, dynamic>{
        ...body,
        'input': body,
      },
      parser: (data) => mapJson<Idea>(data, Idea.fromJson),
    );
  }

  Future<Idea> updateMetadata(UpdateIdeaMetadataInput input) {
    return _client.invoke<Idea>(
      'update_idea_metadata',
      payload: input.toPayload(),
      parser: (data) => mapJson<Idea>(data, Idea.fromJson),
    );
  }

  Future<Idea> updateNotes(UpdateIdeaNotesInput input) {
    return _client.invoke<Idea>(
      'update_idea_notes',
      payload: input.toPayload(),
      parser: (data) => mapJson<Idea>(data, Idea.fromJson),
    );
  }

  Future<void> updateArticle({
    required int id,
    String? articleTitle,
    String? articleMarkdown,
  }) {
    return _client.invoke<void>(
      'update_idea_article',
      payload: <String, dynamic>{
        'id': id,
        'input': <String, dynamic>{
          if (articleTitle != null) ...{
            'articleTitle': articleTitle,
            'article_title': articleTitle,
          },
          if (articleMarkdown != null) ...{
            'articleMarkdown': articleMarkdown,
            'article_markdown': articleMarkdown,
          },
        },
      },
    );
  }

  Future<void> archive(int id) {
    return _client.invoke<void>(
      'archive_idea',
      payload: <String, dynamic>{'id': id},
    );
  }

  Future<void> restore(int id) {
    return _client.invoke<void>(
      'restore_idea',
      payload: <String, dynamic>{'id': id},
    );
  }

  Future<void> bulkArchive(List<int> ids) {
    return _client.invoke<void>(
      'bulk_archive_ideas',
      payload: <String, dynamic>{'ids': ids},
    );
  }

  Future<void> delete(int id) {
    return _client.invoke<void>(
      'delete_idea',
      payload: <String, dynamic>{'id': id},
    );
  }
}
