/**
 * Test suite for error handling in PDF generation functions
 */

// Test functions with edge cases
function getGrade(percentage) {
    if (typeof percentage !== 'number' || isNaN(percentage)) percentage = 0;
    if (percentage >= 70) return 'A';
    if (percentage >= 59) return 'B';
    if (percentage >= 49) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
}

function getRemark(percentage) {
    if (typeof percentage !== 'number' || isNaN(percentage)) percentage = 0;
    if (percentage >= 70) return { text: 'Excellent', class: 'remark-excellent' };
    if (percentage >= 59) return { text: 'Very Good', class: 'remark-good' };
    if (percentage >= 49) return { text: 'Good', class: 'remark-average' };
    if (percentage >= 40) return { text: 'Pass', class: 'remark-poor' };
    return { text: 'Fail', class: 'remark-fail' };
}

function formatPosition(position) {
    if (typeof position !== 'number' || isNaN(position) || position <= 0) return 'N/A';
    const suffix = position % 10 === 1 && position !== 11 ? 'st' :
        position % 10 === 2 && position !== 12 ? 'nd' :
        position % 10 === 3 && position !== 13 ? 'rd' : 'th';
    return position + suffix;
}

function formatAssessmentName(code) {
    if (typeof code !== 'string' || !code) return 'N/A';
    const specialCases = { 'cbt': 'CBT', 'ca': 'CA', 'exam': 'Exam', 'mid_term': 'Mid-Term' };
    if (specialCases[code.toLowerCase()]) return specialCases[code.toLowerCase()];
    return code.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function calculateResumptionDate(endDateStr) {
    try {
        if (!endDateStr) return 'N/A';
        const endDate = new Date(endDateStr);
        if (isNaN(endDate.getTime())) return 'N/A';
        const resumptionDate = new Date(endDate);
        resumptionDate.setDate(resumptionDate.getDate() + 14);
        return resumptionDate.toISOString().split('T')[0];
    } catch (e) {
        return 'N/A';
    }
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
    if (!remark || !remark.class) return '#000000';
    const colors = {
        'remark-excellent': '#059669',
        'remark-good': '#2563eb',
        'remark-average': '#d97706',
        'remark-poor': '#dc2626',
        'remark-fail': '#4b5563'
    };
    return colors[remark.class] || '#000000';
}

// Test cases for error handling
function testEdgeCases() {
    console.log("Testing edge cases and error handling...\n");
    
    // Test getGrade with invalid inputs
    console.log("Testing getGrade with invalid inputs:");
    console.log("getGrade(NaN):", getGrade(NaN));
    console.log("getGrade(undefined):", getGrade(undefined));
    console.log("getGrade(null):", getGrade(null));
    console.log("getGrade('invalid'):", getGrade('invalid'));
    console.log("getGrade(-10):", getGrade(-10));
    console.log("getGrade(0):", getGrade(0));
    console.log("getGrade(100):", getGrade(100));
    
    // Test getRemark with invalid inputs
    console.log("\nTesting getRemark with invalid inputs:");
    console.log("getRemark(NaN):", getRemark(NaN));
    console.log("getRemark(undefined):", getRemark(undefined));
    console.log("getRemark(null):", getRemark(null));
    console.log("getRemark('invalid'):", getRemark('invalid'));
    console.log("getRemark(-10):", getRemark(-10));
    console.log("getRemark(0):", getRemark(0));
    console.log("getRemark(100):", getRemark(100));
    
    // Test formatPosition with invalid inputs
    console.log("\nTesting formatPosition with invalid inputs:");
    console.log("formatPosition(NaN):", formatPosition(NaN));
    console.log("formatPosition(undefined):", formatPosition(undefined));
    console.log("formatPosition(null):", formatPosition(null));
    console.log("formatPosition('invalid'):", formatPosition('invalid'));
    console.log("formatPosition(-10):", formatPosition(-10));
    console.log("formatPosition(0):", formatPosition(0));
    console.log("formatPosition(1):", formatPosition(1));
    console.log("formatPosition(21):", formatPosition(21));
    
    // Test formatAssessmentName with invalid inputs
    console.log("\nTesting formatAssessmentName with invalid inputs:");
    console.log("formatAssessmentName(NaN):", formatAssessmentName(NaN));
    console.log("formatAssessmentName(undefined):", formatAssessmentName(undefined));
    console.log("formatAssessmentName(null):", formatAssessmentName(null));
    console.log("formatAssessmentName(''):", formatAssessmentName(''));
    console.log("formatAssessmentName('cbt'):", formatAssessmentName('cbt'));
    console.log("formatAssessmentName('exam'):", formatAssessmentName('exam'));
    
    // Test calculateResumptionDate with invalid inputs
    console.log("\nTesting calculateResumptionDate with invalid inputs:");
    console.log("calculateResumptionDate(NaN):", calculateResumptionDate(NaN));
    console.log("calculateResumptionDate(undefined):", calculateResumptionDate(undefined));
    console.log("calculateResumptionDate(null):", calculateResumptionDate(null));
    console.log("calculateResumptionDate(''):", calculateResumptionDate(''));
    console.log("calculateResumptionDate('invalid'):", calculateResumptionDate('invalid'));
    console.log("calculateResumptionDate('2023-12-15'):", calculateResumptionDate('2023-12-15'));
    
    // Test color functions with invalid inputs
    console.log("\nTesting color functions with invalid inputs:");
    console.log("getGradeColor(NaN):", getGradeColor(NaN));
    console.log("getGradeColor(undefined):", getGradeColor(undefined));
    console.log("getGradeColor(null):", getGradeColor(null));
    console.log("getGradeColor(''):", getGradeColor(''));
    console.log("getGradeColor('A'):", getGradeColor('A'));
    console.log("getGradeColor('X'):", getGradeColor('X'));
    
    console.log("getGradeFillColor(NaN):", getGradeFillColor(NaN));
    console.log("getGradeFillColor(undefined):", getGradeFillColor(undefined));
    console.log("getGradeFillColor(null):", getGradeFillColor(null));
    console.log("getGradeFillColor(''):", getGradeFillColor(''));
    console.log("getGradeFillColor('A'):", getGradeFillColor('A'));
    console.log("getGradeFillColor('X'):", getGradeFillColor('X'));
    
    console.log("getRemarkColor(NaN):", getRemarkColor(NaN));
    console.log("getRemarkColor(undefined):", getRemarkColor(undefined));
    console.log("getRemarkColor(null):", getRemarkColor(null));
    console.log("getRemarkColor({}):", getRemarkColor({}));
    console.log("getRemarkColor({class: 'remark-excellent'}):", getRemarkColor({class: 'remark-excellent'}));
    console.log("getRemarkColor({class: 'invalid'}):", getRemarkColor({class: 'invalid'}));
    
    console.log("\nAll edge case tests completed!");
}

// Run tests
if (require.main === module) {
    testEdgeCases();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getGrade,
        getRemark,
        formatPosition,
        formatAssessmentName,
        calculateResumptionDate,
        getGradeColor,
        getGradeFillColor,
        getRemarkColor
    };
}