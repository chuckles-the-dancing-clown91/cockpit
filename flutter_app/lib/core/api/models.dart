class IdeaSummary {
  IdeaSummary({
    required this.id,
    required this.title,
    required this.status,
    this.summary,
    this.priority = 0,
    this.isPinned = false,
  });

  final int id;
  final String title;
  final String status;
  final String? summary;
  final int priority;
  final bool isPinned;

  factory IdeaSummary.fromJson(Map<String, dynamic> json) {
    return IdeaSummary(
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: json['title'] as String? ?? 'Untitled idea',
      status: json['status'] as String? ?? 'draft',
      summary: json['summary'] as String?,
      priority: (json['priority'] as num?)?.toInt() ?? 0,
      isPinned: json['isPinned'] as bool? ?? false,
    );
  }
}

class WritingSummary {
  WritingSummary({
    required this.id,
    required this.title,
    required this.status,
    required this.writingType,
    this.excerpt,
    this.wordCount = 0,
  });

  final int id;
  final String title;
  final String status;
  final String writingType;
  final String? excerpt;
  final int wordCount;

  factory WritingSummary.fromJson(Map<String, dynamic> json) {
    return WritingSummary(
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: json['title'] as String? ?? 'Untitled draft',
      status: json['status'] as String? ?? 'draft',
      writingType: json['writingType'] as String? ??
          json['writing_type'] as String? ??
          'article',
      excerpt: json['excerpt'] as String?,
      wordCount: (json['wordCount'] as num?)?.toInt() ??
          (json['word_count'] as num?)?.toInt() ??
          0,
    );
  }
}

class NoteSummary {
  NoteSummary({
    required this.id,
    required this.title,
    required this.entityType,
    required this.entityId,
    this.preview,
  });

  final int id;
  final String title;
  final String entityType;
  final int entityId;
  final String? preview;

  factory NoteSummary.fromJson(Map<String, dynamic> json) {
    return NoteSummary(
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: json['title'] as String? ??
          (json['summary'] as String?) ??
          'Untitled note',
      entityType: json['entityType'] as String? ??
          json['entity_type'] as String? ??
          'workspace',
      entityId: (json['entityId'] as num?)?.toInt() ??
          (json['entity_id'] as num?)?.toInt() ??
          0,
      preview: json['contentText'] as String? ??
          json['content_text'] as String? ??
          json['notesMarkdown'] as String? ??
          json['notes_markdown'] as String?,
    );
  }
}

class ResearchItem {
  ResearchItem({
    required this.id,
    required this.title,
    required this.source,
    this.summary,
    this.publishedAt,
    this.isStarred = false,
    this.isRead = false,
  });

  final int id;
  final String title;
  final String source;
  final String? summary;
  final String? publishedAt;
  final bool isStarred;
  final bool isRead;

  factory ResearchItem.fromJson(Map<String, dynamic> json) {
    return ResearchItem(
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: json['title'] as String? ?? 'Untitled article',
      source: json['sourceName'] as String? ??
          json['source'] as String? ??
          json['source_type'] as String? ??
          'feed',
      summary: json['summary'] as String? ?? json['excerpt'] as String?,
      publishedAt: json['publishedAt'] as String? ??
          json['published_at'] as String? ??
          json['datePublished'] as String?,
      isStarred: json['isStarred'] as bool? ?? json['starred'] as bool? ?? false,
      isRead: json['isRead'] as bool? ?? json['read'] as bool? ?? false,
    );
  }
}
