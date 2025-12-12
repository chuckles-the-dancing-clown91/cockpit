# Cockpit TODO

Current development roadmap and task tracking.

## 🎯 Current Priority: Backend Integration

### Phase 11: System Mode Backend Integration

Wire up all System mode views to Tauri backend commands.

#### Settings View
- [ ] Create `get_app_settings` command
  - [ ] Return AppSettings struct with all config
  - [ ] Load from database/config file
- [ ] Create `update_app_settings` command
  - [ ] Validate settings
  - [ ] Persist to database/config
  - [ ] Handle API key encryption/decryption
- [ ] Wire up frontend SettingsView to use commands
- [ ] Test settings persistence across app restarts

#### Storage View
- [ ] Create `get_storage_stats` command
  - [ ] Calculate total DB size
  - [ ] Get size per table
  - [ ] Get record counts
- [ ] Create `create_backup` command
  - [ ] Copy DB to backups folder
  - [ ] Generate timestamped filename
  - [ ] Return backup metadata
- [ ] Create `get_backups` command
  - [ ] List all backup files
  - [ ] Include size and date info
- [ ] Create `restore_backup` command
  - [ ] Replace current DB with backup
  - [ ] Require confirmation
- [ ] Create `delete_backup` command
  - [ ] Remove backup file
  - [ ] Return success/error
- [ ] Create `export_database` command
  - [ ] Export full DB or filtered by date range
  - [ ] Save to exports folder
- [ ] Create `import_database` command
  - [ ] Merge imported data
  - [ ] Handle conflicts
- [ ] Create `cleanup_old_data` command
  - [ ] Delete articles older than threshold
  - [ ] Delete archived content
  - [ ] Clean up task run history
- [ ] Wire up frontend StorageView to use commands
- [ ] Test all storage operations

#### Logs View
- [ ] Create `get_logs` command
  - [ ] Read from log files
  - [ ] Filter by level, module, date range
  - [ ] Support text search
  - [ ] Paginate results
- [ ] Create `export_logs` command
  - [ ] Export filtered logs to file
  - [ ] Support multiple formats (txt, json)
- [ ] Create `truncate_logs` command
  - [ ] Clear all log files
  - [ ] Require confirmation
- [ ] Create `get_log_stats` command
  - [ ] Total log file size
  - [ ] Line counts by level
  - [ ] Oldest/newest entries
- [ ] (Optional) Create `stream_logs` event
  - [ ] Real-time log updates to frontend
  - [ ] Use Tauri event system
- [ ] Wire up frontend LogsView to use commands
- [ ] Test log filtering and export

#### Tasks View
- [ ] Create `get_scheduled_tasks` command
  - [ ] Return all task definitions
  - [ ] Include schedule, status, metadata
- [ ] Create `get_task_history` command
  - [ ] Query system_task_runs table
  - [ ] Filter by task_id, date range
  - [ ] Include success/error info
- [ ] Create `run_task_now` command
  - [ ] Manually trigger task execution
  - [ ] Record to task_runs table
  - [ ] Return execution result
- [ ] Create `toggle_task` command
  - [ ] Enable/disable task
  - [ ] Update scheduler
- [ ] Create `get_task_status` command
  - [ ] Check if task is currently running
  - [ ] Return last run info
- [ ] Wire up frontend TasksView to use commands
- [ ] Test manual task triggering

---

## 🔮 Future Enhancements

### Writing Mode
- [ ] Add document templates (blog post, newsletter, notes)
- [ ] Implement version history for documents
- [ ] Add collaboration features (comments, suggestions)
- [ ] Export to PDF, HTML, Markdown
- [ ] Spellcheck and grammar checking integration
- [ ] Word goal tracking and progress charts

### Research Mode
- [ ] Add more news sources (RSS, custom APIs)
- [ ] Implement article tagging and categorization
- [ ] Create reading queue with priority
- [ ] Add article summarization (AI integration)
- [ ] Implement search across all articles
- [ ] Add Reddit post scheduling
- [ ] Create content recommendation engine

