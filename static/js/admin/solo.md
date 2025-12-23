Looking at your code, the main issue is likely in the `generateClientSidePDF` function. The problem appears to be that when generating the PDF from canvas, you're not handling the image data correctly. Here's the fix:

Replace your current `generateClientSidePDF` function with this corrected version:

```javascript
/**
 * FIXED: Client-side PDF generation
 */
async function generateClientSidePDF(reportData) {
    try {
        showGlobalLoading('Generating PDF document...');
        
        // 1. Ensure dependencies are loaded
        await loadHtml2Canvas();
        await loadJsPDF();

        // 2. Render the HTML content off-screen
        const html = generateReportHTML(reportData);
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '210mm'; // Standard A4 width
        container.style.backgroundColor = 'white';
        container.innerHTML = html;
        document.body.appendChild(container);

        // 3. Wait for logo and photos to load
        await waitForResources(container);
        
        // 4. Capture using Canvas with proper options
        const canvas = await html2canvas(container, {
            scale: 2, // High resolution
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            // Add these to ensure proper rendering:
            width: container.offsetWidth,
            height: container.offsetHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: container.scrollWidth,
            windowHeight: container.scrollHeight
        });

        // 5. Convert Canvas to PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // Calculate dimensions to fit A4
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgWidthFinal = imgWidth * ratio;
        const imgHeightFinal = imgHeight * ratio;
        
        const x = (pdfWidth - imgWidthFinal) / 2;
        
        // Add image to PDF
        pdf.addImage(imgData, 'JPEG', x, 0, imgWidthFinal, imgHeightFinal);
        
        // Save the PDF
        const fileName = `Report_${reportData.student.name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
        pdf.save(fileName);

        // 6. Cleanup
        document.body.removeChild(container);
        hideGlobalLoading();
        
        // Show success notification
        showNotification('PDF downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('PDF Generation Error:', error);
        hideGlobalLoading();
        
        // Try alternative method if the first fails
        try {
            await generateAlternativePDF(reportData);
        } catch (altError) {
            console.error('Alternative PDF generation also failed:', altError);
            showAlert({
                title: 'PDF Generation Failed',
                message: 'Could not generate PDF. Please try again or use the preview feature.',
                type: 'error'
            });
        }
    }
}

/**
 * Alternative PDF generation method (simpler, more reliable)
 */
