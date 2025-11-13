#!/usr/bin/env node
/**
 * Prepare viewer with real graph data and drift info
 */

const fs = require('fs');
const path = require('path');

const rootGraphPath = path.join(__dirname, '../graph.json');
const viewerGraphPath = path.join(__dirname, '../src/viewer/public/graph.json');
const rootDriftPath = path.join(__dirname, '../drift.json');
const viewerDriftPath = path.join(__dirname, '../src/viewer/public/drift.json');
const rootDriftpackPath = path.join(__dirname, '../.dotto/driftpack.json');
const viewerDriftpackPath = path.join(__dirname, '../src/viewer/public/driftpack.json');

// Check if root graph.json exists
if (!fs.existsSync(rootGraphPath)) {
  console.error('❌ graph.json not found. Run "dotto crawl" first.');
  process.exit(1);
}

// Copy graph.json to viewer public directory
try {
  const graphData = fs.readFileSync(rootGraphPath, 'utf-8');
  fs.writeFileSync(viewerGraphPath, graphData);
  console.log('✅ Copied graph.json to viewer');
} catch (error) {
  console.error('❌ Failed to copy graph.json:', error.message);
  process.exit(1);
}

// Copy drift.json if it exists
if (fs.existsSync(rootDriftPath)) {
  try {
    const driftData = fs.readFileSync(rootDriftPath, 'utf-8');
    fs.writeFileSync(viewerDriftPath, driftData);
    console.log('✅ Copied drift.json to viewer');
  } catch (error) {
    console.warn('⚠️  Failed to copy drift.json:', error.message);
  }
} else {
  // Create empty drift.json
  fs.writeFileSync(viewerDriftPath, JSON.stringify({ diffs: [] }, null, 2));
  console.log('ℹ️  No drift.json found, created empty one');
}

// Copy driftpack.json if it exists
if (fs.existsSync(rootDriftpackPath)) {
  try {
    const driftpackData = fs.readFileSync(rootDriftpackPath, 'utf-8');
    fs.writeFileSync(viewerDriftpackPath, driftpackData);
    console.log('✅ Copied driftpack.json to viewer');
  } catch (error) {
    console.warn('⚠️  Failed to copy driftpack.json:', error.message);
  }
} else {
  console.log('ℹ️  No driftpack.json found (run "dotto scan" to generate)');
}
