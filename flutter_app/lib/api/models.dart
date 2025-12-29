typedef JsonMap = Map<String, dynamic>;

List<T> _mapList<T>(
  dynamic value,
  T Function(Map<String, dynamic>) parser,
) {
  if (value is List) {
    return value
        .whereType<Map>()
        .map((item) => parser(Map<String, dynamic>.from(item)))
        .toList();
  }
  return <T>[];
}

class Idea {
  Idea({
    required this.id,
    required this.title,
    required this.status,
    this.summary,
    this.target,
    this.tags = const <String>[],
    this.notesMarkdown,
    this.priority = 0,
    this.dateAdded,
    this.dateUpdated,
    this.dateCompleted,
    this.dateRemoved,
    this.isPinned = false,
  });

  final int id;
  final String title;
  final String status;
  final String? summary;
  final String? target;
  final List<String> tags;
  final String? notesMarkdown;
  final int priority;
  final String? dateAdded;
  final String? dateUpdated;
  final String? dateCompleted;
  final String? dateRemoved;
  final bool isPinned;

  factory Idea.fromJson(Map<String, dynamic> json) {
    return Idea(
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: json['title'] as String? ?? 'Untitled idea',
      summary: json['summary'] as String?,
      status: json['status'] as String? ?? 'in_progress',
      target: json['target'] as String?,
      tags: (json['tags'] as List?)?.whereType<String>().toList() ?? const <String>[],
      notesMarkdown: json['notesMarkdown'] as String? ??
          json['notes_markdown'] as String?,
      priority: (json['priority'] as num?)?.toInt() ?? 0,
      dateAdded: json['dateAdded'] as String? ??
          json['date_added'] as String?,
      dateUpdated: json['dateUpdated'] as String? ??
          json['date_updated'] as String?,
      dateCompleted: json['dateCompleted'] as String? ??
          json['date_completed'] as String?,
      dateRemoved: json['dateRemoved'] as String? ??
          json['date_removed'] as String?,
      isPinned: json['isPinned'] as bool? ??
          (json['is_pinned'] as num?)?.toInt() == 1,
    );
  }
}

class CreateIdeaInput {
  CreateIdeaInput({
    required this.title,
    this.summary,
    this.status,
    this.target,
    this.tags,
    this.notesMarkdown,
    this.priority,
    this.isPinned,
  });

  final String title;
  final String? summary;
  final String? status;
  final String? target;
  final List<String>? tags;
  final String? notesMarkdown;
  final int? priority;
  final bool? isPinned;

  JsonMap toJson() {
    return <String, dynamic>{
      'title': title,
      if (summary != null) 'summary': summary,
      if (status != null) 'status': status,
      if (target != null) 'target': target,
      if (tags != null) 'tags': tags,
      if (notesMarkdown != null) ...{
        'notesMarkdown': notesMarkdown,
        'notes_markdown': notesMarkdown,
      },
      if (priority != null) 'priority': priority,
      if (isPinned != null) ...{
        'isPinned': isPinned,
        'is_pinned': isPinned,
      },
    };
  }
}

class UpdateIdeaMetadataInput {
  UpdateIdeaMetadataInput({
    required this.id,
    this.title,
    this.summary,
    this.status,
    this.target,
    this.tags,
    this.priority,
    this.isPinned,
  });

  final int id;
  final String? title;
  final String? summary;
  final String? status;
  final String? target;
  final List<String>? tags;
  final int? priority;
  final bool? isPinned;

  JsonMap toPayload() {
    return <String, dynamic>{
      'id': id,
      'input': <String, dynamic>{
        if (title != null) 'title': title,
        if (summary != null) 'summary': summary,
        if (status != null) 'status': status,
        if (target != null) 'target': target,
        if (tags != null) 'tags': tags,
        if (priority != null) 'priority': priority,
        if (isPinned != null) ...{
          'isPinned': isPinned,
          'is_pinned': isPinned,
        },
      },
    };
  }
}

class UpdateIdeaNotesInput {
  UpdateIdeaNotesInput({
    required this.id,
    required this.notesMarkdown,
  });

  final int id;
  final String notesMarkdown;

  JsonMap toPayload() {
    return <String, dynamic>{
      'id': id,
      'input': <String, dynamic>{
        'notesMarkdown': notesMarkdown,
        'notes_markdown': notesMarkdown,
      },
    };
  }
}

