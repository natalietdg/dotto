#!/usr/bin/env node

import { Command } from 'commander';
import { scanCommand } from './scan';
import { verifyCommand } from './verify';
import { serveCommand } from './serve';

const program = new Command();

program
  .name('dotto')
  .description('DoTTO - Data Object Trace & Transparency Orchestrator')
  .version('1.1.0');

program
  .command('scan')
  .description('Scan repository for DTO/schema files and detect drift')
  .option('-d, --dir <directory>', 'Directory to scan', process.cwd())
  .action(async (options) => {
    try {
      await scanCommand(options.dir);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('verify')
  .description('Verify schemas on Hedera Consensus Service')
  .option('-d, --dir <directory>', 'Directory containing artifacts', process.cwd())
  .action(async (options) => {
    try {
      await verifyCommand(options.dir);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('serve')
  .description('Launch viewer UI for artifact graph')
  .option('-d, --dir <directory>', 'Directory containing artifacts', process.cwd())
  .action(async (options) => {
    try {
      await serveCommand(options.dir);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program.parse();
