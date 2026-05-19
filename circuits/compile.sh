#!/bin/bash

# Clean up previous files
rm -f *.r1cs *.wasm *.sym *.ptau *.zkey verification_key.json

echo "📦 Installing dependencies..."
npm init -y
npm install circomlib snarkjs

echo "🔧 Compiling circuit..."
circom age-verifier.circom --r1cs --wasm --sym

# Check if file was created
if [ ! -f "age-verifier.r1cs" ]; then
    echo "❌ Failed to compile circuit. Check your .circom file syntax"
    exit 1
fi

echo "✅ Circuit compiled successfully!"

# Create directories for keys if they don't exist
mkdir -p ../backend/zkey

echo "🔑 Generating Powers of Tau (this may take a moment)..."
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="random text for entropy 1"

echo "⚙️ Preparing phase 2..."
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v

echo "🔐 Generating zkey..."
snarkjs groth16 setup age-verifier.r1cs pot12_final.ptau age-verifier_0000.zkey
snarkjs zkey contribute age-verifier_0000.zkey age-verifier_0001.zkey --name="Second contribution" -v -e="random text for entropy 2"
snarkjs zkey export verificationkey age-verifier_0001.zkey verification_key.json

# Copy files to appropriate locations
cp verification_key.json ../backend/zkey/
cp age-verifier_0001.zkey ../backend/zkey/age-verifier.zkey

# Copy wasm file for frontend
mkdir -p ../frontend/circom
mkdir -p ../frontend/zkey
cp age-verifier_js/age-verifier.wasm ../frontend/circom/
cp age-verifier_0001.zkey ../frontend/zkey/age-verifier.zkey

echo "✅ All files generated and copied!"
echo "📁 Files created:"
ls -la *.r1cs *.wasm verification_key.json 2>/dev/null