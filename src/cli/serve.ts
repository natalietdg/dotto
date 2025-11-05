import * as path from 'path';
import * as fs from 'fs';
import express from 'express';
import chalk from 'chalk';
import { readJsonFile, writeJsonFile } from '../utils/fileUtils';
import { ArtifactGraph, DottoState } from '../types';
import { HederaClient } from '../utils/hederaClient';
import { computeFileHash } from '../utils/fileUtils';

const PORT = 3456;

export async function serveCommand(rootDir: string = process.cwd()): Promise<void> {
  const app = express();
  app.use(express.json());

  const artifactsFile = path.join(rootDir, 'artifacts.json');
  const stateFile = path.join(rootDir, 'dotto_state.json');
  const viewerDistPath = path.join(__dirname, '../../src/viewer/dist');

  // Check if viewer is built
  if (!fs.existsSync(viewerDistPath)) {
    console.log(chalk.yellow('⚠️  Viewer not built. Building now...'));
    console.log(chalk.gray('   This may take a moment...\n'));
    
    // In production, the viewer should be pre-built
    console.log(chalk.red('❌ Viewer build not found.'));
    console.log(chalk.gray('   Please run: npm run build:viewer'));
    return;
  }

  // Serve static files
  app.use(express.static(viewerDistPath));

  // API: Get artifacts
  app.get('/api/artifacts', (req, res) => {
    const artifacts = readJsonFile<ArtifactGraph>(artifactsFile);
    if (!artifacts) {
      return res.json({ artifacts: [] });
    }
    res.json(artifacts);
  });

  // API: Verify all changed/drifted artifacts
  app.post('/api/verify', async (req, res) => {
    try {
      const artifactGraph = readJsonFile<ArtifactGraph>(artifactsFile);
      if (!artifactGraph) {
        return res.status(404).json({ error: 'No artifacts found' });
      }

      const toVerify = artifactGraph.artifacts.filter(
        (a) => a.status === 'changed' || a.status === 'drifted'
      );

      if (toVerify.length === 0) {
        return res.json({ message: 'All schemas already verified', verified: 0 });
      }

      // Initialize Hedera client
      const client = new HederaClient();
      await client.initialize();

      let verifiedCount = 0;

      for (const artifact of toVerify) {
        try {
          // Re-compute hash to ensure it's current
          const fullPath = path.join(rootDir, artifact.file);
          const currentHash = computeFileHash(fullPath);
          artifact.hash = currentHash;

          const message = JSON.stringify({
            id: artifact.id,
            file: artifact.file,
            hash: artifact.hash,
            timestamp: new Date().toISOString(),
          });

          const txId = await client.submitMessage(message);
          artifact.hederaTxId = txId;
          artifact.status = 'verified';
          verifiedCount++;
        } catch (error) {
          console.error(`Failed to verify ${artifact.id}:`, error);
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

      await client.close();

      res.json({ message: 'Verification complete', verified: verifiedCount });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Serve index.html for all other routes (SPA)
  app.get('*', (req, res) => {
    res.sendFile(path.join(viewerDistPath, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(chalk.cyan('🚀 DoTTO Viewer running!\n'));
    console.log(chalk.green(`   → Local: http://localhost:${PORT}`));
    console.log(chalk.gray('\n   Press Ctrl+C to stop\n'));
  });
}
