# dotto v1.1 Quick Start Guide

## 30-Second Setup

```bash
npm install
npm run build
node dist/cli/index.js init
node dist/cli/index.js crawl
```

## Essential Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `init` | Create graph.json | `dotto init` |
| `crawl` | Scan codebase | `dotto crawl` |
| `crawl --diff` | Incremental scan | `dotto crawl --diff` |
| `impact <id>` | Show downstream | `dotto impact src/user.dto.ts:UserDto` |
| `why <id>` | Show upstream | `dotto why src/invoice.dto.ts:InvoiceDto` |
| `check` | Find breaking changes | `dotto check` |
| `graph` | Generate HTML | `dotto graph` |
| `proof <id>` | Record proof (optional) | `dotto proof <id> --proof hedera` |

## Common Workflows

### 1. Initial Setup
```bash
# In your project root
npm install -g dotto-cli
dotto init
dotto crawl
```

### 2. Before Making Changes
```bash
# Check what will be affected
dotto impact src/user.dto.ts:UserDto

# See where it's used
dotto why src/user.dto.ts:UserDto
```

### 3. After Making Changes
```bash
# Re-scan (fast!)
dotto crawl --diff

# Check for breaking changes
dotto check

# Generate report
dotto graph -o changes-report.html
```

### 4. CI/CD Integration
```yaml
# .github/workflows/schema-check.yml
- run: npm install -g dotto-cli
- run: dotto crawl --diff
- run: dotto check
```

## File Patterns Scanned

- `**/*.dto.ts` - Data Transfer Objects
- `**/*.schema.ts` - TypeScript schemas
- `**/*.interface.ts` - Interfaces
- `**/*.openapi.{json,yaml,yml}` - OpenAPI specs
- `**/*.swagger.{json,yaml,yml}` - Swagger specs

## Node ID Format

Node IDs are: `<relative-path>:<name>`

Examples:
- `src/user.dto.ts:UserDto`
- `src/api/openapi.yaml:CreateUserRequest`
- `src/types/payment.schema.ts:PaymentStatus`

## Intention Tracking

Add `@intent` to your schemas:

```typescript
/**
 * @intent Core user identity for authentication
 */
export interface UserDto {
  id: string;
  
  /**
   * @intent Must be hashed with bcrypt, never store plain text
   */
  password: string;
}
```

dotto will flag changes to `@intent` comments as warnings.

## Optional: Hedera Proof Backend

Only needed if you want immutable proof timestamps.

```bash
# 1. Create .env
cat > .env << EOF
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT
HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY
HEDERA_TOPIC_ID=0.0.YOUR_TOPIC
HEDERA_NETWORK=testnet
EOF

# 2. Record proof
dotto proof src/user.dto.ts:UserDto --proof hedera

# 3. View on HashScan
# Opens: https://hashscan.io/testnet/transaction/...
```

## Troubleshooting

### "Node not found"
- Run `dotto crawl` first
- Check node ID format: `path:Name`
- Use tab completion (future feature)

### Slow crawls
- Use `--diff` for incremental updates
- Exclude large directories in .gitignore
- Check for circular dependencies

### Missing dependencies
```bash
npm install
npm run build
```

## Performance Tips

1. **Use incremental mode**: `dotto crawl --diff` (10-50x faster)
2. **Limit depth**: `dotto impact <id> -d 2` (faster for large graphs)
3. **Cache graph.json**: Commit to git for team sharing
4. **Run in CI**: Catch breaking changes before merge

## Example Project Structure

```
my-project/
├── src/
│   ├── user/
│   │   ├── user.dto.ts          ← Scanned
│   │   └── user.service.ts
│   ├── order/
│   │   ├── order.dto.ts         ← Scanned
│   │   └── order.schema.ts      ← Scanned
│   └── api/
│       └── openapi.yaml         ← Scanned
├── graph.json                   ← Generated
├── graph.html                   ← Generated (optional)
└── package.json
```

## Next Steps

1. **Read full docs**: See [README.md](./README.md)
2. **Understand architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Try examples**: `cd examples && dotto crawl`
4. **Integrate CI**: Add to your pipeline
5. **Share graphs**: Send `graph.html` to stakeholders

## Support

- **Issues**: GitHub Issues
- **Docs**: README.md, ARCHITECTURE.md
- **Examples**: `examples/` directory

---

**Remember**: dotto works perfectly without any proof backend. Hedera integration is completely optional!
