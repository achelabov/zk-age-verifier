package verifier

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/vocdoni/go-snark/parsers"
	"github.com/vocdoni/go-snark/types"
	"github.com/vocdoni/go-snark/verifier"
)

type SnarkVerifier struct {
	vk *types.Vk
}

// NewVerifier creates a verifier from verification_key.json
func NewVerifier(vkPath string) (*SnarkVerifier, error) {
	// Read verification key file
	vkData, err := os.ReadFile(vkPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read verification key: %w", err)
	}

	// Parse verification key using ParseVk from parsers
	// ParseVk returns (*VerificationKey, error)
	vk, err := parsers.ParseVk(vkData)
	if err != nil {
		return nil, fmt.Errorf("failed to parse verification key: %w", err)
	}

	return &SnarkVerifier{vk: vk}, nil
}

// VerifyProof verifies a proof from JSON bytes
func (v *SnarkVerifier) VerifyProof(proofJSON []byte, publicSignalsJSON []byte) (bool, error) {
	// Parse proof using ParseProof
	proof, err := parsers.ParseProof(proofJSON)
	if err != nil {
		return false, fmt.Errorf("failed to parse proof: %w", err)
	}

	// Parse public signals using ParsePublicSignals
	publicSignals, err := parsers.ParsePublicSignals(publicSignalsJSON)
	if err != nil {
		return false, fmt.Errorf("failed to parse public signals: %w", err)
	}

	fmt.Printf("[VERIFIER] Verifying proof with %d public signals\n", len(publicSignals))
	for i, sig := range publicSignals {
		fmt.Printf("[VERIFIER] Public signal %d: %s\n", i, sig.String())
	}

	isValid := verifier.Verify(v.vk, proof, publicSignals)
	fmt.Printf("[VERIFIER] Verification result: %v\n", isValid)

	return isValid, nil
}

// VerifyProofFromMap verifies a proof from a map (convenient for HTTP requests)
func (v *SnarkVerifier) VerifyProofFromMap(proofMap map[string]interface{}, publicSignals []string) (bool, error) {
	// Convert proof to JSON
	proofJSON, err := json.Marshal(proofMap)
	if err != nil {
		return false, fmt.Errorf("failed to marshal proof: %w", err)
	}

	// Convert public signals to JSON
	publicJSON, err := json.Marshal(publicSignals)
	if err != nil {
		return false, fmt.Errorf("failed to marshal public signals: %w", err)
	}

	return v.VerifyProof(proofJSON, publicJSON)
}