class WritingDraft {
  WritingDraft({
    required this.id,
    required this.title,
    required this.writingType,
    required this.status,
    required this.contentJson,
    required this.contentText,
    this.slug,
    this.excerpt,
    this.tags,
    this.wordCount = 0,
    this.seriesName,
    this.seriesPart,
    this.isPinned = false,
    this.isFeatured = false,
    this.createdAt,
    this.updatedAt,
    this.publishedAt,
  });

  final int id;
  final String title;
  final String? slug;
  final String writingType;
  final String status;
  final dynamic contentJson;
  final String contentText;
  final String? excerpt;
  final String? tags;
  final int wordCount;
  final String? seriesName;
  final int? seriesPart;
  final bool isPinned;
  final bool isFeatured;
  final String? createdAt;
  final String? updatedAt;
  final String? publishedAt;

  factory WritingDraft.fromJson(Map<String, dynamic> json) {
    return WritingDraft(
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: json['title'] as String? ?? 'Untitled draft',
      slug: json['slug'] as String?,
      writingType: json['writingType'] as String? ??
          json['writing_type'] as String? ??
          'article',
      status: json['status'] as String? ?? 'draft',
      contentJson: json['contentJson'] ?? json['content_json'] ?? <String, dynamic>{},
      contentText: json['contentText'] as String? ??
          json['content_text'] as String? ??
          '',
      excerpt: json['excerpt'] as String?,
      tags: json['tags'] as String?,
      wordCount: (json['wordCount'] as num?)?.toInt() ??
          (json['word_count'] as num?)?.toInt() ??
          0,
      seriesName: json['seriesName'] as String? ??
          json['series_name'] as String?,
      seriesPart: (json['seriesPart'] as num?)?.toInt() ??
          (json['series_part'] as num?)?.toInt(),
      isPinned: json['isPinned'] as bool? ??
          (json['is_pinned'] as num?)?.toInt() == 1,
      isFeatured: json['isFeatured'] as bool? ??
          (json['is_featured'] as num?)?.toInt() == 1,
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String?,
      updatedAt: json['updatedAt'] as String? ?? json['updated_at'] as String?,
      publishedAt: json['publishedAt'] as String? ??
          json['published_at'] as String?,
    );
  }
}

class CreateWritingDraftInput {
  CreateWritingDraftInput({
    required this.title,
    required this.writingType,
    required this.linkIdeaIds,
    required this.initialContentJson,
    this.slug,
    this.excerpt,
    this.tags,
  });

  final String title;
  final String writingType;
  final List<int> linkIdeaIds;
  final dynamic initialContentJson;
  final String? slug;
  final String? excerpt;
  final String? tags;

  JsonMap toJson() {
    return <String, dynamic>{
      'title': title,
      'writingType': writingType,
      'writing_type': writingType,
      'linkIdeaIds': linkIdeaIds,
      'link_idea_ids': linkIdeaIds,
      'initialContentJson': initialContentJson,
      'initial_content_json': initialContentJson,
      if (slug != null) 'slug': slug,
      if (excerpt != null) 'excerpt': excerpt,
      if (tags != null) 'tags': tags,
    };
  }
}

class UpdateWritingMetaInput {
  UpdateWritingMetaInput({
    required this.writingId,
    this.title,
    this.slug,
    this.writingType,
    this.status,
    this.excerpt,
    this.tags,
    this.seriesName,
    this.seriesPart,
    this.isPinned,
    this.isFeatured,
  });

  final int writingId;
  final String? title;
  final String? slug;
  final String? writingType;
  final String? status;
  final String? excerpt;
  final String? tags;
  final String? seriesName;
  final int? seriesPart;
  final bool? isPinned;
  final bool? isFeatured;

  JsonMap toJson() {
    return <String, dynamic>{
      'writingId': writingId,
      'writing_id': writingId,
      if (title != null) 'title': title,
      if (slug != null) 'slug': slug,
      if (writingType != null) ...{
        'writingType': writingType,
        'writing_type': writingType,
      },
      if (status != null) 'status': status,
      if (excerpt != null) 'excerpt': excerpt,
      if (tags != null) 'tags': tags,
      if (seriesName != null) ...{
        'seriesName': seriesName,
        'series_name': seriesName,
      },
      if (seriesPart != null) ...{
        'seriesPart': seriesPart,
        'series_part': seriesPart,
      },
      if (isPinned != null) ...{
        'isPinned': isPinned,
        'is_pinned': isPinned,
      },
      if (isFeatured != null) ...{
        'isFeatured': isFeatured,
        'is_featured': isFeatured,
      },
    };
  }
}

