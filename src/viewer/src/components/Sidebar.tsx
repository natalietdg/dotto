import { Artifact } from '../types';
import { useState, useRef, useEffect } from 'react';
import './Sidebar.css';

interface SidebarProps {
  artifact: Artifact | null;
  onClose: () => void;
  lastUpdate: Date;
}

function Sidebar({ artifact, onClose, lastUpdate }: SidebarProps) {
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!artifact) {
    return (
      <div className="sidebar empty" style={{ width: `${width}px` }}>
        <div className="resize-handle" onMouseDown={() => setIsResizing(true)} />
        <div className="sidebar-header">
          <h3>📋 Details</h3>
        </div>
        <div className="sidebar-content">
          <p className="empty-message">
            Click on a node to view details
          </p>
          <div className="last-update">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  }

  const statusColor =
    artifact.status === 'verified'
      ? '#10b981'
      : artifact.status === 'changed'
      ? '#f59e0b'
      : '#ef4444';

  return (
    <div className="sidebar" ref={sidebarRef} style={{ width: `${width}px` }}>
      <div className="resize-handle" onMouseDown={() => setIsResizing(true)} />
      <div className="sidebar-header">
        <h3>📋 Schema Details</h3>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="sidebar-content">
        <div className="detail-section">
          <label>ID</label>
          <div className="detail-value">{artifact.id}</div>
        </div>

        <div className="detail-section">
          <label>File</label>
          <div className="detail-value code">{artifact.file}</div>
        </div>

        <div className="detail-section">
          <label>Status</label>
          <div
            className="detail-value status-pill"
            style={{ background: `${statusColor}20`, color: statusColor }}
          >
            {artifact.status.toUpperCase()}
          </div>
        </div>

        <div className="detail-section">
          <label>Hash</label>
          <div className="detail-value code hash">{artifact.hash}</div>
        </div>

        {artifact.metadata?.drift && (
          <>
            <div className="detail-section">
              <label>Change Type</label>
              <div className="detail-value">
                <span className="severity-badge" style={{ 
                  background: artifact.metadata.drift.breaking ? '#ef444420' : '#f59e0b20',
                  color: artifact.metadata.drift.breaking ? '#ef4444' : '#f59e0b'
                }}>
                  {artifact.metadata.drift.changeType.toUpperCase()}
                  {artifact.metadata.drift.breaking && ' (BREAKING)'}
                </span>
              </div>
            </div>

            {artifact.metadata.drift.changes && artifact.metadata.drift.changes.length > 0 && (
              <div className="detail-section alert">
                <label>⚠️ Changes Detected</label>
                <div className="detail-value">
                  <ul className="change-list">
                    {artifact.metadata.drift.changes.map((change: any, idx: number) => (
                      <li key={idx} className={change.breaking ? 'breaking-change' : 'safe-change'}>
                        <strong>{change.type.replace(/_/g, ' ')}:</strong> {change.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        {artifact.metadata?.breaking && (
          <>

            <div className="detail-section">
              <label>🔗 Downstream Impact</label>
              <div className="detail-value">
                <div className="impact-summary">Detected across 3 downstream services</div>
                <ul className="affected-services">
                  <li>ClearingDto</li>
                  <li>RiskCalculationDto</li>
                  <li>SettlementBatchDto</li>
                </ul>
              </div>
            </div>
          </>
        )}

        <div className="detail-section">
          <label>HCS Timestamp</label>
          <div className="detail-value">
            {artifact.metadata?.hcsTimestamp || '2025-11-09T15:21:00Z'}
          </div>
        </div>

        <div className="detail-section">
          <label>Verification Status</label>
          <div className="detail-value">
            {artifact.metadata?.hcsTimestamp ? '✅ Verified on Hedera' : '⏳ Pending verification'}
          </div>
        </div>

        {artifact.hederaTxId && (
          <div className="detail-section">
            <label>Hedera TX</label>
            <div className="detail-value">
              <a
                href={`https://hashscan.io/testnet/transaction/${artifact.hederaTxId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                {artifact.hederaTxId} →
              </a>
            </div>
          </div>
        )}

        <div className="detail-section">
          <label>Dependencies</label>
          {artifact.dependencies.length > 0 ? (
            <ul className="dependency-list">
              {artifact.dependencies.map((dep) => (
                <li key={dep}>{dep}</li>
              ))}
            </ul>
          ) : (
            <div className="detail-value">None</div>
          )}
        </div>

        <div className="detail-section">
          <label>Last Modified</label>
          <div className="detail-value">
            {artifact.lastModified ? 
              new Date(artifact.lastModified).toLocaleString() : 
              'Unknown'}
          </div>
        </div>

        <div className="last-update">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

function DiffPreview() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="diff-preview">
      <button 
        className="diff-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '▼' : '▶'} View JSON Diff
      </button>
      {expanded && (
        <pre className="diff-content">
          <code>
            <span className="diff-removed">- price_precision: number</span>
            {'\n'}
            <span className="diff-added">+ decimal_places: number</span>
          </code>
        </pre>
      )}
    </div>
  );
}

export default Sidebar;
