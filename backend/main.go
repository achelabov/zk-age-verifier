package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/iden3/go-iden3-crypto/poseidon"
	"github.com/iden3/go-rapidsnark/types"
	"github.com/iden3/go-rapidsnark/verifier"
)

// VerificationRequest - запрос на верификацию
type VerificationRequest struct {
	Proof  types.ProofData `json:"proof"`
	PubSig []string        `json:"pubSignals"`
}

// VerificationResponse - ответ верификации
type VerificationResponse struct {
	Verified bool   `json:"verified"`
	Message  string `json:"message,omitempty"`
	Error    string `json:"error,omitempty"`
}

// ZKConfig - конфигурация ZK
type ZKConfig struct {
	VerificationKeyPath string `json:"verification_key_path"`
}

var verificationKey []byte

func loadVerificationKey(keyPath string) error {
	keyData, err := os.ReadFile(keyPath)
	if err != nil {
		return fmt.Errorf("failed to read verification key: %w", err)
	}

	verificationKey = keyData
	return nil
}

func verifyHandler(w http.ResponseWriter, r *http.Request) {
	var req VerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Создаем ZKProof из запроса
	zkProof := types.ZKProof{
		Proof:      &req.Proof,
		PubSignals: req.PubSig,
	}

	// Верификация доказательства
	err := verifier.VerifyGroth16(zkProof, verificationKey)
	if err != nil {
		sendError(w, fmt.Sprintf("Verification failed: %v", err), http.StatusInternalServerError)
		return
	}

	response := VerificationResponse{
		Verified: true,
		Message:  "User is 18+ years old (verified via ZK)",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func sendError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(VerificationResponse{
		Verified: false,
		Error:    message,
	})
}

func main() {
	// Загрузка ключа верификации
	keyPath := os.Getenv("VERIFICATION_KEY_PATH")
	if keyPath == "" {
		keyPath = "./keys/verification_key.json"
	}

	if err := loadVerificationKey(keyPath); err != nil {
		log.Printf("Warning: Could not load verification key: %v", err)
		log.Println("Server will start but verification will fail until key is loaded")
	} else {
		log.Println("Verification key loaded successfully")
	}

	// Hash test using poseidon
	hash, err := poseidon.Hash([]*big.Int{big.NewInt(1), big.NewInt(2)})
	if err != nil {
		log.Printf("Poseidon hash test: %v", err)
	} else {
		log.Printf("Poseidon hash test successful: %v", hash)
	}

	r := mux.NewRouter()
	r.HandleFunc("/api/verify", verifyHandler).Methods("POST")
	r.HandleFunc("/api/health", healthHandler).Methods("GET")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting ZK KYC server on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