class SaveDraftInput {
  SaveDraftInput({
    required this.writingId,
    required this.contentJson,
  });

  final int writingId;
  final dynamic contentJson;

  JsonMap toJson() {
    return <String, dynamic>{
      'writingId': writingId,
      'writing_id': writingId,
      'contentJson': contentJson,
      'content_json': contentJson,
    };
  }
}

class ListWritingsQuery {
  ListWritingsQuery({
    this.status,
    this.writingType,
    this.seriesName,
    this.isPinned,
    this.isFeatured,
    this.page,
    this.perPage,
  });

  final String? status;
  final String? writingType;
  final String? seriesName;
  final bool? isPinned;
  final bool? isFeatured;
  final int? page;
  final int? perPage;

  JsonMap toJson() {
    return <String, dynamic>{
      if (status != null) 'status': status,
      if (writingType != null) ...{
        'writingType': writingType,
        'writing_type': writingType,
      },
      if (seriesName != null) ...{
        'seriesName': seriesName,
        'series_name': seriesName,
      },
      if (isPinned != null) ...{
        'isPinned': isPinned,
        'is_pinned': isPinned,
      },
      if (isFeatured != null) ...{
        'isFeatured': isFeatured,
        'is_featured': isFeatured,
      },
      if (page != null) 'page': page,
      if (perPage != null) ...{
        'perPage': perPage,
        'per_page': perPage,
      },
    };
  }
}

class Note {
  Note({
    required this.id,
    required this.entityType,
    required this.entityId,
    required this.noteType,
    required this.bodyHtml,
    this.createdAt,
    this.updatedAt,
  });

  final int id;
  final String entityType;
  final int entityId;
  final String noteType;
  final String bodyHtml;
  final String? createdAt;
  final String? updatedAt;

  factory Note.fromJson(Map<String, dynamic> json) {
    return Note(
      id: (json['id'] as num?)?.toInt() ?? 0,
      entityType: json['entityType'] as String? ??
          json['entity_type'] as String? ??
          'idea',
      entityId: (json['entityId'] as num?)?.toInt() ??
          (json['entity_id'] as num?)?.toInt() ??
          0,
      noteType: json['noteType'] as String? ??
          json['note_type'] as String? ??
          'main',
      bodyHtml: json['bodyHtml'] as String? ??
          json['body_html'] as String? ??
          '',
      createdAt: json['createdAt'] as String? ??
          json['created_at'] as String?,
      updatedAt: json['updatedAt'] as String? ??
          json['updated_at'] as String?,
    );
  }
}

class CreateNoteInput {
  CreateNoteInput({
    required this.entityType,
    required this.entityId,
    required this.bodyHtml,
    this.noteType,
  });

  final String entityType;
  final int entityId;
  final String bodyHtml;
  final String? noteType;

  JsonMap toJson() {
    return <String, dynamic>{
      'entityType': entityType,
      'entity_type': entityType,
      'entityId': entityId,
      'entity_id': entityId,
      'bodyHtml': bodyHtml,
      'body_html': bodyHtml,
      if (noteType != null) ...{
        'noteType': noteType,
        'note_type': noteType,
      },
    };
  }
}

class UpdateNoteInput {
  UpdateNoteInput({
    required this.id,
    this.bodyHtml,
    this.noteType,
  });

  final int id;
  final String? bodyHtml;
  final String? noteType;

  JsonMap toPayload() {
    return <String, dynamic>{
      'id': id,
      'input': <String, dynamic>{
        if (bodyHtml != null) ...{
          'bodyHtml': bodyHtml,
          'body_html': bodyHtml,
        },
        if (noteType != null) ...{
          'noteType': noteType,
          'note_type': noteType,
        },
      },
    };
  }
}

