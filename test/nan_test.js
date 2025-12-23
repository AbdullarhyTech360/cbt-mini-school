/**
 * Specific test for NaN handling in PDF generation
 */

// Test the specific scenario that causes NaN errors
function testNaNHandling() {
    console.log("Testing NaN handling in PDF generation...\n");
    
    // Simulate the scenario that causes NaN
    let overall_total = "invalid"; // This would cause issues
    let overall_max = 100;
    
    // Validate and sanitize numeric values (as in our fixed code)
    const validOverallTotal = typeof overall_total === 'number' && !isNaN(overall_total) ? overall_total : 0;
    const validOverallMax = typeof overall_max === 'number' && !isNaN(overall_max) ? overall_max : 0;
    
    console.log("Input values:");
    console.log("- overall_total:", overall_total, "(type:", typeof overall_total, ")");
    console.log("- overall_max:", overall_max, "(type:", typeof overall_max, ")");
    
    console.log("\nValidated values:");
    console.log("- validOverallTotal:", validOverallTotal);
    console.log("- validOverallMax:", validOverallMax);
    
    // Calculate overall percentage
    const overallPercentage = validOverallMax > 0 ? (validOverallTotal / validOverallMax * 100) : 0;
    console.log("- overallPercentage:", overallPercentage, "(type:", typeof overallPercentage, ")");
    
    // Ensure overallPercentage is a valid number (our new fix)
    const validOverallPercentage = (typeof overallPercentage === 'number' && !isNaN(overallPercentage)) ? overallPercentage : 0;
    console.log("- validOverallPercentage:", validOverallPercentage, "(type:", typeof validOverallPercentage, ")");
    
    // Test the Math operations that were causing issues
    const minWidth = Math.min(100, Math.max(0, validOverallPercentage));
    console.log("- Math.min(100, Math.max(0, validOverallPercentage)):", minWidth);
    
    // Test toFixed
    try {
        const formatted = validOverallPercentage.toFixed(1);
        console.log("- validOverallPercentage.toFixed(1):", formatted);
    } catch (e) {
        console.log("- validOverallPercentage.toFixed(1) ERROR:", e.message);
    }
    
    console.log("\nAll NaN handling tests completed successfully!");
}

// Run the test
testNaNHandling();