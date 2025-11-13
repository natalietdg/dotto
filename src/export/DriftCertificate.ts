/**
 * Drift Certificate - Immutable, portable proof of schema drift
 * This is the core product for compliance and Hedera integration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { SchemaDiff } from '../diff/SchemaDiffer';

export interface DriftCertificate {
  version: string;
  metadata: {
    repository: string;
    branch: string;
    baseCommit: string;
    headCommit: string;
    timestamp: string;
    author: string;
  };
  drift: {
    summary: {
      breaking: number;
      nonBreaking: number;
      filesChanged: number;
    };
    changes: SchemaDiff[];
  };
  intent?: {
    description: string;
    approvedBy?: string;
    timestamp: string;
  };
  proof: {
    hash: string;
    algorithm: string;
    backend: string;
    transactionId?: string; // Hedera txID
    timestamp?: string;
    link?: string;
  };
}

export class DriftCertificateGenerator {
  /**
   * Generate a drift certificate from scan results
   */
  static generate(
    drifts: SchemaDiff[],
    metadata: {
      repository: string;
      branch: string;
      baseCommit: string;
      headCommit: string;
      author: string;
    },
    intent?: {
      description: string;
      approvedBy?: string;
    }
  ): DriftCertificate {
    const breaking = drifts.filter(d => d.breaking).length;
    const nonBreaking = drifts.filter(d => !d.breaking).length;
    
    const certificate: DriftCertificate = {
      version: '1.0.0',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
      drift: {
        summary: {
          breaking,
          nonBreaking,
          filesChanged: new Set(drifts.map(d => d.nodeId.split(':')[0])).size,
        },
        changes: drifts,
      },
      intent: intent ? {
        ...intent,
        timestamp: new Date().toISOString(),
      } : undefined,
      proof: {
        hash: '',
        algorithm: 'sha256',
        backend: 'none',
      },
    };
    
    // Compute hash of certificate (excluding proof section)
    const certForHash = { ...certificate };
    delete (certForHash as any).proof;
    certificate.proof.hash = this.computeHash(certForHash);
    
    return certificate;
  }
  
  /**
   * Save certificate to .dotto/driftpack.json
   */
  static save(certificate: DriftCertificate, outputPath?: string): string {
    const dottoDir = path.join(process.cwd(), '.dotto');
    if (!fs.existsSync(dottoDir)) {
      fs.mkdirSync(dottoDir, { recursive: true });
    }
    
    const filePath = outputPath || path.join(dottoDir, 'driftpack.json');
    fs.writeFileSync(filePath, JSON.stringify(certificate, null, 2));
    
    return filePath;
  }
  
  /**
   * Load certificate from file
   */
  static load(filePath?: string): DriftCertificate {
    const certPath = filePath || path.join(process.cwd(), '.dotto', 'driftpack.json');
    const content = fs.readFileSync(certPath, 'utf-8');
    return JSON.parse(content);
  }
  
  /**
   * Compute SHA-256 hash of certificate
   */
  static computeHash(data: any): string {
    const json = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }
  
  /**
   * Verify certificate integrity
   */
  static verify(certificate: DriftCertificate): boolean {
    const certForHash = { ...certificate };
    delete (certForHash as any).proof;
    const computedHash = this.computeHash(certForHash);
    
    return computedHash === certificate.proof.hash;
  }
  
  /**
   * Add proof transaction ID (after anchoring to Hedera)
   */
  static addProof(
    certificate: DriftCertificate,
    backend: string,
    transactionId: string,
    link?: string
  ): DriftCertificate {
    certificate.proof.backend = backend;
    certificate.proof.transactionId = transactionId;
    certificate.proof.timestamp = new Date().toISOString();
    certificate.proof.link = link;
    
    return certificate;
  }
}
