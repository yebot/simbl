import { defineCommand } from 'citty';

const USAGE_TEXT = `
SIMBL - Simple Backlog
A CLI task manager for dev projects.

COMMANDS

  simbl                     Launch interactive TUI menu
  simbl init                Initialize SIMBL in current directory
  simbl add <title>         Add a new task to backlog
  simbl list                List all tasks (brief by default)
  simbl show <id>           Show a single task's full details
  simbl done <id>           Move task to Done section
  simbl cancel <id>         Mark task as canceled
  simbl tag add <id> <tag>  Add tag to task
  simbl tag remove <id> <tag>  Remove tag from task
  simbl update <id>         Update task title or content
  simbl relate <id>         Create task relationships
  simbl unrelate <id>       Remove task relationships
  simbl serve               Start web UI (HTMX-powered browser interface)
  simbl doctor              Validate tasks.md structure
  simbl usage               Show this help

  Tip: Run any command with --help for detailed options.

INITIALIZATION

  simbl init                            # interactive setup
  simbl init -n "MyProject" -p "smb"    # with name and prefix
  simbl init --port 8080                # with custom web UI port

  Flags: -n/--name (project name), -p/--prefix (task ID prefix), --port (web UI port)

ADDING TASKS

  simbl add "Fix login bug"
  simbl add "Add dark mode" -p 1                    # priority (1-9)
  simbl add "Auth feature" -t "[p2][design]"        # with tags
  simbl add "New feature" --project auth            # with project
  simbl add "Task" -c "Description here"            # with content
  simbl add "Task" --json                           # output as JSON

  Flags: -p/--priority, -t/--tags, -c/--content, --project, --json

VIEWING TASKS

  simbl show <id>                   # show full task details
  simbl show <id> --json            # output as JSON

  simbl list                        # brief output (one line per task)
  simbl list -f                     # show all content (--full)
  simbl list --ids                  # show only task IDs
  simbl list -t p1                  # filter by tag (--tag)
  simbl list -p auth                # filter by project (--project)
  simbl list -s login               # search in title/content (--search)
  simbl list --status in-progress   # filter by status
  simbl list --json                 # output as JSON

  Status values: backlog, in-progress, done, canceled

TASK MODIFICATION

  simbl done <id>                   # move task to Done section
  simbl done <id> --json            # output updated task as JSON

  simbl cancel <id>                 # add [canceled] tag
  simbl cancel <id> --json          # output updated task as JSON

  simbl tag add <id> <tag>          # add tag to task
  simbl tag add <id> <tag> --json   # output updated task as JSON

  simbl tag remove <id> <tag>       # remove tag from task
  simbl tag remove <id> <tag> --json  # output updated task as JSON

  simbl update <id> -t "New title"  # update title (-t/--title)
  simbl update <id> -c "Content"    # replace content (-c/--content)
  simbl update <id> -a "More info"  # append content (-a/--append)
  simbl update <id> --json          # output updated task as JSON

RELATIONSHIPS

  simbl relate <id> --parent <parent-id>        # set parent task
  simbl relate <id> --parent <parent-id> --json  # output as JSON

  simbl relate <id> --depends-on <dep-id>       # add dependency
  simbl relate <id> --depends-on <dep-id> --json  # output as JSON

  simbl unrelate <id> --parent                  # remove parent
  simbl unrelate <id> --parent --json           # output as JSON

  simbl unrelate <id> --depends-on <dep-id>     # remove dependency
  simbl unrelate <id> --depends-on <dep-id> --json  # output as JSON

  Note: Circular dependencies are automatically detected and prevented.
  Note: Use flag syntax (--parent, --depends-on), not positional args.

WEB UI

  simbl serve                       # start server on port 3497
  simbl serve -o                    # start and open browser
  simbl serve -p 8080               # use custom port

COMMON WORKFLOWS

  # Create a task with full details
  simbl add "Implement auth" -p 1 --project auth -c "Add OAuth2 login flow"

  # Create related tasks
  simbl add "Parent epic" -p 1
  simbl add "Subtask" && simbl relate smb-2 --parent smb-1

  # Refine a task (add details, update content)
  simbl show smb-1                          # review current state
  simbl update smb-1 -a "## Acceptance Criteria..."  # append criteria
  simbl tag add smb-1 refined               # mark as refined
  simbl tag remove smb-1 needs-refinement   # remove old tag

  # Find and update tasks
  simbl list -s "auth" --status backlog     # find auth tasks
  simbl list -t p1 --json | jq '.[]'        # parse with jq

TAG REFERENCE

  Priority:     [p1] [p2] [p3] ... [p9]   (p1 is highest)
  Status:       [in-progress] [canceled] [refined]
  Project:      [project:name]
  Hierarchy:    [child-of-<id>]
  Dependency:   [depends-on-<id>]
  Custom:       [any-tag-you-want]

FILE STRUCTURE

  .simbl/
    config.yaml         Configuration (task ID prefix, etc.)
    tasks.md            Active tasks (Backlog + Done sections)
    tasks-archive.md    Archived completed tasks

TASK FORMAT IN MARKDOWN

  # Backlog

  ## task-1 Task title here

  [p1][project:auth]

  ### Description

  Task content with **markdown** support.

  # Done

  ## task-2 Completed task

  [p2]
`;

export const usageCommand = defineCommand({
  meta: {
    name: 'usage',
    description: 'Show detailed usage information',
  },
  args: {},
  async run() {
    console.log(USAGE_TEXT.trim());
  },
});
