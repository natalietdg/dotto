/**
 * Static HTML graph generator
 * Creates standalone React Flow visualization
 */

import * as fs from 'fs';
import { GraphEngine } from '../graph/GraphEngine';

export class GraphGenerator {
  private graphEngine: GraphEngine;
  
  constructor(graphEngine: GraphEngine) {
    this.graphEngine = graphEngine;
  }
  
  generate(outputPath: string = 'graph.html'): void {
    const nodes = this.graphEngine.getAllNodes();
    const edges = this.graphEngine.getAllEdges();
    
    const html = this.generateHTML(nodes, edges);
    fs.writeFileSync(outputPath, html, 'utf-8');
  }
  
  private generateHTML(nodes: any[], edges: any[]): string {
    const nodesData = JSON.stringify(nodes.map((n, idx) => ({
      id: n.id,
      type: 'default',
      position: { x: (idx % 5) * 250, y: Math.floor(idx / 5) * 150 },
      data: {
        label: n.name,
        type: n.type,
        file: n.filePath,
        intent: n.intent,
      },
      style: {
        background: this.getNodeColor(n.type),
        color: '#fff',
        border: '2px solid #fff',
        borderRadius: '8px',
        padding: '10px',
        minWidth: '120px',
      },
    })));
    
    const edgesData = JSON.stringify(edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.type,
      animated: e.confidence < 0.7,
      style: {
        stroke: e.confidence >= 0.7 ? '#4b5563' : '#f59e0b',
        strokeWidth: 2,
      },
    })));
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>dotto Dependency Graph</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reactflow@11/dist/umd/index.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reactflow@11/dist/style.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0e1a; color: #e0e0e0; }
    #root { width: 100vw; height: 100vh; }
    .header { background: #1a1f2e; padding: 16px 24px; border-bottom: 2px solid #06b6d4; }
    .header h1 { color: #06b6d4; font-size: 24px; }
    .info { padding: 8px 24px; background: #141824; font-size: 13px; color: #9ca3af; }
    .graph-container { height: calc(100vh - 120px); }
    .react-flow__node { cursor: pointer; }
    .react-flow__controls { background: #1a1f2e; border: 1px solid #374151; }
    .react-flow__controls button { background: #1a1f2e; color: #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧠 dotto Dependency Graph</h1>
  </div>
  <div class="info">
    ${nodes.length} nodes • ${edges.length} edges • Generated: ${new Date().toLocaleString()}
  </div>
  <div id="root"></div>
  
  <script>
    const { useState } = React;
    const { ReactFlow, Background, Controls, MiniMap } = ReactFlowRenderer;
    
    const initialNodes = ${nodesData};
    const initialEdges = ${edgesData};
    
    function App() {
      const [nodes, setNodes] = useState(initialNodes);
      const [edges, setEdges] = useState(initialEdges);
      
      const onNodeClick = (event, node) => {
        console.log('Node clicked:', node.data);
        alert(\`\${node.data.label}\\nType: \${node.data.type}\\nFile: \${node.data.file}\${node.data.intent ? '\\nIntent: ' + node.data.intent : ''}\`);
      };
      
      return React.createElement(ReactFlow, {
        nodes,
        edges,
        onNodeClick,
        fitView: true,
        children: [
          React.createElement(Background, { color: '#1f2937', gap: 16 }),
          React.createElement(Controls),
          React.createElement(MiniMap, { 
            nodeColor: (node) => node.style.background,
            maskColor: '#0a0e1a90'
          })
        ]
      });
    }
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
  </script>
</body>
</html>`;
  }
  
  private getNodeColor(type: string): string {
    const colors: Record<string, string> = {
      schema: '#3b82f6',  // blue
      dto: '#10b981',     // green
      api: '#f59e0b',     // yellow
      service: '#8b5cf6', // purple
      enum: '#ec4899',    // pink
    };
    return colors[type] || '#6b7280';
  }
}
