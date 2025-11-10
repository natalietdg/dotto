/**
 * Intent Drift Detector
 * Detects semantic changes in @intent comments using similarity scoring
 */

export interface IntentDrift {
  nodeId: string;
  oldIntent: string;
  newIntent: string;
  similarity: number;
  isDrift: boolean;
  severity: 'high' | 'medium' | 'low';
  explanation: string;
}

export class IntentDriftDetector {
  private similarityThreshold: number;
  
  constructor(similarityThreshold: number = 0.80) {
    this.similarityThreshold = similarityThreshold;
  }
  
  /**
   * Detect intent drift between two versions
   */
  detectDrift(
    nodeId: string,
    oldIntent: string | undefined,
    newIntent: string | undefined
  ): IntentDrift | null {
    // No drift if both undefined or same
    if (!oldIntent && !newIntent) {
      return null;
    }
    
    if (oldIntent === newIntent) {
      return null;
    }
    
    // Intent added or removed
    if (!oldIntent || !newIntent) {
      return {
        nodeId,
        oldIntent: oldIntent || '(none)',
        newIntent: newIntent || '(none)',
        similarity: 0,
        isDrift: true,
        severity: 'medium',
        explanation: oldIntent ? 'Intent removed' : 'Intent added',
      };
    }
    
    // Calculate similarity
    const similarity = this.calculateSimilarity(oldIntent, newIntent);
    const isDrift = similarity < this.similarityThreshold;
    
    return {
      nodeId,
      oldIntent,
      newIntent,
      similarity,
      isDrift,
      severity: this.determineSeverity(similarity),
      explanation: this.explainDrift(oldIntent, newIntent, similarity),
    };
  }
  
  /**
   * Calculate semantic similarity between two intent strings
   * Uses multiple techniques for robustness
   */
  private calculateSimilarity(intent1: string, intent2: string): number {
    // Normalize
    const norm1 = this.normalize(intent1);
    const norm2 = this.normalize(intent2);
    
    // Multiple similarity metrics
    const jacc = this.jaccardSimilarity(norm1, norm2);
    const cosine = this.cosineSimilarity(norm1, norm2);
    const leven = this.levenshteinSimilarity(intent1, intent2);
    
    // Weighted average (favor semantic over syntactic)
    return (jacc * 0.4) + (cosine * 0.4) + (leven * 0.2);
  }
  
  /**
   * Normalize text for comparison
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Jaccard similarity (set-based)
   */
  private jaccardSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(' '));
    const words2 = new Set(text2.split(' '));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
  
  /**
   * Cosine similarity (vector-based with TF weighting)
   */
  private cosineSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    
    // Build vocabulary
    const vocab = new Set([...words1, ...words2]);
    
    // Term frequency vectors
    const vec1 = this.buildTFVector(words1, vocab);
    const vec2 = this.buildTFVector(words2, vocab);
    
    // Dot product
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (const word of vocab) {
      const v1 = vec1.get(word) || 0;
      const v2 = vec2.get(word) || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    }
    
    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
  
  /**
   * Build term frequency vector
   */
  private buildTFVector(words: string[], vocab: Set<string>): Map<string, number> {
    const tf = new Map<string, number>();
    
    for (const word of words) {
      tf.set(word, (tf.get(word) || 0) + 1);
    }
    
    return tf;
  }
  
  /**
   * Levenshtein similarity (edit distance)
   */
  private levenshteinSimilarity(text1: string, text2: string): number {
    const distance = this.levenshteinDistance(text1, text2);
    const maxLen = Math.max(text1.length, text2.length);
    return maxLen === 0 ? 1 : 1 - (distance / maxLen);
  }
  
  /**
   * Levenshtein distance (edit distance)
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    // Create distance matrix
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));
    
    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    // Fill matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }
    
    return dp[m][n];
  }
  
  /**
   * Determine severity based on similarity score
   */
  private determineSeverity(similarity: number): 'high' | 'medium' | 'low' {
    if (similarity < 0.50) return 'high';
    if (similarity < 0.70) return 'medium';
    return 'low';
  }
  
  /**
   * Explain what changed in the intent
   */
  private explainDrift(oldIntent: string, newIntent: string, similarity: number): string {
    const oldWords = new Set(this.normalize(oldIntent).split(' '));
    const newWords = new Set(this.normalize(newIntent).split(' '));
    
    const added = [...newWords].filter(w => !oldWords.has(w));
    const removed = [...oldWords].filter(w => !newWords.has(w));
    
    const parts: string[] = [];
    
    if (removed.length > 0) {
      parts.push(`Removed concepts: ${removed.slice(0, 3).join(', ')}`);
    }
    
    if (added.length > 0) {
      parts.push(`Added concepts: ${added.slice(0, 3).join(', ')}`);
    }
    
    if (similarity < 0.50) {
      parts.push('Fundamental semantic change detected');
    } else if (similarity < 0.70) {
      parts.push('Moderate semantic shift');
    } else {
      parts.push('Minor wording change');
    }
    
    return parts.join('. ');
  }
  
  /**
   * Batch detect drift across multiple nodes
   */
  detectBatchDrift(
    oldNodes: Map<string, string | undefined>,
    newNodes: Map<string, string | undefined>
  ): IntentDrift[] {
    const drifts: IntentDrift[] = [];
    
    // Check all nodes that exist in either version
    const allNodeIds = new Set([...oldNodes.keys(), ...newNodes.keys()]);
    
    for (const nodeId of allNodeIds) {
      const drift = this.detectDrift(
        nodeId,
        oldNodes.get(nodeId),
        newNodes.get(nodeId)
      );
      
      if (drift && drift.isDrift) {
        drifts.push(drift);
      }
    }
    
    return drifts;
  }
  
  /**
   * Format drift report
   */
  formatDriftReport(drifts: IntentDrift[]): string {
    if (drifts.length === 0) {
      return '\n✅ No intent drift detected\n';
    }
    
    let report = `\n⚠️  ${drifts.length} intent drift(s) detected:\n\n`;
    
    const high = drifts.filter(d => d.severity === 'high');
    const medium = drifts.filter(d => d.severity === 'medium');
    const low = drifts.filter(d => d.severity === 'low');
    
    if (high.length > 0) {
      report += `🔴 High Severity (${high.length}):\n`;
      for (const drift of high) {
        report += `  • ${drift.nodeId}\n`;
        report += `    Similarity: ${(drift.similarity * 100).toFixed(0)}%\n`;
        report += `    Old: "${drift.oldIntent.substring(0, 60)}..."\n`;
        report += `    New: "${drift.newIntent.substring(0, 60)}..."\n`;
        report += `    ${drift.explanation}\n\n`;
      }
    }
    
    if (medium.length > 0) {
      report += `🟡 Medium Severity (${medium.length}):\n`;
      for (const drift of medium) {
        report += `  • ${drift.nodeId} (${(drift.similarity * 100).toFixed(0)}% similar)\n`;
      }
      report += '\n';
    }
    
    if (low.length > 0) {
      report += `🟢 Low Severity (${low.length}):\n`;
      for (const drift of low) {
        report += `  • ${drift.nodeId} (${(drift.similarity * 100).toFixed(0)}% similar)\n`;
      }
      report += '\n';
    }
    
    return report;
  }
}
