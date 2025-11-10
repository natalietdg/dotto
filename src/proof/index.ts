/**
 * Proof backend factory
 */

import { ProofBackend } from './ProofBackend';
import { NoneBackend } from './NoneBackend';
import { GitBackend } from './GitBackend';
import { HederaBackend } from './HederaBackend';
import { SigstoreBackend } from './SigstoreBackend';

export { ProofBackend } from './ProofBackend';
export { NoneBackend } from './NoneBackend';
export { GitBackend } from './GitBackend';
export { HederaBackend } from './HederaBackend';
export { SigstoreBackend } from './SigstoreBackend';

export function createProofBackend(type: string): ProofBackend {
  switch (type.toLowerCase()) {
    case 'none':
      return new NoneBackend();
    case 'git':
      return new GitBackend();
    case 'hedera':
      return new HederaBackend();
    case 'sigstore':
      return new SigstoreBackend();
    default:
      throw new Error(`Unknown proof backend: ${type}`);
  }
}
