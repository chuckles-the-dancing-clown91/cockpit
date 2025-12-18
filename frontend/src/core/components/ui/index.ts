/**
 * Barrel export for UI components
 * 
 * Simplifies imports across the application:
 * 
 * Before:
 * import { LoadingState } from '@/core/components/ui/LoadingState';
 * import { ErrorState } from '@/core/components/ui/ErrorState';
 * import { EmptyState } from '@/core/components/ui/EmptyState';
 * 
 * After:
 * import { LoadingState, ErrorState, EmptyState } from '@/core/components/ui';
 */

export { LoadingState, LoadingInline } from './LoadingState';
export { ErrorState, ErrorInline } from './ErrorState';
export { EmptyState, EmptyInline } from './EmptyState';
export { CapabilityGate, useCapabilityNav, type NavItem } from './CapabilityGate';
export { Toast, ToastTitle, ToastDescription, ToastClose, ToastProvider, ToastViewport } from './Toast';
export { Toaster } from './Toaster';
