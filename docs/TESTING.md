# SIMBL Human-in-the-Loop Testing Guide

This guide walks through manual testing of SIMBL's features.

## Prerequisites

```bash
cd /path/to/simbl
bun install
```

## Test Environment Setup

Create a fresh test directory:

```bash
mkdir /tmp/simbl-test && cd /tmp/simbl-test
```

Run commands using:
```bash
bun run /path/to/simbl/src/index.ts <command>
# Or if installed:
simbl <command>
```

---

## Test Cases

### 1. Initialization

```bash
# Test: Initialize SIMBL
simbl init

# Expected:
# - Creates .simbl/ directory
# - Creates .simbl/config.yaml with prefix: "task"
# - Creates .simbl/tasks.md with Backlog and Done sections
# - Prompts about CLAUDE.md integration
```

**Verify:**
- [ ] `.simbl/config.yaml` exists with `prefix: "task"`
- [ ] `.simbl/tasks.md` has `# Backlog` and `# Done` headings
- [ ] `.simbl/tasks-archive.md` exists (empty)

---

### 2. Adding Tasks

```bash
# Basic add
simbl add "Test task one"

# With priority
simbl add "Urgent task" -p 1

# With project
simbl add "Feature work" --project auth

# With tags
simbl add "Tagged task" -t "[p2][design]"

# With content
simbl add "Task with details" -c "This is the description"
```

**Verify:**
- [ ] Each task gets incrementing ID (task-1, task-2, ...)
- [ ] Priority tags appear as `[p1]`, `[p2]`, etc.
- [ ] Project tags appear as `[project:auth]`
- [ ] Content appears under task heading

---

### 3. Listing Tasks

```bash
# Default (brief)
simbl list

# Full content
simbl list --full

# IDs only
simbl list --ids

# Filter by tag
simbl list --tag p1

# Filter by project
simbl list --project auth

# Search
simbl list --search "urgent"

# JSON output
simbl list --json
```

**Verify:**
- [ ] Default output is one line per task
- [ ] `--full` shows complete task content
- [ ] `--ids` shows only task IDs
- [ ] Filters work correctly
- [ ] JSON is valid and parseable

---

### 4. Showing Single Task

```bash
simbl show task-1
simbl show task-1 --json
```

**Verify:**
- [ ] Shows full task details
- [ ] Displays tags, status, relationships
- [ ] JSON output works

---

### 5. Task Modification

```bash
# Update title
simbl update task-1 --title "New title"

# Update content
simbl update task-1 --content "New description"

# Append content
simbl update task-1 --append "Additional notes"

# Add tag
simbl tag add task-1 urgent

# Remove tag
simbl tag remove task-1 urgent

# Mark done
simbl done task-1

# Cancel task
simbl cancel task-2
```

**Verify:**
- [ ] Title updates correctly
- [ ] Content replaces or appends
- [ ] Tags add/remove correctly
- [ ] Done moves task to Done section
- [ ] Cancel adds `[canceled]` tag

---

### 6. Relationships

```bash
# Create parent-child
simbl relate task-3 --parent task-1

# Create dependency
simbl relate task-4 --depends-on task-1

# Try circular dependency (should fail)
simbl relate task-1 --parent task-3

# Remove relationships
simbl unrelate task-3 --parent
simbl unrelate task-4 --depends-on task-1
```

**Verify:**
- [ ] `[child-of-task-1]` tag appears
- [ ] `[depends-on-task-1]` tag appears
- [ ] Circular dependency is rejected
- [ ] Unrelate removes tags

---

### 7. Doctor Validation

```bash
simbl doctor
simbl doctor --json
```

**Verify:**
- [ ] Reports no issues on valid file
- [ ] Detects duplicate IDs
- [ ] Detects missing parent references
- [ ] Detects circular dependencies
- [ ] JSON output works

---

### 8. Interactive TUI

```bash
# Launch TUI
simbl
```

**Test each menu option:**
- [ ] View backlog - shows task list
- [ ] Add task - prompts for title and priority
- [ ] Mark task done - shows selectable list
- [ ] Archive completed tasks - multi-select works
- [ ] Run doctor - shows validation results
- [ ] Quit - exits cleanly

---

### 9. Archive Flow

```bash
# First, mark some tasks as done
simbl done task-1
simbl done task-2

# Launch TUI and select "Archive completed tasks"
simbl

# Or manually verify archive file
cat .simbl/tasks-archive.md
```

**Verify:**
- [ ] Multi-select shows done tasks
- [ ] Selected tasks move to tasks-archive.md
- [ ] Removed from tasks.md Done section

---

### 10. Compiled Binary

```bash
# Build
cd /path/to/simbl
bun run build

# Test binary
./dist/simbl list
./dist/simbl add "Binary test"
./dist/simbl
```

**Verify:**
- [ ] Binary runs without Bun installed
- [ ] All commands work same as dev mode
- [ ] TUI works correctly

---

## Edge Cases

- [ ] Empty backlog handling
- [ ] Empty done section handling
- [ ] Very long task titles
- [ ] Special characters in titles
- [ ] Unicode in content
- [ ] Large number of tasks (50+)
- [ ] Malformed tasks.md recovery

## Cleanup

```bash
rm -rf /tmp/simbl-test
```
