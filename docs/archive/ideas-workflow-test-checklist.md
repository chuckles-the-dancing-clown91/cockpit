# Ideas Workflow - Test Checklist

## ✅ Pre-Test Setup
- [ ] Backend compiled successfully
- [ ] Frontend built successfully
- [ ] Migration 005 applied (check logs for "Migration 5 (idea_references) already applied")
- [ ] App running in dev mode (`cargo tauri dev`)
- [ ] Navigate to Writing mode

---

## 🧪 Test Scenarios

### 1. Create New Idea via Dialog ✅

**Steps**:
1. Navigate to Ideas Library
2. Click "New Idea" button (top right)
3. Verify NewIdeaDialog opens with form

**Test Cases**:
- [ ] Dialog opens centered on screen
- [ ] All form fields visible: Title, Summary, Status, Priority, Target
- [ ] Status dropdown defaults to "In Progress"
- [ ] Priority dropdown defaults to "Low" (0)
- [ ] Click "Create Idea" without title → Toast error "Title is required"
- [ ] Enter title "Test Idea", leave others empty
- [ ] Click "Create Idea" → Success toast
- [ ] Dialog closes automatically
- [ ] New idea appears in Ideas Library
- [ ] (Optional) Navigates to editor view

**Expected Result**: Idea created with title only, appears in library

---

### 2. Edit Existing Idea via Detail Modal ✅

**Steps**:
1. In Ideas Library, click any existing idea card
2. Verify IdeaDetailModal opens with 3 tabs

**Test Cases**:
- [ ] Modal opens centered with idea data loaded
- [ ] Title pre-filled with existing value
- [ ] Summary, Status, Priority, Target all pre-filled
- [ ] Three tabs visible: Details, Notes, References

**Details Tab**:
- [ ] Edit title to "Updated Test Idea"
- [ ] Change status to "Stalled"
- [ ] Change priority to "High"
- [ ] Add target audience "Developers"
- [ ] Click "Save Details" → Success toast
- [ ] Close modal, reopen same idea
- [ ] Verify all changes persisted

**Notes Tab**:
- [ ] Click "Notes" tab
- [ ] See full-height textarea
- [ ] Type markdown notes: "# Research Notes\n\nThis is a test."
- [ ] Click "Save Notes" → Success toast
- [ ] Close modal, reopen same idea
- [ ] Switch to Notes tab, verify content persisted

**Expected Result**: All edits save to database and persist across sessions

---

### 3. Add Manual URL Reference ✅

**Steps**:
1. Open idea in IdeaDetailModal
2. Go to "References" tab
3. Click "Add Reference" button

**Test Cases**:
- [ ] AddReferenceDialog opens
- [ ] Two tabs visible: "Manual URL" and "From Feed"
- [ ] "Manual URL" tab active by default
- [ ] Form shows: Title, URL, Description fields
- [ ] Click "Add Reference" without filling → Validation error
- [ ] Fill Title: "Example Article"
- [ ] Fill URL: "https://example.com/article"
- [ ] Leave Description empty
- [ ] Click "Add Reference" → Success toast
- [ ] Dialog closes
- [ ] Reference appears in list immediately (no page refresh)
- [ ] Reference shows:
  - Title "Example Article"
  - Type badge "manual"
  - Today's date
  - Three icons: Eye, External link, Trash

**Expected Result**: Reference created and displays in list

---

### 4. View Reference in Article Modal ✅

**Steps**:
1. In References tab, find reference with URL
2. Click Eye icon (👁️)

**Test Cases**:
- [ ] ArticleModal opens
- [ ] Webview loads the URL
- [ ] Article content displays
- [ ] Modal has close button (X)
- [ ] Can scroll article content
- [ ] Close modal with X or Escape

**Expected Result**: Article loads in embedded webview

---

### 5. Open Reference in Browser ✅

**Steps**:
1. In References tab, find reference
2. Click External link icon (🔗)

**Test Cases**:
- [ ] Default browser opens
- [ ] Correct URL loads in new tab/window
- [ ] App remains open (not blocked)

**Expected Result**: URL opens in system default browser

---

### 6. Delete Reference ✅

