/**
 * Simple test to verify logging functionality
 */

// Copy the safeNumber function for testing
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

// Test the logging
console.log("=== Logging Test ===");
console.log("Testing safeNumber function with logging:");

// Test cases
const testCases = [
    { value: null, expected: 0 },
    { value: undefined, expected: 0 },
    { value: "", expected: 0 },
    { value: "invalid", expected: 0 },
    { value: NaN, expected: 0 },
    { value: 42, expected: 42 },
    { value: "100", expected: 100 }
];

for (const testCase of testCases) {
    const result = safeNumber(testCase.value);
    console.log(`[TEST] safeNumber(${JSON.stringify(testCase.value)}) = ${result} (expected: ${testCase.expected})`);
}

console.log("=== Logging Test Completed ===");

async function getName(userId) {
    const response = await fetch(`/api/users/${userId}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch user ${userId}`);
    }

}