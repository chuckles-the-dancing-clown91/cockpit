import '../command_client.dart';
import '../models.dart';

class ResearchService {
  const ResearchService(this._client);

  final CockpitCommandClient _client;

  Future<List<ResearchArticle>> listArticles({
    ListNewsArticlesQuery? query,
  }) async {
    final result = await _client.invoke<dynamic>(
      'list_news_articles',
      payload: query?.toJson(),
    );
    return mapJsonList(result, ResearchArticle.fromJson);
  }

  Future<ResearchArticle> getArticle(int id) {
    return _client.invoke<ResearchArticle>(
      'get_news_article',
      payload: <String, dynamic>{'id': id},
      parser: (data) => mapJson<ResearchArticle>(
        data,
        ResearchArticle.fromJson,
      ),
    );
  }

  Future<void> toggleStar(int id, bool starred) {
    return _client.invoke<void>(
      'toggle_star_news_article',
      payload: <String, dynamic>{
        'id': id,
        'starred': starred,
      },
    );
  }

  Future<void> markRead(int id) {
    return _client.invoke<void>(
      'mark_news_article_read',
      payload: <String, dynamic>{'id': id},
    );
  }

  Future<void> dismiss(int id) {
    return _client.invoke<void>(
      'dismiss_news_article',
      payload: <String, dynamic>{'id': id},
    );
  }

  Future<void> syncNow() {
    return _client.invoke<void>('sync_news_now');
  }
}
