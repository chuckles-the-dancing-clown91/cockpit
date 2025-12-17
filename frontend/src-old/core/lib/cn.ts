import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper conflict resolution
 * 
 * Combines clsx for conditional classes with tailwind-merge for smart merging.
 * Ensures later classes override earlier ones correctly.
 * 
 * @example
 * cn('px-2 py-1', isActive && 'px-4') // => 'py-1 px-4' when active
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
