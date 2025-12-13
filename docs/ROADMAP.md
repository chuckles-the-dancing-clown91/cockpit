# Cockpit Development Roadmap

High-level project phases, milestones, and long-term vision.

---

## Current Status (December 12, 2025)

- ✅ **UI Complete**: Phases 1-10 (100%)
- 🔄 **Backend Modernization**: Phase 1 (HIGH priority complete - 7/17 tasks)
- ⏳ **Backend Integration**: Phase 11 (pending)
- ⏳ **Testing**: 0%
- 📖 **Documentation**: 60%

---

## Phase Overview

### ✅ Phase 1-9: UI Foundation (COMPLETE)
**Status**: Complete  
**Duration**: ~4 weeks

- Modern, clean UI with Tailwind + shadcn/ui
- Three-mode navigation (Writing, Research, System)
- Theme system with persistence
- All views implemented and functional
- Responsive layout and mobile drawer

---

### ✅ Phase 10: UI Polish (COMPLETE)
**Status**: Complete  

- Number input spinners removed
- Select component styling consistency
- Mobile drawer scroll prevention
- Theme switch improvements
- Component cleanup

---

### 🔄 Phase 11: Backend Modernization (IN PROGRESS)
**Status**: HIGH Priority Complete (7/17 tasks)  
**Started**: December 11, 2025  
**Target**: Complete MEDIUM priority by December 20, 2025

**CRITICAL Security (3/3 complete)**:
- ✅ SQL injection fix
- ✅ Database transactions
- ✅ Connection pool optimization

**HIGH Priority (4/4 complete)**:
- ✅ N+1 query performance fix
- ✅ Structured logging migration
- ✅ Database performance indexes
- ✅ Scheduler error handling

**MEDIUM Priority (0/10 pending)**:
- Bulk database operations
- sea-orm 1.1 patterns
- tokio-cron-scheduler 0.15 API
- Encryption security enhancements
- HTTP client patterns
- Tauri command audit
- Enhanced tracing
- thiserror 2.0 patterns
- Query column optimization

---

### ⏳ Phase 12: System Mode Backend Integration (PENDING)
**Status**: Not Started  
**Target**: January 2026

Wire up all System mode views to Tauri backend:

#### Settings View
- Get/update app settings commands
- API key encryption/decryption
- Settings persistence

#### Storage View
- Storage stats calculation
- Backup/restore operations
- Database export/import
- Old data cleanup

#### Logs View
- Log file reading with filters
- Log export functionality
- Log truncation
- Real-time log streaming

#### Tasks View
- Scheduled tasks management
- Task history queries
- Manual task triggering
- Task enable/disable

---

### ⏳ Phase 13: Frontend Modernization (PENDING)
**Status**: Phase 1/5 Complete  
**Target**: January-February 2026

**Phase 1**: ✅ Package cleanup (13 removed, 8 updated)  
**Phase 2**: Vite 7 upgrade (security fix)  
**Phase 3**: tailwind-merge & sonner updates  
**Phase 4**: Code modularization & bundle optimization  
**Phase 5**: Tailwind v4 (Q2 2026 - wait for stable)

---

### ⏳ Phase 14: Testing Infrastructure (Q1 2026)
**Status**: Not Started

- Unit tests for backend commands
- Integration tests for Tauri IPC
- Component tests for critical UI
- E2E tests for core workflows
- CI/CD pipeline setup

---

### ⏳ Phase 15: Production Readiness (Q1 2026)
**Status**: Not Started

#### First-Run Experience
- **Directory initialization**: Create `~/.cockpit/` on first launch
  - `~/.cockpit/data/` - Database and user data
  - `~/.cockpit/logs/` - Application logs
  - `~/.cockpit/cache/` - Temporary cache files
  - `~/.cockpit/backups/` - Database backups
  - `~/.cockpit/exports/` - Exported data
- **Configuration wizard**: Guide user through initial setup
  - API key input (NewsData, etc.)
  - Generate secure master key
  - Configure storage limits
  - Set logging preferences
- **Default settings**: Populate sensible defaults
- **Migration path**: Import existing data from dev installation

#### Distribution & Updates
- Installation wizard
- Auto-update mechanism
- Platform-specific installers (AppImage, .deb, .dmg, .exe)
- Sandboxed permissions for system access

#### Monitoring & Quality
- Error reporting/telemetry (opt-in)
- Performance monitoring
- Crash reporting
- Security audit
- Documentation completion

---

### ⏳ Phase 16: Modular Component Architecture (Q1-Q2 2026)
**Status**: Planning Phase
**Goal**: True drop-in component system for maximum modularity

#### Phase 1: File-Level Refactoring (December 2025) 🔴
**Current**: Split large monolithic files into focused modules

**Targets**:
- `core/components/storage.rs` (1467 lines) → 5 modules (stats, backup, cleanup, logs, export)
- `research/components/feed.rs` (~1200 lines) → 3 modules (sync, fetch, parser)
- Apply pattern across all domains

**Structure**:
```
domain/components/feature/
├── mod.rs           # Public API + re-exports
├── types.rs         # Structs, enums
├── queries.rs       # Read operations
└── mutations.rs     # Write operations
```