### System Mode
- [ ] Add plugin/extension system
- [ ] Implement data sync across devices
- [ ] Add performance monitoring dashboard
- [ ] Create automated backup to cloud storage
- [ ] Implement audit log for all actions
- [ ] Add system health checks

### Cross-Cutting
- [ ] Command palette (⌘K) for quick navigation
- [ ] Global search across all content
- [ ] Keyboard shortcut customization
- [ ] Dark mode per-view (not just global)
- [ ] Export/import full app configuration
- [ ] Multi-window support
- [ ] System tray integration
- [ ] Auto-updates

---

## 🐛 Known Issues

- [ ] Number input spinners removed but type="number" validation could be improved
- [ ] Mobile drawer doesn't prevent scroll on body when open
- [ ] Theme switch animation could be smoother
- [ ] Select dropdowns need min-width enforcement on small content

---

## 🧹 Technical Debt

### Code Cleanup
- [ ] Remove deprecated files in `frontend/src/views/` (CalendarView, FilesView, DashboardView, RedditView)
- [ ] Remove old markdown files (NAVIGATION_REFACTOR.md, REFACTORING_LOG.md, etc.)
- [ ] Remove unused imports across codebase
- [ ] Consolidate duplicate styles
- [ ] Extract magic numbers to constants

### Testing
- [ ] Add unit tests for backend commands
- [ ] Add integration tests for Tauri IPC
- [ ] Add component tests for critical UI
- [ ] Add E2E tests for core workflows
- [ ] Set up CI/CD pipeline

### Documentation
- [ ] Add JSDoc comments to complex functions
- [ ] Document all Tauri commands
- [ ] Create architecture decision records (ADRs)
- [ ] Add inline code examples
- [ ] Create video walkthrough

### Performance
- [ ] Implement code splitting for faster initial load
- [ ] Lazy load non-critical components
- [ ] Optimize bundle size (currently 525 kB)
- [ ] Add service worker for offline support
- [ ] Implement virtual scrolling for large lists

---

## 📊 Metrics

### Current Status
- **UI Complete**: 100% (Phases 1-9 done)
- **Backend Integration**: 0% (Phase 11 pending)
- **Test Coverage**: 0%
- **Documentation**: 60%

### Build Stats
- **Frontend Bundle**: 525.83 kB (gzipped: 151.90 kB)
- **Modules**: 1749
- **Build Time**: ~5 seconds
- **Backend Binary**: ~10 MB

---

## 🎨 Design System

Future improvements to standardize UI:
- [ ] Create comprehensive component library documentation
- [ ] Standardize spacing scale (currently ad-hoc)
- [ ] Create animation guidelines
- [ ] Document color palette usage
- [ ] Create icon system documentation
- [ ] Standardize form validation patterns

---

## 📱 Platform Support

Current: Linux ✅

Future:
- [ ] macOS build testing
- [ ] Windows build testing
- [ ] iOS/Android (via Tauri Mobile - future)

---

## 🔒 Security

- [ ] Audit API key encryption implementation
- [ ] Add rate limiting to Tauri commands
- [ ] Implement CSP (Content Security Policy)
- [ ] Add input sanitization for all user inputs
- [ ] Security audit of dependencies
- [ ] Implement secure update mechanism

---

## 📝 Notes

### Development Philosophy
- Focus on stability before features
- Keep codebase maintainable
- Document architectural decisions
- Test critical paths thoroughly
- Optimize for developer experience

### Version Strategy
- Semantic versioning (MAJOR.MINOR.PATCH)
- Keep changelog updated
- Tag releases in git
- Create release notes

---

**Last Updated**: December 11, 2024
**Current Phase**: Phase 11 - Backend Integration
**Next Milestone**: System Mode fully functional with backend
