import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';
import Sidebar from './components/Sidebar';
import DemoGuide from './components/DemoGuide';
import { CertificateDashboard } from './components/CertificateDashboard';
import { Artifact } from './types';

interface ProofData {
  epoch?: string;
  merkleRoot?: string;
  txId?: string;
  hashscan?: string;
  timestamp?: string;
}

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedNode, setSelectedNode] = useState<Artifact | null>(null);
  const [proof, setProof] = useState<ProofData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [showDemoGuide, setShowDemoGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'certificate'>('graph');

  const fetchData = useCallback(async () => {
    try {
      // Load graph.json (try root first, fallback to public)
      let graphRes;
      try {
        graphRes = await fetch('/graph.json');
      } catch {
        graphRes = await fetch('../../../graph.json');
      }
      const graphData = await graphRes.json();
      
      // Load drift.json if available
      let driftData = { diffs: [] };
      try {
        const driftRes = await fetch('/drift.json');
        driftData = await driftRes.json();
      } catch {
        // No drift data available
      }
      
      // Handle both array and object format for nodes
      const nodesArray = Array.isArray(graphData.nodes) 
        ? graphData.nodes 
        : Object.values(graphData.nodes || {});
      
      // Handle both array and object format for edges
      const edgesArray = Array.isArray(graphData.edges)
        ? graphData.edges
        : Object.values(graphData.edges || {});
      
      // Create drift lookup map
      const driftMap = new Map(driftData.diffs.map((d: any) => [d.nodeId, d]));
      
      // Convert graph nodes to artifacts
      const artifactList: Artifact[] = nodesArray.map((node: any) => {
        const drift = driftMap.get(node.id);
        const status = drift?.breaking ? 'drifted' : 'verified';
        
        return {
          id: node.id,
          name: node.name || node.id.split(':').pop() || node.id,
          status,
          dependencies: edgesArray
            .filter((e: any) => e.target === node.id)
            .map((e: any) => e.source),
          hash: node.hash || node.fileHash,
          file: node.file || node.filePath,
          filePath: node.filePath,
          type: node.type,
          lastModified: node.lastModified || new Date().toISOString(),
          metadata: {
            ...node.metadata,
            drift: drift ? {
              changeType: drift.changeType,
              breaking: drift.breaking,
              changes: drift.changes,
            } : undefined,
          },
        };
      });
      
      setArtifacts(artifactList);
      
      // Load proof.json if exists
      try {
        const proofRes = await fetch('/proof.json');
        const proofData = await proofRes.json();
        setProof(proofData);
      } catch (e) {
        console.log('No proof.json found');
      }
      
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (artifacts.length === 0) return;

    // Create nodes
    const newNodes: Node[] = artifacts.map((artifact, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);

      let nodeColor = '#10b981'; // green - verified
      if (artifact.status === 'changed') nodeColor = '#f59e0b'; // yellow
      if (artifact.status === 'drifted') nodeColor = '#ef4444'; // red

      return {
        id: artifact.id,
        type: 'default',
        position: { x: col * 300 + 100, y: row * 180 + 100 },
        data: {
          label: (
            <div style={{ 
              textAlign: 'center',
              maxWidth: '250px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                fontWeight: 'bold', 
                marginBottom: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {artifact.name}
              </div>
              <div style={{ 
                fontSize: '10px', 
                opacity: 0.7,
                textTransform: 'lowercase'
              }}>
                {artifact.status}
              </div>
            </div>
          ),
        },
        style: {
          background: nodeColor,
          color: '#fff',
          border: `2px solid ${nodeColor}`,
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: `0 0 20px ${nodeColor}40`,
          minWidth: '180px',
          maxWidth: '250px',
        },
      };
    });

    // Create edges based on dependencies
    const newEdges: Edge[] = [];
    artifacts.forEach((artifact) => {
      artifact.dependencies.forEach((depId) => {
        // Check if dependency exists in artifacts
        if (artifacts.some((a) => a.id === depId)) {
          newEdges.push({
            id: `${artifact.id}-${depId}`,
            source: depId,
            target: artifact.id,
            animated: artifact.status === 'drifted',
            style: {
              stroke: artifact.status === 'drifted' ? '#ef4444' : '#4b5563',
              strokeWidth: 2,
            },
          });
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [artifacts, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const artifact = artifacts.find((a) => a.id === node.id);
      if (artifact) {
        setSelectedNode(artifact);
      }
    },
    [artifacts]
  );

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: '#888' }}>Loading graph data...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🧠 dotto</h1>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'graph' ? 'active' : ''}`}
            onClick={() => setActiveTab('graph')}
          >
            Dependency Graph
          </button>
          <button
            className={`tab ${activeTab === 'certificate' ? 'active' : ''}`}
            onClick={() => setActiveTab('certificate')}
          >
            Drift Certificate
          </button>
        </div>
        <div className="header-info">
          <button
            className="demo-guide-btn"
            onClick={() => setShowDemoGuide(true)}
            title="View Demo Guide"
          >
            📖 Demo Guide
          </button>
          {proof && proof.hashscan && (
            <a 
              href={proof.hashscan} 
              target="_blank" 
              rel="noopener noreferrer"
              className="proof-badge"
              title="View proof on HashScan"
            >
              ✅ Verified on Hedera
            </a>
          )}
          <span className="status-badge verified">
            {artifacts.filter((a) => a.status === 'verified').length} ✓ OK
          </span>
          <span className="status-badge drifted">
            {artifacts.filter((a) => a.status === 'drifted').length} ✗ Breaking
          </span>
          <button
            className="verify-btn"
            onClick={handleRefresh}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
      
      <DemoGuide isOpen={showDemoGuide} onClose={() => setShowDemoGuide(false)} />

      {activeTab === 'graph' ? (
        <div className="main-content">
          <div className="flow-container">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              fitView
            >
              <Background color="#000" gap={16} />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  const artifact = artifacts.find((a) => a.id === node.id);
                  if (!artifact) return '#4b5563';
                  if (artifact.status === 'verified') return '#10b981';
                  if (artifact.status === 'changed') return '#f59e0b';
                  return '#ef4444';
                }}
                maskColor="#00000090"
              />
            </ReactFlow>
          </div>

          <Sidebar
            artifact={selectedNode}
            onClose={() => setSelectedNode(null)}
            lastUpdate={lastUpdate}
          />
        </div>
      ) : (
        <CertificateDashboard />
      )}
    </div>
  );
}

export default App;
