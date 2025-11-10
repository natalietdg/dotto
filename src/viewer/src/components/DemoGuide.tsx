import './DemoGuide.css';

interface DemoGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

function DemoGuide({ isOpen, onClose }: DemoGuideProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎯 Demo Guide</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
        
          <section>
            <h3>🧩 What You're Seeing</h3>
            <p>
              Bank A's trading system suffered a <strong>$12 million precision drift</strong> —
              a schema rename that quietly changed how money was rounded.
            </p>
            <ul>
              <li><span className="status-dot verified">🟢</span> <strong>Verified</strong> — Code version matches proof on Hedera</li>
              <li><span className="status-dot drifted">🔴</span> <strong>Drifted</strong> — Structural change detected</li>
              <li><span className="status-dot changed">🟡</span> <strong>Intent Drift</strong> — When a schema change hides a logic or meaning shift</li>
            </ul>
          </section>

          <section>
            <h3>⚠️ The Problem</h3>
            <p>
              A developer renamed a field:
            </p>
            <div className="code-block">
              <code>
                price_precision → decimal_places
              </code>
            </div>
            <p>
              It looked harmless — but that rename carried an assumption:<br />
              that rounding behavior would stay the same.
            </p>
            <p><strong>It didn't.</strong></p>
            <div className="intent-comparison">
              <div><strong>Old:</strong> floor rounding (conservative)</div>
              <div><strong>New:</strong> bankers' rounding (accurate)</div>
            </div>
            <p className="impact">
              💥 This invisible logic drift mis-settled <strong>$12 million</strong> across clearing and risk systems.
            </p>
            <p>
              The schema change exposed the gap between what the system did and what the developer <em>thought</em> it did.
            </p>
          </section>

          <section>
            <h3>🧠 Why This Happens</h3>
            <p>
              Modern systems run on <strong>tribal knowledge</strong> —<br />
              intent lives in people's heads, not in code.
            </p>
            <p>
              When those people leave or teams rotate, that intent vanishes — and every rename, refactor, or "minor cleanup"<br />
              risks shifting the system's real-world meaning.
            </p>
          </section>

          <section>
            <h3>💡 How Dotto Helps</h3>
            <ol>
              <li><strong>Schema Drift → Intent Drift</strong> — Detects renamed or broken fields, surfacing where meaning may have shifted</li>
              <li><strong>Impact Analysis</strong> — Maps downstream services that inherit that shift</li>
              <li><strong>Hedera Proof</strong> — Anchors every version hash on Hedera, making intent and proof immutable</li>
            </ol>
          </section>

          <section>
            <h3>🚀 Try It</h3>
            <ol>
              <li>Click any 🔴 node to see drift details</li>
              <li>Review the <strong>Drift Cause</strong> to see what changed</li>
              <li>Notice how schema drift reveals intent drift — what the system now <em>means</em></li>
              <li>Click <strong>✅ Verified on Hedera</strong> to open the public proof on HashScan</li>
            </ol>
          </section>

          <div className="demo-stats">
            <h3>Key Stats</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">$12M</div>
                <div className="stat-label">Potential Loss Prevented</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">5</div>
                <div className="stat-label">Artifacts Impacted</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">&lt; 1s</div>
                <div className="stat-label">Detection Time</div>
              </div>
            </div>
          </div>

          <section>
            <h3>🔐 Why Hedera</h3>
            <ul>
              <li><strong>Immutable</strong> — Past proofs can't change</li>
              <li><strong>Fast</strong> — 3–5 s finality</li>
              <li><strong>Cheap</strong> — Batch proofs cost cents per year</li>
              <li><strong>Public</strong> — Viewable on HashScan explorer</li>
            </ul>
          </section>

          <p className="demo-footer">
            🧩 <strong>Dotto</strong> turns tribal knowledge into verifiable intent.<br />
            Every change now has its context, its impact, and its proof — all in one view.
          </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>Got It!</button>
        </div>
      </div>
  );
}

export default DemoGuide;
