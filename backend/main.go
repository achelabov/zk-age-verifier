package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"zk-age-verifier/backend/verifier"
)

type VerifyRequest struct {
	Proof         ProofData `json:"proof"`
	PublicSignals []string  `json:"publicSignals"`
}

type ProofData struct {
	PiA []string   `json:"pi_a"`
	PiB [][]string `json:"pi_b"`
	PiC []string   `json:"pi_c"`
}

type VerifyResponse struct {
	IsValid bool   `json:"isValid"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

var snarkVerifier *verifier.SnarkVerifier

func main() {
	logger.Info("Starting ZK Age Verifier Backend...")

	// Check if keys exist
	if _, err := os.Stat("zkey/verification_key.json"); os.IsNotExist(err) {
		logger.Error("Verification key not found at keys/verification_key.json")
		logger.Info("Please run 'make compile' in the circom directory first")
		log.Fatal("Verification key not found")
	}

	logger.Info("Loading verification key...")
	// Initialize verifier
	var err error
	snarkVerifier, err = verifier.NewVerifier("zkey/verification_key.json")
	if err != nil {
		logger.Error("Failed to initialize verifier: %v", err)
		log.Fatalf("Failed to initialize verifier: %v", err)
	}
	logger.Info("✅ Verifier initialized successfully")

	// Configure routes with logging
	http.HandleFunc("/api/verify", withLogging(enableCORS(handleVerify)))
	http.HandleFunc("/api/health", withLogging(enableCORS(handleHealth)))

	// Serve static files
	http.Handle("/", withLogging(enableCORS(handleStatic)))

	// Start server
	port := ":8080"
	logger.Info("🚀 Server starting on http://localhost%s", port)
	logger.Info("📝 POST /api/verify - Verify age proof")
	logger.Info("🔍 GET  /api/health - Health check")
	logger.Info("📁 GET  / - Frontend UI")

	log.Fatal(http.ListenAndServe(port, nil))
}

func handleVerify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		logger.Error("Invalid method for /api/verify: %s", r.Method)
		sendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request
	var req VerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("Failed to parse request body: %v", err)
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.PublicSignals) == 0 {
		sendJSONError(w, "Missing public signals", http.StatusBadRequest)
		return
	}

	logger.Info("Received verification request")
	logger.Debug("Public signals: %v", req.PublicSignals)
	logger.Debug("Proof pi_a: %v", req.Proof.PiA)
	logger.Debug("Proof pi_b: %v", req.Proof.PiB)
	logger.Debug("Proof pi_c: %v", req.Proof.PiC)

	// First public signal is the isValid output from the circuit
	isClaimedAdult := req.PublicSignals[0] == "1"
	if !isClaimedAdult {
		// User claims to be underage (isValid = 0)
		logger.Info("User claims underage, rejecting")
		sendJSON(w, VerifyResponse{
			IsValid: false,
			Message: "❌ Age verification failed. You must be at least 18 years old.",
		}, http.StatusOK)
		return
	}

	// Convert to format for verifier
	proofMap := map[string]interface{}{
		"pi_a": req.Proof.PiA,
		"pi_b": req.Proof.PiB,
		"pi_c": req.Proof.PiC,
	}

	// Verify proof
	startVerify := time.Now()
	isValid, err := snarkVerifier.VerifyProofFromMap(proofMap, req.PublicSignals)
	verifyDuration := time.Since(startVerify)

	if err != nil {
		logger.Error("Verification error: %v", err)
		sendJSONError(w, fmt.Sprintf("Verification error: %v", err), http.StatusInternalServerError)
		return
	}

	logger.Info("Verification result: %v (took %v)", isValid, verifyDuration)

	response := VerifyResponse{
		IsValid: isValid,
		Message: map[bool]string{
			true:  "✅ Age verification successful! You are over 18.",
			false: "❌ Age verification failed. You must be at least 18 years old.",
		}[isValid],
	}

	sendJSON(w, response, http.StatusOK)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	logger.Debug("Health check requested")
	sendJSON(w, map[string]interface{}{
		"status":   "healthy",
		"verifier": "ready",
		"time":     time.Now().Unix(),
	}, http.StatusOK)
}

func sendJSON(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		logger.Error("Failed to encode JSON response: %v", err)
	}
}

func sendJSONError(w http.ResponseWriter, message string, status int) {
	sendJSON(w, VerifyResponse{IsValid: false, Error: message}, status)
}

// Middleware for request logging
func withLogging(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		logger.Info("→ %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
		next(w, r)
		logger.Info("← %s %s completed in %v", r.Method, r.URL.Path, time.Since(start))
	}
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func handleStatic(w http.ResponseWriter, r *http.Request) {
	logger.Debug("Serving static file: %s", r.URL.Path)
	http.FileServer(http.Dir("../frontend")).ServeHTTP(w, r)
}

type Logger struct {
	*log.Logger
}

func (l *Logger) Info(format string, v ...interface{}) {
	l.Printf("[INFO] "+format, v...)
}

func (l *Logger) Error(format string, v ...interface{}) {
	l.Printf("[ERROR] "+format, v...)
}

func (l *Logger) Debug(format string, v ...interface{}) {
	l.Printf("[DEBUG] "+format, v...)
}

var logger = &Logger{log.New(os.Stdout, "", log.LstdFlags)}
