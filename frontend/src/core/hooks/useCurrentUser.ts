import { useQuery } from '@tanstack/react-query';
import { getCurrentUser, type CurrentUser } from '@/core/api/tauri';

/**
 * Hook to get current system user information
 * 
 * Returns username, home directory, and user ID
 * Used for personalization and future multi-user features
 */
export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: Infinity, // User info doesn't change during session
    retry: 1,
  });
}
