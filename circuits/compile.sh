#!/bin/bash

# Script for compiling Circom circuit and generating ZK keys
# Requires: circom, snarkjs, nodejs

set -e

echo "🔧 ZK KYC Circuit Compilation Script"
echo "====================================="

CIRCUIT_NAME="circuit"
PHASE1_URL="https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau"

cd "$(dirname "$0")"

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "❌ circom is not installed. Please install it first:"
    echo "   git clone https://github.com/iden3/circom.git"
    echo "   cd circom"
    echo "   cargo build --release"
    echo "   sudo cargo install --path circom"
    exit 1
fi

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo "⚠️  snarkjs is not installed globally. Installing..."
    npm install -g snarkjs
fi

echo ""
echo "📦 Step 1: Installing circomlib dependencies..."
npm init -y 2>/dev/null || true
npm install circomlib

echo ""
echo "🔨 Step 2: Compiling the circuit..."
circom circuit.circom --r1cs --wasm --sym --circuit

echo ""
echo "🎲 Step 3: Downloading Phase 1 ceremony file (this may take a while)..."
if [ ! -f powersOfTau28_hez_final_12.ptau ]; then
    curl -L $PHASE1_URL -o powersOfTau28_hez_final_12.ptau
else
    echo "Phase 1 file already exists, skipping download"
fi

echo ""
echo "🔐 Step 4: Creating Phase 2 ceremony (trusted setup)..."
snarkjs groth16 setup circuit.r1cs powersOfTau28_hez_final_12.ptau circuit_0000.zkey

echo ""
echo "🎯 Step 5: Contributing to the ceremony..."
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey --name="First Contribution" -v -e="random text"

echo ""
echo "📤 Step 6: Exporting verification key..."
snarkjs zkey export verificationkey circuit_final.zkey ../keys/verification_key.json

echo ""
echo "📋 Step 7: Exporting Solidity verifier (optional, for blockchain)..."
snarkjs zkey export solidityverifier circuit_final.zkey ../contracts/Verifier.sol 2>/dev/null || echo "Contracts directory not created, skipping..."

echo ""
echo "✅ Compilation complete!"
echo ""
echo "Generated files:"
echo "  - circuit.r1cs          : Circuit constraints"
echo "  - circuit.wasm          : WebAssembly for proof generation"
echo "  - circuit_final.zkey    : Proving key"
echo "  - ../keys/verification_key.json : Verification key for backend"
echo ""
echo "Next steps:"
echo "  1. Copy circuit.wasm and circuit_final.zkey to frontend or keep on server"
echo "  2. Start the backend: cd ../backend && go run main.go"
echo "  3. Open frontend/index.html in browser"
echo ""
