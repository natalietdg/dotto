/**
 * TypeScript file scanner
 * Extracts schemas, DTOs, interfaces, and dependencies
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { GraphNode, GraphEdge, PropertyInfo } from '../core/types';

export class TypeScriptScanner {
  
  scan(filePath: string, fileHash: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const dependencies: Set<string> = new Set();
    
    const visit = (node: ts.Node) => {
      // Extract @intent from JSDoc
      const intent = this.extractIntent(node, sourceFile);
      
      // Parse interfaces
      if (ts.isInterfaceDeclaration(node) && node.name) {
        const interfaceNode = this.parseInterface(node, sourceFile, filePath, fileHash, intent);
        nodes.push(interfaceNode);
      }
      
      // Parse classes (DTOs)
      if (ts.isClassDeclaration(node) && node.name) {
        const classNode = this.parseClass(node, sourceFile, filePath, fileHash, intent);
        nodes.push(classNode);
      }
      
      // Parse type aliases
      if (ts.isTypeAliasDeclaration(node) && node.name) {
        const typeNode = this.parseTypeAlias(node, sourceFile, filePath, fileHash, intent);
        nodes.push(typeNode);
      }
      
      // Parse enums
      if (ts.isEnumDeclaration(node) && node.name) {
        const enumNode = this.parseEnum(node, sourceFile, filePath, fileHash, intent);
        nodes.push(enumNode);
      }
      
      // Extract imports for dependencies
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          if (importPath.startsWith('.') || importPath.startsWith('/')) {
            dependencies.add(importPath);
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    
    // Create dependency edges
    nodes.forEach(node => {
      dependencies.forEach(dep => {
        const depId = this.resolveImportId(dep, filePath);
        edges.push({
          id: `${node.id}-uses-${depId}`,
          source: node.id,
          target: depId,
          type: 'uses',
          confidence: 0.9,
        });
      });
    });
    
    return { nodes, edges };
  }
  
  private extractIntent(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
    const jsDoc = (node as any).jsDoc;
    if (!jsDoc || jsDoc.length === 0) return undefined;
    
    for (const doc of jsDoc) {
      const comment = doc.comment;
      if (typeof comment === 'string') {
        const intentMatch = comment.match(/@intent\s+(.+)/);
        if (intentMatch) {
          return intentMatch[1].trim();
        }
      }
    }
    
    return undefined;
  }
  
  private parseInterface(
    node: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string,
    fileHash: string,
    intent?: string
  ): GraphNode {
    const name = node.name.text;
    const properties = this.extractProperties(node.members, sourceFile);
    
    return {
      id: this.generateId(filePath, name),
      type: 'schema',
      name,
      filePath,
      fileHash,
      intent,
      metadata: { kind: 'interface' },
      properties,
      lastModified: new Date().toISOString(),
    };
  }
  
  private parseClass(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string,
    fileHash: string,
    intent?: string
  ): GraphNode {
    const name = node.name?.text || 'AnonymousClass';
    const properties = this.extractProperties(node.members, sourceFile);
    
    return {
      id: this.generateId(filePath, name),
      type: 'dto',
      name,
      filePath,
      fileHash,
      intent,
      metadata: { kind: 'class' },
      properties,
      lastModified: new Date().toISOString(),
    };
  }
  
  private parseTypeAlias(
    node: ts.TypeAliasDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string,
    fileHash: string,
    intent?: string
  ): GraphNode {
    const name = node.name.text;
    let properties: PropertyInfo[] = [];
    
    if (ts.isTypeLiteralNode(node.type)) {
      properties = this.extractProperties(node.type.members, sourceFile);
    }
    
    return {
      id: this.generateId(filePath, name),
      type: 'schema',
      name,
      filePath,
      fileHash,
      intent,
      metadata: { kind: 'type' },
      properties,
      lastModified: new Date().toISOString(),
    };
  }
  
  private parseEnum(
    node: ts.EnumDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string,
    fileHash: string,
    intent?: string
  ): GraphNode {
    const name = node.name.text;
    const values = node.members.map(m => m.name.getText(sourceFile));
    
    return {
      id: this.generateId(filePath, name),
      type: 'enum',
      name,
      filePath,
      fileHash,
      intent,
      metadata: { kind: 'enum', values },
      lastModified: new Date().toISOString(),
    };
  }
  
  private extractProperties(
    members: ts.NodeArray<ts.TypeElement | ts.ClassElement>,
    sourceFile: ts.SourceFile
  ): PropertyInfo[] {
    const properties: PropertyInfo[] = [];
    
    members.forEach(member => {
      if (ts.isPropertySignature(member) || ts.isPropertyDeclaration(member)) {
        if (member.name) {
          const name = member.name.getText(sourceFile);
          const type = member.type ? member.type.getText(sourceFile) : 'any';
          const required = !member.questionToken;
          
          properties.push({ name, type, required });
        }
      }
    });
    
    return properties;
  }
  
  private generateId(filePath: string, name: string): string {
    const relativePath = filePath.replace(process.cwd(), '').replace(/^\//, '');
    return `${relativePath}:${name}`.replace(/[^a-zA-Z0-9:/_.-]/g, '_');
  }
  
  private resolveImportId(importPath: string, fromFile: string): string {
    const dir = path.dirname(fromFile);
    const resolved = path.resolve(dir, importPath);
    return resolved.replace(process.cwd(), '').replace(/^\//, '');
  }
}
