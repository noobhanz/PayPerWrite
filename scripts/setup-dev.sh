#!/bin/bash
set -e

echo "Setting up Solana development environment..."

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"
export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
npm install -g @project-serum/anchor-cli@0.29.0

# Install AVM for version management
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.29.0
avm use 0.29.0

# Setup local validator
solana config set --url localhost
solana-keygen new --no-bip39-passphrase --silent --outfile ~/.config/solana/id.json

# Install Node dependencies if package.json exists
if [ -f "package.json" ]; then
    npm install
fi

# Generate Solana keypair for the program
if [ ! -f "target/paywall-keypair.json" ]; then
    mkdir -p target
    solana-keygen new --no-bip39-passphrase --silent --outfile target/paywall-keypair.json
fi

echo "Development environment setup complete!"
echo "Run 'solana-test-validator' to start local blockchain"
echo "Run 'anchor build' to build the program"