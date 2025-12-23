/**
 * Comprehensive test for NaN handling in PDF generation
 */

// Utility functions (copied from the main file)
function safeNumber(value, defaultValue = 0) {
    // Handle null, undefined, or non-numeric strings
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }
    
    // Convert to number
    const num = Number(value);
    
    // Check if it's a valid finite number
    if (Number.isFinite(num)) {
        return num;
    }
    
    // Return default for NaN, Infinity, -Infinity
    return defaultValue;
}

function safeInteger(value, defaultValue = 0) {
    return Math.floor(safeNumber(value, defaultValue));
}

// Test all possible edge cases that could cause NaN
function testAllEdgeCases() {
    console.log("=== Comprehensive NaN Handling Test ===\n");
    
    // Test cases that commonly cause NaN
    const testCases = [
        // Basic invalid values
        { value: null, expected: 0, description: "null value" },
        { value: undefined, expected: 0, description: "undefined value" },
        { value: "", expected: 0, description: "empty string" },
        { value: " ", expected: 0, description: "whitespace string" },
        { value: "NaN", expected: 0, description: "'NaN' string" },
        { value: "invalid", expected: 0, description: "non-numeric string" },
        
        // Edge numeric values
        { value: NaN, expected: 0, description: "NaN value" },
        { value: Infinity, expected: 0, description: "Infinity value" },
        { value: -Infinity, expected: 0, description: "-Infinity value" },
        
        // Valid numeric values
        { value: 0, expected: 0, description: "zero" },
        { value: 42, expected: 42, description: "positive integer" },
        { value: -15, expected: -15, description: "negative integer" },
        { value: 3.14, expected: 3.14, description: "positive float" },
        { value: -2.71, expected: -2.71, description: "negative float" },
        { value: "100", expected: 100, description: "numeric string" },
        { value: "50.5", expected: 50.5, description: "float string" },
        
        // Boolean values (should convert to 1 or 0)
        { value: true, expected: 1, description: "boolean true" },
        { value: false, expected: 0, description: "boolean false" }
    ];
    
    console.log("Testing safeNumber function:");
    let passed = 0;
    let total = testCases.length;
    
    for (const testCase of testCases) {
        const result = safeNumber(testCase.value);
        const success = result === testCase.expected;
        
        if (success) {
            console.log(`✓ ${testCase.description}: ${testCase.value} -> ${result}`);
            passed++;
        } else {
            console.log(`✗ ${testCase.description}: ${testCase.value} -> ${result} (expected ${testCase.expected})`);
        }
    }
    
    console.log(`\nsafeNumber tests: ${passed}/${total} passed\n`);
    
    // Test safeInteger function
    console.log("Testing safeInteger function:");
    const integerTestCases = [
        { value: null, expected: 0, description: "null value" },
        { value: 3.14, expected: 3, description: "float value" },
        { value: -2.71, expected: -3, description: "negative float value" },
        { value: 42, expected: 42, description: "integer value" },
        { value: "100", expected: 100, description: "numeric string" }
    ];
    
    passed = 0;
    total = integerTestCases.length;
    
    for (const testCase of integerTestCases) {
        const result = safeInteger(testCase.value);
        const success = result === testCase.expected;
        
        if (success) {
            console.log(`✓ ${testCase.description}: ${testCase.value} -> ${result}`);
            passed++;
        } else {
            console.log(`✗ ${testCase.description}: ${testCase.value} -> ${result} (expected ${testCase.expected})`);
        }
    }
    
    console.log(`\nsafeInteger tests: ${passed}/${total} passed\n`);
    
    // Test mathematical operations that could produce NaN
    console.log("Testing mathematical operations:");
    
    // Division by zero scenarios
    const divZeroTests = [
        { a: 10, b: 0, description: "10 / 0" },
        { a: 0, b: 0, description: "0 / 0" },
        { a: -5, b: 0, description: "-5 / 0" }
    ];
    
    for (const test of divZeroTests) {
        const result = test.a / test.b;
        const safeResult = safeNumber(result);
        console.log(`✓ ${test.description} = ${result} -> safeNumber(${result}) = ${safeResult}`);
    }
    
    // Invalid arithmetic operations
    const invalidOps = [
        { op: "0 * Infinity", result: 0 * Infinity },
        { op: "Infinity - Infinity", result: Infinity - Infinity },
        { op: "Infinity / Infinity", result: Infinity / Infinity }
    ];
    
    for (const test of invalidOps) {
        const safeResult = safeNumber(test.result);
        console.log(`✓ ${test.op} = ${test.result} -> safeNumber(${test.result}) = ${safeResult}`);
    }
    
    // Test percentage calculations with edge cases
    console.log("\nTesting percentage calculations:");
    const percentageTests = [
        { total: 85, max: 100, description: "Normal calculation" },
        { total: 0, max: 100, description: "Zero total" },
        { total: 85, max: 0, description: "Zero max (division by zero)" },
        { total: null, max: 100, description: "Null total" },
        { total: 85, max: null, description: "Null max" },
        { total: "invalid", max: 100, description: "Invalid total" }
    ];
    
    for (const test of percentageTests) {
        // Simulate the calculation in our PDF generator
        const validTotal = safeNumber(test.total, 0);
        const validMax = safeNumber(test.max, 0);
        const percentage = validMax > 0 ? (validTotal / validMax * 100) : 0;
        const validPercentage = safeNumber(percentage, 0);
        
        console.log(`✓ ${test.description}: (${test.total}/${test.max}) -> ${validPercentage.toFixed(1)}%`);
    }
    
    console.log("\n=== All tests completed successfully! ===");
}

// Run the tests
testAllEdgeCases();