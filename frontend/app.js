// ZK KYC Frontend - Age Verification using snarkJS
// This is a demo file that will work once circom circuit is compiled

const BACKEND_URL = 'http://localhost:8080';

// Глобальные переменные для хранения ключей и схемы
let verificationKey = null;
let wasmBlob = null;
let zkeyBlob = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('ZK KYC Frontend initialized');
    
    // В реальном приложении здесь загружались бы:
    // 1. verification_key.json - ключ верификации
    // 2. circuit.wasm - WebAssembly файл схемы
    // 3. circuit_final.zkey - файл с настройками доверия
    
    try {
        // Попытка загрузить файлы (будет работать после компиляции circom)
        await loadZKFiles();
    } catch (error) {
        console.warn('ZK files not loaded yet (expected before circom compilation):', error.message);
        showResult('ZK files not found. Please compile the circom circuit first.', 'error');
    }
    
    setupFormHandler();
});

// Загрузка ZK файлов
async function loadZKFiles() {
    try {
        // Загрузка ключа верификации
        const vkResponse = await fetch('../keys/verification_key.json');
        if (vkResponse.ok) {
            verificationKey = await vkResponse.json();
            console.log('Verification key loaded');
        }
        
        // Загрузка WASM файла
        const wasmResponse = await fetch('../circuits/circuit.wasm');
        if (wasmResponse.ok) {
            wasmBlob = await wasmResponse.blob();
            console.log('WASM file loaded');
        }
        
        // Загрузка zkey файла
        const zkeyResponse = await fetch('../circuits/circuit_final.zkey');
        if (zkeyResponse.ok) {
            zkeyBlob = await zkeyResponse.blob();
            console.log('Zkey file loaded');
        }
    } catch (error) {
        throw new Error('Failed to load ZK files');
    }
}

// Обработчик формы
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
        
        // Расчет возраста
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
        
        // Блокируем кнопку и показываем индикатор загрузки
        verifyBtn.disabled = true;
        showLoading(true);
        
        try {
            // Генерация доказательства
            const proof = await generateProof(age);
            
            // Отправка на бэкенд для верификации
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

// Генерация zero-knowledge доказательства
async function generateProof(age) {
    console.log('Generating proof for age:', age);
    
    // Проверка наличия необходимых файлов
    if (!wasmBlob || !zkeyBlob) {
        // Демо режим - симуляция доказательства
        console.log('Running in demo mode (no circuit files)');
        return createDemoProof(age >= 18);
    }
    
    // Входные данные для схемы
    const input = {
        age: age,
        threshold: 18
    };
    
    console.log('Input:', input);
    
    // Генерация доказательства с использованием snarkJS
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

// Создание демо-доказательства (когда нет файлов схемы)
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

// Верификация доказательства на бэкенде
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
        // Если бэкенд недоступен, делаем локальную верификацию (для демо)
        console.warn('Backend unavailable, using local verification:', error.message);
        return localVerify(proofData);
    }
}

// Локальная верификация (fallback)
async function localVerify(proofData) {
    if (!verificationKey) {
        // Демо режим - просто проверяем public signals
        const isOver18 = proofData.pubSignals[0] === "1";
        return {
            verified: isOver18,
            message: isOver18 ? 'User is 18+ years old (demo verification)' : 'User is under 18'
        };
    }
    
    // Полная верификация через snarkJS
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

// Отображение результата
function showResult(message, type) {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.className = `result ${type}`;
}

// Отображение индикатора загрузки
function showLoading(show) {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = show ? 'block' : 'none';
}

// Отображение деталей доказательства
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
