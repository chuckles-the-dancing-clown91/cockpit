#!/bin/bash
# Fix all imports to use new domain-based paths

cd /home/daddy/Documents/Commonwealth/cockpit/frontend/src

echo "Fixing imports across all TypeScript files..."

# Fix @/lib/utils → @/core/lib/cn
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '@/lib/utils'|from '@/core/lib/cn'|g"
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '@/lib/cn'|from '@/core/lib/cn'|g"

# Fix @/components/ui → @/core/components/ui
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '@/components/ui/|from '@/core/components/ui/|g"

# Fix relative imports to ui components
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '../ui/|from '@/core/components/ui/|g"
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '../../ui/|from '@/core/components/ui/|g"
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '../../../ui/|from '@/core/components/ui/|g"

# Fix @/components/ErrorBoundary
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '@/components/ErrorBoundary'|from '@/core/components/ErrorBoundary'|g"

# Fix @/theme → @/core/theme
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '@/theme/|from '@/core/theme/|g"
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from './theme/|from '@/core/theme/|g"

# Fix @/hooks → @/core/hooks
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '@/hooks/|from '@/core/hooks/|g"

# Fix @/vendor → @/core/vendor
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '@/vendor/|from '@/core/vendor/|g"

# Fix relative imports from old hooks/queries.ts
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '../hooks/queries'|from '@/research/components/feed-sources/queries'|g"
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '../../hooks/queries'|from '@/research/components/feed-sources/queries'|g"
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '../../../hooks/queries'|from '@/research/components/feed-sources/queries'|g"

echo "Import fixes complete!"
