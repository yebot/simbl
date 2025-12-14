import { defineCommand } from 'citty';
import * as p from '@clack/prompts';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import { SIMBL_DIR, initSimblDir, loadConfig, saveConfig } from '../../core/config.ts';

/**
 * The SIMBL section to add to CLAUDE.md
 */
const CLAUDE_MD_SECTION = `
<!-- SIMBL:BEGIN -->
## SIMBL Backlog

This project uses SIMBL for task management. Run \`simbl usage\` for all commands.

**Data files** (in \`.simbl/\`):
- \`tasks.md\` - active backlog and done tasks
- \`tasks-archive.md\` - archived tasks
- \`config.yaml\` - project configuration

**Common commands:**
- \`simbl list\` - view all tasks
- \`simbl add "title"\` - add a task
- \`simbl done <id>\` - mark task complete

**IMPORTANT:** When working on a task, proactively update its description with discoveries, surprises, course-corrections, or architectural decisions. Example:
\`\`\`bash
simbl update <id> --append "### Notes\\nDiscovered that X requires Y..."
\`\`\`
<!-- SIMBL:END -->
`;

/**
 * Starter CLAUDE.md content when creating a new file
 */
const CLAUDE_MD_STARTER = `# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
${CLAUDE_MD_SECTION}`;

/**
 * Check if CLAUDE.md already has a SIMBL section
 */
function hasSimblSection(content: string): boolean {
  return content.includes('<!-- SIMBL:BEGIN -->') || content.includes('## SIMBL');
}

/**
 * Extract user-added content from within the SIMBL section.
 * Looks for content after the standard section but before the END marker.
 */
function extractUserContent(content: string): string | null {
  const beginMarker = '<!-- SIMBL:BEGIN -->';
  const endMarker = '<!-- SIMBL:END -->';

  const beginIndex = content.indexOf(beginMarker);
  const endIndex = content.indexOf(endMarker);

  if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
    return null;
  }

  // Extract everything between markers
  const sectionContent = content.slice(beginIndex + beginMarker.length, endIndex);

  // Find where our standard content ends within the section
  // We look for the last line of our standard content (the code block end)
  const lastStandardLine = '```';
  const lastLineIndex = sectionContent.lastIndexOf(lastStandardLine);

  if (lastLineIndex === -1) {
    // Standard content not found - user may have modified everything
    // Preserve everything as user content
    return sectionContent.trim() || null;
  }

  // Extract anything after our standard content
  const afterStandard = sectionContent.slice(lastLineIndex + lastStandardLine.length);
  const userContent = afterStandard.trim();

  return userContent || null;
}

/**
 * Build the SIMBL section, optionally including preserved user content
 */
function buildSimblSection(userContent: string | null): string {
  const baseSection = `
<!-- SIMBL:BEGIN -->
## SIMBL Backlog

This project uses SIMBL for task management. Run \`simbl usage\` for all commands.

**Data files** (in \`.simbl/\`):
- \`tasks.md\` - active backlog and done tasks
- \`tasks-archive.md\` - archived tasks
- \`config.yaml\` - project configuration

**Common commands:**
- \`simbl list\` - view all tasks
- \`simbl add "title"\` - add a task
- \`simbl done <id>\` - mark task complete

**IMPORTANT:** When working on a task, proactively update its description with discoveries, surprises, course-corrections, or architectural decisions. Example:
\`\`\`bash
simbl update <id> --append "### Notes\\nDiscovered that X requires Y..."
\`\`\``;

  if (userContent) {
    return `${baseSection}

${userContent}
<!-- SIMBL:END -->
`;
  }

  return `${baseSection}
<!-- SIMBL:END -->
`;
}

/**
 * Replace the existing SIMBL section in content, preserving user additions
 */
function replaceSimblSection(content: string): string {
  const beginMarker = '<!-- SIMBL:BEGIN -->';
  const endMarker = '<!-- SIMBL:END -->';

  const beginIndex = content.indexOf(beginMarker);
  const endIndex = content.indexOf(endMarker);

  if (beginIndex === -1 || endIndex === -1) {
    // No valid section to replace, append instead
    return content.trimEnd() + '\n' + buildSimblSection(null);
  }

  // Extract user content before replacing
  const userContent = extractUserContent(content);

  // Replace the section
  const before = content.slice(0, beginIndex);
  const after = content.slice(endIndex + endMarker.length);

  return before + buildSimblSection(userContent).trim() + after;
}