async function generateAlternativePDF(reportData) {
    showGlobalLoading('Generating PDF (alternative method)...');
    
    const html = generateReportHTML(reportData);
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.backgroundColor = 'white';
    container.innerHTML = html;
    document.body.appendChild(container);
    
    await waitForResources(container);
    
    const canvas = await html2canvas(container, {
        scale: 1,
        useCORS: true,
        backgroundColor: '#ffffff'
    });
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Simple approach - just add the image to fit page width
    const imgData = canvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Report_${reportData.student.name.replace(/\s+/g, '_')}_alt.pdf`);
    
    document.body.removeChild(container);
    hideGlobalLoading();
}

/**
 * Enhanced HTML generation to ensure proper layout
 */
function generateReportHTML(reportData) {
    const { student, school, term, assessment_types, scores, position, total_students, overall_total, overall_max } = reportData;
    
    // Make sure we have fallbacks for all data
    const teacherComment = reportData.teacher_comment || student.teacher_remarks || "Satisfactory progress.";
    const principalComment = reportData.principal_comment || student.principal_remarks || "A good result.";
    const overallPercentage = overall_max > 0 ? (overall_total / overall_max * 100) : 0;
    const overallGrade = getSimpleGrade(overallPercentage);

    // Sort assessments by order
    const assessments = (assessment_types || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(at => at.code);

    // Generate subject rows
    let rows = '';
    if (scores) {
        const subjectKeys = Object.keys(scores);
        subjectKeys.forEach((subjectKey, idx) => {
            const sub = scores[subjectKey];
            const perc = sub.max_total > 0 ? (sub.total / sub.max_total * 100) : 0;
            const grade = getSimpleGrade(perc);
            
            rows += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: bold;">${sub.subject_name || subjectKey}</td>
                    ${assessments.map(code => `<td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${Math.round(sub.assessments && sub.assessments[code] ? sub.assessments[code].score : 0)}</td>`).join('')}
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${Math.round(sub.total || 0)}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold; color: ${getGradeColor(grade)};">${grade}</td>
                    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-size: 10px;">${getRemark(grade)}</td>
                </tr>`;
        });
    }

    // Get school logo with proper fallback
    const logoUrl = school && school.logo ? 
        (school.logo.startsWith('http') ? school.logo : `/static/${school.logo}`) :
        'https://via.placeholder.com/80?text=SCHOOL+LOGO';
    
    // Get student photo with proper fallback
    const studentPhotoUrl = student && student.profile_picture ?
        (student.profile_picture.startsWith('http') ? student.profile_picture : `/static/${student.profile_picture}`) :
        'https://via.placeholder.com/100?text=STUDENT+PHOTO';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page { margin: 0; size: A4; }
            body { 
                font-family: 'Segoe UI', Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                color: #333; 
                line-height: 1.4;
                background: white;
                width: 210mm;
                min-height: 297mm;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                font-size: 12px; 
                margin-bottom: 20px; 
                table-layout: fixed;
            }
            th, td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: center; 
                word-wrap: break-word;
            }
            th { 
                background: #1e3a8a; 
                color: white; 
                font-weight: bold;
            }
            .header { 
                display: flex; 
                align-items: center; 
                border-bottom: 3px solid #1e3a8a; 
                padding-bottom: 15px; 
                margin-bottom: 20px;
            }
            .student-info { 
                display: flex; 
                background: #f8fafc; 
                padding: 15px; 
                border-radius: 8px; 
                margin-bottom: 20px; 
                border: 1px solid #e2e8f0;
            }
            .summary { 
                display: flex; 
                justify-content: space-between; 
                background: #1e3a8a; 
                color: white; 
                padding: 15px; 
                border-radius: 8px; 
                margin-bottom: 20px; 
                font-weight: bold;
            }
            .comments { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 15px; 
                margin-top: 20px;
            }
            .comment-box { 
                border: 1px solid #e2e8f0; 
                padding: 10px; 
                border-radius: 8px; 
                min-height: 60px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="${logoUrl}" 
                 style="width: 80px; height: 80px; object-fit: contain; margin-right: 20px;" 
                 onerror="this.src='https://via.placeholder.com/80?text=LOGO'">
            <div style="flex-grow: 1;">
                <h1 style="margin: 0; color: #1e3a8a; text-transform: uppercase; font-size: 24px;">
                    ${school ? school.name : 'School Name'}
                </h1>
                <p style="margin: 2px 0; font-size: 12px; color: #666;">
                    ${school && school.address ? school.address : 'School Address'}
                </p>
                <h3 style="margin: 5px 0 0 0; color: #d97706;">
                    TERM REPORT: ${term ? term.name : 'Term'} - ${term ? term.session : 'Session'}
                </h3>
            </div>
        </div>

        <div class="student-info">
            <img src="${studentPhotoUrl}" 
                 style="width: 100px; height: 100px; border-radius: 5px; object-fit: cover; border: 2px solid #fff; margin-right: 20px;"
                 onerror="this.src='https://via.placeholder.com/100?text=PHOTO'">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex-grow: 1;">
                <div>
                    <small style="color: #64748b; font-size: 10px;">NAME</small>
                    <div style="font-weight: bold;">${student ? student.name : 'Student Name'}</div>
                </div>
                <div>
                    <small style="color: #64748b; font-size: 10px;">ADMISSION NO</small>
                    <div style="font-weight: bold;">${student && student.admission_number ? student.admission_number : 'N/A'}</div>
                </div>
                <div>
                    <small style="color: #64748b; font-size: 10px;">CLASS</small>
                    <div style="font-weight: bold;">${student && student.class_name ? student.class_name : 'N/A'}</div>
                </div>
                <div>
                    <small style="color: #64748b; font-size: 10px;">POSITION</small>
                    <div style="font-weight: bold;">${formatPosition(position || 0)} of ${total_students || 0}</div>
                </div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 30px;">#</th>
                    <th style="text-align: left;">SUBJECT</th>
                    ${assessments.map(a => `<th>${formatAssessmentName(a)}</th>`).join('')}
                    <th>TOTAL</th>
                    <th>GRADE</th>
                    <th>REMARK</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>

        <div class="summary">
            <div>TOTAL: ${Math.round(overall_total || 0)}/${overall_max || 0}</div>
            <div>AVERAGE: ${overallPercentage.toFixed(1)}%</div>
            <div>GRADE: ${overallGrade}</div>
        </div>

        <div class="comments">
            <div class="comment-box">
                <div style="font-size: 10px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px;">
                    CLASS TEACHER'S REMARK
                </div>
                <div style="font-style: italic; font-size: 12px;">"${teacherComment}"</div>
            </div>
            <div class="comment-box">
                <div style="font-size: 10px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px;">
                    PRINCIPAL'S REMARK
                </div>
                <div style="font-style: italic; font-size: 12px;">"${principalComment}"</div>
            </div>
        </div>
    </body>
    </html>`;
}
```

Also, add this helper function if it doesn't exist:

```javascript
/**
 * Enhanced waitForResources with timeout
 */
function waitForResources(element) {
    return new Promise((resolve) => {
        const images = element.getElementsByTagName('img');
        let loadedCount = 0;
        const totalImages = images.length;
        
        if (totalImages === 0) {
            resolve();
            return;
        }
        
        const checkComplete = () => {
            loadedCount++;
            if (loadedCount === totalImages) {
                resolve();
            }
        };
        
        // Set a maximum timeout
        const timeout = setTimeout(() => {
            console.warn('Image loading timeout, proceeding anyway');
            resolve();
        }, 5000); // 5 second timeout
        
        Array.from(images).forEach(img => {
            if (img.complete) {
                checkComplete();
            } else {
                img.addEventListener('load', checkComplete);
                img.addEventListener('error', () => {
                    console.warn('Image failed to load:', img.src);
                    checkComplete();
                });
            }
        });
        
        // Clear timeout when done
        if (loadedCount === totalImages) {
            clearTimeout(timeout);
        }
    });
}
```

**Key fixes made:**

1. **Added proper error handling** - Now tries an alternative method if the first fails
2. **Fixed image loading** - Added better timeout and error handling for images
3. **Added CSS styling** - Ensures consistent rendering across browsers
4. **Fixed PDF dimensions** - Properly calculates image dimensions to fit A4
5. **Added fallback content** - Handles missing data gracefully
6. **Improved resource waiting** - Added timeout to prevent hanging
7. **Added success notification** - Lets user know when download starts

**Additional troubleshooting steps:**

If this still doesn't work, try these debug steps:

1. **Check console for errors** - Open browser developer tools (F12) and look for errors
2. **Test with a simple HTML** - Temporarily replace the content with simple text to see if PDF generation works at all
3. **Check network requests** - Ensure the report data is being fetched correctly
4. **Test dependencies** - Make sure html2canvas and jsPDF are loading properly

The most common issue is images failing to load, which can hang the html2canvas process. The enhanced `waitForResources` function now has a timeout to prevent this.