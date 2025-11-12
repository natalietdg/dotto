/**
 * Git Integration
 * Compare schema changes between commits
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { GraphEngine } from '../graph/GraphEngine';
import { Crawler } from '../scanner/Crawler';
import { SchemaDiffer, SchemaDiff } from '../diff/SchemaDiffer';

export interface GitComparisonResult {
  baseCommit: string;
  headCommit: string;
  diffs: SchemaDiff[];
  filesChanged: string[];
}

export class GitScanner {
  private repoPath: string;
  
  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
  }
  
  /**
   * Get current git commit hash
   */
  getCurrentCommit(): string {
    try {
      return execSync('git rev-parse HEAD', { cwd: this.repoPath, encoding: 'utf-8' }).trim();
    } catch (error) {
      throw new Error('Not a git repository or git not available');
    }
  }
  
  /**
   * Get list of changed files between two commits
   */
  getChangedFiles(baseCommit: string, headCommit: string = 'HEAD'): string[] {
    try {
      const output = execSync(
        `git diff --name-only ${baseCommit} ${headCommit}`,
        { cwd: this.repoPath, encoding: 'utf-8' }
      );
      
      return output
        .split('\n')
        .filter(f => f.trim().length > 0)
        .filter(f => this.isSchemaFile(f));
    } catch (error) {
      throw new Error(`Failed to get changed files: ${error}`);
    }
  }
  
  /**
   * Check if file is a schema file
   */
  private isSchemaFile(filePath: string): boolean {
    return /\.(dto|schema|interface)\.ts$/i.test(filePath) ||
           /Dto\.ts$/i.test(filePath) ||
           /Schema\.ts$/i.test(filePath) ||
           /Interface\.ts$/i.test(filePath) ||
           /\.(openapi|swagger)\.(json|yaml|yml)$/i.test(filePath);
  }
  
  /**
   * Get file content at specific commit
   */
  getFileAtCommit(filePath: string, commit: string): string | null {
    try {
      return execSync(
        `git show ${commit}:${filePath}`,
        { cwd: this.repoPath, encoding: 'utf-8' }
      );
    } catch (error) {
      return null; // File didn't exist at that commit
    }
  }
  
  /**
   * Compare schemas between two commits
   */
  async compareCommits(baseCommit: string, headCommit: string = 'HEAD'): Promise<GitComparisonResult> {
    const filesChanged = this.getChangedFiles(baseCommit, headCommit);
    
    // Scan baseline
    const baseEngine = new GraphEngine('.dotto-baseline.json');
    const baseCrawler = new Crawler(baseEngine);
    await baseCrawler.crawl();
    const baseNodes = new Map(baseEngine.getAllNodes().map(n => [n.id, n]));
    
    // Scan current
    const headEngine = new GraphEngine('.dotto-head.json');
    const headCrawler = new Crawler(headEngine);
    await headCrawler.crawl();
    const headNodes = new Map(headEngine.getAllNodes().map(n => [n.id, n]));
    
    // Compute diffs
    const differ = new SchemaDiffer();
    const diffs = differ.diffMany(baseNodes, headNodes);
    
    // Cleanup temp files
    try {
      fs.unlinkSync('.dotto-baseline.json');
      fs.unlinkSync('.dotto-head.json');
    } catch (e) {
      // Ignore cleanup errors
    }
    
    return {
      baseCommit,
      headCommit,
      diffs,
      filesChanged,
    };
  }
  
  /**
   * Compare current working directory against last commit
   */
  async scanUncommittedChanges(): Promise<GitComparisonResult> {
    const headCommit = this.getCurrentCommit();
    
    // Get changed files in working directory
    const filesChanged = this.getWorkingDirectoryChanges();
    
    if (filesChanged.length === 0) {
      return {
        baseCommit: headCommit,
        headCommit: 'working-directory',
        diffs: [],
        filesChanged: [],
      };
    }
    
    // Stash current changes temporarily
    const hasStash = this.stashChanges();
    
    try {
      // Scan baseline (HEAD - committed version)
      const baseEngine = new GraphEngine('.dotto-baseline.json');
      const baseCrawler = new Crawler(baseEngine);
      await baseCrawler.crawl();
      const baseNodes = new Map(baseEngine.getAllNodes().map(n => [n.id, n]));
      
      // Restore working directory changes
      if (hasStash) {
        this.unstashChanges();
      }
      
      // Scan current working directory
      const headEngine = new GraphEngine('.dotto-head.json');
      const headCrawler = new Crawler(headEngine);
      await headCrawler.crawl();
      const headNodes = new Map(headEngine.getAllNodes().map(n => [n.id, n]));
      
      // Compute diffs
      const differ = new SchemaDiffer();
      const diffs = differ.diffMany(baseNodes, headNodes);
      
      // Cleanup temp files
      try {
        const fs = require('fs');
        fs.unlinkSync('.dotto-baseline.json');
        fs.unlinkSync('.dotto-head.json');
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return {
        baseCommit: headCommit,
        headCommit: 'working-directory',
        diffs,
        filesChanged,
      };
    } catch (error) {
      // Make sure to restore stash on error
      if (hasStash) {
        this.unstashChanges();
      }
      throw error;
    }
  }
  
  /**
   * Stash current changes
   */
  private stashChanges(): boolean {
    try {
      execSync('git stash push -u -m "dotto-temp-scan"', { cwd: this.repoPath, stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Unstash changes
   */
  private unstashChanges(): void {
    try {
      execSync('git stash pop', { cwd: this.repoPath, stdio: 'pipe' });
    } catch (error) {
      console.warn('Warning: Failed to restore stashed changes');
    }
  }
  
  /**
   * Get files changed in working directory (uncommitted)
   */
  private getWorkingDirectoryChanges(): string[] {
    try {
      const output = execSync(
        'git diff --name-only HEAD',
        { cwd: this.repoPath, encoding: 'utf-8' }
      );
      
      return output
        .split('\n')
        .filter(f => f.trim().length > 0)
        .filter(f => this.isSchemaFile(f));
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Get commit message
   */
  getCommitMessage(commit: string): string {
    try {
      return execSync(
        `git log -1 --pretty=%B ${commit}`,
        { cwd: this.repoPath, encoding: 'utf-8' }
      ).trim();
    } catch (error) {
      return '';
    }
  }
  
  /**
   * Get commit author
   */
  getCommitAuthor(commit: string): string {
    try {
      return execSync(
        `git log -1 --pretty=%an ${commit}`,
        { cwd: this.repoPath, encoding: 'utf-8' }
      ).trim();
    } catch (error) {
      return '';
    }
  }
  
  /**
   * Check if working directory is clean
   */
  isWorkingDirectoryClean(): boolean {
    try {
      const status = execSync('git status --porcelain', { cwd: this.repoPath, encoding: 'utf-8' });
      return status.trim().length === 0;
    } catch (error) {
      return false;
    }
  }
}