**Steps**:
1. In References tab, find reference to delete
2. Click Trash icon (🗑️)

**Test Cases**:
- [ ] ConfirmDialog appears
- [ ] Dialog shows "Remove Reference" title
- [ ] Description warns action cannot be undone
- [ ] Two buttons: "Cancel" and "Remove"
- [ ] Click "Cancel" → Dialog closes, reference still there
- [ ] Click Trash again, then "Remove"
- [ ] Success toast appears
- [ ] Reference disappears from list immediately
- [ ] Close and reopen modal, verify reference still gone

**Expected Result**: Reference deleted from database, UI updates

---

### 7. Delete Idea with References (CASCADE) ✅

**Steps**:
1. Create idea with 2-3 references
2. Go back to Ideas Library
3. Hover over idea card, click Delete (🗑️)

**Test Cases**:
- [ ] ConfirmDialog appears
- [ ] Dialog shows "Delete Idea" title
- [ ] Click "Cancel" → Idea still there
- [ ] Click Delete again, then "Delete"
- [ ] Success toast appears
- [ ] Idea removed from library
- [ ] Reload app, idea still gone
- [ ] Check database (manually): References also deleted (CASCADE)

**Expected Result**: Idea and all its references deleted

---

### 8. Empty States ✅

**References Tab - No References**:
- [ ] Open idea with 0 references
- [ ] Go to References tab
- [ ] See message: "No references yet"
- [ ] See subtext: "Add articles or URLs to support your idea"
- [ ] "Add Reference" button still visible

**Ideas Library - No Ideas**:
- [ ] Delete all ideas
- [ ] See message: "No ideas yet. Create your first one!"

**Ideas Library - No Filter Matches**:
- [ ] Create ideas with different statuses
- [ ] Set Status filter to "Complete"
- [ ] If no complete ideas, see: "No ideas match your filters"

**Expected Result**: Clear empty states guide user

---

### 9. Validation & Error Handling ✅

**NewIdeaDialog Validation**:
- [ ] Empty title → Error toast
- [ ] Whitespace-only title → Error toast
- [ ] Title with spaces " Test " → Trims and accepts

**AddReferenceDialog Validation**:
- [ ] Empty title → Error toast
- [ ] Empty URL → Error toast
- [ ] Invalid URL format "not-a-url" → Should validate (check backend logs)

**Network Errors**:
- [ ] Stop backend (Ctrl+C)
- [ ] Try to create idea → Error toast with message
- [ ] Try to load idea → Loading state, then error

**Expected Result**: All errors handled gracefully with user feedback

---

### 10. Multiple Ideas Workflow ✅

**Full User Journey**:
1. [ ] Create 3 new ideas with different priorities
2. [ ] Open first idea, add 2 references
3. [ ] Switch to Notes tab, add some notes
4. [ ] Go back to library (close modal)
5. [ ] Open second idea, add 1 reference
6. [ ] Open third idea, add notes but no references
7. [ ] Filter ideas by "High" priority
8. [ ] Click high-priority idea, edit title
9. [ ] Delete one idea with references
10. [ ] Close app, reopen, verify all data persisted

**Expected Result**: Smooth workflow with no data loss

---

### 11. UI/UX Polish ✅

**Dialog Behavior**:
- [ ] Escape key closes any dialog
- [ ] Click overlay (dark area) closes dialog
- [ ] Can't click through dialog to background
- [ ] Dialog properly centered on all screen sizes

**Button States**:
- [ ] "Save Details" button shows loading state during save
- [ ] "Add Reference" button disabled during creation
- [ ] All buttons have hover effects

**Toast Notifications**:
- [ ] Success toasts are green with checkmark
- [ ] Error toasts are red with X
- [ ] Toasts auto-dismiss after 3-5 seconds
- [ ] Multiple toasts stack vertically

**Theme Consistency**:
- [ ] All dialogs use same color scheme
- [ ] Borders consistent (var(--color-border))
- [ ] Text colors match theme (primary/soft/muted)
- [ ] Shadows appropriate (card-elevated)

**Expected Result**: Professional, consistent UI

---

