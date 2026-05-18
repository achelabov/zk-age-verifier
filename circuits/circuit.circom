// Circom circuit for age verification (18+)
// This circuit proves that a user is 18 years or older without revealing their exact age

pragma circom 2.0.0;

include "circomlib/comparators.circom";

template AgeVerification() {
    // Input signals
    signal input age;           // user's age (private)
    signal input threshold;     // threshold (18 years, public)
    
    // Output signal - verification result
    signal output isOver18;     // 1 if age >= 18, otherwise 0
    
    // Use comparator from circomlib for comparison
    component comparator = IsGreaterOrEqualThan(128);
    
    // Feed age and threshold to input
    comparator.in[0] <== age;
    comparator.in[1] <== threshold;
    
    // Comparison result
    isOver18 <== comparator.out;
}

// Main component
component main {public [threshold]} = AgeVerification();
