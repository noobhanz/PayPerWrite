# Version Compatibility Guide

## Current Working Configuration

**Tested and Working:**
- Solana CLI: 1.18.26
- Anchor CLI: 0.32.1 (with anchor-lang 0.30.1)
- Rust: 1.91.0 (latest stable)
- Node.js: 18+ recommended

## Known Issues & Workarounds

### Lock File Version Issue
- **Problem**: Cargo.lock format v4 incompatibility with older tools
- **Workaround**: Delete Cargo.lock before building, let it regenerate
- **Status**: Temporary - will be resolved as ecosystem updates

### Anchor Version Mismatch Warnings
- **Problem**: CLI version (0.32.1) vs library version (0.30.1) warnings
- **Impact**: Warnings only, compilation succeeds
- **Workaround**: Acceptable for development
- **Status**: Waiting for ecosystem alignment

## Build Commands

```bash
# Clean build (if lock file issues)
rm -f Cargo.lock && anchor build

# Alternative build method
cd programs/paywall && cargo-build-sbf

# Development setup
./scripts/setup-dev.sh
```

## Upgrade Path

1. **Current**: Use working versions (0.30.1/0.32.1)
2. **Near-term**: Monitor Solana/Anchor releases
3. **Future**: Upgrade to fully aligned versions when available

## DevContainer Option

For consistent environment across team, use `.devcontainer/` setup with:
- Rust 1.75.0 (known stable)
- Solana 1.18.26
- Anchor 0.29.0 (fully compatible set)

This ensures reproducible builds regardless of local environment.