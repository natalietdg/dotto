/**
 * dotto - Data Object Trace & Transparency Orchestrator
 * Main library exports for programmatic usage
 */

// Core types
export * from './core/types';

// Graph engine
export { GraphEngine } from './graph/GraphEngine';

// Scanners
export { Crawler } from './scanner/Crawler';
export { TypeScriptScanner } from './scanner/TypeScriptScanner';
export { OpenAPIScanner } from './scanner/OpenAPIScanner';

// Analysis
export { ImpactAnalyzer } from './analysis/ImpactAnalyzer';
export { ProvenanceAnalyzer } from './analysis/ProvenanceAnalyzer';
export { CompatibilityChecker } from './analysis/CompatibilityChecker';
export { IntentDriftDetector } from './analysis/IntentDriftDetector';

// Proof backends
export { createProofBackend } from './proof';
export type { ProofBackend } from './proof/ProofBackend';

// UI
export { GraphGenerator } from './ui/GraphGenerator';
