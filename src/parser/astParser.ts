import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export interface ParsedSchema {
  id: string;
  file: string;
  dependencies: string[];
  properties: string[];
}

export class ASTParser {
  parse(filePath: string): ParsedSchema {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // Handle JSON schema files
    if (filePath.endsWith('.json')) {
      return this.parseJsonSchema(filePath, fileName, content);
    }

    // Parse TypeScript files
    return this.parseTypeScriptFile(filePath, fileName, content);
  }

  private parseJsonSchema(filePath: string, fileName: string, content: string): ParsedSchema {
    try {
      const schema = JSON.parse(content);
      const dependencies: string[] = [];
      const properties: string[] = [];

      // Extract properties
      if (schema.properties) {
        properties.push(...Object.keys(schema.properties));
      }

      // Look for $ref dependencies
      const refs = this.extractRefs(schema);
      dependencies.push(...refs);

      return {
        id: this.generateId(fileName),
        file: filePath,
        dependencies,
        properties,
      };
    } catch (error) {
      return {
        id: this.generateId(fileName),
        file: filePath,
        dependencies: [],
        properties: [],
      };
    }
  }

  private extractRefs(obj: any, refs: string[] = []): string[] {
    if (typeof obj !== 'object' || obj === null) {
      return refs;
    }

    for (const key in obj) {
      if (key === '$ref' && typeof obj[key] === 'string') {
        const refName = obj[key].split('/').pop();
        if (refName) {
          refs.push(this.generateId(refName));
        }
      } else {
        this.extractRefs(obj[key], refs);
      }
    }

    return refs;
  }

  private parseTypeScriptFile(filePath: string, fileName: string, content: string): ParsedSchema {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const dependencies: string[] = [];
    const properties: string[] = [];

    const visit = (node: ts.Node) => {
      // Extract import statements for dependencies
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          // Only track local imports (relative paths)
          if (importPath.startsWith('.') || importPath.startsWith('/')) {
            const depName = path.basename(importPath, path.extname(importPath));
            dependencies.push(this.generateId(depName));
          }
        }
      }

      // Extract class properties
      if (ts.isClassDeclaration(node)) {
        node.members.forEach((member) => {
          if (ts.isPropertyDeclaration(member) && member.name) {
            properties.push(member.name.getText(sourceFile));
          }
        });
      }

      // Extract interface properties
      if (ts.isInterfaceDeclaration(node)) {
        node.members.forEach((member) => {
          if (ts.isPropertySignature(member) && member.name) {
            properties.push(member.name.getText(sourceFile));
          }
        });
      }

      // Extract type alias properties
      if (ts.isTypeAliasDeclaration(node)) {
        const typeNode = node.type;
        if (ts.isTypeLiteralNode(typeNode)) {
          typeNode.members.forEach((member) => {
            if (ts.isPropertySignature(member) && member.name) {
              properties.push(member.name.getText(sourceFile));
            }
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      id: this.generateId(fileName),
      file: filePath,
      dependencies: [...new Set(dependencies)],
      properties,
    };
  }

  private generateId(fileName: string): string {
    return fileName
      .replace(/\.(dto|schema)$/, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
  }
}
