import { defineCommand } from 'citty';
import { findSimblDir } from '../../core/config.ts';
import { startServer } from '../../web/server.ts';

export const serveCommand = defineCommand({
  meta: {
    name: 'serve',
    description: 'Start the SIMBL web UI',
  },
  args: {
    port: {
      type: 'string',
      alias: 'p',
      description: 'Port to run on (default: 3497)',
      default: '3497',
    },
    open: {
      type: 'boolean',
      alias: 'o',
      description: 'Open browser automatically',
      default: false,
    },
  },
  async run({ args }) {
    const simblDir = findSimblDir();

    if (!simblDir) {
      console.error('No .simbl directory found. Run `simbl init` first.');
      process.exit(1);
    }

    const port = parseInt(args.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('Invalid port number');
      process.exit(1);
    }

    await startServer({
      port,
      open: args.open,
    });
  },
});
