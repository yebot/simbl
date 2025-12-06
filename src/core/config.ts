import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

/**
 * SIMBL configuration schema
 */
export interface SimblConfig {
  /** Task ID prefix (default: "task") */
  prefix: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: SimblConfig = {
  prefix: 'task',
};

/**
 * SIMBL directory name
 */
export const SIMBL_DIR = '.simbl';

/**
 * File names within .simbl directory
 */
export const FILES = {
  config: 'config.yaml',
  tasks: 'tasks.md',
  archive: 'tasks-archive.md',
} as const;

/**
 * Find the .simbl directory by walking up from cwd
 * Returns the path to .simbl directory or null if not found
 */
export function findSimblDir(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;

  while (true) {
    const simblPath = join(currentDir, SIMBL_DIR);
    if (existsSync(simblPath)) {
      return simblPath;
    }

    const parentDir = join(currentDir, '..');
    if (parentDir === currentDir) {
      // Reached root
      return null;
    }
    currentDir = parentDir;
  }
}

/**
 * Get paths for SIMBL files
 */
export function getSimblPaths(simblDir: string) {
  return {
    config: join(simblDir, FILES.config),
    tasks: join(simblDir, FILES.tasks),
    archive: join(simblDir, FILES.archive),
  };
}

/**
 * Load configuration from .simbl/config.yaml
 * Returns default config merged with file config
 */
export function loadConfig(simblDir: string): SimblConfig {
  const configPath = join(simblDir, FILES.config);

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(content) as Partial<SimblConfig> | null;

    return {
      ...DEFAULT_CONFIG,
      ...parsed,
    };
  } catch {
    // Return defaults on parse error
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to .simbl/config.yaml
 */
export function saveConfig(simblDir: string, config: SimblConfig): void {
  const configPath = join(simblDir, FILES.config);
  const content = yaml.dump(config, { indent: 2 });
  writeFileSync(configPath, content, 'utf-8');
}

/**
 * Initialize .simbl directory structure
 */
export function initSimblDir(baseDir: string = process.cwd()): string {
  const simblDir = join(baseDir, SIMBL_DIR);

  // Create directory if it doesn't exist
  if (!existsSync(simblDir)) {
    mkdirSync(simblDir, { recursive: true });
  }

  const paths = getSimblPaths(simblDir);

  // Create config.yaml with defaults
  if (!existsSync(paths.config)) {
    saveConfig(simblDir, DEFAULT_CONFIG);
  }

  // Create empty tasks.md with structure
  if (!existsSync(paths.tasks)) {
    const tasksContent = `# Backlog

# Done
`;
    writeFileSync(paths.tasks, tasksContent, 'utf-8');
  }

  // Create empty archive file
  if (!existsSync(paths.archive)) {
    const archiveContent = `# Archived Tasks
`;
    writeFileSync(paths.archive, archiveContent, 'utf-8');
  }

  return simblDir;
}

/**
 * Check if current directory (or ancestors) has SIMBL initialized
 */
export function isSimblInitialized(startDir: string = process.cwd()): boolean {
  return findSimblDir(startDir) !== null;
}
