# ZK KYC - Zero-Knowledge Age Verification

Educational example of an age verification system (18+) using zero-knowledge proofs.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│    Circuit   │─────▶│   Backend   │
│  (snarkJS)  │      │   (Circom)   │      │   (Golang)  │
└─────────────┘      └──────────────┘      └─────────────┘
     │                      │                      │
     │  1. Enter birth      │                      │
     │     date             │                      │
     │                      │                      │
     │  2. Generate         │                      │
     │     proof            │                      │
     │─────────────────────▶│                      │
     │                      │                      │
     │                      │  3. Send proof       │
     │                      │─────────────────────▶│
     │                      │                      │
     │                      │  4. Verification     │
     │                      │◀─────────────────────│
     │                      │                      │
     │  5. Result           │                      │
     │◀─────────────────────│                      │
     │                      │                      │
```

## Components

### 1. Circom Circuit (`circuits/circuit.circom`)
- Circuit for proving that age >= 18
- Uses comparator from circomlib
- Public input: threshold (18)
- Private input: age (user's actual age)

### 2. Frontend (`frontend/`)
- HTML + JavaScript with snarkJS
- ZK-proof generation in browser
- Does not reveal exact age

### 3. Backend (`backend/`)
- Golang server
- Proof verification
- REST API for verification

## Quick Start

### Requirements
- Go 1.21+
- Node.js 18+
- Circom (for circuit compilation)
- snarkjs

### 1. Compile the circuit

```bash
cd circuits
./compile.sh
```

This will create:
- `circuit.wasm` - for proof generation
- `circuit_final.zkey` - proving key
- `../keys/verification_key.json` - verification key

### 2. Start the backend

```bash
cd backend
go run main.go
```

The server will start on port 8080.

### 3. Start the frontend

Open `frontend/index.html` in a browser or use a local server:

```bash
cd frontend
python3 -m http.server 3000
```

## API

### POST /api/verify

Verify ZK proof.

**Request:**
```json
{
  "proof": {
    "pi_a": ["...", "...", "..."],
    "pi_b": [["...", "..."], ["...", "..."], ["...", "..."]],
    "pi_c": ["...", "..."]
  },
  "pubSignals": ["1"]
}
```

**Response:**
```json
{
  "verified": true,
  "message": "User is 18+ years old (verified via ZK)"
}
```

### GET /api/health

Check server status.

## How it works

1. User enters birth date
2. Frontend calculates age
3. ZK-proof is generated proving age >= 18
4. Proof is sent to backend
5. Backend verifies proof without knowing exact age
6. Verification result is returned

## Security and Privacy

✅ **Hidden:**
- Exact birth date
- Exact age
- Any personal data

✅ **Known:**
- Fact that user is 18+ (or not)

## Project Structure

```
zk-kyc/
├── backend/
│   ├── main.go           # Golang server
│   ├── go.mod            # Go module
│   └── bin/server        # Compiled binary
├── frontend/
│   ├── index.html        # UI page
│   └── app.js            # snarkJS logic
├── circuits/
│   ├── circuit.circom    # Circom circuit
│   ├── compile.sh        # Compilation script
│   └── circuit.wasm      # (after compilation)
├── keys/
│   └── verification_key.json  # (after compilation)
└── README.md
```

## Demo Mode

If circuit files are not yet compiled, frontend runs in demo mode:
- Fake proofs are generated
- Verification happens locally
- Allows testing UI without full setup

## Next Steps

1. ✅ Golang backend - ready
2. ✅ JavaScript/snarkJS frontend - ready
3. ✅ Circom circuit - ready
4. ⏳ Circuit compilation (requires circom installation)
5. ⏳ Integration testing

## Resources

- [Circom Documentation](https://docs.circom.io/)
- [snarkJS GitHub](https://github.com/iden3/snarkjs)
- [Zero-Knowledge Proofs Explained](https://zokrates.io/)
