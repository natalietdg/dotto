#!/usr/bin/env node

import { Command } from 'commander';
import {
  initCommand,
  crawlCommand,
  scanCommand,
  impactCommand,
  whyCommand,
  checkCommand,
  graphCommand,
  recordProofCommand,
} from './commands';

const program = new Command();

program
  .name('dotto')
  .description('dotto - Enterprise-grade schema dependency analysis')
  .version('1.1.0');

program
  .command('init')
  .description('Initialize dotto in current directory')
  .action(async () => {
    try {
      await initCommand();
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('crawl')
  .description('Scan codebase and build dependency graph')
  .option('--diff', 'Only update changed nodes (incremental)', false)
  .action(async (options) => {
    try {
      await crawlCommand(options);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('scan')
  .description('Scan repository for schema changes (git-aware)')
  .option('--base <commit>', 'Base commit to compare against', 'HEAD')
  .action(async (options) => {
    try {
      await scanCommand(options);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('impact <node-id>')
  .description('Analyze downstream impact of a schema change')
  .option('-d, --depth <number>', 'Maximum depth to traverse', '3')
  .action(async (nodeId, options) => {
    try {
      await impactCommand(nodeId, { depth: parseInt(options.depth) });
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('why <node-id>')
  .description('Show provenance chain (reverse dependencies)')
  .action(async (nodeId) => {
    try {
      await whyCommand(nodeId);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Run compatibility checks on impacted nodes')
  .action(async () => {
    try {
      await checkCommand();
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('graph')
  .description('Generate static HTML visualization')
  .option('--html', 'Generate HTML file (default)', true)
  .option('-o, --output <file>', 'Output file path', 'graph.html')
  .action(async (options) => {
    try {
      await graphCommand(options);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('proof <node-id>')
  .description('Record proof for a node (optional)')
  .option('--proof <backend>', 'Proof backend: none|git|hedera|sigstore', 'none')
  .action(async (nodeId, options) => {
    try {
      await recordProofCommand(nodeId, options);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program.parse();
