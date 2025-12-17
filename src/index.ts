#!/usr/bin/env bun

import { defineCommand, runMain } from 'citty';
import { initCommand } from './cli/commands/init.ts';
import { listCommand } from './cli/commands/list.ts';
import { showCommand } from './cli/commands/show.ts';
import { addCommand } from './cli/commands/add.ts';
import { doneCommand } from './cli/commands/done.ts';
import { cancelCommand } from './cli/commands/cancel.ts';
import { tagCommand } from './cli/commands/tag.ts';
import { updateCommand } from './cli/commands/update.ts';
import { relateCommand } from './cli/commands/relate.ts';
import { unrelateCommand } from './cli/commands/unrelate.ts';
import { usageCommand } from './cli/commands/usage.ts';
import { doctorCommand } from './cli/commands/doctor.ts';
import { serveCommand } from './cli/commands/serve.ts';
import { syncCommand } from './cli/commands/sync.ts';
import { acCommand } from './cli/commands/ac.ts';
import { logCommand } from './cli/commands/log.ts';
import { runTuiMenu } from './cli/tui/menu.ts';

const main = defineCommand({
  meta: {
    name: 'simbl',
    version: '0.1.0',
    description: 'Simple Backlog - A CLI task manager for dev projects',
  },
  subCommands: {
    init: initCommand,
    list: listCommand,
    show: showCommand,
    add: addCommand,
    done: doneCommand,
    cancel: cancelCommand,
    tag: tagCommand,
    update: updateCommand,
    relate: relateCommand,
    unrelate: unrelateCommand,
    usage: usageCommand,
    doctor: doctorCommand,
    serve: serveCommand,
    sync: syncCommand,
    ac: acCommand,
    log: logCommand,
  },
});

// Check if we have a subcommand or not
const args = process.argv.slice(2);
const hasSubCommand = args.length > 0 && !args[0].startsWith('-');

if (!hasSubCommand) {
  // No subcommand - launch interactive TUI menu
  runTuiMenu();
} else {
  runMain(main);
}
