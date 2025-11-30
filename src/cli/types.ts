/**
 * CLI Types and Configuration
 */

export interface CLIConfig {
  projectDir: string;
  dataDir: string;
  graphFile: string;
  loopsFile: string;
  configFile: string;
}

export const DEFAULT_CONFIG: CLIConfig = {
  projectDir: '.',
  dataDir: '.loop',
  graphFile: 'graph.json',
  loopsFile: 'loops.json',
  configFile: 'config.json',
};

export interface ProjectConfig {
  name: string;
  version: string;
  graphId: string;
  defaultTone: string;
  defaultPerspective: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: string[];
}

export type OutputFormat = 'text' | 'json' | 'table';

export interface GlobalOptions {
  format?: OutputFormat;
  quiet?: boolean;
  verbose?: boolean;
  projectDir?: string;
}