#### Phase 2: Component Trait Foundation (January 2026)
**Goal**: Create plugin interface alongside existing code (coexist, don't replace)

**New Infrastructure**:
```
core/component/
├── mod.rs           # DomainComponent trait
├── registry.rs      # Component registration system
├── migration.rs     # Component-based DB migrations
├── settings.rs      # Component settings schema
├── command.rs       # Auto-command registration
└── task.rs          # Auto-task scheduling
```

**Component Interface**:
```rust
pub trait DomainComponent: Send + Sync {
    fn info(&self) -> ComponentInfo;
    fn migrations(&self) -> Vec<Migration>;
    fn settings_schema(&self) -> Option<SettingsSchema>;
    fn commands(&self) -> Vec<Command>;
    fn tasks(&self) -> Vec<ScheduledTask>;
    async fn initialize(&self, state: &AppState) -> Result<()>;
}
```

#### Phase 3: Domain Migration (February-March 2026)
**Goal**: Migrate existing domains to new plugin system one-by-one

**Migration Order**:
1. **util** (smallest, easiest test case)
2. **system** (scheduler already isolated)
3. **writing** (simple domain, clear boundaries)
4. **research** (most complex, do last)

#### Phase 4: Plugin Developer Experience (Q2 2026)
**Goal**: Make adding new components trivial

**One-Line Registration**:
```rust
// main.rs
let registry = ComponentRegistry::new()
    .register(CoreComponent)
    .register(WritingComponent)
    .register(ResearchComponent)  // <-- Drop in new component
    .register(SystemComponent);

// Auto-wires:
// ✅ Database migrations
// ✅ Settings schema
// ✅ Tauri commands
// ✅ Scheduled tasks
// ✅ Logging context
```

**Component Structure**:
```
my_component/
├── Cargo.toml           # Standalone crate
├── src/
│   ├── lib.rs           # Implements DomainComponent
│   ├── commands.rs      # Tauri command handlers
│   ├── models/          # Database models
│   └── migrations/      # SQL migration files
└── settings.toml        # Settings schema definition
```

**Benefits**:
- ✅ **True modularity**: Add/remove features without touching core
- ✅ **Parallel development**: Teams work on separate components
- ✅ **Testable**: Components isolated, easy to unit test
- ✅ **Marketplace potential**: Community-contributed components
- ✅ **Django-like migrations**: Auto-detection, auto-numbering (future)
- ✅ **Hot reload**: Swap components without restart (future)

---

## Long-Term Vision

### Q2 2026: Enhanced Features
- Document templates
- Version history
- AI-powered summarization
- Multi-source news aggregation
- Reading queue with priorities
- Content recommendation engine

### Q3 2026: Collaboration
- Comments and suggestions
- Shared workspaces
- Real-time collaboration
- Cloud sync

### Q4 2026: Platform Expansion
- macOS build
- Windows build
- Mobile apps (iOS/Android via Tauri Mobile)

### 2027: Advanced Features
- **Plugin marketplace**: Community-contributed components via modular architecture
- **Django-like migrations**: Auto-detect model changes, generate migration files
- **Component hot-reload**: Swap plugins without restart
- Command palette (⌘K)
- Global search
- Multi-window support
- System tray integration
- Cloud storage integration

---

## Success Metrics

### Performance Targets
- Initial load: < 2s
- Bundle size: < 300KB gzipped
- Database queries: < 50ms (p95)
- News sync: < 5s for 100 articles

### Quality Targets
- Test coverage: > 80%
- Zero critical security issues
- < 5 known bugs at any time
- Documentation: 100% of public APIs

### User Experience Targets
- Smooth 60fps animations
- Offline-first capabilities
- Keyboard navigation for all actions
- Accessible (WCAG 2.1 AA)

---

## Technology Evolution

### Current Stack
- **Frontend**: React 19, Vite 5, Tailwind 3, TanStack Query 5
- **Backend**: Rust, Tauri 2, SeaORM 1.1, SQLite
- **Build**: Cargo, npm

### Planned Upgrades
- Vite 7 (Q1 2026)
- Tailwind 4 (Q2 2026)
- TypeScript strict mode (Q1 2026)

### Future Considerations
- Rust WASM components
- Service workers for offline
- IndexedDB for client-side caching
- WebGPU for visualizations

---

## Risk Management

### Technical Risks
- **Tauri API changes**: Monitor releases, test beta versions
- **Database migrations**: Always reversible, tested on backups
- **Bundle size growth**: Regular audits, code splitting
- **Performance regression**: Automated benchmarks in CI

### Product Risks
- **Feature creep**: Stick to roadmap, defer nice-to-haves
- **Breaking changes**: Semantic versioning, migration guides
- **User data loss**: Automated backups, export functionality
- **Security vulnerabilities**: Regular audits, dependency updates

---

## Release Strategy

### Version Numbering
- **MAJOR**: Breaking changes, major features (1.0, 2.0)
- **MINOR**: New features, non-breaking changes (1.1, 1.2)
- **PATCH**: Bug fixes, performance improvements (1.1.1, 1.1.2)

### Release Cycle
- **Weekly**: Patch releases (bug fixes)
- **Monthly**: Minor releases (new features)
- **Quarterly**: Major releases (breaking changes)

### Pre-Release Versions
- **Alpha**: Internal testing
- **Beta**: Early adopter testing
- **RC**: Release candidate (final testing)

---

**Roadmap Last Updated**: December 12, 2025  
**Next Review**: January 1, 2026
