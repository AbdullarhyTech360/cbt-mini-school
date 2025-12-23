/**
 * Test for the improved PDF generation functionality
 */

// Mock data for testing
const mockReportData = {
    student: {
        name: "John Doe",
        admission_number: "ADM001",
        class_name: "SSS 1A",
        image: null
    },
    school: {
        name: "CBT Minischool",
        motto: "Knowledge is Power",
        address: "123 Education Street, Learning City",
        phone: "+1234567890",
        email: "info@cbtminischool.edu",
        logo: null
    },
    term: {
        name: "First Term",
        session: "2023/2024",
        start_date: "2023-09-01",
        end_date: "2023-12-15"
    },
    assessment_types: [
        { code: "ca1", name: "First CA", max_score: 20, order: 1 },
        { code: "ca2", name: "Second CA", max_score: 20, order: 2 },
        { code: "exam", name: "Exam", max_score: 60, order: 3 }
    ],
    scores: {
        "math": {
            subject_name: "Mathematics",
            total: 78,
            max_total: 100,
            assessments: {
                "ca1": { score: 18, is_cbt: false },
                "ca2": { score: 17, is_cbt: false },
                "exam": { score: 43, is_cbt: true }
            }
        },
        "eng": {
            subject_name: "English Language",
            total: 65,
            max_total: 100,
            assessments: {
                "ca1": { score: 15, is_cbt: false },
                "ca2": { score: 14, is_cbt: false },
                "exam": { score: 36, is_cbt: true }
            }
        },
        "sci": {
            subject_name: "Basic Science",
            total: 82,
            max_total: 100,
            assessments: {
                "ca1": { score: 19, is_cbt: false },
                "ca2": { score: 18, is_cbt: false },
                "exam": { score: 45, is_cbt: true }
            }
        }
    },
    position: 5,
    total_students: 30,
    overall_total: 225,
    overall_max: 300
};

// Test the improved PDF generation
async function testImprovedPDFGeneration() {
    console.log("Testing improved PDF generation...");
    
    try {
        // Check if the ImprovedClientPDFGenerator is available
        if (typeof window.ImprovedClientPDFGenerator === 'undefined') {
            console.error("ImprovedClientPDFGenerator not found. Make sure the script is loaded.");
            return false;
        }
        
        // Test the generateImprovedStudentReportPDF function
        console.log("Calling generateImprovedStudentReportPDF...");
        await window.ImprovedClientPDFGenerator.generateImprovedStudentReportPDF(mockReportData);
        console.log("PDF generation completed successfully!");
        return true;
    } catch (error) {
        console.error("Error during PDF generation test:", error);
        return false;
    }
}

// Run the test if this script is executed directly
if (typeof module !== 'undefined' && require.main === module) {
    testImprovedPDFGeneration()
        .then(success => {
            if (success) {
                console.log("✅ All tests passed!");
            } else {
                console.log("❌ Some tests failed!");
            }
        })
        .catch(error => {
            console.error("Unexpected error:", error);
        });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testImprovedPDFGeneration,
        mockReportData
    };
}