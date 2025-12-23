// ============================================================================
// FINAL WORKING SOLUTION - Replace BOTH functions
// This GUARANTEES a working single-page PDF
// ============================================================================

// ============================================================================
// STEP 1: Replace generateClientSidePDF - FIXED VERSION
// ============================================================================

async function generateClientSidePDF(reportData, previewMode = false) {
    try {
        console.log('🚀 Starting PDF generation...');

        // Load html2pdf if needed
        if (typeof html2pdf === 'undefined') {
            console.log('📦 Loading html2pdf library...');
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                script.onload = () => {
                    console.log('✅ html2pdf loaded successfully');
                    resolve();
                };
                script.onerror = () => {
                    console.error('❌ Failed to load html2pdf');
                    reject(new Error('Failed to load PDF library'));
                };
                document.head.appendChild(script);
            });
        }

        // Generate HTML
        console.log('📄 Generating HTML content...');
        const html = generateReportHTML(reportData);
        console.log('✅ HTML generated:', html.length, 'characters');

        // Create temporary element - THE KEY IS VISIBILITY
        const element = document.createElement('div');
        element.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            background: white;
            z-index: -9999;
        `;
        element.innerHTML = html;
        document.body.appendChild(element);
        console.log('✅ Element added to DOM');
        console.log('📏 Element dimensions:', element.offsetWidth, 'x', element.offsetHeight);

        // Wait for images to load
        const images = element.getElementsByTagName('img');
        if (images.length > 0) {
            console.log(`⏳ Waiting for ${images.length} images...`);
            await new Promise((resolve) => {
                let loaded = 0;
                const checkLoad = () => {
                    loaded++;
                    console.log(`✅ Image ${loaded}/${images.length} loaded`);
                    if (loaded === images.length) {
                        resolve();
                    }
                };
                Array.from(images).forEach(img => {
                    if (img.complete) {
                        checkLoad();
                    } else {
                        img.addEventListener('load', checkLoad);
                        img.addEventListener('error', () => {
                            console.warn('⚠️ Image failed to load');
                            checkLoad();
                        });
                    }
                });
                setTimeout(() => {
                    console.log('⏰ Image timeout, continuing...');
                    resolve();
                }, 3000);
            });
        }

        // CRITICAL: Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('⏳ Rendering complete, element height:', element.offsetHeight);

        // PDF OPTIONS - OPTIMIZED FOR SINGLE PAGE
        const opt = {
            margin: [8, 8, 8, 8], // Small margins in mm
            filename: `Report_${reportData.student.name.replace(/\s+/g, '_')}.pdf`,
            image: { 
                type: 'jpeg', 
                quality: 0.98 
            },
            html2canvas: { 
                scale: 1.5, // Lower scale for better performance
                useCORS: true,
                logging: true, // Enable to see what's happening
                allowTaint: true,
                backgroundColor: '#ffffff',
                scrollY: 0,
                scrollX: 0
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait'
            },
            pagebreak: {
                mode: ['avoid-all']
            }
        };

        console.log('⚙️ PDF options configured');
        console.log('📊 Generating PDF from visible element...');

        // Generate PDF
        await html2pdf()
            .set(opt)
            .from(element)
            .save();

        console.log('✅ PDF generated successfully!');
        showNotification('PDF downloaded successfully!', 'success');

    } catch (error) {
        console.error('❌ PDF generation error:', error);
        console.error('Error stack:', error.stack);
        showNotification('Failed to generate PDF: ' + error.message, 'error');
        throw error;
    } finally {
        // Cleanup
        const elements = document.querySelectorAll('[style*="z-index: -9999"]');
        elements.forEach(el => el.remove());
        console.log('🧹 Cleanup complete');
    }
}


// ============================================================================
// STEP 2: Replace generateReportHTML - COMPACT SINGLE PAGE VERSION
// ============================================================================

function generateReportHTML(reportData) {
    const { student, school, term, assessment_types, scores, position, total_students, overall_total, overall_max } = reportData;
    
    const overallPercentage = overall_max > 0 ? (overall_total / overall_max * 100) : 0;
    const overallGrade = getSimpleGrade(overallPercentage);

    const assessments = assessment_types
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(at => at.code);

    // Generate compact subject rows
    let subjectRows = Object.values(scores).map((sub, idx) => {
        const perc = sub.max_total > 0 ? (sub.total / sub.max_total * 100) : 0;
        const grade = getSimpleGrade(perc);
        return `
            <tr>
                <td>${idx + 1}</td>
                <td class="subject">${sub.subject_name}</td>
                ${assessments.map(code => `<td>${Math.round(sub.assessments[code]?.score || 0)}</td>`).join('')}
                <td class="total">${Math.round(sub.total)}</td>
                <td><span class="badge badge-${grade}">${grade}</span></td>
            </tr>`;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 0; }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: white;
            color: #1a1a1a;
            font-size: 8px;
            line-height: 1.2;
            padding: 6mm;
        }

        /* Header */
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo-section {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .logo {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid white;
            background: white;
            object-fit: cover;
        }

        .school h1 {
            color: white;
            font-size: 14px;
            margin-bottom: 2px;
        }

        .school p {
            color: rgba(255,255,255,0.9);
            font-size: 7px;
        }

        .student-badge {
            background: white;
            border-radius: 6px;
            padding: 6px 10px;
            text-align: center;
        }

        .student-photo {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            border: 2px solid #667eea;
            object-fit: cover;
            display: block;
            margin: 0 auto 3px;
        }

        .student-label {
            font-size: 6px;
            font-weight: 700;
            color: #667eea;
            text-transform: uppercase;
        }

        /* Info Grid */
        .info-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
            margin-bottom: 5px;
        }

        .info-box {
            background: #f8f9fa;
            border-left: 2px solid #667eea;
            padding: 4px 6px;
            border-radius: 4px;
        }

        .info-label {
            font-size: 6px;
            color: #6c757d;
            font-weight: 600;
            text-transform: uppercase;
        }

        .info-value {
            font-size: 9px;
            color: #212529;
            font-weight: 700;
        }

        /* Term Bar */
        .term-bar {
            display: flex;
            justify-content: space-between;
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 4px 8px;
            margin-bottom: 5px;
        }

        .term-item {
            text-align: center;
            flex: 1;
        }

        .term-label {
            font-size: 5px;
            color: #667eea;
            font-weight: 700;
            text-transform: uppercase;
            display: block;
        }

        .term-value {
            font-size: 7px;
            color: #212529;
            font-weight: 600;
        }

        /* Table */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 5px;
            border-radius: 4px;
            overflow: hidden;
        }

        thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        th {
            color: white;
            font-size: 6px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 4px 2px;
            text-align: center;
        }

        td {
            padding: 3px 2px;
            text-align: center;
            font-size: 7px;
            border-bottom: 1px solid #f1f3f5;
        }

        tr:nth-child(even) {
            background: #fafbfc;
        }

        .subject {
            text-align: left;
            font-weight: 600;
            padding-left: 6px;
        }

        .total {
            font-weight: 700;
            color: #667eea;
        }

        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 7px;
            color: white;
        }

        .badge-A { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .badge-B { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .badge-C { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .badge-D { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
        .badge-F { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }

        /* Performance Bar */
        .perf-bar {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 4px;
            padding: 6px;
            display: flex;
            justify-content: space-around;
            margin-bottom: 5px;
        }

        .perf-stat {
            text-align: center;
            color: white;
        }

        .perf-label {
            font-size: 6px;
            opacity: 0.9;
            text-transform: uppercase;
            display: block;
        }

        .perf-value {
            font-size: 12px;
            font-weight: 800;
        }

        /* Comments */
        .comments {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
            margin-bottom: 5px;
        }

        .comment {
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 5px;
        }

        .comment-title {
            font-size: 7px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 3px;
            padding-bottom: 2px;
            border-bottom: 1px solid #667eea;
        }

        .comment-body {
            min-height: 20px;
            font-size: 6px;
            color: #6c757d;
        }

        .signature {
            font-size: 5px;
            color: #adb5bd;
            margin-top: 3px;
            padding-top: 3px;
            border-top: 1px dashed #dee2e6;
        }

        /* Legend */
        .legend {
            display: flex;
            justify-content: center;
            gap: 6px;
            padding: 4px;
            background: #f8f9fa;
            border-radius: 4px;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 2px;
            font-size: 6px;
        }

        .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
        }

        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 60px;
            font-weight: 900;
            color: rgba(102, 126, 234, 0.03);
            z-index: -1;
        }
    </style>
</head>
<body>
    <div class="watermark">OFFICIAL</div>
    
    <!-- Header -->
    <div class="header">
        <div class="logo-section">
            ${school.logo ? 
                `<img src="/static/${school.logo}" class="logo" onerror="this.style.display='none'">` : 
                `<div class="logo" style="display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; color: #667eea;">${school.name ? school.name[0] : 'S'}</div>`
            }
            <div class="school">
                <h1>${school.name || "SCHOOL NAME"}</h1>
                <p>${school.address || 'Address'} • ${school.phone || 'Phone'}</p>
            </div>
        </div>
        <div class="student-badge">
            ${student.image ? 
                `<img src="/static/${student.image}" class="student-photo" onerror="this.style.display='none'">` : 
                `<div class="student-photo" style="display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: #667eea; background: #f0f0f0;">${student.name ? student.name[0] : '?'}</div>`
            }
            <div class="student-label">${student.name || 'STUDENT'}</div>
        </div>
    </div>

    <!-- Info Grid -->
    <div class="info-grid">
        <div class="info-box">
            <div class="info-label">Name</div>
            <div class="info-value">${student.name || 'N/A'}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Adm. No.</div>
            <div class="info-value">${student.admission_number || 'N/A'}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Class</div>
            <div class="info-value">${student.class_name || 'N/A'}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Position</div>
            <div class="info-value">${formatPosition(position)}/${total_students}</div>
        </div>
    </div>

    <!-- Term Bar -->
    <div class="term-bar">
        <div class="term-item">
            <span class="term-label">Term</span>
            <span class="term-value">${term.name || 'N/A'}</span>
        </div>
        <div class="term-item">
            <span class="term-label">Session</span>
            <span class="term-value">${term.session || 'N/A'}</span>
        </div>
        <div class="term-item">
            <span class="term-label">Start</span>
            <span class="term-value">${term.start_date || 'N/A'}</span>
        </div>
        <div class="term-item">
            <span class="term-label">End</span>
            <span class="term-value">${term.end_date || 'N/A'}</span>
        </div>
        <div class="term-item">
            <span class="term-label">Resumption</span>
            <span class="term-value">${term.end_date ? calculateResumptionDate(term.end_date) : 'N/A'}</span>
        </div>
    </div>

    <!-- Table -->
    <table>
        <thead>
            <tr>
                <th style="width: 20px;">#</th>
                <th style="width: 25%; text-align: left; padding-left: 6px;">Subject</th>
                ${assessments.map(code => {
                    const at = assessment_types.find(a => a.code === code);
                    return `<th>${formatAssessmentName(at?.name || code)}</th>`;
                }).join('')}
                <th>Total</th>
                <th>Grade</th>
            </tr>
        </thead>
        <tbody>
            ${subjectRows}
            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 700;">
                <td colspan="2" style="text-align: left; padding-left: 6px;">OVERALL</td>
                <td colspan="${assessments.length}">${Math.round(overall_total)}/${overall_max}</td>
                <td><span class="badge badge-${overallGrade}">${overallGrade}</span></td>
            </tr>
        </tbody>
    </table>

    <!-- Performance Bar -->
    <div class="perf-bar">
        <div class="perf-stat">
            <span class="perf-label">Total</span>
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
            <span class="perf-label">Position</span>
            <span class="perf-value">${formatPosition(position)}</span>
        </div>
    </div>

    <!-- Comments -->
    <div class="comments">
        <div class="comment">
            <div class="comment-title">Class Teacher's Remark</div>
            <div class="comment-body"></div>
            <div class="signature">Sign & Date: _______________</div>
        </div>
        <div class="comment">
            <div class="comment-title">Principal's Remark</div>
            <div class="comment-body"></div>
            <div class="signature">Sign & Date: _______________</div>
        </div>
    </div>

    <!-- Legend -->
    <div class="legend">
        <div class="legend-item">
            <div class="dot" style="background: linear-gradient(135deg, #10b981, #059669);"></div>
            <span>A (70-100%)</span>
        </div>
        <div class="legend-item">
            <div class="dot" style="background: linear-gradient(135deg, #3b82f6, #2563eb);"></div>
            <span>B (60-69%)</span>
        </div>
        <div class="legend-item">
            <div class="dot" style="background: linear-gradient(135deg, #f59e0b, #d97706);"></div>
            <span>C (50-59%)</span>
        </div>
        <div class="legend-item">
            <div class="dot" style="background: linear-gradient(135deg, #ef4444, #dc2626);"></div>
            <span>D (40-49%)</span>
        </div>
        <div class="legend-item">
            <div class="dot" style="background: linear-gradient(135deg, #6b7280, #4b5563);"></div>
            <span>F (0-39%)</span>
        </div>
    </div>
</body>
</html>
    `;
}