/**
 * Test suite for enhanced styling functions
 */

// Import the functions we want to test
const fs = require('fs');

// Test functions from the client_pdf_generator.js file
function getGrade(percentage) {
    if (percentage >= 70) return 'A';
    if (percentage >= 59) return 'B';
    if (percentage >= 49) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
}

function getRemark(percentage) {
    if (percentage >= 70) return { text: 'Excellent', class: 'remark-excellent' };
    if (percentage >= 59) return { text: 'Very Good', class: 'remark-good' };
    if (percentage >= 49) return { text: 'Good', class: 'remark-average' };
    if (percentage >= 40) return { text: 'Pass', class: 'remark-poor' };
    return { text: 'Fail', class: 'remark-fail' };
}

function getGradeColor(grade) {
    const colors = {
        'A': '#10b981',
        'B': '#3b82f6',
        'C': '#f59e0b',
        'D': '#ef4444',
        'F': '#6b7280'
    };
    return colors[grade] || '#000000';
}

function getGradeFillColor(grade) {
    const colors = {
        'A': '#10b981',
        'B': '#3b82f6',
        'C': '#f59e0b',
        'D': '#ef4444',
        'F': '#6b7280'
    };
    return colors[grade] || '#000000';
}

function getRemarkColor(remark) {
    const colors = {
        'remark-excellent': '#059669',
        'remark-good': '#2563eb',
        'remark-average': '#d97706',
        'remark-poor': '#dc2626',
        'remark-fail': '#4b5563'
    };
    return colors[remark.class] || '#000000';
}

function formatPosition(position) {
    if (!position) return 'N/A';
    const suffix = position % 10 === 1 && position !== 11 ? 'st' :
        position % 10 === 2 && position !== 12 ? 'nd' :
        position % 10 === 3 && position !== 13 ? 'rd' : 'th';
    return position + suffix;
}

