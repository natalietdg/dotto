export interface Artifact {
  id: string;
  file: string;
  hash: string;
  dependencies: string[];
  status: 'verified' | 'changed' | 'drifted';
  hederaTxId?: string;
  lastModified: string;
}
