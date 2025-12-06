/**
 * Task status values
 */
export type TaskStatus = 'backlog' | 'in-progress' | 'done' | 'canceled';

/**
 * Reserved tag types that SIMBL recognizes
 */
export interface ReservedTags {
  priority?: number;        // 1-9 from [p1]-[p9]
  project?: string;         // from [project:xxx]
  parentId?: string;        // from [child-of-xxx]
  dependsOn: string[];      // from [depends-on-xxx]
  inProgress: boolean;      // [in-progress]
  canceled: boolean;        // [canceled]
  refined: boolean;         // [refined]
}

/**
 * A SIMBL task
 */
export interface Task {
  /** Unique identifier (e.g., "task-1", "abc-42") */
  id: string;

  /** Task title (text after ID in H2 heading) */
  title: string;

  /** All tags as raw strings (e.g., ["p1", "design", "project:auth"]) */
  tags: string[];

  /** Parsed reserved tags for easy access */
  reserved: ReservedTags;

  /** Current status derived from section and tags */
  status: TaskStatus;

  /** Raw markdown content (H3+ sections) */
  content: string;

  /** Section this task belongs to */
  section: 'backlog' | 'done';
}

/**
 * Parsed SIMBL file structure
 */
export interface SimblFile {
  /** Tasks in the Backlog section */
  backlog: Task[];

  /** Tasks in the Done section */
  done: Task[];

  /** Raw content before Backlog section (if any) */
  preamble?: string;
}

/**
 * Parse a tag string to extract reserved tag info
 */
export function parseTag(tag: string): { type: 'priority'; value: number }
  | { type: 'project'; value: string }
  | { type: 'child-of'; value: string }
  | { type: 'depends-on'; value: string }
  | { type: 'in-progress' }
  | { type: 'canceled' }
  | { type: 'refined' }
  | { type: 'custom'; value: string } {

  // Priority: p1-p9
  const priorityMatch = tag.match(/^p([1-9])$/);
  if (priorityMatch) {
    return { type: 'priority', value: parseInt(priorityMatch[1], 10) };
  }

  // Project: project:xxx
  const projectMatch = tag.match(/^project:(.+)$/);
  if (projectMatch) {
    return { type: 'project', value: projectMatch[1] };
  }

  // Child-of: child-of-xxx
  const childOfMatch = tag.match(/^child-of-(.+)$/);
  if (childOfMatch) {
    return { type: 'child-of', value: childOfMatch[1] };
  }

  // Depends-on: depends-on-xxx
  const dependsOnMatch = tag.match(/^depends-on-(.+)$/);
  if (dependsOnMatch) {
    return { type: 'depends-on', value: dependsOnMatch[1] };
  }

  // Simple reserved tags
  if (tag === 'in-progress') return { type: 'in-progress' };
  if (tag === 'canceled') return { type: 'canceled' };
  if (tag === 'refined') return { type: 'refined' };

  // Custom tag
  return { type: 'custom', value: tag };
}

/**
 * Parse all tags and extract reserved tag info
 */
export function parseReservedTags(tags: string[]): ReservedTags {
  const reserved: ReservedTags = {
    dependsOn: [],
    inProgress: false,
    canceled: false,
    refined: false,
  };

  for (const tag of tags) {
    const parsed = parseTag(tag);
    switch (parsed.type) {
      case 'priority':
        reserved.priority = parsed.value;
        break;
      case 'project':
        reserved.project = parsed.value;
        break;
      case 'child-of':
        reserved.parentId = parsed.value;
        break;
      case 'depends-on':
        reserved.dependsOn.push(parsed.value);
        break;
      case 'in-progress':
        reserved.inProgress = true;
        break;
      case 'canceled':
        reserved.canceled = true;
        break;
      case 'refined':
        reserved.refined = true;
        break;
    }
  }

  return reserved;
}

/**
 * Determine task status from section and tags
 */
export function deriveStatus(section: 'backlog' | 'done', reserved: ReservedTags): TaskStatus {
  if (reserved.canceled) return 'canceled';
  if (section === 'done') return 'done';
  if (reserved.inProgress) return 'in-progress';
  return 'backlog';
}

/**
 * Parse tag line to extract individual tags
 * Example: "[p1][design][project:auth]" -> ["p1", "design", "project:auth"]
 */
export function parseTagLine(line: string): string[] {
  const tags: string[] = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    tags.push(match[1]);
  }
  return tags;
}

/**
 * Format tags back to tag line
 */
export function formatTagLine(tags: string[]): string {
  if (tags.length === 0) return '';
  return tags.map(t => `[${t}]`).join('');
}
