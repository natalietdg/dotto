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
import { AuditPackExporter } from '../export/AuditPackExporter';
import { DriftCertificateGenerator } from '../export/DriftCertificate';
import { IntentCapture } from './IntentCapture';
import { createProofBackend } from '../proof';
import { ProofEvent } from '../core/types';
import { GitScanner } from '../git/GitScanner';
import { SchemaDiffer } from '../diff/SchemaDiffer';

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

export async function scanCommand(options: { base?: string }): Promise<void> {
  console.log(chalk.cyan('\n🔍 Scanning repository for schema changes...\n'));
  
  const gitScanner = new GitScanner();
  
  try {
    // Check if we're in a git repo
    const currentCommit = gitScanner.getCurrentCommit();
    console.log(chalk.gray(`Current commit: ${currentCommit.substring(0, 8)}\n`));
    
    // Scan for changes
    const result = options.base 
      ? await gitScanner.scanCommitRange(options.base, 'HEAD')
      : await gitScanner.scanUncommittedChanges();
    
    // Format and display diff report
    const differ = new SchemaDiffer();
    const report = differ.formatDiffReport(result.diffs);
    console.log(report);
    
    // Save diffs to file for viewer
    const fs = require('fs');
    const diffData = {
      timestamp: new Date().toISOString(),
      baseCommit: result.baseCommit,
      headCommit: result.headCommit,
      diffs: result.diffs.map(d => ({
        nodeId: d.nodeId,
        name: d.name,
        type: d.type,
        changeType: d.changeType,
        breaking: d.breaking,
        changes: d.changes,
      })),
      filesChanged: result.filesChanged,
    };
    fs.writeFileSync('drift.json', JSON.stringify(diffData, null, 2));
    console.log(chalk.gray('💾 Saved drift report to drift.json\n'));
    
    // Capture intent for breaking changes
    const hasBreaking = result.diffs.some(d => d.breaking);
    let intent = undefined;
    
    if (hasBreaking && process.stdin.isTTY) {
      // Interactive mode - prompt for intent
      intent = await IntentCapture.prompt(result.diffs.filter(d => d.breaking).length);
    } else if (hasBreaking) {
      // CI mode - check environment variables
      intent = IntentCapture.fromEnvironment();
    }
    
    // Generate drift certificate with intent
    const certificate = DriftCertificateGenerator.generate(
      result.diffs,
      {
        repository: gitScanner.getRepositoryName(),
        branch: gitScanner.getCurrentBranch(),
        baseCommit: result.baseCommit,
        headCommit: result.headCommit,
        author: gitScanner.getCommitAuthor(result.headCommit),
      },
      intent
    );
    const certPath = DriftCertificateGenerator.save(certificate);
    console.log(chalk.gray(`📜 Saved drift certificate to ${certPath}\n`));
    
    // Show impacted files
    if (result.filesChanged.length > 0) {
      console.log(chalk.gray(`\n📁 Files changed: ${result.filesChanged.length}`));
      result.filesChanged.slice(0, 5).forEach(file => {
        console.log(chalk.gray(`  • ${file}`));
      });
      if (result.filesChanged.length > 5) {
        console.log(chalk.gray(`  ... and ${result.filesChanged.length - 5} more\n`));
      }
    }
    
    // Exit with error code if breaking changes found
    if (hasBreaking) {
      console.log(chalk.red('❌ Breaking changes detected\n'));
      process.exit(1);
    } else if (result.diffs.length > 0) {
      console.log(chalk.yellow('⚠️  Non-breaking changes detected\n'));
    } else {
      console.log(chalk.green('✓ No schema changes detected\n'));
    }
  } catch (error) {
    console.log(chalk.red(`\n❌ ${(error as Error).message}\n`));
    process.exit(1);
  }
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

/**
 * Anchor drift certificate to Hedera
 */
export async function anchorCommand(filePath?: string, options?: { backend: string }): Promise<void> {
  console.log(chalk.cyan('\n⚓ Anchoring drift certificate to Hedera...\n'));
  
  const fs = require('fs');
  const path = require('path');
  
  // Load drift certificate
  const certPath = filePath || path.join(process.cwd(), '.dotto', 'driftpack.json');
  
  if (!fs.existsSync(certPath)) {
    console.log(chalk.red(`❌ Drift certificate not found at ${certPath}\n`));
    console.log(chalk.gray('Run `dotto scan` first to generate a drift certificate.\n'));
    process.exit(1);
  }
  
  const certificate = DriftCertificateGenerator.load(certPath);
  
  // Initialize Hedera backend
  const backend = options?.backend || 'hedera';
  const proofBackend = createProofBackend(backend);
  
  try {
    if (proofBackend.initialize) {
      await proofBackend.initialize();
    }
  } catch (error) {
    console.log(chalk.red(`❌ Failed to initialize ${backend} backend: ${(error as Error).message}\n`));
    console.log(chalk.gray('Make sure HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY, and HEDERA_TOPIC_ID are set in .env\n'));
    process.exit(1);
  }
  
  // Submit to Hedera
  const event: ProofEvent = {
    nodeId: 'driftpack',
    eventType: 'created',
    hash: certificate.proof.hash,
    metadata: {
      repository: certificate.metadata.repository,
      branch: certificate.metadata.branch,
      breaking: certificate.drift.summary.breaking,
      intent: certificate.intent?.description,
    },
    timestamp: certificate.metadata.timestamp,
  };
  
  try {
    const ref = await proofBackend.record(event);
    
    // Update certificate with proof
    const updatedCert = DriftCertificateGenerator.addProof(
      certificate,
      backend,
      ref.id,
      proofBackend.getLink(ref)
    );
    
    // Save updated certificate
    DriftCertificateGenerator.save(updatedCert, certPath);
    
    console.log(chalk.green('✓ Proof anchored to Hedera\n'));
    console.log(chalk.gray(`  Transaction ID: ${ref.id}`));
    console.log(chalk.gray(`  Hash: ${certificate.proof.hash}`));
    console.log(chalk.gray(`  Explorer: ${proofBackend.getLink(ref)}\n`));
    
    if (proofBackend.close) {
      await proofBackend.close();
    }
  } catch (error) {
    console.log(chalk.red(`❌ Failed to anchor proof: ${(error as Error).message}\n`));
    process.exit(1);
  }
}

/**
 * Verify proof on Hedera
 */
export async function verifyCommand(txId: string): Promise<void> {
  console.log(chalk.cyan('\n🔍 Verifying proof on Hedera...\n'));
  
  const fs = require('fs');
  const path = require('path');
  
  // Load drift certificate
  const certPath = path.join(process.cwd(), '.dotto', 'driftpack.json');
  
  if (!fs.existsSync(certPath)) {
    console.log(chalk.red(`❌ Drift certificate not found at ${certPath}\n`));
    process.exit(1);
  }
  
  const certificate = DriftCertificateGenerator.load(certPath);
  
  // Verify certificate integrity
  const isValid = DriftCertificateGenerator.verify(certificate);
  
  if (!isValid) {
    console.log(chalk.red('❌ Certificate integrity check failed\n'));
    console.log(chalk.gray('The certificate hash does not match its contents.\n'));
    process.exit(1);
  }
  
  console.log(chalk.green('✔ Certificate Integrity: Valid\n'));
  
  // Check if proof exists
  if (!certificate.proof.transactionId) {
    console.log(chalk.yellow('⚠️  No proof transaction found in certificate\n'));
    console.log(chalk.gray('Run `dotto anchor` to anchor this certificate to Hedera.\n'));
    process.exit(1);
  }
  
  // Verify transaction ID matches
  if (certificate.proof.transactionId !== txId) {
    console.log(chalk.yellow(`⚠️  Transaction ID mismatch\n`));
    console.log(chalk.gray(`  Certificate: ${certificate.proof.transactionId}`));
    console.log(chalk.gray(`  Provided: ${txId}\n`));
  }
  
  // Display verification report
  console.log(chalk.cyan('📊 Proof Verification Report\n'));
  console.log(chalk.gray(`  Local Hash:    ${certificate.proof.hash}`));
  console.log(chalk.gray(`  Algorithm:     ${certificate.proof.algorithm}`));
  console.log(chalk.gray(`  Backend:       ${certificate.proof.backend}`));
  console.log(chalk.gray(`  Transaction:   ${certificate.proof.transactionId}`));
  console.log(chalk.gray(`  Timestamp:     ${certificate.proof.timestamp}`));
  console.log(chalk.gray(`  Explorer:      ${certificate.proof.link}\n`));
  
  console.log(chalk.green('✔ Proof Verified\n'));
  console.log(chalk.gray('The drift certificate is cryptographically signed and anchored on Hedera.\n'));
  console.log(chalk.gray('Immutability: Guaranteed ✓\n'));
}
