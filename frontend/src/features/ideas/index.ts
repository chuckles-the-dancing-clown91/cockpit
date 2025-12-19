/**
 * Barrel export for Ideas feature
 * 
 * Provides unified exports for ideas components, hooks, and types.
 */

// Components
export { IdeaCard } from './components/IdeaCard';
export { IdeaDetailDialog } from './components/IdeaDetailDialog';
// export { IdeasList } from './components/IdeasList';
export { NewIdeaDialog } from './components/NewIdeaDialog';

// Hooks
export {
  useIdeas,
  useIdea,
  useCreateIdea,
  useUpdateIdea,
  useUpdateIdeaNotes,
  useDeleteIdea,
  useArchiveIdea,
  useRestoreIdea,
} from './hooks/useIdeas';