### 12. Performance & Responsiveness ✅

**Loading States**:
- [ ] IdeaDetailModal shows "Loading..." while fetching idea
- [ ] References load without blocking modal open
- [ ] No flash of empty content

**Query Invalidation**:
- [ ] Create idea → Library updates immediately
- [ ] Edit idea → Changes reflect in card without reload
- [ ] Add reference → Count in tab updates "(3)"
- [ ] Delete reference → List updates without refresh

**Large Data**:
- [ ] Create idea with 20+ references
- [ ] References tab scrolls smoothly
- [ ] Modal remains responsive

**Expected Result**: Snappy UI with no noticeable lag

---

### 13. Edge Cases ✅

**Long Text**:
- [ ] Create idea with 500-word summary
- [ ] Add reference with very long URL
- [ ] Verify text doesn't break layout
- [ ] Verify text truncates in cards with ellipsis

**Special Characters**:
- [ ] Title with emoji: "Test 🚀 Idea"
- [ ] URL with query params: "https://example.com?q=test&lang=en"
- [ ] Notes with markdown formatting

**Rapid Clicking**:
- [ ] Click "Create Idea" multiple times rapidly
- [ ] Should only create one idea (mutation handling)
- [ ] No duplicate toasts

**Concurrent Edits**:
- [ ] Open two IdeaDetailModals (if possible)
- [ ] Edit same idea in both
- [ ] Last save wins (expected behavior)

**Expected Result**: Handles edge cases gracefully

---

## 🐛 Known Issues (Document, Don't Fail)

### Article Viewer Context Menu
- **Status**: Partial - Menu displays but IPC not working yet
- **Test**: Right-click with text selected in article
- **Expected**: Menu shows "Add to Notes" option
- **Current**: Menu shows but command doesn't fire
- **Action**: Document in test results, don't mark as blocker

### "From Feed" Tab
- **Status**: Placeholder UI, not implemented
- **Test**: Click "From Feed" tab in AddReferenceDialog
- **Expected**: Shows article picker (future)
- **Current**: Empty state message
- **Action**: Mark as "Not Implemented" in notes

### Reference Notes Editing
- **Status**: Backend ready, UI not built
- **Test**: Try to edit notes on a reference
- **Expected**: Textarea or editor (future)
- **Current**: No UI element exists
- **Action**: Mark as "Backend Complete, UI Pending"

---

## ✅ Test Results Summary

### Passing Tests
- [ ] New Idea Dialog (5/5 tests)
- [ ] Idea Detail Modal (10/10 tests)
- [ ] Add Reference (7/7 tests)
- [ ] View Reference (4/4 tests)
- [ ] Delete Reference (6/6 tests)
- [ ] Delete Idea CASCADE (5/5 tests)
- [ ] Empty States (3/3 tests)
- [ ] Validation (6/6 tests)
- [ ] Full Workflow (10/10 tests)
- [ ] UI/UX Polish (8/8 tests)
- [ ] Performance (6/6 tests)
- [ ] Edge Cases (8/8 tests)

**Total**: ___ / 78 tests passing

### Blockers
(List any critical failures that prevent usage)

### Minor Issues
(List any non-critical bugs or polish items)

### Nice-to-Haves
(List any enhancement ideas discovered during testing)

---

## 📝 Notes

### Testing Environment
- **OS**: 
- **Browser Version** (for ArticleModal): 
- **Backend Version**: 
- **Frontend Build**: 
- **Database Size**: 
- **Number of Ideas**: 
- **Number of References**: 

### Performance Metrics
- **Time to create idea**: 
- **Time to load IdeaDetailModal**: 
- **Time to add reference**: 
- **Time to delete reference**: 

### User Feedback
(Notes from actual usage, not just checklist)

---

## 🎯 Final Sign-Off

- [ ] All critical features working
- [ ] No data loss issues
- [ ] UI/UX acceptable for production
- [ ] Documentation complete
- [ ] Known issues documented
- [ ] Ready for user testing

**Tester Name**: ___________________
**Date**: ___________________
**Overall Assessment**: ⭐⭐⭐⭐⭐ (1-5 stars)

**Comments**:
