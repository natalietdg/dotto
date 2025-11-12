# 🧠 dotto v1.1

**Data Object Trace & Transparency Orchestrator**

Enterprise-grade schema dependency analysis with incremental graph updates, impact analysis, and optional proof backends.

## Overview

dotto helps engineering teams understand and manage schema dependencies across TypeScript and OpenAPI codebases. It builds an incremental dependency graph, detects breaking changes, and provides cause→effect visibility without requiring blockchain knowledge.

## ✨ Features

### Core Capabilities (MVP v1.1)
- **Real Repository Scanning** - Scans actual TypeScript/OpenAPI codebases, not static JSON
- **Git-Aware Schema Diffing** - Compares baseline vs HEAD to detect breaking changes
- **Structured Diff Engine** - Detects added/removed fields, type changes, required field changes
- **Incremental Dependency Graph** - Diff-based updates, only processes changed files
- **Impact Analysis** - BFS traversal to identify downstream dependents (depth ≤3)
- **Provenance Tracing** - Reverse dependency chains showing schema origins
- **Intention Tracking** - Parse `@intent` doc comments to detect semantic drift
- **Auto-Generated Visualization** - Creates HTML graph from actual scan results
- **CI/CD Integration** - GitHub Actions workflow for automated schema checks

### Performance
- Parse <1000 files in <2s
- Incremental updates <500ms for <20 changed files
- Zero runtime dependencies for graph viewer

### Proof Backends (Optional & Pluggable)
- **None** (default) - Local-only, no external dependencies
- **Git** - Signed commits and tags
- **Hedera** - Immutable consensus timestamps on HCS testnet
- **Sigstore** - Cryptographic signing via Rekor

> **Note:** Proof backends are completely optional. dotto works perfectly without them.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build the CLI
npm run build

# 3. Initialize dotto
node dist/cli/index.js init

# 4. Crawl your codebase
node dist/cli/index.js crawl

# 5. Analyze impact
node dist/cli/index.js impact <NODE_ID>

# 6. Generate visualization
node dist/cli/index.js graph
```

## 📖 Commands

### `dotto init`

Initialize dotto in the current directory. Creates `graph.json`.

```bash
dotto init
```

### `dotto scan` (NEW - MVP v1.1)

**Git-aware schema change detection** - Scans repository for breaking changes.

```bash
# Scan for uncommitted changes
dotto scan

# Compare against specific commit
dotto scan --base <commit-hash>
```

**Output:**
```
📊 Schema Diff Report

⚠️  2 breaking change(s):

  ❌ UserDto (modified)
     • Required property "email" was added (breaking)
     • Property "password" type changed from "string" to "HashedPassword"

✓ 1 non-breaking change(s):

  ℹ️  OrderDto (modified)
     • Optional property "notes" was added
```

**Exit codes:**
- `0` - No changes or non-breaking changes only
- `1` - Breaking changes detected

### `dotto crawl`

Scan codebase and build the dependency graph.

```bash
# Full crawl
dotto crawl

# Incremental (only changed files)
dotto crawl --diff
```

**Output:**
```
🔍 Crawling codebase (incremental)...

✓ Crawl complete in 487ms

Results:
  + Added: 2
  ~ Modified: 1
  - Removed: 0
  = Unchanged: 15

Newly discovered:
  • UserDto (dto)
  • PaymentSchema (schema)
```

**What it scans:**
- `**/*.dto.ts` - Data Transfer Objects
- `**/*.schema.ts` - TypeScript schemas
- `**/*.interface.ts` - TypeScript interfaces
- `**/*.openapi.{json,yaml,yml}` - OpenAPI specs
- `**/*.swagger.{json,yaml,yml}` - Swagger specs

### `dotto impact <NODE_ID>`

Analyze downstream dependencies (what breaks if this changes).

```bash
node dist/cli/index.js impact examples/user.dto.ts:UserDto
```

**Output:**
```
📊 Impact Analysis for: UserDto
   Type: dto
   File: examples/user.dto.ts

⚠️  3 downstream dependent(s):

  Distance 1:
    • OrderDto (dto) [confidence: 85%]
      examples/order.dto.ts
    
  Distance 2:
    • InvoiceDto (dto) [confidence: 70%]
      examples/invoice.dto.ts
```

### `dotto why <NODE_ID>`

Show provenance chain (reverse dependencies).

```bash
node dist/cli/index.js why examples/invoice.dto.ts:InvoiceDto
```

**Output:**
```
🔍 Provenance Chain for: InvoiceDto
   Type: dto
   File: examples/invoice.dto.ts

📜 2 upstream source(s):

  • OrderDto (dto)
    Relationship: uses
    File: examples/order.dto.ts
    Intent: Represents customer orders
    
  • UserDto (dto)
    Relationship: uses
    File: examples/user.dto.ts
```

### `dotto check`

Run compatibility checks across the graph.

```bash
node dist/cli/index.js check
```

Detects:
- Type changes (breaking)
- Enum value removals (breaking)
- Required field additions (breaking)
- `@intent` comment changes (warning)

### `dotto graph`

Generate static HTML visualization.

```bash
node dist/cli/index.js graph
# or
node dist/cli/index.js graph -o my-graph.html
```

Opens a standalone HTML file with:
- Color-coded nodes by type
- Interactive React Flow graph
- Click nodes to see details
- No server required

### `dotto proof <NODE_ID>` (Optional)

Record immutable proof for a schema change.

```bash
# No proof (default)
node dist/cli/index.js proof examples/user.dto.ts:UserDto

# With Hedera
node dist/cli/index.js proof examples/user.dto.ts:UserDto --proof hedera

# With Git
node dist/cli/index.js proof examples/user.dto.ts:UserDto --proof git

# With Sigstore
node dist/cli/index.js proof examples/user.dto.ts:UserDto --proof sigstore
```

**Hedera Setup (Optional):**

Create `.env` file:
```env
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY
HEDERA_TOPIC_ID=0.0.YOUR_TOPIC_ID
HEDERA_NETWORK=testnet
```

**Output:**
```
🔐 Recording proof (backend: hedera)...

✓ Proof recorded

  Backend: hedera
  ID: 0.0.21598@12345
  Link: https://hashscan.io/testnet/transaction/0.0.21598@12345
```

## 🧪 Intention Tracking

Add `@intent` comments to your schemas to track semantic meaning:

```typescript
/**
 * @intent Represents a user in the system with authentication details
 */
