import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as crypto from 'crypto';

export async function findSchemaFiles(rootDir: string): Promise<string[]> {
  const patterns = [
    '**/*.dto.ts',
    '**/*.schema.ts',
    '**/*.schema.json',
  ];

  const files: string[] = [];
  
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: rootDir,
      ignore: ['node_modules/**', 'dist/**', '.git/**'],
      absolute: true,
    });
    files.push(...matches);
  }

  return [...new Set(files)];
}

export function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function getRelativePath(filePath: string, rootDir: string): string {
  return path.relative(rootDir, filePath);
}

export function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

export function writeJsonFile(filePath: string, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function getFileModifiedTime(filePath: string): string {
  const stats = fs.statSync(filePath);
  return stats.mtime.toISOString();
}
