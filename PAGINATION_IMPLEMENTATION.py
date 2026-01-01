# This is the corrected pagination implementation for generate_broad_sheet_html
# Starting from line 1803 (after the header is built)

# Instead of generating one table, we loop through subject_chunks
all_tables_html = ""

for page_num, current_subjects in enumerate(subject_chunks, 1):
    # Add page break before each new page (except the first)
    if page_num > 1:
        all_tables_html += '<div style="page-break-before: always;"></div>'
        # Add header again for new page
        all_tables_html += f"""
        <div class="header">
            <div class="school-name">{school_name}</div>
            <div class="school-address">{school_address}</div>
            <div class="report-title">BROAD SHEET</div>
            <div class="meta-info">
                <div><strong>Class:</strong> {metadata_class_name}</div>
                <div><strong>Form Master:</strong> {form_master}</div>
                <div><strong>Term:</strong> {term_name}</div>
                <div><strong>Session:</strong> {academic_session}</div>
            </div>
            <p><strong>Generated on:</strong> {datetime_str} | <strong>Page {page_num} of {total_pages}</strong></p>
        </div>
        """
    else:
        # For first page, just add page number to existing header
        # This was already generated in the main HTML variable
        pass
    
    # Start table for this chunk
    table_html = """
        <table>
            <thead>
                <tr>
                    <th rowspan="2">S/N</th>
                    <th rowspan="2">Admission No.</th>
                    <th rowspan="2" class="student-name">Student Name</th>"""
    
    # Add multi-level subject headers for THIS CHUNK
    for subject in current_subjects:
        # Count assessments
        subject_assessment_count = 0
        for student in broad_sheet_data:
            if subject in student["subjects"] and 'scores' in student["subjects"][subject]:
                subject_assessment_count = max(subject_assessment_count, len(student["subjects"][subject]['scores']))
        if subject_assessment_count == 0:
            subject_assessment_count = 1
        
        table_html += f"""
                    <th class="subject-header" colspan="{subject_assessment_count + 1}">{subject}</th>"""
    
    table_html += """
                </tr>
                <tr>"""
    
    # Get assessment types for subjects in THIS CHUNK
    subject_assessment_map = {}
    for subject in current_subjects:
        subject_assessment_types = set()
        for student in broad_sheet_data:
            if subject in student["subjects"] and 'scores' in student["subjects"][subject]:
                for score_item in student["subjects"][subject]['scores']:
                    subject_assessment_types.add(score_item['assessment_type'])
        subject_assessment_map[subject] = sorted(list(subject_assessment_types))
    
    # Add assessment type headers for THIS CHUNK
    for subject in current_subjects:
        for assessment_type in subject_assessment_map[subject]:
            table_html += f"""
                    <th class="assessment-header">{assessment_type}</th>"""
        table_html += """
                    <th class="assessment-header">Total</th>"""
    
    table_html += """
                </tr>
            </thead>
            <tbody>"""
    
    # Add student rows for THIS CHUNK
    for idx, student in enumerate(broad_sheet_data, 1):
        table_html += f"""
                <tr>
                    <td>{idx}</td>
                    <td>{student['admission_number'] or ''}</td>
                    <td class="student-name">{student['student_name']}</td>"""
        
        # Add scores for subjects in THIS CHUNK only
        for subject in current_subjects:
            if subject in student["subjects"]:
                subject_data = student["subjects"][subject]
                score_lookup = {}
                if 'scores' in subject_data and subject_data['scores']:
                    for score_item in subject_data['scores']:
                        score_lookup[score_item['assessment_type']] = score_item
                
                for assessment_type in subject_assessment_map[subject]:
                    if assessment_type in score_lookup:
                        score_item = score_lookup[assessment_type]
                        score_text = f"{score_item['score']}/{score_item['max_score']} ({score_item['percentage']}%)"
                        table_html += f"""
                    <td>{score_text}</td>"""
                    else:
                        table_html += """
                    <td>-</td>"""
                
                total_text = f"{subject_data['total_score']}/{subject_data['max_possible']} ({subject_data['percentage']}%)"
                table_html += f"""
                    <td>{total_text}</td>"""
            else:
                for _ in range(len(subject_assessment_map[subject]) + 1):
                    table_html += """
                    <td>-</td>"""
        
        table_html += """
                </tr>"""
    
    table_html += """
            </tbody>
        </table>"""
    
    all_tables_html += table_html

# Close the HTML document
html += all_tables_html + """
        
        <div class="footer">
            <p>Generated by CBT Mini School System</p>
        </div>
    </body>
    </html>"""

return html
