import * as path from 'path';
import chalk from 'chalk';
import { ASTParser } from '../parser/astParser';
import {
  findSchemaFiles,
  computeFileHash,
  getRelativePath,
  readJsonFile,
  writeJsonFile,
  getFileModifiedTime,
} from '../utils/fileUtils';
import { Artifact, ArtifactGraph, DottoState } from '../types';

export async function scanCommand(rootDir: string = process.cwd()): Promise<void> {
  console.log(chalk.cyan('🔍 DoTTO: Scanning for schema files...\n'));

  const stateFile = path.join(rootDir, 'dotto_state.json');
  const artifactsFile = path.join(rootDir, 'artifacts.json');

  // Load previous state
  const previousState = readJsonFile<DottoState>(stateFile) || {
    lastScan: new Date().toISOString(),
    artifacts: {},
  };

  // Find all schema files
  const files = await findSchemaFiles(rootDir);
  console.log(chalk.gray(`Found ${files.length} schema file(s)\n`));

  if (files.length === 0) {
    console.log(chalk.yellow('⚠️  No schema files found. Looking for *.dto.ts, *.schema.ts, *.schema.json'));
    return;
  }

  // Parse and analyze files
  const parser = new ASTParser();
  const artifacts: Artifact[] = [];
  const statusCounts = { verified: 0, changed: 0, drifted: 0 };

  for (const file of files) {
    const relativePath = getRelativePath(file, rootDir);
    const hash = computeFileHash(file);
    const parsed = parser.parse(file);

    const previousArtifact = previousState.artifacts[parsed.id];
    let status: 'verified' | 'changed' | 'drifted' = 'changed';

    if (previousArtifact) {
      if (previousArtifact.hash === hash) {
        status = 'verified';
      } else {
        // Hash changed - mark as drifted if it was previously verified
        status = previousArtifact.hederaTxId ? 'drifted' : 'changed';
      }
    }

    const artifact: Artifact = {
      id: parsed.id,
      file: relativePath,
      hash,
      dependencies: parsed.dependencies,
      status,
      hederaTxId: previousArtifact?.hederaTxId,
      lastModified: getFileModifiedTime(file),
    };

    artifacts.push(artifact);
    statusCounts[status]++;

    // Print status
    const statusIcon = status === 'verified' ? '🟢' : status === 'changed' ? '🟡' : '🔴';
    const statusColor = status === 'verified' ? chalk.green : status === 'changed' ? chalk.yellow : chalk.red;
    const txInfo = artifact.hederaTxId ? ` (TX ${artifact.hederaTxId})` : '';
    
    console.log(`${statusIcon} ${statusColor(artifact.id)} - ${relativePath}${txInfo}`);
    
    if (status === 'drifted') {
      console.log(chalk.red(`   └─ Schema drift detected: hash changed from previous verified state`));
    }
  }

  // Save artifacts
  const artifactGraph: ArtifactGraph = { artifacts };
  writeJsonFile(artifactsFile, artifactGraph);

  // Update state
  const newState: DottoState = {
    lastScan: new Date().toISOString(),
    artifacts: artifacts.reduce((acc, artifact) => {
      acc[artifact.id] = {
        hash: artifact.hash,
        hederaTxId: artifact.hederaTxId,
      };
      return acc;
    }, {} as DottoState['artifacts']),
  };
  writeJsonFile(stateFile, newState);

  // Summary
  console.log(chalk.cyan('\n📊 Summary:'));
  console.log(chalk.green(`   ✓ Verified: ${statusCounts.verified}`));
  console.log(chalk.yellow(`   ⚡ Changed: ${statusCounts.changed}`));
  console.log(chalk.red(`   ⚠️  Drifted: ${statusCounts.drifted}`));
  console.log(chalk.gray(`\n⚙️  artifacts.json updated`));
}