function formatAssessmentName(code) {
    if (typeof code !== 'string') return code;
    const specialCases = { 'cbt': 'CBT', 'ca': 'CA', 'exam': 'Exam', 'mid_term': 'Mid-Term' };
    if (specialCases[code.toLowerCase()]) return specialCases[code.toLowerCase()];
    return code.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Test cases
function testGradeCalculation() {
    console.log("Testing grade calculation...");
    
    const testCases = [
        { percentage: 85, expected: 'A' },
        { percentage: 70, expected: 'A' },
        { percentage: 65, expected: 'B' },
        { percentage: 59, expected: 'B' },
        { percentage: 55, expected: 'C' },
        { percentage: 49, expected: 'C' },
        { percentage: 45, expected: 'D' },
        { percentage: 40, expected: 'D' },
        { percentage: 35, expected: 'F' }
    ];
    
    let passed = 0;
    let total = testCases.length;
    
    for (const testCase of testCases) {
        const result = getGrade(testCase.percentage);
        if (result === testCase.expected) {
            console.log(`✓ Grade test passed for ${testCase.percentage}%: ${result}`);
            passed++;
        } else {
            console.error(`✗ Grade test failed for ${testCase.percentage}%: expected ${testCase.expected}, got ${result}`);
        }
    }
    
    console.log(`Grade calculation tests: ${passed}/${total} passed\n`);
    return passed === total;
}

function testRemarkGeneration() {
    console.log("Testing remark generation...");
    
    const testCases = [
        { percentage: 85, expectedText: 'Excellent', expectedClass: 'remark-excellent' },
        { percentage: 70, expectedText: 'Excellent', expectedClass: 'remark-excellent' },
        { percentage: 65, expectedText: 'Very Good', expectedClass: 'remark-good' },
        { percentage: 59, expectedText: 'Very Good', expectedClass: 'remark-good' },
        { percentage: 55, expectedText: 'Good', expectedClass: 'remark-average' },
        { percentage: 49, expectedText: 'Good', expectedClass: 'remark-average' },
        { percentage: 45, expectedText: 'Pass', expectedClass: 'remark-poor' },
        { percentage: 40, expectedText: 'Pass', expectedClass: 'remark-poor' },
        { percentage: 35, expectedText: 'Fail', expectedClass: 'remark-fail' }
    ];
    
    let passed = 0;
    let total = testCases.length;
    
    for (const testCase of testCases) {
        const result = getRemark(testCase.percentage);
        if (result.text === testCase.expectedText && result.class === testCase.expectedClass) {
            console.log(`✓ Remark test passed for ${testCase.percentage}%: ${result.text}`);
            passed++;
        } else {
            console.error(`✗ Remark test failed for ${testCase.percentage}%: expected ${testCase.expectedText}, got ${result.text}`);
        }
    }
    
    console.log(`Remark generation tests: ${passed}/${total} passed\n`);
    return passed === total;
}

function testColorFunctions() {
    console.log("Testing color functions...");
    
    // Test grade colors
    const gradeColors = [
        { grade: 'A', expected: '#10b981' },
        { grade: 'B', expected: '#3b82f6' },
        { grade: 'C', expected: '#f59e0b' },
        { grade: 'D', expected: '#ef4444' },
        { grade: 'F', expected: '#6b7280' }
    ];
    
    let passed = 0;
    let total = gradeColors.length * 2; // Testing both getGradeColor and getGradeFillColor
    
    for (const colorTest of gradeColors) {
        const colorResult = getGradeColor(colorTest.grade);
        const fillColorResult = getGradeFillColor(colorTest.grade);
        
        if (colorResult === colorTest.expected) {
            console.log(`✓ Grade color test passed for ${colorTest.grade}: ${colorResult}`);
            passed++;
        } else {
            console.error(`✗ Grade color test failed for ${colorTest.grade}: expected ${colorTest.expected}, got ${colorResult}`);
        }
        
        if (fillColorResult === colorTest.expected) {
            console.log(`✓ Grade fill color test passed for ${colorTest.grade}: ${fillColorResult}`);
            passed++;
        } else {
            console.error(`✗ Grade fill color test failed for ${colorTest.grade}: expected ${colorTest.expected}, got ${fillColorResult}`);
        }
    }
    
    // Test remark colors
    const remarkColors = [
        { remark: { class: 'remark-excellent' }, expected: '#059669' },
        { remark: { class: 'remark-good' }, expected: '#2563eb' },
        { remark: { class: 'remark-average' }, expected: '#d97706' },
        { remark: { class: 'remark-poor' }, expected: '#dc2626' },
        { remark: { class: 'remark-fail' }, expected: '#4b5563' }
    ];
    
    total += remarkColors.length;
    
    for (const colorTest of remarkColors) {
        const result = getRemarkColor(colorTest.remark);
        if (result === colorTest.expected) {
            console.log(`✓ Remark color test passed for ${colorTest.remark.class}: ${result}`);
            passed++;
        } else {
            console.error(`✗ Remark color test failed for ${colorTest.remark.class}: expected ${colorTest.expected}, got ${result}`);
        }
    }
    
    console.log(`Color function tests: ${passed}/${total} passed\n`);
    return passed === total;
}

function testFormattingFunctions() {
    console.log("Testing formatting functions...");
    
    // Test position formatting
    const positionTests = [
        { position: 1, expected: '1st' },
        { position: 2, expected: '2nd' },
        { position: 3, expected: '3rd' },
        { position: 4, expected: '4th' },
        { position: 11, expected: '11th' },
        { position: 21, expected: '21st' },
        { position: 22, expected: '22nd' },
        { position: 23, expected: '23rd' },
        { position: 24, expected: '24th' }
    ];
    
    let passed = 0;
    let total = positionTests.length;
    
    for (const posTest of positionTests) {
        const result = formatPosition(posTest.position);
        if (result === posTest.expected) {
            console.log(`✓ Position formatting test passed for ${posTest.position}: ${result}`);
            passed++;
        } else {
            console.error(`✗ Position formatting test failed for ${posTest.position}: expected ${posTest.expected}, got ${result}`);
        }
    }
    
    // Test assessment name formatting
    const assessmentTests = [
        { code: 'cbt', expected: 'CBT' },
        { code: 'ca', expected: 'CA' },
        { code: 'exam', expected: 'Exam' },
        { code: 'mid_term', expected: 'Mid-Term' },
        { code: 'final_exam', expected: 'Final Exam' }
    ];
    
    total += assessmentTests.length;
    
    for (const assessTest of assessmentTests) {
        const result = formatAssessmentName(assessTest.code);
        if (result === assessTest.expected) {
            console.log(`✓ Assessment name formatting test passed for ${assessTest.code}: ${result}`);
            passed++;
        } else {
            console.error(`✗ Assessment name formatting test failed for ${assessTest.code}: expected ${assessTest.expected}, got ${result}`);
        }
    }
    
    console.log(`Formatting function tests: ${passed}/${total} passed\n`);
    return passed === total;
}

// Run all tests
function runAllTests() {
    console.log("Running enhanced styling tests...\n");
    
    const results = [
        testGradeCalculation(),
        testRemarkGeneration(),
        testColorFunctions(),
        testFormattingFunctions()
    ];
    
    const allPassed = results.every(result => result);
    
    console.log(`Overall result: ${allPassed ? 'All tests passed!' : 'Some tests failed!'}`);
    return allPassed;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        getGrade,
        getRemark,
        getGradeColor,
        getGradeFillColor,
        getRemarkColor,
        formatPosition,
        formatAssessmentName
    };
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}