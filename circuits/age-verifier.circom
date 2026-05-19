pragma circom 2.1.6;

include "node_modules/circomlib/circuits/comparators.circom";

template AgeVerifier(AGE_THRESHOLD) {
    // Public inputs (visible to the server)
    signal input birthdayHash;   // Hash of the birth date
    
    // Private inputs (hidden data)
    signal input birthYear;
    signal input currentYear;
    signal input salt;
    
    // Output
    signal output isValid;
    
    // Simple age calculation
    signal age;
    age <== currentYear - birthYear;
    
    // Age verification check
    component lt = LessThan(32);
    lt.in[0] <== age;
    lt.in[1] <== AGE_THRESHOLD;
    
    isValid <== 1 - lt.out;
    
    // Simple hash for verification (not Poseidon)
    // Temporarily using addition as a hash (FOR TESTING PURPOSES ONLY!)
    signal computedHash;
    computedHash <== birthYear + salt;
    
    birthdayHash === computedHash;
}

component main = AgeVerifier(18);