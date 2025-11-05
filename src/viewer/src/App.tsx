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
import { Artifact } from './types';

const API_BASE = '';

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedNode, setSelectedNode] = useState<Artifact | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchArtifacts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/artifacts`);
      const data = await response.json();
      setArtifacts(data.artifacts || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch artifacts:', error);
    }
  }, []);

  useEffect(() => {
    fetchArtifacts();
    const interval = setInterval(fetchArtifacts, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchArtifacts]);

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
        position: { x: col * 250 + 100, y: row * 150 + 100 },
        data: {
          label: (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {artifact.id}
              </div>
              <div style={{ fontSize: '10px', opacity: 0.7 }}>
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
          padding: '10px',
          boxShadow: `0 0 20px ${nodeColor}40`,
          minWidth: '120px',
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

  const handleVerifyAll = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch(`${API_BASE}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      alert(`Verification complete! ${result.verified} schema(s) verified.`);
      await fetchArtifacts();
    } catch (error) {
      alert(`Verification failed: ${(error as Error).message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const changedCount = artifacts.filter(
    (a) => a.status === 'changed' || a.status === 'drifted'
  ).length;

  return (
    <div className="app">
      <div className="header">
        <h1>🧠 DoTTO Viewer</h1>
        <div className="header-info">
          <span className="status-badge verified">
            {artifacts.filter((a) => a.status === 'verified').length} Verified
          </span>
          <span className="status-badge changed">
            {artifacts.filter((a) => a.status === 'changed').length} Changed
          </span>
          <span className="status-badge drifted">
            {artifacts.filter((a) => a.status === 'drifted').length} Drifted
          </span>
          <button
            className="verify-btn"
            onClick={handleVerifyAll}
            disabled={isVerifying || changedCount === 0}
          >
            {isVerifying ? 'Verifying...' : `Verify All (${changedCount})`}
          </button>
        </div>
      </div>

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
            <Background color="#1f2937" gap={16} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const artifact = artifacts.find((a) => a.id === node.id);
                if (!artifact) return '#4b5563';
                if (artifact.status === 'verified') return '#10b981';
                if (artifact.status === 'changed') return '#f59e0b';
                return '#ef4444';
              }}
              maskColor="#0a0e1a90"
            />
          </ReactFlow>
        </div>

        <Sidebar
          artifact={selectedNode}
          onClose={() => setSelectedNode(null)}
          lastUpdate={lastUpdate}
        />
      </div>
    </div>
  );
}

export default App;
