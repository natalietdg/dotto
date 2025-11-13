/**
 * Intent Capture - Prompt users to document why they made breaking changes
 * This is the category-creation feature for DoTTO
 */

import * as readline from 'readline';

export interface IntentResponse {
  description: string;
  approvedBy?: string;
}

export class IntentCapture {
  /**
   * Prompt user for intent when breaking changes are detected
   */
  static async prompt(breakingCount: number): Promise<IntentResponse | undefined> {
    console.log('\n⚠️  Breaking changes detected. Please provide intent for audit trail:\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    return new Promise((resolve) => {
      rl.question('Why are you making this breaking change? (or press Enter to skip): ', (description) => {
        if (!description.trim()) {
          rl.close();
          resolve(undefined);
          return;
        }
        
        rl.question('Approved by (optional, press Enter to skip): ', (approvedBy) => {
          rl.close();
          resolve({
            description: description.trim(),
            approvedBy: approvedBy.trim() || undefined,
          });
        });
      });
    });
  }
  
  /**
   * Non-interactive mode - get intent from environment or config
   */
  static fromEnvironment(): IntentResponse | undefined {
    const description = process.env.DOTTO_INTENT;
    const approvedBy = process.env.DOTTO_APPROVED_BY;
    
    if (description) {
      return {
        description,
        approvedBy,
      };
    }
    
    return undefined;
  }
}