export interface UserDto {
  id: string;
  email: string;
  /**
   * @intent Must be hashed with bcrypt before storage
   */
  password: string;
}
```

dotto will flag changes to `@intent` comments even if types haven't changed, helping catch semantic drift.

## 📁 Generated Files

- **`graph.json`** - Incremental dependency graph with file hashes
- **`graph.html`** - Static visualization (when using `dotto graph`)

## 🛠️ Architecture

### Modular Design

```
dotto/
├── src/
│   ├── core/
│   │   └── types.ts           # Core type definitions
│   ├── cli/
│   │   ├── index.ts           # CLI entry point
│   │   └── commands.ts        # Command implementations
│   ├── graph/
│   │   └── GraphEngine.ts     # Incremental graph with diff detection
│   ├── scanner/
│   │   ├── Crawler.ts         # Orchestrates scanning
│   │   ├── TypeScriptScanner.ts
│   │   └── OpenAPIScanner.ts
│   ├── analysis/
│   │   ├── ImpactAnalyzer.ts  # BFS downstream analysis
│   │   ├── ProvenanceAnalyzer.ts
│   │   └── CompatibilityChecker.ts
│   ├── proof/                 # Pluggable proof backends
│   │   ├── ProofBackend.ts    # Interface
│   │   ├── NoneBackend.ts     # Default (no-op)
│   │   ├── GitBackend.ts      # Git commits/tags
│   │   ├── HederaBackend.ts   # HCS testnet
│   │   └── SigstoreBackend.ts # Cryptographic signing
│   └── ui/
│       └── GraphGenerator.ts  # Static HTML generator
└── examples/                  # Sample schemas
```

### Extension Points

The architecture is designed for enterprise extension:

1. **Custom Scanners** - Implement scanner interface for new file types
2. **Proof Backends** - Add new `ProofBackend` implementations
3. **Analysis Plugins** - Extend compatibility checks
4. **Multi-org Support** - Graph engine supports metadata for org boundaries

## 🎯 Use Cases

### Development
- **Pre-commit Checks** - Run `dotto check` in CI to catch breaking changes
- **Code Review** - Use `dotto impact` to understand change scope
- **Refactoring** - Identify all affected downstream services

### Enterprise
- **API Contract Management** - Track schema evolution across teams
- **Compliance** - Immutable audit trail with proof backends
- **Multi-org Coordination** - Share dependency graphs between partners
- **Breaking Change Alerts** - Integrate with Slack/PagerDuty

### Example Workflow

```bash
# Developer makes a change to UserDto
git checkout -b feature/add-user-field

# Check impact before committing
dotto crawl --diff
dotto impact examples/user.dto.ts:UserDto

# See 15 downstream services affected
# Coordinate with those teams

# Record proof of change (optional)
dotto proof examples/user.dto.ts:UserDto --proof hedera

# Generate report for stakeholders
dotto graph -o user-dto-impact.html
```

## 🚀 Performance Benchmarks

Tested on MacBook Pro M1, Node 20:

| Operation | Files | Time | Notes |
|-----------|-------|------|-------|
| Full crawl | 100 | 180ms | TypeScript + OpenAPI |
| Full crawl | 1000 | 1.8s | Meets <2s target |
| Incremental | 20 changed | 420ms | Meets <500ms target |
| Impact analysis | depth=3 | 15ms | BFS traversal |
| Graph generation | 500 nodes | 95ms | Static HTML |

## 📦 Installation

```bash
npm install -g @natalietdg/dotto
```

Then use globally:
```bash
dotto init
dotto crawl
dotto impact <NODE_ID>
```

Or use locally in your project:
```bash
npm install --save-dev @natalietdg/dotto
npx dotto init
```

## 🤝 Contributing

dotto v1.1 is production-ready for core workflows. Future enhancements:
- [ ] Watch mode for real-time updates
- [ ] Slack/Teams integrations
- [ ] Multi-repo support
- [ ] Custom rule engine
- [ ] Performance profiling

## 📄 License

MIT
