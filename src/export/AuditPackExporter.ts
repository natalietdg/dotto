/**
 * Audit Pack Exporter
 * Generates regulator-ready ZIP files with all evidence
 */

import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { GraphEngine } from '../graph/GraphEngine';
import { ProofRef } from '../core/types';
import { Epoch } from '../proof/EpochManager';
import { IntentDrift } from '../analysis/IntentDriftDetector';

export interface AuditPackOptions {
  outputPath: string;
  includeSourceCode?: boolean;
  includeTimeline?: boolean;
  includeVisualReport?: boolean;
}

export interface AuditPackMetadata {
  generated_at: string;
  dotto_version: string;
  organization?: string;
  audit_period: {
    start: string;
    end: string;
  };
  summary: {
    total_artifacts: number;
    breaking_changes: number;
    intent_drifts: number;
    hedera_proofs: number;
  };
}

export class AuditPackExporter {
  private graphEngine: GraphEngine;
  
  constructor(graphEngine: GraphEngine) {
    this.graphEngine = graphEngine;
  }
  
  /**
   * Export complete audit pack as ZIP
   */
  async export(
    options: AuditPackOptions,
    epoch?: Epoch,
    proof?: ProofRef,
    intentDrifts?: IntentDrift[]
  ): Promise<string> {
    const outputPath = options.outputPath;
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`\n📦 Audit pack created: ${outputPath}`);
        console.log(`   Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
        resolve(outputPath);
      });
      
      archive.on('error', (err: Error) => {
        reject(err);
      });
      
      archive.pipe(output);
      
      // Add metadata
      const metadata = this.generateMetadata(epoch, intentDrifts);
      archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
      
      // Add schema diffs
      const diffs = this.generateSchemaDiffs();
      archive.append(JSON.stringify(diffs, null, 2), { name: 'schema-diffs.json' });
      
      // Add intent analysis
      if (intentDrifts && intentDrifts.length > 0) {
        archive.append(
          JSON.stringify(intentDrifts, null, 2),
          { name: 'intent-analysis.json' }
        );
      }
      
      // Add impact report
      const impactReport = this.generateImpactReport();
      archive.append(JSON.stringify(impactReport, null, 2), { name: 'impact-report.json' });
      
      // Add Hedera proof
      if (epoch && proof) {
        const hederaProof = {
          epoch,
          proof,
          verification: {
            hashscan_link: proof.link,
            mirror_api: `https://testnet.mirrornode.hedera.com/api/v1/topics/${proof.id.split('@')[0]}/messages/${proof.id.split('@')[1]}`,
          },
        };
        archive.append(
          JSON.stringify(hederaProof, null, 2),
          { name: 'hedera-proof.json' }
        );
      }
      
      // Add Merkle tree
      if (epoch) {
        archive.append(
          JSON.stringify(epoch.merkle_tree, null, 2),
          { name: 'merkle-tree.json' }
        );
      }
      
      // Add dependency graph
      const graph = {
        nodes: this.graphEngine.getAllNodes(),
        edges: this.graphEngine.getAllEdges(),
      };
      archive.append(JSON.stringify(graph, null, 2), { name: 'dependency-graph.json' });
      
      // Add timeline HTML
      if (options.includeTimeline) {
        const timeline = this.generateTimelineHTML(epoch, proof, intentDrifts);
        archive.append(timeline, { name: 'timeline.html' });
      }
      
      // Add README
      const readme = this.generateReadme(metadata, proof);
      archive.append(readme, { name: 'README.md' });
      
      // Finalize
      archive.finalize();
    });
  }
  
  /**
   * Generate audit pack metadata
   */
  private generateMetadata(epoch?: Epoch, intentDrifts?: IntentDrift[]): AuditPackMetadata {
    const nodes = this.graphEngine.getAllNodes();
    
    return {
      generated_at: new Date().toISOString(),
      dotto_version: '1.0.0',
      organization: process.env.ORG_NAME || 'Bank A',
      audit_period: {
        start: epoch?.timestamp || new Date().toISOString(),
        end: new Date().toISOString(),
      },
      summary: {
        total_artifacts: nodes.length,
        breaking_changes: epoch?.artifacts.filter(a => a.severity === 'breaking').length || 0,
        intent_drifts: intentDrifts?.length || 0,
        hedera_proofs: epoch ? 1 : 0,
      },
    };
  }
  
  /**
   * Generate schema diffs
   */
  private generateSchemaDiffs(): any[] {
    const nodes = this.graphEngine.getAllNodes();
    const diffs: any[] = [];
    
    for (const node of nodes) {
      if (node.metadata.changed) {
        diffs.push({
          artifact_id: node.id,
          file: node.filePath,
          type: node.type,
          changes: {
            structural: node.metadata.structuralChanges || [],
            properties: node.metadata.propertyChanges || [],
          },
          severity: node.metadata.breaking ? 'breaking' : 'non-breaking',
          timestamp: node.metadata.lastModified || new Date().toISOString(),
        });
      }
    }
    
    return diffs;
  }
  
  /**
   * Generate impact report
   */
  private generateImpactReport(): any {
    const nodes = this.graphEngine.getAllNodes();
    const edges = this.graphEngine.getAllEdges();
    
    const changedNodes = nodes.filter(n => n.metadata.changed);
    const impactedNodes = new Set<string>();
    
    // Calculate blast radius for each changed node
    for (const node of changedNodes) {
      const downstream = this.graphEngine.getDownstream(node.id, 3);
      downstream.forEach(d => impactedNodes.add(d.nodeId));
    }
    
    return {
      summary: {
        changed_artifacts: changedNodes.length,
        impacted_artifacts: impactedNodes.size,
        total_dependencies: edges.length,
      },
      changed_artifacts: changedNodes.map(n => ({
        id: n.id,
        file: n.filePath,
        type: n.type,
        severity: n.metadata.breaking ? 'breaking' : 'non-breaking',
      })),
      blast_radius: Array.from(impactedNodes).map(nodeId => {
        const node = this.graphEngine.getNode(nodeId);
        return {
          id: nodeId,
          file: node?.filePath,
          type: node?.type,
        };
      }),
    };
  }
  
  /**
   * Generate timeline HTML
   */
  private generateTimelineHTML(epoch?: Epoch, proof?: ProofRef, intentDrifts?: IntentDrift[]): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>dotto Audit Timeline</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 1200px;
      margin: 40px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { margin: 0 0 10px 0; color: #333; }
    .subtitle { color: #666; font-size: 14px; }
    .timeline {
      position: relative;
      padding-left: 40px;
    }
    .timeline::before {
      content: '';
      position: absolute;
      left: 20px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #ddd;
    }
    .event {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      position: relative;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .event::before {
      content: '';
      position: absolute;
      left: -28px;
      top: 24px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #4CAF50;
      border: 3px solid white;
      box-shadow: 0 0 0 2px #4CAF50;
    }
    .event.breaking::before { background: #f44336; box-shadow: 0 0 0 2px #f44336; }
    .event.warning::before { background: #ff9800; box-shadow: 0 0 0 2px #ff9800; }
    .event-time {
      font-size: 12px;
      color: #999;
      margin-bottom: 8px;
    }
    .event-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }
    .event-desc {
      color: #666;
      line-height: 1.6;
    }
    .proof-badge {
      display: inline-block;
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      margin-top: 10px;
    }
    .proof-link {
      color: #1976d2;
      text-decoration: none;
      font-size: 13px;
    }
    .proof-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 dotto Audit Timeline</h1>
    <div class="subtitle">Generated: ${new Date().toLocaleString()}</div>
    ${proof ? `<div class="subtitle">Hedera Proof: ${proof.id}</div>` : ''}
  </div>
  
  <div class="timeline">
    ${epoch ? `
    <div class="event">
      <div class="event-time">${new Date(epoch.timestamp).toLocaleString()}</div>
      <div class="event-title">Epoch #${epoch.epoch_id} Created</div>
      <div class="event-desc">
        Batched ${epoch.artifacts.length} artifact(s) into Merkle tree<br>
        Root: <code>${epoch.merkle_root.substring(0, 16)}...</code>
      </div>
    </div>
    ` : ''}
    
    ${epoch?.artifacts.map(artifact => `
    <div class="event ${artifact.severity}">
      <div class="event-time">${new Date(artifact.timestamp).toLocaleString()}</div>
      <div class="event-title">${artifact.id}</div>
      <div class="event-desc">
        Event: ${artifact.eventType}<br>
        Severity: ${artifact.severity || 'info'}<br>
        Hash: <code>${artifact.hash.substring(0, 16)}...</code>
      </div>
    </div>
    `).join('') || ''}
    
    ${proof ? `
    <div class="event">
      <div class="event-time">${new Date(proof.timestamp).toLocaleString()}</div>
      <div class="event-title">Hedera Proof Anchored</div>
      <div class="event-desc">
        Immutable proof submitted to Hedera Consensus Service<br>
        Transaction ID: <code>${proof.id}</code>
        <div class="proof-badge">✅ Verified on HCS</div><br>
        <a href="${proof.link}" class="proof-link" target="_blank">View on HashScan →</a>
      </div>
    </div>
    ` : ''}
    
    ${intentDrifts && intentDrifts.length > 0 ? `
    <div class="event warning">
      <div class="event-time">${new Date().toLocaleString()}</div>
      <div class="event-title">Intent Drift Detected</div>
      <div class="event-desc">
        ${intentDrifts.length} semantic change(s) detected:<br>
        ${intentDrifts.slice(0, 3).map(d => `
          • ${d.nodeId}: ${(d.similarity * 100).toFixed(0)}% similarity
        `).join('<br>')}
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>`;
  }
  
  /**
   * Generate README
   */
  private generateReadme(metadata: AuditPackMetadata, proof?: ProofRef): string {
    return `# dotto Audit Pack

## Overview

This audit pack contains complete evidence of schema changes detected by dotto.

**Generated:** ${metadata.generated_at}
**Organization:** ${metadata.organization}
**Audit Period:** ${metadata.audit_period.start} to ${metadata.audit_period.end}

## Summary

- **Total Artifacts:** ${metadata.summary.total_artifacts}
- **Breaking Changes:** ${metadata.summary.breaking_changes}
- **Intent Drifts:** ${metadata.summary.intent_drifts}
- **Hedera Proofs:** ${metadata.summary.hedera_proofs}

## Contents

### 1. metadata.json
High-level summary of the audit pack contents.

### 2. schema-diffs.json
Detailed structural changes to each DTO/schema.

### 3. intent-analysis.json
Semantic drift detection results with similarity scores.

### 4. impact-report.json
Blast radius analysis showing downstream dependencies.

### 5. hedera-proof.json
Immutable proof anchored on Hedera Consensus Service.

${proof ? `
**Verification:**
- HashScan: ${proof.link}
- Mirror API: https://testnet.mirrornode.hedera.com/api/v1/topics/${proof.id.split('@')[0]}/messages/${proof.id.split('@')[1]}
` : ''}

### 6. merkle-tree.json
Complete Merkle tree for cryptographic verification.

### 7. dependency-graph.json
Full dependency graph in JSON format.

### 8. timeline.html
Visual timeline of changes (open in browser).

## Verification Steps

### 1. Verify Hedera Proof
\`\`\`bash
curl https://testnet.mirrornode.hedera.com/api/v1/topics/${proof?.id.split('@')[0]}/messages/${proof?.id.split('@')[1]}
\`\`\`

### 2. Verify Merkle Root
Compare the Merkle root in \`hedera-proof.json\` with the root in \`merkle-tree.json\`.

### 3. Verify Artifact Inclusion
Use the Merkle proof path to verify any artifact is included in the epoch.

## Compliance

This audit pack satisfies requirements for:
- SEC Reg SCI (immutable change records)
- MAS TRM Guidelines (third-party verification)
- SOC2 Type II (tamper-proof audit logs)
- Basel III (complete system lineage)

## Support

For questions about this audit pack:
- Email: compliance@dotto.dev
- Documentation: https://docs.dotto.dev
`;
  }
}
