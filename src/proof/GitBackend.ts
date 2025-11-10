/**
 * Git-based proof backend
 * Records proofs as git commits with signed tags
 */

import { ProofBackend } from './ProofBackend';
import { ProofRef, ProofEvent } from '../core/types';
import * as crypto from 'crypto';

export class GitBackend implements ProofBackend {
  readonly name = 'git';
  
  async record(event: ProofEvent): Promise<ProofRef> {
    // Stub: In production, this would create a git commit/tag
    const commitHash = crypto.createHash('sha1')
      .update(JSON.stringify(event))
      .digest('hex')
      .substring(0, 7);
    
    return {
      backend: this.name,
      id: `git-${commitHash}`,
      timestamp: new Date().toISOString(),
      link: `commit:${commitHash}`,
    };
  }
  
  async verify(ref: ProofRef): Promise<boolean> {
    // Stub: Would verify git commit signature
    return ref.backend === this.name && ref.id.startsWith('git-');
  }
  
  getLink(ref: ProofRef): string {
    const commitId = ref.id.replace('git-', '');
    return `git log --show-signature ${commitId}`;
  }
}
