#!/usr/bin/env node

/**
 * Demo Runner - Apply Breaking Change
 * Simulates developer refactoring TradeDto with breaking changes
 */

const fs = require('fs');
const path = require('path');

const TRADE_DTO_PATH = path.join(__dirname, '../examples/bank-a/trade-core/TradeDto.ts');
const TRADE_DTO_V2_PATH = path.join(__dirname, '../examples/bank-a/trade-core/TradeDto.v2.ts');
const BACKUP_PATH = path.join(__dirname, '../examples/bank-a/trade-core/TradeDto.backup.ts');

function applyDrift() {
  console.log('🔧 Applying schema drift to TradeDto...\n');
  
  // Backup original
  if (fs.existsSync(TRADE_DTO_PATH)) {
    fs.copyFileSync(TRADE_DTO_PATH, BACKUP_PATH);
    console.log('✅ Backed up original to TradeDto.backup.ts');
  }
  
  // Apply breaking change
  if (fs.existsSync(TRADE_DTO_V2_PATH)) {
    fs.copyFileSync(TRADE_DTO_V2_PATH, TRADE_DTO_PATH);
    console.log('✅ Applied breaking changes from TradeDto.v2.ts\n');
  } else {
    console.error('❌ TradeDto.v2.ts not found');
    process.exit(1);
  }
  
  console.log('📝 Changes applied:');
  console.log('  • Field renamed: price_precision → decimal_places');
  console.log('  • Intent changed: "floor rounding" → "bankers\' rounding"');
  console.log('  • Semantic drift: Conservative P&L → Accurate settlement\n');
  
  console.log('⚠️  Impact:');
  console.log('  • ClearingDto still references price_precision (compilation error)');
  console.log('  • RiskCalculationDto may update field name but miss intent change');
  console.log('  • Potential for silent P&L calculation errors\n');
  
  console.log('🔍 Next step: Run "npm run scan:diff" to detect drift');
}

function restoreDrift() {
  console.log('🔄 Restoring original TradeDto...\n');
  
  if (fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(BACKUP_PATH, TRADE_DTO_PATH);
    fs.unlinkSync(BACKUP_PATH);
    console.log('✅ Restored original TradeDto');
    console.log('🔍 Run "npm run scan" to rebuild baseline');
  } else {
    console.error('❌ Backup file not found');
    process.exit(1);
  }
}

// CLI
const command = process.argv[2];

if (command === 'restore') {
  restoreDrift();
} else {
  applyDrift();
}
