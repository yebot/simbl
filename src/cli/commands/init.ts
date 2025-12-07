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

Common commands:
- \`simbl list\` - view all tasks
- \`simbl add "title"\` - add a task
- \`simbl done <id>\` - mark task complete
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
        p.log.info('CLAUDE.md already has SIMBL instructions');
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
