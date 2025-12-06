# SIMBL Spec

## Stack

- Bun
- TypeScript
- Markdown
- YAML (config file)

## API

- CLI
- MCP (later)
- Web (later)

## CLI commands

- `simbl list` - Show list of all tasks
  - default grouping
    - Backlog tasks
      - sorted by priority DESC, id ASC
      - tasks with [child-of-#] tag are shown nest under parent.
    - Done tasks
      - sorted by id DESC

## Task Fields

- ID
- Tags
- Description

## Init File Structure

A SIMBL instance is init'd in a repo like this:

- `.simbl/tasks.md`
- `.simbl/tasks-archive.md`
- `.simbl/config.yaml`

## Example SIMBL File

```md
# Backlog

## abc-1 Change logo from green to orange

[p1][design]

### Description

We need to change the logo theme color. Put reqs, acceptance criteria or definition of done here. And implementation notes.

# Done
```

## SIMBL File rules

- Has only two H1 ('#') heading, 'Backlog' & 'Done'
- H2 level headings ('##') may only be used to contain the task ID and its optional title.
- The line of text that beings with a '[' immediately after a H2 heading signals that this line contains tags
- tags are denoted by braces. (Ex. [p1])
- Reserved tags
  - [p1][p2][p3][p4][p5][p6][p7]... - These are priority tags. [p1] is the highest priority. Most users will likely only use [p1], [p2] and [p3] but SIMBL can support up to [p9]. A task can have only zero or one [p#] tags in it.
  - [canceled] - a decision was made to cancel this task. a task with this tag can only exist under the `# Done` heading or in the archive file.
  - [child-of-#] - is a subtask of another task–has a parent. Changes to the parent should cascade to the child. a task may have only one parent.
  - [depends-on-#] - shows dependancy. this task should not be worked until all know deps are done. (can have multiple)
  - [in-progress] - added when a task is being worked on and is not yet done or canceled.
  - [refined] - useful for large tasks updated by agentic coding tools. added after a new task is updated by a team of agents with detailed specs.
  - [project:xxxxxx] - tasks can optionally grouped into projects using this tag structure.
- Tasks have have sections
  - A tasks's top-most section header is an H3 ('###') only.
  - Useful subsections can be 'Description', 'Tasks', 'Acceptance Criteria', etc.
  - A task section can have subsections in the form of H4, H5, H6, ('####', '#####', '######')

## Config options

- should SIMBL's files be .gitignore'd?
