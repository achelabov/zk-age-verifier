.PHONY: setup compile backend frontend run clean clean-all help

CIRCUIT_DIR = circuits
BACKEND_DIR = backend
FRONTEND_DIR = frontend
BACKEND_KEYS_DIR = $(BACKEND_DIR)/zkey
FRONTEND_CIRCOM_DIR = $(FRONTEND_DIR)/circom
FRONTEND_ZKEY_DIR = $(FRONTEND_DIR)/zkey

compile:
	@echo "🔧 Compiling Circom circuit..."
	cd $(CIRCUIT_DIR) && chmod +x compile.sh && ./compile.sh
	@echo "✅ Circuit compiled"

backend:
	@echo "🏗️ Building backend..."
	cd $(BACKEND_DIR) && go mod download
	@echo "✅ Backend ready"

frontend:
	@echo "🎨 Preparing frontend..."
	mkdir -p $(FRONTEND_CIRCOM_DIR) $(FRONTEND_ZKEY_DIR)
	@echo "✅ Frontend ready"

run:
	@echo "🚀 Starting server..."
	cd $(BACKEND_DIR) && go run main.go

clean:
	@echo "🧹 Cleaning up generated files..."
	rm -rf $(CIRCUIT_DIR)/node_modules
	rm -f $(CIRCUIT_DIR)/*.r1cs 
	rm -f $(CIRCUIT_DIR)/*.wasm 
	rm -f $(CIRCUIT_DIR)/*.sym
	rm -f $(CIRCUIT_DIR)/*.ptau
	rm -f $(CIRCUIT_DIR)/*.zkey
	rm -f $(CIRCUIT_DIR)/verification_key.json
	rm -rf $(CIRCUIT_DIR)/*_js
	rm -f $(CIRCUIT_DIR)/package.json
	rm -f $(CIRCUIT_DIR)/package-lock.json
	
	rm -rf $(BACKEND_KEYS_DIR)
	mkdir -p $(BACKEND_KEYS_DIR)
	
	rm -rf $(FRONTEND_CIRCOM_DIR)
	rm -rf $(FRONTEND_ZKEY_DIR)
	mkdir -p $(FRONTEND_CIRCOM_DIR) $(FRONTEND_ZKEY_DIR)
	
	@echo "✅ Clean complete"

help:
	@echo "Available commands:"
	@echo "  make setup     - Install dependencies"
	@echo "  make compile   - Compile Circom circuit and generate keys"
	@echo "  make backend   - Download Go dependencies"
	@echo "  make frontend  - Prepare frontend directories"
	@echo "  make run       - Start the backend server"
	@echo "  make clean     - Remove all generated files"
	@echo "  make all       - Setup + Compile + Backend + Frontend"

all: compile backend frontend
	@echo "🎉 Project ready! Run 'make run' to start"