export const initCommand = defineCommand({
  meta: {
    name: 'init',
    description: 'Initialize a new SIMBL instance in the current directory',
  },
  args: {
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Reinitialize even if .simbl already exists',
      default: false,
    },
    name: {
      type: 'string',
      alias: 'n',
      description: 'Project name',
    },
    prefix: {
      type: 'string',
      alias: 'p',
      description: 'Set custom task ID prefix (default: "task")',
    },
  },
  async run({ args }) {
    const cwd = process.cwd();
    const simblPath = join(cwd, SIMBL_DIR);
    const claudeMdPath = join(cwd, 'CLAUDE.md');
    const exists = existsSync(simblPath);

    p.intro('SIMBL Setup');

    // Check if already initialized
    if (exists && !args.force) {
      p.log.warn(`SIMBL already initialized at ${simblPath}`);
      p.log.info('Use --force to reinitialize');
      p.outro('Setup cancelled');
      return;
    }

    // Initialize the directory
    const simblDir = initSimblDir(cwd);

    // Get the directory name as default project name
    const dirName = basename(cwd);

    // Determine name: CLI arg > interactive prompt > directory name
    let name = dirName;
    if (args.name) {
      name = args.name;
    } else {
      const nameInput = await p.text({
        message: 'Project name',
        placeholder: dirName,
        defaultValue: dirName,
      });

      if (p.isCancel(nameInput)) {
        p.outro('Setup cancelled');
        process.exit(0);
      }

      if (nameInput && nameInput.trim()) {
        name = nameInput.trim();
      }
    }

    // Determine prefix: CLI arg > interactive prompt > default
    let prefix = 'task';
    if (args.prefix) {
      prefix = args.prefix;
    } else {
      const prefixInput = await p.text({
        message: 'Task ID prefix (e.g., "task" → task-1, task-2)',
        placeholder: 'task',
        defaultValue: 'task',
      });

      if (p.isCancel(prefixInput)) {
        p.outro('Setup cancelled');
        process.exit(0);
      }

      if (prefixInput && prefixInput.trim()) {
        prefix = prefixInput.trim();
      }
    }

    // Update config with chosen values
    const config = loadConfig(simblDir);
    config.name = name;
    config.prefix = prefix;
    saveConfig(simblDir, config);

    // Show what was created
    p.log.success(`Created ${SIMBL_DIR}/config.yaml (name: "${config.name}", prefix: "${config.prefix}")`);
    p.log.success(`Created ${SIMBL_DIR}/tasks.md`);
    p.log.success(`Created ${SIMBL_DIR}/tasks-archive.md`);

    // Check for CLAUDE.md integration
    const claudeMdExists = existsSync(claudeMdPath);

    if (claudeMdExists) {
      const content = readFileSync(claudeMdPath, 'utf-8');

      if (hasSimblSection(content)) {
        if (args.force) {
          // Re-initialize but preserve user content
          const userContent = extractUserContent(content);
          const updatedContent = replaceSimblSection(content);
          writeFileSync(claudeMdPath, updatedContent, 'utf-8');
          if (userContent) {
            p.log.success('Updated SIMBL section in CLAUDE.md (preserved user content)');
          } else {
            p.log.success('Updated SIMBL section in CLAUDE.md');
          }
        } else {
          p.log.info('CLAUDE.md already has SIMBL instructions');
        }
      } else {
        const shouldAdd = await p.confirm({
          message: 'Found CLAUDE.md. Add SIMBL usage instructions?',
          initialValue: true,
        });

        if (p.isCancel(shouldAdd)) {
          p.outro('Setup complete (CLAUDE.md unchanged)');
          return;
        }

        if (shouldAdd) {
          const updatedContent = content.trimEnd() + '\n' + CLAUDE_MD_SECTION;
          writeFileSync(claudeMdPath, updatedContent, 'utf-8');
          p.log.success('Added SIMBL section to CLAUDE.md');
        }
      }
    } else {
      const shouldCreate = await p.confirm({
        message: 'No CLAUDE.md found. Create one with SIMBL instructions?',
        initialValue: true,
      });

      if (p.isCancel(shouldCreate)) {
        p.outro('Setup complete (no CLAUDE.md created)');
        return;
      }

      if (shouldCreate) {
        writeFileSync(claudeMdPath, CLAUDE_MD_STARTER, 'utf-8');
        p.log.success('Created CLAUDE.md with SIMBL instructions');
      }
    }

    p.outro('SIMBL is ready! Run `simbl add "Your first task"` to get started.');
  },
});
