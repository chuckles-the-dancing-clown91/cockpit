/**
 * TanStack Query hooks for Setup Wizard
 */

import { invoke } from '@tauri-apps/api/core';
import { useQuery } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export type SetupStatus = {
  is_complete: boolean;
  has_master_key: boolean;
  has_database: boolean;
  cockpit_home: string;
};

// ============================================================================
// Setup Queries
// ============================================================================

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setupStatus'],
    queryFn: () => invoke<SetupStatus>('check_setup_status_command'),
    staleTime: 1000 * 60, // 1 minute - setup status doesn't change frequently
    retry: 1, // Only retry once for setup checks
  });
}
