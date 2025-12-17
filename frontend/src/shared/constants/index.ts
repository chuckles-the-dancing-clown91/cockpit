/**
 * Shared constants aligned with backend
 * Single source of truth for all constant values
 */

import { IdeaStatus, IdeaPriority, Theme } from '../types';

// Idea Status Options (matches backend exactly)
export const IDEA_STATUSES: { value: IdeaStatus; label: string; color: string }[] = [
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'stalled', label: 'Stalled', color: 'orange' },
  { value: 'complete', label: 'Complete', color: 'green' },
];

// Idea Priority Options
export const IDEA_PRIORITIES: { value: IdeaPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'gray' },
  { value: 'medium', label: 'Medium', color: 'blue' },
  { value: 'high', label: 'High', color: 'red' },
];

// Theme Options
export const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
];

// Status Labels Helper
export const getStatusLabel = (status: IdeaStatus): string => {
  return IDEA_STATUSES.find(s => s.value === status)?.label || 'Unknown';
};

// Status Color Helper
export const getStatusColor = (status: IdeaStatus): string => {
  return IDEA_STATUSES.find(s => s.value === status)?.color || 'gray';
};

// Priority Label Helper
export const getPriorityLabel = (priority: IdeaPriority): string => {
  return IDEA_PRIORITIES.find(p => p.value === priority)?.label || 'Unknown';
};

// Priority Color Helper
export const getPriorityColor = (priority: IdeaPriority): string => {
  return IDEA_PRIORITIES.find(p => p.value === priority)?.color || 'gray';
};
