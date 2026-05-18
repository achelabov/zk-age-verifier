// Circom circuit for age verification (18+)
// This circuit proves that a user is 18 years or older without revealing their exact age

pragma circom 2.0.0;

include "circomlib/comparators.circom";

template AgeVerification() {
    // Входные сигналы
    signal input age;           // возраст пользователя (приватный)
    signal input threshold;     // порог (18 лет, публичный)
    
    // Выходной сигнал - результат проверки
    signal output isOver18;     // 1 если возраст >= 18, иначе 0
    
    // Используем компаратор из circomlib для сравнения
    component comparator = IsGreaterOrEqualThan(128);
    
    // Подаём на вход age и threshold
    comparator.in[0] <== age;
    comparator.in[1] <== threshold;
    
    // Результат сравнения
    isOver18 <== comparator.out;
}

// Основной компонент
component main {public [threshold]} = AgeVerification();