class ResearchArticle {
  ResearchArticle({
    required this.id,
    required this.title,
    this.excerpt,
    this.articleId,
    this.url,
    this.imageUrl,
    this.sourceName,
    this.sourceDomain,
    this.sourceId,
    this.tags = const <String>[],
    this.country = const <String>[],
    this.language,
    this.category,
    this.publishedAt,
    this.fetchedAt,
    this.addedVia,
    this.isStarred = false,
    this.isDismissed = false,
    this.isRead = false,
    this.addedToIdeasAt,
    this.dismissedAt,
  });

  final int id;
  final String title;
  final String? excerpt;
  final String? articleId;
  final String? url;
  final String? imageUrl;
  final String? sourceName;
  final String? sourceDomain;
  final String? sourceId;
  final List<String> tags;
  final List<String> country;
  final String? language;
  final String? category;
  final String? publishedAt;
  final String? fetchedAt;
  final String? addedVia;
  final bool isStarred;
  final bool isDismissed;
  final bool isRead;
  final String? addedToIdeasAt;
  final String? dismissedAt;

  factory ResearchArticle.fromJson(Map<String, dynamic> json) {
    return ResearchArticle(
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: json['title'] as String? ?? 'Untitled article',
      articleId: json['articleId'] as String? ??
          json['article_id'] as String?,
      excerpt: json['excerpt'] as String?,
      url: json['url'] as String?,
      imageUrl: json['imageUrl'] as String? ?? json['image_url'] as String?,
      sourceName: json['sourceName'] as String? ??
          json['source_name'] as String?,
      sourceDomain: json['sourceDomain'] as String? ??
          json['source_domain'] as String?,
      sourceId: json['sourceId'] as String? ??
          json['source_id'] as String?,
      tags: (json['tags'] as List?)?.whereType<String>().toList() ??
          const <String>[],
      country: (json['country'] as List?)?.whereType<String>().toList() ??
          const <String>[],
      language: json['language'] as String?,
      category: json['category'] as String?,
      publishedAt: json['publishedAt'] as String? ??
          json['published_at'] as String?,
      fetchedAt: json['fetchedAt'] as String? ??
          json['fetched_at'] as String?,
      addedVia: json['addedVia'] as String? ??
          json['added_via'] as String?,
      isStarred: json['isStarred'] as bool? ??
          json['is_starred'] as bool? ??
          false,
      isDismissed: json['isDismissed'] as bool? ??
          json['is_dismissed'] as bool? ??
          false,
      isRead: json['isRead'] as bool? ??
          json['is_read'] as bool? ??
          false,
      addedToIdeasAt: json['addedToIdeasAt'] as String? ??
          json['added_to_ideas_at'] as String?,
      dismissedAt: json['dismissedAt'] as String? ??
          json['dismissed_at'] as String?,
    );
  }
}

class ListNewsArticlesQuery {
  ListNewsArticlesQuery({
    this.status,
    this.limit,
    this.offset,
    this.includeDismissed = false,
    this.search,
    this.sourceId,
    this.starred,
    this.startDate,
    this.endDate,
    this.sortBy,
  });

  final String? status;
  final int? limit;
  final int? offset;
  final bool includeDismissed;
  final String? search;
  final int? sourceId;
  final bool? starred;
  final String? startDate;
  final String? endDate;
  final String? sortBy;

  JsonMap toJson() {
    return <String, dynamic>{
      if (status != null) 'status': status,
      if (limit != null) 'limit': limit,
      if (offset != null) 'offset': offset,
      if (includeDismissed) ...{
        'includeDismissed': includeDismissed,
        'include_dismissed': includeDismissed,
      },
      if (search != null) 'search': search,
      if (sourceId != null) ...{
        'sourceId': sourceId,
        'source_id': sourceId,
      },
      if (starred != null) 'starred': starred,
      if (startDate != null) ...{
        'startDate': startDate,
        'start_date': startDate,
      },
      if (endDate != null) ...{
        'endDate': endDate,
        'end_date': endDate,
      },
      if (sortBy != null) ...{
        'sortBy': sortBy,
        'sort_by': sortBy,
      },
    };
  }
}

T mapJson<T>(
  dynamic value,
  T Function(Map<String, dynamic>) parser,
) {
  return parser(Map<String, dynamic>.from(value as Map));
}

List<T> mapJsonList<T>(
  dynamic value,
  T Function(Map<String, dynamic>) parser,
) {
  return _mapList<T>(value, parser);
}
