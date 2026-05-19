// Configuration
const API_BASE_URL = 'http://localhost:8080';
const CIRCUIT_WASM_URL = '/circom/age-verifier.wasm';
const CIRCUIT_ZKEY_URL = '/zkey/age-verifier.zkey';

// Global variables
let generatedProof = null;
let generatedPublicSignals = null;
let isCircuitLoaded = false;

// Logger
const logger = {
    info: (msg, data = null) => console.log(`[${new Date().toISOString()}] ℹ️ ${msg}`, data || ''),
    success: (msg, data = null) => console.log(`[${new Date().toISOString()}] ✅ ${msg}`, data || ''),
    error: (msg, err = null) => console.error(`[${new Date().toISOString()}] ❌ ${msg}`, err || ''),
    warn: (msg, data = null) => console.warn(`[${new Date().toISOString()}] ⚠️ ${msg}`, data || ''),
    debug: (msg, data = null) => console.debug(`[${new Date().toISOString()}] 🔍 ${msg}`, data || '')
};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    logger.info('Page loading...');
    
    // Set current date
    const today = new Date();
    document.getElementById('currentYear').value = today.getFullYear();
    
    // Default/example values
    document.getElementById('birthYear').value = 1990;
    
    // Assign event handlers
    document.getElementById('generateProofBtn').addEventListener('click', generateProof);
    document.getElementById('verifyProofBtn').addEventListener('click', verifyProof);
    
    // Load circuit files
    await loadCircuitFiles();
    await checkServerHealth();
});

// Load files
async function loadCircuitFiles() {
    logger.info('Loading circuit files...');
    
    try {
        // Check WASM
        const wasmResp = await fetch(CIRCUIT_WASM_URL, { method: 'HEAD' });
        if (!wasmResp.ok) throw new Error(`WASM not found (${wasmResp.status})`);
        logger.success('WASM file found');
        
        // Check ZKEY
        const zkeyResp = await fetch(CIRCUIT_ZKEY_URL, { method: 'HEAD' });
        if (!zkeyResp.ok) throw new Error(`ZKEY not found (${zkeyResp.status})`);
        logger.success('ZKEY file found');
        
        // Check snarkjs
        if (typeof snarkjs === 'undefined') throw new Error('snarkjs not loaded');
        logger.success('snarkjs loaded');
        
        isCircuitLoaded = true;
        const btn = document.getElementById('generateProofBtn');
        btn.disabled = false;
        btn.textContent = '🎫 Generate Zero-Knowledge Proof';
        showStatus('✅ Circuit ready! Enter your birth year and generate proof.', 'success');
        
    } catch (error) {
        logger.error('Failed to load circuit', error);
        showStatus(`❌ ${error.message}`, 'error');
        document.getElementById('generateProofBtn').disabled = true;
    }
}

