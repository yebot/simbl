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
import { usageCommand } from './cli/commands/usage.ts';
import { doctorCommand } from './cli/commands/doctor.ts';

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
    usage: usageCommand,
    doctor: doctorCommand,
  },
});

// Check if we have a subcommand or not
const args = process.argv.slice(2);
const hasSubCommand = args.length > 0 && !args[0].startsWith('-');

if (!hasSubCommand) {
  // No subcommand - show TUI menu (for now, show help)
  console.log('SIMBL - Simple Backlog');
  console.log('');
  console.log('Usage: simbl <command>');
  console.log('');
  console.log('Commands:');
  console.log('  init     Initialize a new SIMBL instance');
  console.log('  add      Add a new task');
  console.log('  list     List tasks');
  console.log('  show     Show a single task');
  console.log('  done     Mark task as done');
  console.log('  cancel   Mark task as canceled');
  console.log('  tag      Manage task tags (add/remove)');
  console.log('  update   Update task title or content');
  console.log('  usage    Show detailed usage information');
  console.log('  doctor   Validate tasks.md structure');
  console.log('');
  console.log('Run "simbl <command> --help" for more information.');
  console.log('');
  console.log('(TUI mode coming soon - just run "simbl" with no args)');
} else {
  runMain(main);
}
