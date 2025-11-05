import * as path from 'path';
import chalk from 'chalk';
import { HederaClient } from '../utils/hederaClient';
import { readJsonFile, writeJsonFile } from '../utils/fileUtils';
import { ArtifactGraph, DottoState } from '../types';

export async function verifyCommand(rootDir: string = process.cwd()): Promise<void> {
  console.log(chalk.cyan('🔐 DoTTO: Verifying schemas on Hedera...\n'));

  const artifactsFile = path.join(rootDir, 'artifacts.json');
  const stateFile = path.join(rootDir, 'dotto_state.json');

  // Load artifacts
  const artifactGraph = readJsonFile<ArtifactGraph>(artifactsFile);
  if (!artifactGraph || !artifactGraph.artifacts.length) {
    console.log(chalk.yellow('⚠️  No artifacts found. Run "dotto scan" first.'));
    return;
  }

  // Filter artifacts that need verification (changed or drifted)
  const toVerify = artifactGraph.artifacts.filter(
    (a) => a.status === 'changed' || a.status === 'drifted'
  );

  if (toVerify.length === 0) {
    console.log(chalk.green('✓ All schemas are already verified!'));
    return;
  }

  console.log(chalk.gray(`Found ${toVerify.length} schema(s) to verify\n`));

  // Initialize Hedera client
  let client: HederaClient;
  try {
    client = new HederaClient();
    await client.initialize();
  } catch (error) {
    console.log(chalk.red('❌ Failed to initialize Hedera client:'));
    console.log(chalk.red(`   ${(error as Error).message}`));
    console.log(chalk.gray('\n💡 Make sure to create a .env file with your Hedera credentials'));
    console.log(chalk.gray('   See .env.example for reference'));
    return;
  }

  // Verify each artifact
  const verifiedCount = { success: 0, failed: 0 };

  for (const artifact of toVerify) {
    try {
      const message = JSON.stringify({
        id: artifact.id,
        file: artifact.file,
        hash: artifact.hash,
        timestamp: new Date().toISOString(),
      });

      console.log(chalk.gray(`Submitting ${artifact.id}...`));
      const txId = await client.submitMessage(message);
      
      // Update artifact
      artifact.hederaTxId = txId;
      artifact.status = 'verified';
      
      console.log(chalk.green(`✓ ${artifact.id} verified (TX ${txId})`));
      verifiedCount.success++;
    } catch (error) {
      console.log(chalk.red(`✗ ${artifact.id} failed: ${(error as Error).message}`));
      verifiedCount.failed++;
    }
  }

  // Save updated artifacts
  writeJsonFile(artifactsFile, artifactGraph);

  // Update state
  const state = readJsonFile<DottoState>(stateFile) || {
    lastScan: new Date().toISOString(),
    artifacts: {},
  };

  artifactGraph.artifacts.forEach((artifact) => {
    state.artifacts[artifact.id] = {
      hash: artifact.hash,
      hederaTxId: artifact.hederaTxId,
    };
  });

  writeJsonFile(stateFile, state);

  // Close client
  await client.close();

  // Summary
  console.log(chalk.cyan('\n📊 Verification Summary:'));
  console.log(chalk.green(`   ✓ Success: ${verifiedCount.success}`));
  if (verifiedCount.failed > 0) {
    console.log(chalk.red(`   ✗ Failed: ${verifiedCount.failed}`));
  }
  console.log(chalk.gray('\n⚙️  artifacts.json updated'));
}