// Generate proof
async function generateProof() {
    if (!isCircuitLoaded) {
        showStatus('Circuit not loaded yet. Please wait.', 'error');
        return;
    }
    
    // Get values
    const birthYear = parseInt(document.getElementById('birthYear').value);
    const currentYear = parseInt(document.getElementById('currentYear').value);
    
    // Validation
    if (!birthYear || !currentYear) {
        showStatus('Please enter both birth year and current year', 'error');
        return;
    }
    
    const age = currentYear - birthYear;
    
    if (age < 0) {
        showStatus('Birth year cannot be in the future', 'error');
        return;
    }
    
    logger.info(`Age: ${age} years old`);
    showStatus(`🎂 You are ${age} years old. Generating proof...`, 'info');
    
    const generateBtn = document.getElementById('generateProofBtn');
    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ Generating proof...';
    
    try {
        // Generate salt
        const salt = Math.floor(Math.random() * 1000000);
        
        // Compute hash (simple addition, as in the circuit)
        const birthdayHash = birthYear + salt;
        
        logger.debug(`Salt: ${salt}, Birthday hash: ${birthdayHash}`);
        
        // Circuit inputs
        const input = {
            birthYear: birthYear,
            currentYear: currentYear,
            salt: salt,
            birthdayHash: birthdayHash
        };
        
        logger.debug('Circuit input:', input);
        
        // Generate proof
        const startTime = Date.now();
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            CIRCUIT_WASM_URL,
            CIRCUIT_ZKEY_URL
        );
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        logger.success(`Proof generated in ${duration}s`);
        logger.debug('Public signals:', publicSignals);
        
        // Save
        generatedProof = proof;
        generatedPublicSignals = publicSignals;
        
        // Display details
        const isValid = publicSignals[0] === '1';
        document.getElementById('birthdayHash').textContent = birthdayHash;
        document.getElementById('publicSignals').textContent = JSON.stringify(publicSignals);
        document.getElementById('proofSize').textContent = `${JSON.stringify(proof).length} bytes`;
        document.getElementById('proofDetails').style.display = 'block';
        
        // Enable verification button
        document.getElementById('verifyProofBtn').disabled = false;
        
        if (isValid) {
            showStatus(`✅ Proof ready! You are ${age} years old. Click "Verify" to prove to server.`, 'success');
        } else {
            showStatus(`⚠️ You are ${age} years old (under 18). Proof generated but verification will fail.`, 'warning');
        }
        
    } catch (error) {
        logger.error('Proof generation failed', error);
        showStatus(`❌ Failed: ${error.message}`, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '🎫 Generate Zero-Knowledge Proof';
    }
}

// Verify proof
async function verifyProof() {
    if (!generatedProof || !generatedPublicSignals) {
        showStatus('No proof generated. Please generate a proof first.', 'error');
        return;
    }
    
    showStatus('🔍 Sending proof to server...', 'info');
    
    const verifyBtn = document.getElementById('verifyProofBtn');
    verifyBtn.disabled = true;
    verifyBtn.textContent = '⏳ Verifying...';
    
    try {
        const proofData = {
            proof: {
                pi_a: generatedProof.pi_a,
                pi_b: generatedProof.pi_b,
                pi_c: generatedProof.pi_c
            },
            publicSignals: generatedPublicSignals
        };
        
        logger.debug('Sending verification request');
        
        const startTime = Date.now();
        const response = await fetch(`${API_BASE_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proofData)
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const result = await response.json();

        console.log('Server response:', result);
        console.log('Public signals sent:', generatedPublicSignals);
        console.log('Expected isValid:', generatedPublicSignals[0]);
        
        logger.info(`Server responded in ${duration}s: isValid=${result.isValid}`);
        
        if (response.ok && result.isValid) {
            showResult(true, result.message);
            showStatus('✅ Server verification successful!', 'success');
        } else {
            showResult(false, result.message || result.error || 'Verification failed');
            showStatus(`❌ ${result.error || 'Verification failed'}`, 'error');
        }
        
    } catch (error) {
        logger.error('Verification request failed', error);
        showStatus(`❌ Network error: ${error.message}`, 'error');
        showResult(false, 'Cannot connect to backend server');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = '✅ Verify Proof with Server';
    }
}

// Helper functions
function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type} show`;
    setTimeout(() => statusDiv.classList.remove('show'), 5000);
}

function showResult(isValid, message) {
    const resultDiv = document.getElementById('result');
    resultDiv.className = `result ${isValid ? 'success' : 'error'}`;
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <h3>${isValid ? '✅ Verification Successful!' : '❌ Verification Failed'}</h3>
        <p>${message}</p>
        ${isValid ? '<p>🎉 You proved you are over 18 without revealing your birth year!</p>' : ''}
    `;
    setTimeout(() => resultDiv.style.display = 'none', 10000);
}

async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (response.ok) {
            logger.success('Backend server is healthy');
            showStatus('✅ Connected to backend', 'success');
        }
    } catch (error) {
        logger.warn('Backend not available');
        showStatus('⚠️ Backend server not running on port 8080', 'warning');
    }
}

// Export for debugging
window.debug = {
    getProof: () => generatedProof,
    getPublicSignals: () => generatedPublicSignals,
    isLoaded: () => isCircuitLoaded
};