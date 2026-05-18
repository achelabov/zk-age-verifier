// ZK KYC Frontend - Age Verification using snarkJS
// This is a demo file that will work once circom circuit is compiled

const BACKEND_URL = 'http://localhost:8080';

// Global variables for storing keys and schema
let verificationKey = null;
let wasmBlob = null;
let zkeyBlob = null;

// Initialization on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('ZK KYC Frontend initialized');
    
    // In a real application, the following would be loaded here:
    // 1. verification_key.json - verification key
    // 2. circuit.wasm - circuit WebAssembly file
    // 3. circuit_final.zkey - trusted setup file
    
    try {
        // Attempt to load files (will work after circom compilation)
        await loadZKFiles();
    } catch (error) {
        console.warn('ZK files not loaded yet (expected before circom compilation):', error.message);
        showResult('ZK files not found. Please compile the circom circuit first.', 'error');
    }
    
    setupFormHandler();
});

// Load ZK files
async function loadZKFiles() {
    try {
        // Load verification key
        const vkResponse = await fetch('../keys/verification_key.json');
        if (vkResponse.ok) {
            verificationKey = await vkResponse.json();
            console.log('Verification key loaded');
        }
        
        // Load WASM file
        const wasmResponse = await fetch('../circuits/circuit.wasm');
        if (wasmResponse.ok) {
            wasmBlob = await wasmResponse.blob();
            console.log('WASM file loaded');
        }
        
        // Load zkey file
        const zkeyResponse = await fetch('../circuits/circuit_final.zkey');
        if (zkeyResponse.ok) {
            zkeyBlob = await zkeyResponse.blob();
            console.log('Zkey file loaded');
        }
    } catch (error) {
        throw new Error('Failed to load ZK files');
    }
}

// Form handler
function setupFormHandler() {
    const form = document.getElementById('kycForm');
    const verifyBtn = document.getElementById('verifyBtn');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const birthDateInput = document.getElementById('birthDate').value;
        
        if (!birthDateInput) {
            showResult('Please enter your birth date', 'error');
            return;
        }
        
        const birthDate = new Date(birthDateInput);
        const today = new Date();
        
        // Calculate age
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        console.log(`User age: ${age}`);
        
        if (age < 0 || age > 150) {
            showResult('Invalid birth date', 'error');
            return;
        }
        
        // Disable button and show loading indicator
        verifyBtn.disabled = true;
        showLoading(true);
        
        try {
            // Generate proof
            const proof = await generateProof(age);
            
            // Send to backend for verification
            const result = await verifyProof(proof);
            
            if (result.verified) {
                showResult(result.message, 'success');
                showProofDetails(proof);
            } else {
                showResult(result.message || 'Verification failed', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showResult(`Error: ${error.message}`, 'error');
        } finally {
            verifyBtn.disabled = false;
            showLoading(false);
        }
    });
}

// Generate zero-knowledge proof
async function generateProof(age) {
    console.log('Generating proof for age:', age);
    
    // Check for required files
    if (!wasmBlob || !zkeyBlob) {
        // Demo mode - simulate proof
        console.log('Running in demo mode (no circuit files)');
        return createDemoProof(age >= 18);
    }
    
    // Input data for the circuit
    const input = {
        age: age,
        threshold: 18
    };
    
    console.log('Input:', input);
    
    // Generate proof using snarkJS
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        wasmBlob,
        zkeyBlob
    );
    
    console.log('Proof generated:', proof);
    console.log('Public signals:', publicSignals);
    
    return {
        proof: proof,
        pubSignals: publicSignals
    };
}

// Create demo proof (when circuit files are not available)
function createDemoProof(isOver18) {
    return {
        proof: {
            pi_a: [
                "1234567890123456789012345678901234567890123456789012345678901234",
                "9876543210987654321098765432109876543210987654321098765432109876",
                "1111111111111111111111111111111111111111111111111111111111111111"
            ],
            pi_b: [
                [
                    "2222222222222222222222222222222222222222222222222222222222222222",
                    "3333333333333333333333333333333333333333333333333333333333333333"
                ],
                [
                    "4444444444444444444444444444444444444444444444444444444444444444",
                    "5555555555555555555555555555555555555555555555555555555555555555"
                ],
                [
                    "6666666666666666666666666666666666666666666666666666666666666666",
                    "7777777777777777777777777777777777777777777777777777777777777777"
                ]
            ],
            pi_c: [
                "8888888888888888888888888888888888888888888888888888888888888888",
                "9999999999999999999999999999999999999999999999999999999999999999"
            ]
        },
        pubSignals: isOver18 ? ["1"] : ["0"]
    };
}

// Verify proof on backend
async function verifyProof(proofData) {
    console.log('Verifying proof on backend...');
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                proof: proofData.proof,
                pubSignals: proofData.pubSignals
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Verification request failed');
        }
        
        const result = await response.json();
        console.log('Verification result:', result);
        
        return result;
    } catch (error) {
        // If backend is unavailable, do local verification (for demo)
        console.warn('Backend unavailable, using local verification:', error.message);
        return localVerify(proofData);
    }
}

// Local verification (fallback)
async function localVerify(proofData) {
    if (!verificationKey) {
        // Demo mode - just check public signals
        const isOver18 = proofData.pubSignals[0] === "1";
        return {
            verified: isOver18,
            message: isOver18 ? 'User is 18+ years old (demo verification)' : 'User is under 18'
        };
    }
    
    // Full verification via snarkJS
    const verified = await snarkjs.groth16.verify(
        verificationKey,
        proofData.pubSignals,
        proofData.proof
    );
    
    return {
        verified: verified,
        message: verified ? 'User is 18+ years old (verified via ZK)' : 'Verification failed'
    };
}

// Display result
function showResult(message, type) {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.className = `result ${type}`;
}

// Display loading indicator
function showLoading(show) {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = show ? 'block' : 'none';
}

// Display proof details
function showProofDetails(proof) {
    const detailsDiv = document.getElementById('proofDetails');
    detailsDiv.innerHTML = `
        <strong>Proof Details (Public Signals):</strong><br>
        Is 18+: ${proof.pubSignals[0]}<br><br>
        <strong>Proof (truncated):</strong><br>
        π_a: ${proof.proof.pi_a[0].substring(0, 20)}...<br>
        π_b: [${proof.proof.pi_b[0][0].substring(0, 20)}..., ...]<br>
        π_c: ${proof.proof.pi_c[0].substring(0, 20)}...
    `;
}
