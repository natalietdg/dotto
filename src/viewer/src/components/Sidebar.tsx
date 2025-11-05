import { Artifact } from '../types';
import './Sidebar.css';

interface SidebarProps {
  artifact: Artifact | null;
  onClose: () => void;
  lastUpdate: Date;
}

function Sidebar({ artifact, onClose, lastUpdate }: SidebarProps) {
  if (!artifact) {
    return (
      <div className="sidebar empty">
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
    <div className="sidebar">
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
            {new Date(artifact.lastModified).toLocaleString()}
          </div>
        </div>

        <div className="last-update">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
