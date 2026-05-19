# zk-age-verifier

Zero-knowledge proof system for age verification using Circom, Go (go-snark) and snarkjs. Proves that a user is over 18 without revealing the exact birth date.

## Overview

The user enters birth year and current year in the browser. The frontend generates a Groth16 zk-SNARK proof using a precompiled Circom circuit. The proof is sent to the backend, which verifies it cryptographically. The server returns whether the user is at least 18 years old. The actual birth year never leaves the client.

## Features

- Zero-knowledge: no personal data is transmitted to the server.
- Non-interactive proof (one round).
- Compatible with standard Circom toolchain.
- Backend verification using go-snark (bn256 curve).
- Simple web UI.

## How it works

1. User inputs birth year and current year.
2. Frontend computes age, generates a proof with snarkjs using the circuit and proving key.
3. Proof and public signals (isValid) are sent to the backend.
4. Backend verifies the proof using the verification key.
5. Only the verification result (true/false) is returned.

The circuit logic:
- age = currentYear - birthYear.
- isValid = 1 if age >= 18, else 0.
- Inputs: birthYear, currentYear, salt (private); birthdayHash = birthYear + salt (public).
- Output: isValid (public).

## Requirements

- Node.js 16+
- Go 1.21+
- Circom 2.1.6
- snarkjs 0.7.0

## Installation
git clone https://github.com/achelabov/zk-age-verifier \
cd zk-age-verifier \
make all

## Running
Open `http://localhost:8080` in a browser.

## Project Structure
```
zk-age-verifier/
├── circuits/
│   ├── age-verifier.circom
│   └── compile.sh
├── backend/
│   ├── main.go
│   ├── verifier/
│   │   └── verifier.go
│   └── zkey/
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── Makefile
└── README.md
```

## Commands
make compile - Compile circuit and generate keys \
make backend - Download Go modules \
make frontend - Create frontend directories \
make run - Start server \
make clean - Remove generated files \
make all - Run setup, compile, backend, frontend \
make help - Show available commands

## Circuit Definition

`circuits/age-verifier.circom`:

```circom
pragma circom 2.1.6;

include "node_modules/circomlib/circuits/comparators.circom";

template AgeVerifier(AGE_THRESHOLD) {
    signal input birthdayHash;
    signal input birthYear;
    signal input currentYear;
    signal input salt;
    signal output isValid;

    signal age;
    age <== currentYear - birthYear;

    component lt = LessThan(32);
    lt.in[0] <== age;
    lt.in[1] <== AGE_THRESHOLD;

    isValid <== 1 - lt.out;

    signal computedHash;
    computedHash <== birthYear + salt;
    birthdayHash === computedHash;
}

component main = AgeVerifier(18);
```

## API Endpoint

The backend exposes a single verification endpoint.

`POST /api/verify`

Request body format:

```json
{
  "proof": {
    "pi_a": ["string", "string", "string"],
    "pi_b": [["string", "string"], ["string", "string"], ["string", "string"]],
    "pi_c": ["string", "string", "string"]
  },
  "publicSignals": ["0", "1"]
}
```

Response:

```json
{
  "proof": {
    "pi_a": ["string", "string", "string"],
    "pi_b": [["string", "string"], ["string", "string"], ["string", "string"]],
    "pi_c": ["string", "string", "string"]
  },
  "publicSignals": ["0", "1"]
}
```

`GET /api/health` returns server status

Response:

```json
{
  "status": "healthy",
  "verifier": "ready"
}
```

## Troubleshooting

**Button is disabled**

Circuit files (wasm, zkey) not loaded. Run `make compile` and verify that `frontend/circom/age-verifier.wasm` and `frontend/zkey/age-verifier.zkey` exist. Check browser console for 404 errors.

**Verification always returns true**

The backend must check the public signal before returning a result. Ensure `handleVerify` verifies that `req.PublicSignals[0] == "1"` before calling the cryptographic verifier.

**go-snark module not found**

Set GOPROXY to a working value:
go env -w GOPROXY=https://goproxy.cn,https://proxy.golang.org,direct


**Proof generation fails with "Assert Failed"**

The circuit input does not match the expected signal structure. Verify that the input object contains exactly the fields defined in the circuit: birthYear, currentYear, salt, birthdayHash.

**CORS errors**

The backend enables CORS for all origins. If you run the frontend from a different port, ensure the API_BASE_URL in script.js points to `http://localhost:8080`.

**snarkjs fullProve hangs or takes too long**

Generation time depends on circuit size and machine performance. The circuit has approximately 2000 constraints, which should take 5-15 seconds on a modern machine. If it hangs indefinitely, check that the wasm and zkey files are not corrupted.

**Verification key mismatch**

If the backend logs "verification error", the proving key used in the frontend may not match the verification key in the backend. Regenerate both keys with `make clean && make compile`.

**Frontend cannot fetch /api/verify**

Ensure the backend is running on port 8080. Run `make run` and check that no other process uses the same port. Test manually with curl:
