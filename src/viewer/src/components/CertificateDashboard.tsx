/**
 * Drift Certificate Dashboard
 * Shows all drift certificates with Hedera proof status
 */

import React, { useState, useEffect } from 'react';
import './CertificateDashboard.css';

// Simple icon components (no external dependency)
const ExternalLink = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
  </svg>
);

const CheckCircle = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>
  </svg>
);

const AlertCircle = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const Clock = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

interface DriftCertificate {
  version: string;
  metadata: {
    repository: string;
    branch: string;
    baseCommit: string;
    headCommit: string;
    timestamp: string;
    author: string;
  };
  drift: {
    summary: {
      breaking: number;
      nonBreaking: number;
      filesChanged: number;
    };
    changes: any[];
  };
  intent?: {
    description: string;
    approvedBy?: string;
    timestamp: string;
  };
  proof: {
    hash: string;
    algorithm: string;
    backend: string;
    transactionId?: string;
    timestamp?: string;
    link?: string;
  };
}

export const CertificateDashboard: React.FC = () => {
  const [certificate, setCertificate] = useState<DriftCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCertificate();
  }, []);

  const loadCertificate = async () => {
    try {
      const response = await fetch('/driftpack.json');
      if (!response.ok) {
        throw new Error('No drift certificate found');
      }
      const data = await response.json();
      setCertificate(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="certificate-dashboard">
        <div className="loading">Loading drift certificate...</div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="certificate-dashboard">
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>No Drift Certificate Found</h3>
          <p>Run <code>dotto scan</code> to generate a drift certificate</p>
        </div>
      </div>
    );
  }

  const hasBreaking = certificate.drift.summary.breaking > 0;
  const isAnchored = !!certificate.proof.transactionId;

  return (
    <div className="certificate-dashboard">
      <div className="dashboard-header">
        <h2>Drift Certificate</h2>
        <div className="status-badges">
          {hasBreaking ? (
            <span className="badge badge-breaking">
              {certificate.drift.summary.breaking} Breaking
            </span>
          ) : (
            <span className="badge badge-safe">No Breaking Changes</span>
          )}
          {isAnchored ? (
            <span className="badge badge-anchored">
              <CheckCircle size={14} /> Anchored on Hedera
            </span>
          ) : (
            <span className="badge badge-pending">
              <Clock size={14} /> Not Anchored
            </span>
          )}
        </div>
      </div>

      <div className="certificate-grid">
        {/* Metadata Card */}
        <div className="cert-card">
          <h3>Repository Info</h3>
          <div className="cert-field">
            <label>Repository:</label>
            <span>{certificate.metadata.repository}</span>
          </div>
          <div className="cert-field">
            <label>Branch:</label>
            <span>{certificate.metadata.branch}</span>
          </div>
          <div className="cert-field">
            <label>Author:</label>
            <span>{certificate.metadata.author}</span>
          </div>
          <div className="cert-field">
            <label>Timestamp:</label>
            <span>{new Date(certificate.metadata.timestamp).toLocaleString()}</span>
          </div>
        </div>

        {/* Drift Summary Card */}
        <div className="cert-card">
          <h3>Drift Summary</h3>
          <div className="drift-stats">
            <div className="stat">
              <div className="stat-value breaking">{certificate.drift.summary.breaking}</div>
              <div className="stat-label">Breaking Changes</div>
            </div>
            <div className="stat">
              <div className="stat-value non-breaking">{certificate.drift.summary.nonBreaking}</div>
              <div className="stat-label">Non-Breaking</div>
            </div>
            <div className="stat">
              <div className="stat-value">{certificate.drift.summary.filesChanged}</div>
              <div className="stat-label">Files Changed</div>
            </div>
          </div>
        </div>

        {/* Intent Card */}
        {certificate.intent && (
          <div className="cert-card intent-card">
            <h3>Intent & Approval</h3>
            <div className="intent-content">
              <p className="intent-description">"{certificate.intent.description}"</p>
              {certificate.intent.approvedBy && (
                <div className="cert-field">
                  <label>Approved by:</label>
                  <span>{certificate.intent.approvedBy}</span>
                </div>
              )}
              <div className="cert-field">
                <label>Captured:</label>
                <span>{new Date(certificate.intent.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Proof Card */}
        <div className="cert-card proof-card">
          <h3>Cryptographic Proof</h3>
          <div className="cert-field">
            <label>Hash:</label>
            <code className="hash">{certificate.proof.hash.substring(0, 16)}...</code>
          </div>
          <div className="cert-field">
            <label>Algorithm:</label>
            <span>{certificate.proof.algorithm.toUpperCase()}</span>
          </div>
          <div className="cert-field">
            <label>Backend:</label>
            <span>{certificate.proof.backend}</span>
          </div>
          {isAnchored && (
            <>
              <div className="cert-field">
                <label>Transaction ID:</label>
                <code className="tx-id">{certificate.proof.transactionId}</code>
              </div>
              <div className="cert-field">
                <label>Anchored:</label>
                <span>{new Date(certificate.proof.timestamp!).toLocaleString()}</span>
              </div>
              <a
                href={certificate.proof.link}
                target="_blank"
                rel="noopener noreferrer"
                className="verify-button"
              >
                <ExternalLink size={16} />
                View on HashScan
              </a>
            </>
          )}
          {!isAnchored && (
            <div className="anchor-prompt">
              <p>Run <code>dotto anchor</code> to anchor this certificate on Hedera</p>
            </div>
          )}
        </div>
      </div>

      {/* Changes List */}
      {certificate.drift.changes.length > 0 && (
        <div className="changes-section">
          <h3>Schema Changes</h3>
          <div className="changes-list">
            {certificate.drift.changes.map((change, idx) => (
              <div key={idx} className={`change-item ${change.breaking ? 'breaking' : 'safe'}`}>
                <div className="change-header">
                  <span className="change-name">{change.name}</span>
                  <span className={`change-badge ${change.breaking ? 'breaking' : 'safe'}`}>
                    {change.breaking ? 'Breaking' : 'Non-Breaking'}
                  </span>
                </div>
                <div className="change-type">{change.changeType}</div>
                {change.changes && change.changes.length > 0 && (
                  <ul className="change-details">
                    {change.changes.map((c: any, i: number) => (
                      <li key={i}>{c.description}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
