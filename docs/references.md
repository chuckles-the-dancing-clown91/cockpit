# References (Frontend Patterns)

Core hooks (from existing providers):
```tsx
import { useSetting, useUpdateSetting } from '@/core/hooks/useSettings';
import { useTheme } from '@/core/providers/ThemeProvider';
import { useDialog } from '@/core/providers/DialogProvider';
import { useCurrentUser } from '@/core/hooks/useCurrentUser';
import { toast } from '@/core/lib/toast';
import { queryKeys } from '@/shared/queryKeys';
```

Component patterns:
- State components: `LoadingState`, `ErrorState`, `EmptyState` from `@/core/components/ui`
- Dialogs: Radix Dialog primitives with `useDialog()` for confirmations
- Forms: Radix Form primitives with Radix Themes components (TextField, Select, Switch, TextArea, Button)
- Styling: CSS custom properties (`var(--color-surface)`, `var(--color-text-primary)`)

TanStack Query pattern:
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.ideas.detail(id),
  queryFn: () => invoke('get_idea', { id }),
});

const mutation = useMutation({
  mutationFn: (data) => invoke('update_idea', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
    toast.success('Updated');
  },
});
```
