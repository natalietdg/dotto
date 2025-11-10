/**
 * CLI command implementations
 */

import chalk from 'chalk';
import { GraphEngine } from '../graph/GraphEngine';
import { Crawler } from '../scanner/Crawler';
import { ImpactAnalyzer } from '../analysis/ImpactAnalyzer';
import { ProvenanceAnalyzer } from '../analysis/ProvenanceAnalyzer';
import { CompatibilityChecker } from '../analysis/CompatibilityChecker';
import { GraphGenerator } from '../ui/GraphGenerator';
import { createProofBackend } from '../proof';
import { ProofEvent } from '../core/types';

export async function initCommand(): Promise<void> {
  console.log(chalk.cyan('\n🧠 Initializing dotto...\n'));
  
  const engine = new GraphEngine();
  engine.saveGraph();
  
  console.log(chalk.green('✓ Created graph.json'));
  console.log(chalk.gray('\nNext steps:'));
  console.log(chalk.gray('  1. Run "dotto crawl" to scan your codebase'));
  console.log(chalk.gray('  2. Use "dotto impact <NODE_ID>" to analyze dependencies'));
  console.log(chalk.gray('  3. Generate visualization with "dotto graph --html"\n'));
}

export async function crawlCommand(options: { diff?: boolean }): Promise<void> {
  console.log(chalk.cyan(`\n🔍 Crawling codebase${options.diff ? ' (incremental)' : ''}...\n`));
  
  const engine = new GraphEngine();
  const crawler = new Crawler(engine);
  
  const result = await crawler.crawl({ diff: options.diff });
  
  console.log(chalk.green(`✓ Crawl complete in ${result.duration}ms\n`));
  console.log(chalk.gray('Results:'));
  console.log(chalk.green(`  + Added: ${result.added.length}`));
  console.log(chalk.yellow(`  ~ Modified: ${result.modified.length}`));
  console.log(chalk.red(`  - Removed: ${result.removed.length}`));
  console.log(chalk.gray(`  = Unchanged: ${result.unchanged}\n`));
  
  if (result.added.length > 0) {
    console.log(chalk.gray('Newly discovered:'));
    result.added.slice(0, 5).forEach(node => {
      console.log(chalk.gray(`  • ${node.name} (${node.type})`));
    });
    if (result.added.length > 5) {
      console.log(chalk.gray(`  ... and ${result.added.length - 5} more\n`));
    }
  }
}

export async function impactCommand(nodeId: string, options: { depth?: number }): Promise<void> {
  const engine = new GraphEngine();
  const analyzer = new ImpactAnalyzer(engine);
  
  try {
    const analysis = analyzer.analyze(nodeId, options.depth || 3);
    const report = analyzer.formatImpactReport(analysis);
    console.log(report);
  } catch (error) {
    console.log(chalk.red(`\n❌ ${(error as Error).message}\n`));
    console.log(chalk.gray('Hint: Run "dotto crawl" first to build the dependency graph\n'));
  }
}

export async function whyCommand(nodeId: string): Promise<void> {
  const engine = new GraphEngine();
  const analyzer = new ProvenanceAnalyzer(engine);
  
  try {
    const chain = analyzer.analyze(nodeId);
    const report = analyzer.formatProvenanceReport(chain);
    console.log(report);
  } catch (error) {
    console.log(chalk.red(`\n❌ ${(error as Error).message}\n`));
  }
}

export async function checkCommand(): Promise<void> {
  console.log(chalk.cyan('\n🔍 Checking compatibility...\n'));
  
  const engine = new GraphEngine();
  const checker = new CompatibilityChecker(engine);
  
  const issues = checker.check();
  const report = checker.formatCompatibilityReport(issues);
  console.log(report);
}

export async function graphCommand(options: { html?: boolean; output?: string }): Promise<void> {
  const engine = new GraphEngine();
  const generator = new GraphGenerator(engine);
  
  const outputPath = options.output || 'graph.html';
  
  console.log(chalk.cyan('\n📊 Generating graph visualization...\n'));
  generator.generate(outputPath);
  console.log(chalk.green(`✓ Generated ${outputPath}\n`));
  console.log(chalk.gray(`Open in browser: file://${process.cwd()}/${outputPath}\n`));
}

export async function recordProofCommand(
  nodeId: string,
  options: { proof?: string }
): Promise<void> {
  const backend = options.proof || 'none';
  
  console.log(chalk.cyan(`\n🔐 Recording proof (backend: ${backend})...\n`));
  
  const engine = new GraphEngine();
  const node = engine.getNode(nodeId);
  
  if (!node) {
    console.log(chalk.red(`❌ Node not found: ${nodeId}\n`));
    return;
  }
  
  const proofBackend = createProofBackend(backend);
  
  if (proofBackend.initialize) {
    try {
      await proofBackend.initialize();
    } catch (error) {
      console.log(chalk.red(`❌ Failed to initialize proof backend: ${(error as Error).message}\n`));
      return;
    }
  }
  
  const event: ProofEvent = {
    nodeId: node.id,
    eventType: 'created',
    hash: node.fileHash,
    metadata: {
      name: node.name,
      type: node.type,
      intent: node.intent,
    },
    timestamp: new Date().toISOString(),
  };
  
  try {
    const ref = await proofBackend.record(event);
    console.log(chalk.green(`✓ Proof recorded\n`));
    console.log(chalk.gray(`  Backend: ${ref.backend}`));
    console.log(chalk.gray(`  ID: ${ref.id}`));
    console.log(chalk.gray(`  Link: ${proofBackend.getLink(ref)}\n`));
    
    if (proofBackend.close) {
      await proofBackend.close();
    }
  } catch (error) {
    console.log(chalk.red(`❌ Failed to record proof: ${(error as Error).message}\n`));
  }
}
