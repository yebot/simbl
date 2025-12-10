import { defineCommand } from 'citty';
import { findSimblDir, loadConfig } from '../../core/config.ts';
import { startServer } from '../../web/server.ts';

const DEFAULT_PORT = 3497;

export const serveCommand = defineCommand({
  meta: {
    name: 'serve',
    description: 'Start the SIMBL web UI',
  },
  args: {
    port: {
      type: 'string',
      alias: 'p',
      description: 'Port to run on (default: 3497, or webPort from config)',
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

    const config = loadConfig(simblDir);

    // Priority: CLI --port > config webPort > default
    let port: number;
    if (args.port !== undefined) {
      port = parseInt(args.port, 10);
    } else if (config.webPort !== undefined) {
      port = config.webPort;
    } else {
      port = DEFAULT_PORT;
    }

    if (isNaN(port) || port > 65535) {
      console.error('Invalid port number');
      process.exit(1);
    }

    if (port < 1024) {
      console.error('Error: Ports below 1024 are privileged and cannot be used.');
      process.exit(1);
    }

    await startServer({
      port,
      open: args.open,
    });
  },
});
