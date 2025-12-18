/**
 * Query Keys Factory
 * 
 * Centralized query key management for TanStack Query.
 * Provides type-safe, consistent cache keys across the application.
 * 
 * Pattern:
 * - Base keys: ['ideas'], ['articles'], ['sources']
 * - Detail keys: ['ideas', id], ['articles', id]
 * - List filters: ['ideas', { status, priority }]
 * 
 * Usage:
 * ```ts
 * // In a component
 * const query = useQuery({
 *   queryKey: queryKeys.ideas.detail(123),
 *   queryFn: () => getIdea(123),
 * });
 * 
 * // Invalidate all ideas
 * queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
 * 
 * // Invalidate specific idea
 * queryClient.invalidateQueries({ queryKey: queryKeys.ideas.detail(123) });
 * ```
 */

// ========== Writing Domain ==========

export const queryKeys = {
  ideas: {
    all: () => ['ideas'] as const,
    lists: () => [...queryKeys.ideas.all(), 'list'] as const,
    list: (filters?: { status?: string; priority?: string; tags?: string[] }) =>
      [...queryKeys.ideas.lists(), filters] as const,
    details: () => [...queryKeys.ideas.all(), 'detail'] as const,
    detail: (id: number) => [...queryKeys.ideas.details(), id] as const,
  },

  references: {
    _def: ['references'] as const,
    all: () => [...queryKeys.references._def] as const,
    lists: () => [...queryKeys.references._def, 'list'] as const,
    list: (ideaId: number) => [...queryKeys.references.lists(), ideaId] as const,
    details: () => [...queryKeys.references._def, 'detail'] as const,
    detail: (id: number) => [...queryKeys.references.details(), id] as const,
  },

  // ========== Research Domain ==========

  articles: {
    all: () => ['articles'] as const,
    lists: () => [...queryKeys.articles.all(), 'list'] as const,
    list: (filters?: { source?: string; category?: string; read?: boolean }) =>
      [...queryKeys.articles.lists(), filters] as const,
    details: () => [...queryKeys.articles.all(), 'detail'] as const,
    detail: (id: number) => [...queryKeys.articles.details(), id] as const,
  },

  sources: {
    all: () => ['sources'] as const,
    lists: () => [...queryKeys.sources.all(), 'list'] as const,
    list: (filters?: { type?: string; enabled?: boolean }) =>
      [...queryKeys.sources.lists(), filters] as const,
    details: () => [...queryKeys.sources.all(), 'detail'] as const,
    detail: (id: number) => [...queryKeys.sources.details(), id] as const,
  },

  feeds: {
    all: () => ['feeds'] as const,
    lists: () => [...queryKeys.feeds.all(), 'list'] as const,
    list: (filters?: { sourceId?: number }) =>
      [...queryKeys.feeds.lists(), filters] as const,
  },

  // ========== System Domain ==========

  settings: {
    all: () => ['settings'] as const,
    detail: (key: string) => [...queryKeys.settings.all(), key] as const,
  },

  logs: {
    all: () => ['logs'] as const,
    lists: () => [...queryKeys.logs.all(), 'list'] as const,
    list: (level?: string) =>
      [...queryKeys.logs.lists(), level] as const,
    stats: () => [...queryKeys.logs.all(), 'stats'] as const,
  },

  tasks: {
    all: () => ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all(), 'list'] as const,
    list: () => [...queryKeys.tasks.lists()] as const,
    details: () => [...queryKeys.tasks.all(), 'detail'] as const,
    detail: (id: number) => [...queryKeys.tasks.details(), id] as const,
    history: () => [...queryKeys.tasks.all(), 'history'] as const,
  },

  storage: {
    all: () => ['storage'] as const,
    stats: () => [...queryKeys.storage.all(), 'stats'] as const,
    backups: () => [...queryKeys.storage.all(), 'backups'] as const,
  },

  // ========== User Domain ==========

  currentUser: {
    all: () => ['currentUser'] as const,
  },
} as const;

/**
 * Type-safe invalidation helpers
 * 
 * These helpers provide a cleaner API for common invalidation patterns.
 */
export const invalidation = {
  // Writing
  invalidateIdeas: () => ({ queryKey: queryKeys.ideas.all() }),
  invalidateIdea: (id: number) => ({ queryKey: queryKeys.ideas.detail(id) }),

  // Research
  invalidateArticles: () => ({ queryKey: queryKeys.articles.all() }),
  invalidateArticle: (id: number) => ({ queryKey: queryKeys.articles.detail(id) }),
  invalidateSources: () => ({ queryKey: queryKeys.sources.all() }),
  invalidateSource: (id: number) => ({ queryKey: queryKeys.sources.detail(id) }),
  invalidateFeeds: () => ({ queryKey: queryKeys.feeds.all() }),

  // System
  invalidateSettings: () => ({ queryKey: queryKeys.settings.all() }),
  invalidateLogs: () => ({ queryKey: queryKeys.logs.all() }),
  invalidateTasks: () => ({ queryKey: queryKeys.tasks.all() }),
  invalidateTask: (id: number) => ({ queryKey: queryKeys.tasks.detail(id) }),
  invalidateStorage: () => ({ queryKey: queryKeys.storage.all() }),

  // User
  invalidateCurrentUser: () => ({ queryKey: queryKeys.currentUser.all() }),
} as const;

/**
 * Usage Example:
 * 
 * ```ts
 * // In a mutation
 * const createIdea = useMutation({
 *   mutationFn: createIdeaFn,
 *   onSuccess: () => {
 *     queryClient.invalidateQueries(invalidation.invalidateIdeas());
 *   },
 * });
 * 
 * // Update specific idea
 * const updateIdea = useMutation({
 *   mutationFn: updateIdeaFn,
 *   onSuccess: (_, variables) => {
 *     queryClient.invalidateQueries(invalidation.invalidateIdea(variables.id));
 *   },
 * });
 * ```
 */
