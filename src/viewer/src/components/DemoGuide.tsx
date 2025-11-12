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
              This is a <strong>live dependency graph</strong> generated from scanning the actual codebase.
              dotto has analyzed TypeScript DTOs and their relationships in real-time.
            </p>
            <ul>
              <li><strong>Nodes</strong> — Each represents a schema (DTO, interface, or type)</li>
              <li><strong>Edges</strong> — Show import dependencies between schemas</li>
              <li><strong>Colors</strong> — Indicate schema types (dto, schema, interface, enum)</li>
            </ul>
          </section>

          <section>
            <h3>⚠️ The Problem dotto Solves</h3>
            <p>
              In complex systems, schemas don't exist in isolation. When you change a DTO:
            </p>
            <ul>
              <li><strong>Breaking changes</strong> can cascade through dependent services</li>
              <li><strong>Field renames</strong> may hide semantic shifts in business logic</li>
              <li><strong>Type changes</strong> can break downstream consumers silently</li>
            </ul>
            <p>
              Example: Renaming <code>price_precision</code> to <code>decimal_places</code> might seem harmless,
              but if it changes rounding behavior (floor → bankers' rounding), it could cause settlement errors.
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
            <h3>💡 How dotto Helps</h3>
            <ol>
              <li><strong>Automatic Scanning</strong> — Parses TypeScript and OpenAPI files to build dependency graph</li>
              <li><strong>Impact Analysis</strong> — Shows all downstream schemas affected by a change</li>
              <li><strong>Schema Diffing</strong> — Detects breaking vs non-breaking changes (field additions, type changes, etc.)</li>
              <li><strong>Git Integration</strong> — Compares commits to detect schema drift over time</li>
              <li><strong>Hedera Proofs (Optional)</strong> — Anchors schema versions on Hedera for immutable audit trails</li>
            </ol>
          </section>

          <section>
            <h3>🚀 Try It Yourself</h3>
            <p><strong>In this demo:</strong></p>
            <ol>
              <li>Click any node to see its schema details</li>
              <li>Red nodes show breaking changes detected in working directory</li>
              <li>View exact field changes in the sidebar</li>
              <li>Explore dependency relationships via edges</li>
            </ol>
            
            <p><strong>In your own project:</strong></p>
            <div className="code-block">
              <code>
                npm install -g @natalietdg/dotto<br/>
                cd your-typescript-project<br/>
                dotto init<br/>
                dotto crawl<br/>
                dotto scan  # Detect breaking changes
              </code>
            </div>
          </section>

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
            🧩 <strong>dotto</strong> makes schema dependencies visible and verifiable.<br />
            Understand impact before you ship. Detect drift before it breaks production.
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
