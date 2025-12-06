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
  simbl usage               Show this help
  simbl doctor              Validate tasks.md structure

ADDING TASKS

  simbl add "Fix login bug"
  simbl add "Add dark mode" -p 1                    # priority 1
  simbl add "Auth feature" -t "[p2][design]"        # with tags
  simbl add "New feature" --project auth            # with project
  simbl add "Task" -c "Description here"            # with content

LISTING TASKS

  simbl list                        # brief output (one line per task)
  simbl list --full                 # show all content
  simbl list --ids                  # show only task IDs
  simbl list --tag p1               # filter by tag
  simbl list --project auth         # filter by project
  simbl list --search login         # search in title/content
  simbl list --status in-progress   # filter by status
  simbl list --json                 # output as JSON

TASK MODIFICATION

  simbl done <id>                   # move task to Done
  simbl cancel <id>                 # mark task as canceled
  simbl tag add <id> <tag>          # add tag to task
  simbl tag remove <id> <tag>       # remove tag from task
  simbl update <id> --title "New"   # update task title
  simbl update <id> --content "..."  # replace task content
  simbl update <id> --append "..."   # append to task content

RELATIONSHIPS (coming soon)

  simbl relate <id> --parent <parent-id>      # set parent task
  simbl relate <id> --depends-on <dep-id>     # add dependency
  simbl unrelate <id> --parent                # remove parent
  simbl unrelate <id> --depends-on <dep-id>   # remove dependency

TAG REFERENCE

  Priority:     [p1] [p2] [p3] ... [p9]   (p1 is highest)
  Status:       [in-progress] [canceled] [refined]
  Project:      [project:name]
  Hierarchy:    [child-of-task-1]
  Dependency:   [depends-on-task-2]
  Custom:       [any-tag-you-want]

FILE STRUCTURE

  .simbl/
    config.yaml         Configuration (task ID prefix, etc.)
    tasks.md            Active tasks (Backlog + Done)
    tasks-archive.md    Archived tasks

TASK FORMAT

  # Backlog

  ## task-1 Task title here

  [p1][project:auth]

  ### Description

  Task content with markdown support.

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
