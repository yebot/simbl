import { defineCommand } from 'citty';
import * as p from '@clack/prompts';
import { findSimblDir } from '../../core/config.ts';
import { needsMigration, migrateTaskLogs } from '../../core/migrate.ts';

export const migrateLogsCommand = defineCommand({
  meta: {
    name: 'migrate-logs',
    description: 'Migrate embedded task logs to centralized log file',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Run migration even if already migrated',
      default: false,
    },
  },
  async run({ args }) {
    const simblDir = findSimblDir();

    if (!simblDir) {
      if (args.json) {
        console.log(JSON.stringify({ error: 'No .simbl directory found' }));
      } else {
        console.error('No .simbl directory found. Run `simbl init` first.');
      }
      process.exit(1);
    }

    // Check if migration is needed
    const migrationNeeded = await needsMigration(simblDir);

    if (!migrationNeeded && !args.force) {
      if (args.json) {
        console.log(
          JSON.stringify({
            status: 'skipped',
            message: 'No migration needed (logVersion is already 2 or no embedded logs found)',
            tasksMigrated: 0,
            entriesMigrated: 0,
          })
        );
      } else {
        p.log.info('No migration needed. Logs are already using the centralized format.');
      }
      return;
    }

    // Run migration
    if (!args.json) {
      p.intro('Log Migration');
      p.log.step('Migrating embedded logs to centralized format...');
    }

    const result = await migrateTaskLogs(simblDir);

    if (args.json) {
      console.log(
        JSON.stringify({
          status: 'success',
          tasksMigrated: result.tasksMigrated,
          entriesMigrated: result.entriesMigrated,
          errors: result.errors,
        })
      );
    } else {
      if (result.tasksMigrated === 0) {
        p.log.info('No tasks had embedded logs to migrate.');
      } else {
        p.log.success(`Migrated ${result.entriesMigrated} log entries from ${result.tasksMigrated} tasks`);
      }

      if (result.errors.length > 0) {
        p.log.warn(`Encountered ${result.errors.length} errors:`);
        for (const error of result.errors) {
          p.log.error(`  - ${error}`);
        }
      }

      p.log.info('Log entries are now stored in .simbl/log.ndjson');
      p.outro('Migration complete');
    }
  },
});
