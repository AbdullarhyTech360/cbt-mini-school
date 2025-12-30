// ============================================================================
// ULTRA-MODERN SINGLE PAGE REPORT CARD - Copy & Replace generateReportHTML
// ============================================================================

function generateReportHTML(reportData) {
    const { student, school, term, assessment_types, scores, position, total_students, overall_total, overall_max } = reportData;
    
    const overallPercentage = overall_max > 0 ? (overall_total / overall_max * 100) : 0;
    const overallGrade = getSimpleGrade(overallPercentage);

    const assessments = assessment_types
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(at => at.code);

    // Generate subject rows
    let subjectRows = Object.values(scores).map((sub, idx) => {
        const perc = sub.max_total > 0 ? (sub.total / sub.max_total * 100) : 0;
        const grade = getSimpleGrade(perc);
        return `
            <tr>
                <td>${idx + 1}</td>
                <td class="subject-cell">${sub.subject_name}</td>
                ${assessments.map(code => `<td>${Math.round(sub.assessments[code]?.score || 0)}</td>`).join('')}
                <td class="total-cell">${Math.round(sub.total)}</td>
                <td><div class="grade-pill grade-${grade}">${grade}</div></td>
            </tr>`;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4 portrait; margin: 0; }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-# print-color-adjust: exact !important;
            # print-color-adjust: exact !important;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: white;
            color: #1a1a1a;
            font-size: 9px;
            line-height: 1.3;
            width: 210mm;
            height: 297mm;
            overflow: hidden;
        }

        .page-wrapper {
            width: 210mm;
            height: 297mm;
            padding: 8mm;
            display: flex;
            flex-direction: column;
        }

        /* Modern Header with Gradient */
        .header-banner {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            padding: 10px 12px;
            margin-bottom: 6px;
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.2);
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .school-branding {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .school-logo-circle {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 3px solid white;
            object-fit: cover;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .school-details h1 {
            color: white;
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 2px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .school-details p {
            color: rgba(255,255,255,0.95);
            font-size: 8px;
            font-weight: 500;
        }

        .student-badge {
            background: white;
            border-radius: 8px;
            padding: 8px 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
            min-width: 80px;
        }

        .student-photo-circle {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #667eea;
            margin: 0 auto 4px;
            display: block;
        }

        .student-name-tag {
            font-size: 7px;
            font-weight: 700;
            color: #667eea;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Info Cards Section */
        .info-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 5px;
            margin-bottom: 6px;
        }

        .info-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
            border-radius: 6px;
            padding: 6px 8px;
            border-left: 3px solid #667eea;
            transition: transform 0.2s;
        }

        .info-label {
            font-size: 7px;
            color: #6c757d;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
        }

        .info-value {
            font-size: 10px;
            color: #212529;
            font-weight: 700;
        }

        /* Term Timeline */
        .term-timeline {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 6px 10px;
            margin-bottom: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .timeline-item {
            text-align: center;
            flex: 1;
            position: relative;
        }

        .timeline-item:not(:last-child)::after {
            content: '';
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 1px;
            height: 20px;
            background: #dee2e6;
        }

        .timeline-label {
            font-size: 6px;
            color: #667eea;
            font-weight: 700;
            text-transform: uppercase;
            display: block;
            margin-bottom: 2px;
        }

        .timeline-value {
            font-size: 8px;
            color: #212529;
            font-weight: 600;
        }

        /* Modern Table */
        .table-container {
            flex: 1;
            margin-bottom: 6px;
            overflow: hidden;
        }

        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            background: white;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        th {
            color: white;
            font-size: 7px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 6px 4px;
            text-align: center;
            letter-spacing: 0.5px;
            border-right: 1px solid rgba(255,255,255,0.1);
        }

        th:last-child {
            border-right: none;
        }

        tbody tr {
            border-bottom: 1px solid #f1f3f5;
            transition: background 0.2s;
        }

        tbody tr:hover {
            background: #f8f9fa;
        }

        tbody tr:nth-child(even) {
            background: #fafbfc;
        }

        td {
            padding: 5px 4px;
            text-align: center;
            font-size: 8px;
            color: #495057;
        }

        .subject-cell {
            text-align: left;
            font-weight: 600;
            color: #212529;
            padding-left: 8px;
        }

        .total-cell {
            font-weight: 700;
            color: #667eea;
            font-size: 9px;
        }

        .grade-pill {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 8px;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .grade-A { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .grade-B { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .grade-C { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .grade-D { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
        .grade-F { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }

        /* Performance Summary Bar */
        .performance-banner {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 6px;
            padding: 8px 12px;
            display: flex;
            justify-content: space-around;
            align-items: center;
            margin-bottom: 6px;
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.2);
        }

        .perf-stat {
            text-align: center;
            color: white;
        }

        .perf-label {
            font-size: 7px;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: block;
            margin-bottom: 2px;
        }

        .perf-value {
            font-size: 14px;
            font-weight: 800;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        /* Comments Grid */
        .comments-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 6px;
        }

        .comment-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 6px 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .comment-header {
            font-size: 8px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 4px;
            padding-bottom: 3px;
            border-bottom: 2px solid #667eea;
        }

        .comment-body {
            min-height: 25px;
            font-size: 7px;
            color: #6c757d;
            font-style: italic;
        }

        .signature-row {
            font-size: 6px;
            color: #adb5bd;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px dashed #dee2e6;
        }

        /* Grade Legend */
        .grade-legend {
            display: flex;
            justify-content: center;
            gap: 8px;
            padding: 5px;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 3px;
            font-size: 7px;
            color: #495057;
        }

        .legend-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        /* Watermark */
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 70px;
            font-weight: 900;
            color: rgba(102, 126, 234, 0.03);
            z-index: -1;
            pointer-events: none;
            letter-spacing: 10px;
        }
    </style>
</head>
<body>
    <div class="watermark">OFFICIAL</div>
    
    <div class="page-wrapper">
        <!-- Modern Header -->
        <div class="header-banner">
            <div class="header-content">
                <div class="school-branding">
                    ${school.logo ? 
                        `<img src="/static/${school.logo}" class="school-logo-circle" onerror="this.style.display='none'">` : 
                        `<div class="school-logo-circle" style="display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: #667eea;">${school.name ? school.name[0] : 'S'}</div>`
                    }
                    <div class="school-details">
                        <h1>${school.name || "SCHOOL NAME"}</h1>
                        <p>${school.address || 'School Address'} • ${school.phone || 'Tel: N/A'}</p>
                    </div>
                </div>
                <div class="student-badge">
                    ${student.image ? 
                        `<img src="/static/${student.image}" class="student-photo-circle" onerror="this.style.display='none'">` : 
                        `<div class="student-photo-circle" style="display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; color: #667eea; background: #f0f0f0;">${student.name ? student.name[0] : '?'}</div>`
                    }
                    <div class="student-name-tag">${student.name || 'STUDENT'}</div>
                </div>
            </div>
        </div>

        <!-- Info Cards -->
        <div class="info-cards">
            <div class="info-card">
                <div class="info-label">Full Name</div>
                <div class="info-value">${student.name || 'N/A'}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Admission No.</div>
                <div class="info-value">${student.admission_number || 'N/A'}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Class</div>
                <div class="info-value">${student.class_name || 'N/A'}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Position</div>
                <div class="info-value">${formatPosition(position)}/${total_students}</div>
            </div>
        </div>

        <!-- Term Timeline -->
        <div class="term-timeline">
            <div class="timeline-item">
                <span class="timeline-label">Term</span>
                <span class="timeline-value">${term.name || 'N/A'}</span>
            </div>
            <div class="timeline-item">
                <span class="timeline-label">Session</span>
                <span class="timeline-value">${term.session || 'N/A'}</span>
            </div>
            <div class="timeline-item">
                <span class="timeline-label">Start Date</span>
                <span class="timeline-value">${term.start_date || 'N/A'}</span>
            </div>
            <div class="timeline-item">
                <span class="timeline-label">End Date</span>
                <span class="timeline-value">${term.end_date || 'N/A'}</span>
            </div>
            <div class="timeline-item">
                <span class="timeline-label">Resumption</span>
                <span class="timeline-value">${term.end_date ? calculateResumptionDate(term.end_date) : 'N/A'}</span>
            </div>
        </div>

        <!-- Academic Table -->
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 25px;">#</th>
                        <th style="width: 28%; text-align: left; padding-left: 8px;">Subject</th>
                        ${assessments.map(code => {
                            const at = assessment_types.find(a => a.code === code);
                            return `<th style="width: ${55/(assessments.length+2)}%;">${formatAssessmentName(at?.name || code)}</th>`;
                        }).join('')}
                        <th style="width: ${55/(assessments.length+2)}%;">Total</th>
                        <th style="width: ${55/(assessments.length+2)}%;">Grade</th>
                    </tr>
                </thead>
                <tbody>
                    ${subjectRows}
                    <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 700;">
                        <td colspan="2" style="text-align: left; padding-left: 8px;">OVERALL PERFORMANCE</td>
                        <td colspan="${assessments.length}">${Math.round(overall_total)} / ${overall_max}</td>
                        <td><div class="grade-pill grade-${overallGrade}" style="box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${overallGrade}</div></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Performance Banner -->
        <div class="performance-banner">
            <div class="perf-stat">
                <span class="perf-label">Total Score</span>
                <span class="perf-value">${Math.round(overall_total)}/${overall_max}</span>
            </div>
            <div class="perf-stat">
                <span class="perf-label">Percentage</span>
                <span class="perf-value">${overallPercentage.toFixed(1)}%</span>
            </div>
            <div class="perf-stat">
                <span class="perf-label">Grade</span>
                <span class="perf-value">${overallGrade}</span>
            </div>
            <div class="perf-stat">
                <span class="perf-label">Class Position</span>
                <span class="perf-value">${formatPosition(position)}</span>
            </div>
        </div>

        <!-- Comments -->
        <div class="comments-grid">
            <div class="comment-card">
                <div class="comment-header">Class Teacher's Remark</div>
                <div class="comment-body"></div>
                <div class="signature-row">Signature & Date: _________________</div>
            </div>
            <div class="comment-card">
                <div class="comment-header">Principal's Remark</div>
                <div class="comment-body"></div>
                <div class="signature-row">Signature & Date: _________________</div>
            </div>
        </div>

        <!-- Grade Legend -->
        <div class="grade-legend">
            <div class="legend-item">
                <div class="legend-dot" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);"></div>
                <span>A (70-100%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);"></div>
                <span>B (60-69%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);"></div>
                <span>C (50-59%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);"></div>
                <span>D (40-49%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);"></div>
                <span>F (0-39%)</span>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

// Helper function to get remark
function getRemark(grade) {
    const remarks = {
        'A': 'Excellent',
        'B': 'Very Good',
        'C': 'Good',
        'D': 'Fair',
        'F': 'Needs Improvement'
    };
    return remarks[grade] || 'N/A';
}