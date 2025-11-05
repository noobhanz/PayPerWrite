#!/bin/bash
set -e

echo "Building Solana Pay-per-Article Program..."

# Clean previous builds
rm -rf target/deploy
mkdir -p target/deploy

# Remove problematic lock files
rm -f Cargo.lock
rm -f programs/paywall/Cargo.lock

# Build the program
cd programs/paywall

# Try to build with cargo-build-sbf directly
if command -v cargo-build-sbf &> /dev/null; then
    echo "Building with cargo-build-sbf..."
    RUST_LOG=error cargo-build-sbf --manifest-path Cargo.toml
else
    echo "cargo-build-sbf not found, trying anchor build..."
    cd ../..
    anchor build --skip-lint
fi

echo "Build complete!"

# Copy the built program to deploy directory if successful
if [ -f "target/deploy/paywall.so" ]; then
    echo "Program built successfully at target/deploy/paywall.so"
else
    echo "Build might have failed, checking alternative locations..."
    find target -name "*.so" -type f 2>/dev/null || true
fi