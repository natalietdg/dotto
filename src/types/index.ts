export interface Artifact {
  id: string;
  file: string;
  hash: string;
  dependencies: string[];
  status: 'verified' | 'changed' | 'drifted';
  hederaTxId?: string;
  lastModified: string;
}

export interface ArtifactGraph {
  artifacts: Artifact[];
}

export interface dottoState {
  lastScan: string;
  artifacts: Record<string, {
    hash: string;
    hederaTxId?: string;
  }>;
}
