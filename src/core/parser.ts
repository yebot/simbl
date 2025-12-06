import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import type { Root, Heading, Content } from 'mdast';
import {
  type Task,
  type SimblFile,
  parseTagLine,
  parseReservedTags,
  deriveStatus,
  formatTagLine,
} from './task.ts';

/**
 * Parse markdown string into AST
 */
export function parseMarkdown(content: string): Root {
  const processor = unified().use(remarkParse);
  return processor.parse(content);
}

/**
 * Stringify AST back to markdown
 */
export function stringifyMarkdown(ast: Root): string {
  const processor = unified()
    .use(remarkParse)
    .use(remarkStringify, {
      bullet: '-',
      emphasis: '*',
      strong: '*',
      listItemIndent: 'one',
    });
  return processor.stringify(ast);
}

/**
 * Extract text content from heading node
 */
function getHeadingText(heading: Heading): string {
  return heading.children
    .map((child) => {
      if (child.type === 'text') return child.value;
      if (child.type === 'inlineCode') return child.value;
      return '';
    })
    .join('');
}

/**
 * Check if a node is a paragraph that looks like a tag line
 * Tag lines start with '[' and contain bracket notation
 */
function isTagLine(node: Content): boolean {
  if (node.type !== 'paragraph') return false;
  const firstChild = node.children[0];
  if (firstChild?.type !== 'text') return false;
  return firstChild.value.trimStart().startsWith('[');
}

/**
 * Extract tag line text from a paragraph node
 */
function getTagLineText(node: Content): string {
  if (node.type !== 'paragraph') return '';
  return node.children
    .map((child) => (child.type === 'text' ? child.value : ''))
    .join('');
}

/**
 * Parse task ID and title from H2 heading text
 * Format: "task-1 Optional title here"
 */
function parseTaskHeading(text: string): { id: string; title: string } {
  const trimmed = text.trim();
  const spaceIndex = trimmed.indexOf(' ');

  if (spaceIndex === -1) {
    return { id: trimmed, title: '' };
  }

  return {
    id: trimmed.slice(0, spaceIndex),
    title: trimmed.slice(spaceIndex + 1).trim(),
  };
}

/**
 * Find the index of the next H1 or H2 heading, or end of array
 */
function findNextHeadingIndex(
  nodes: Content[],
  startIndex: number,
  maxDepth: number
): number {
  for (let i = startIndex; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === 'heading' && node.depth <= maxDepth) {
      return i;
    }
  }
  return nodes.length;
}

/**
 * Convert content nodes to markdown string
 */
function nodesToMarkdown(nodes: Content[]): string {
  if (nodes.length === 0) return '';

  const root: Root = {
    type: 'root',
    children: nodes,
  };

  return stringifyMarkdown(root).trim();
}

/**
 * Parse a SIMBL markdown file into structured data
 */
export function parseSimblFile(content: string): SimblFile {
  const ast = parseMarkdown(content);
  const nodes = ast.children;

  const result: SimblFile = {
    backlog: [],
    done: [],
  };

  let currentSection: 'backlog' | 'done' | null = null;
  let i = 0;

  // Find preamble (content before first H1)
  const firstH1Index = nodes.findIndex(
    (n) => n.type === 'heading' && n.depth === 1
  );
  if (firstH1Index > 0) {
    result.preamble = nodesToMarkdown(nodes.slice(0, firstH1Index) as Content[]);
  }

  while (i < nodes.length) {
    const node = nodes[i];

    // H1 heading - section marker
    if (node.type === 'heading' && node.depth === 1) {
      const text = getHeadingText(node).toLowerCase();
      if (text === 'backlog') {
        currentSection = 'backlog';
      } else if (text === 'done') {
        currentSection = 'done';
      } else {
        currentSection = null;
      }
      i++;
      continue;
    }

    // H2 heading - task
    if (node.type === 'heading' && node.depth === 2 && currentSection) {
      const headingText = getHeadingText(node);
      const { id, title } = parseTaskHeading(headingText);

      // Look for tag line immediately after H2
      let tags: string[] = [];
      let contentStartIndex = i + 1;

      if (i + 1 < nodes.length && isTagLine(nodes[i + 1])) {
        const tagLineText = getTagLineText(nodes[i + 1]);
        tags = parseTagLine(tagLineText);
        contentStartIndex = i + 2;
      }

      // Find where this task's content ends (next H1 or H2)
      const contentEndIndex = findNextHeadingIndex(nodes, contentStartIndex, 2);

      // Extract content nodes (H3+ sections and other content)
      const contentNodes = nodes.slice(contentStartIndex, contentEndIndex) as Content[];
      const taskContent = nodesToMarkdown(contentNodes);

      // Parse reserved tags
      const reserved = parseReservedTags(tags);
      const status = deriveStatus(currentSection, reserved);

      const task: Task = {
        id,
        title,
        tags,
        reserved,
        status,
        content: taskContent,
        section: currentSection,
      };

      result[currentSection].push(task);
      i = contentEndIndex;
      continue;
    }

    i++;
  }

  return result;
}

/**
 * Serialize a SimblFile back to markdown string
 */
export function serializeSimblFile(file: SimblFile): string {
  const lines: string[] = [];

  // Preamble
  if (file.preamble) {
    lines.push(file.preamble);
    lines.push('');
  }

  // Backlog section
  lines.push('# Backlog');
  lines.push('');

  for (const task of file.backlog) {
    lines.push(`## ${task.id}${task.title ? ' ' + task.title : ''}`);
    lines.push('');

    if (task.tags.length > 0) {
      lines.push(formatTagLine(task.tags));
      lines.push('');
    }

    if (task.content) {
      lines.push(task.content);
      lines.push('');
    }
  }

  // Done section
  lines.push('# Done');
  lines.push('');

  for (const task of file.done) {
    lines.push(`## ${task.id}${task.title ? ' ' + task.title : ''}`);
    lines.push('');

    if (task.tags.length > 0) {
      lines.push(formatTagLine(task.tags));
      lines.push('');
    }

    if (task.content) {
      lines.push(task.content);
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

/**
 * Get all tasks from a SimblFile
 */
export function getAllTasks(file: SimblFile): Task[] {
  return [...file.backlog, ...file.done];
}

/**
 * Find a task by ID
 */
export function findTaskById(file: SimblFile, id: string): Task | undefined {
  return getAllTasks(file).find((t) => t.id === id);
}
