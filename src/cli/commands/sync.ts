import { defineCommand } from 'citty';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, getAllTasks } from '../../core/parser.ts';

/**
 * Check if we're in a git repository
 */
function isGitRepo(): boolean {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if remote is configured
 */
function hasRemote(): boolean {
  try {
    const result = execSync('git remote', { encoding: 'utf-8' });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if working tree is dirty
 */
function isDirty(): boolean {
  try {
    const result = execSync('git status --porcelain', { encoding: 'utf-8' });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

export const syncCommand = defineCommand({
  meta: {
    name: 'sync',
    description: 'Pull remote changes and report new/updated tasks',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const simblDir = findSimblDir();

    if (!simblDir) {
      console.error('No .simbl directory found. Run `simbl init` first.');
      process.exit(1);
    }

    if (!isGitRepo()) {
      console.error('Not a git repository. Sync requires git.');
      process.exit(1);
    }

    if (!hasRemote()) {
      console.log('No git remote configured. Nothing to sync.');
      return;
    }

    const paths = getSimblPaths(simblDir);

    // Check if tasks file exists
    if (!existsSync(paths.tasks)) {
      console.error(`Tasks file not found: ${paths.tasks}`);
      process.exit(1);
    }

    // Warn about dirty working tree
    if (isDirty()) {
      console.log('⚠️  Working tree has uncommitted changes');
    }

    // Get tasks before pull
    const beforeContent = readFileSync(paths.tasks, 'utf-8');
    const beforeFile = parseSimblFile(beforeContent);
    const beforeTasks = getAllTasks(beforeFile);
    const beforeIds = new Set(beforeTasks.map(t => t.id));
    const beforeTasksMap = new Map(beforeTasks.map(t => [t.id, t]));

    // Pull from remote
    console.log('Pulling from remote...');
    try {
      const pullResult = execSync('git pull --no-edit', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });

      // Check for "Already up to date"
      if (pullResult.includes('Already up to date') || pullResult.includes('Already up-to-date')) {
        if (args.json) {
          console.log(JSON.stringify({ status: 'up-to-date', newTasks: [], updatedTasks: [], deletedTasks: [] }, null, 2));
          return;
        }
        console.log('✓ Already up to date');
        return;
      }
    } catch (error) {
      // Check for merge conflict
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('CONFLICT') || errorMsg.includes('Merge conflict')) {
        console.error('⚠️  Merge conflict detected in tasks.md');
        console.error('   Resolve conflicts manually, then run: git add .simbl/tasks.md && git commit');
        process.exit(1);
      }
      // Other git errors
      console.error('Git pull failed:', errorMsg);
      process.exit(1);
    }

    // Get tasks after pull
    const afterContent = readFileSync(paths.tasks, 'utf-8');
    const afterFile = parseSimblFile(afterContent);
    const afterTasks = getAllTasks(afterFile);
    const afterIds = new Set(afterTasks.map(t => t.id));
    const afterTasksMap = new Map(afterTasks.map(t => [t.id, t]));

    // Find differences
    const newTasks: string[] = [];
    const updatedTasks: string[] = [];
    const deletedTasks: string[] = [];

    // New tasks (in after but not in before)
    for (const id of afterIds) {
      if (!beforeIds.has(id)) {
        newTasks.push(id);
      }
    }

    // Deleted tasks (in before but not in after)
    for (const id of beforeIds) {
      if (!afterIds.has(id)) {
        deletedTasks.push(id);
      }
    }

    // Updated tasks (in both but different content)
    for (const id of afterIds) {
      if (beforeIds.has(id)) {
        const beforeTask = beforeTasksMap.get(id);
        const afterTask = afterTasksMap.get(id);
        if (beforeTask && afterTask) {
          // Compare key fields
          if (
            beforeTask.title !== afterTask.title ||
            beforeTask.content !== afterTask.content ||
            JSON.stringify(beforeTask.tags) !== JSON.stringify(afterTask.tags) ||
            beforeTask.section !== afterTask.section
          ) {
            updatedTasks.push(id);
          }
        }
      }
    }

    // Output results
    if (args.json) {
      console.log(JSON.stringify({
        status: 'synced',
        newTasks,
        updatedTasks,
        deletedTasks,
      }, null, 2));
      return;
    }

    const hasChanges = newTasks.length > 0 || updatedTasks.length > 0 || deletedTasks.length > 0;

    if (!hasChanges) {
      console.log('✓ Synced (no task changes)');
      return;
    }

    console.log('✓ Synced');

    if (newTasks.length > 0) {
      console.log(`  ${newTasks.length} new task(s): ${newTasks.join(', ')}`);
    }

    if (updatedTasks.length > 0) {
      console.log(`  ${updatedTasks.length} updated task(s): ${updatedTasks.join(', ')}`);
    }

    if (deletedTasks.length > 0) {
      console.log(`  ${deletedTasks.length} deleted task(s): ${deletedTasks.join(', ')}`);
    }
  },
});
