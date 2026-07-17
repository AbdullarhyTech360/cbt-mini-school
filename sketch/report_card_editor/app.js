// ────────────────────── STATE ──────────────────────
let blocks = [];
let selectedIds = [];
let idCounter = 0;
let dragState = null;
let fileTarget = null;
let activeTab = 'layout';
let customPresets = [];
let activeTableCell = null;
let activeSubElement = null;

// Undo/Redo
let historyStack = [];
let historyIndex = -1;
const MAX_HISTORY = 100;
let editingSnapshotTaken = false;

const canvas = document.getElementById('report-canvas');
const CW = 794;

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function getStateSnapshot() {
    return blocks.map(b => { const copy = JSON.parse(JSON.stringify(b)); delete copy._el; return copy; });
}

function saveSnapshot() {
    if (historyIndex < historyStack.length - 1) { historyStack = historyStack.slice(0, historyIndex + 1); }
    historyStack.push(getStateSnapshot());
    historyIndex++;
    if (historyStack.length > MAX_HISTORY) { historyStack.shift(); historyIndex--; }
    updateUndoRedoButtons();
}

function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    blocks = JSON.parse(JSON.stringify(historyStack[historyIndex]));
    selectedIds = [];
    clearActiveTableCell();
    clearSubElementSelection();
    renderAll();
    showEmptyProps();
    editingSnapshotTaken = false;
    updateUndoRedoButtons();
    toast('Undo');
}

function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    historyIndex++;
    blocks = JSON.parse(JSON.stringify(historyStack[historyIndex]));
    selectedIds = [];
    clearActiveTableCell();
    clearSubElementSelection();
    renderAll();
    showEmptyProps();
    editingSnapshotTaken = false;
    updateUndoRedoButtons();
    toast('Redo');
}

function updateUndoRedoButtons() {
    document.getElementById('btn-undo').classList.toggle('btn-disabled', historyIndex <= 0);
    document.getElementById('btn-redo').classList.toggle('btn-disabled', historyIndex >= historyStack.length - 1);
}

document.addEventListener('focusin', (e) => {
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) {
        if (!editingSnapshotTaken) { saveSnapshot(); editingSnapshotTaken = true; }
    }
});
document.addEventListener('blur', (e) => {
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) { editingSnapshotTaken = false; }
}, true);

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    document.getElementById('theme-icon').textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('sidebar-open-btn');
    if (sidebar.classList.contains('w-56')) {
        sidebar.classList.remove('w-56', 'p-3');
        sidebar.classList.add('w-0', 'overflow-hidden', 'p-0');
        openBtn.classList.remove('hidden');
    } else {
        openSidebar();
    }
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('sidebar-open-btn');
    sidebar.classList.remove('w-0', 'overflow-hidden', 'p-0');
    sidebar.classList.add('w-56', 'p-3');
    openBtn.classList.add('hidden');
}

// ────────────────────── BLOCK UTILITIES ──────────────────────
function findBlockById(id) {
    for (const b of blocks) {
        if (b.id === id) return b;
        if (b.children) {
            const found = findInChildren(b.children, id);
            if (found) return found;
        }
    }
    return null;
}

function findInChildren(children, id) {
    for (const c of children) {
        if (c.id === id) return c;
        if (c.children) {
            const found = findInChildren(c.children, id);
            if (found) return found;
        }
    }
    return null;
}

function getParentGroup(childId) {
    for (const b of blocks) {
        if (b.children) {
            for (const c of b.children) {
                if (c.id === childId) return b;
                if (c.children) {
                    const deeper = findParentInChildren(c.children, childId, c);
                    if (deeper) return deeper;
                }
            }
        }
    }
    return null;
}

function findParentInChildren(children, childId, parent) {
    for (const c of children) {
        if (c.id === childId) return parent;
        if (c.children) {
            const found = findParentInChildren(c.children, childId, c);
            if (found) return found;
        }
    }
    return null;
}

function isChildOfGroup(blockId) {
    return getParentGroup(blockId) !== null;
}

// ────────────────────── SELECTION & DRILL DOWN ──────────────────────
function selectBlock(id) {
    clearActiveTableCell();
    clearSubElementSelection();
    selectedIds = [id];
    renderAll();
    const b = findBlockById(id);
    if (b) {
        populateProperties(b);
        updateParentButtonVisibility();
    }
}

function toggleSelect(id) {
    clearActiveTableCell();
    clearSubElementSelection();
    const idx = selectedIds.indexOf(id);
    if (idx >= 0) {
        selectedIds.splice(idx, 1);
        if (selectedIds.length === 0) selectedIds = [id];
    } else {
        selectedIds.push(id);
    }
    renderAll();
    if (selectedIds.length === 1) {
        const b = findBlockById(selectedIds[0]);
        if (b) populateProperties(b);
        updateParentButtonVisibility();
    } else if (selectedIds.length > 1) {
        showMultiSelectProps();
    }
}

function navigateToParent() {
    if (selectedIds.length !== 1) return;
    if (activeSubElement) {
        clearSubElementSelection();
        if (selectedIds.length === 1) {
            const b = findBlockById(selectedIds[0]);
            if (b) populateProperties(b);
        }
        return;
    }
    if (activeTableCell) {
        const tableId = activeTableCell.blockId;
        clearActiveTableCell();
        selectBlock(tableId);
        return;
    }
    const parentGroup = getParentGroup(selectedIds[0]);
    if (parentGroup) {
        selectBlock(parentGroup.id);
        return;
    }
    const block = findBlockById(selectedIds[0]);
    if (block && block._parentGroupId) {
        const parent = findBlockById(block._parentGroupId);
        if (parent) selectBlock(parent.id);
        return;
    }
}

function drillIntoChildren() {
    if (selectedIds.length !== 1) return;
    const block = findBlockById(selectedIds[0]);
    if (!block) return;

    if (block.type === 'table') {
        if (!activeTableCell || activeTableCell.blockId !== block.id) {
            selectTableCell(block.id, 0, 0, 'table');
            return;
        }
    }
    if (block.type === 'grades') {
        if (!activeTableCell || activeTableCell.blockId !== block.id) {
            onGradesCellClick(new Event('dblclick'), block.id, 0, 0);
            return;
        }
    }
    if (block.children && block.children.length > 0) {
        const firstChild = block.children[0];
        saveSnapshot();
        selectedIds = [firstChild.id];
        renderAll();
        populateProperties(firstChild);
        updateParentButtonVisibility();
        toast(`Editing child: ${getBlockLabel(firstChild.type)}`);
        return;
    }

    const templateTypes = ['school-header', 'student-info', 'comments', 'attendance', 'signature'];
    if (templateTypes.includes(block.type)) {
        const subIds = getSubElementIds(block.type);
        if (subIds.length > 0) {
            selectSubElement(block.id, subIds[0]);
            return;
        }
    }
    toast('No deeper children available');
}

function getSubElementIds(type) {
    switch (type) {
        case 'school-header': return ['logo', 'schoolName', 'schoolSub', 'reportTitle'];
        case 'student-info': {
            const block = findBlockById(selectedIds[0]);
            if (!block || !block.fields) return ['photo'];
            const ids = ['photo'];
            block.fields.forEach((_, i) => { ids.push(`label-${i}`, `value-${i}`); });
            return ids;
        }
        case 'comments': return ['title', 'body'];
        case 'attendance': return ['present', 'absent', 'late', 'present-lbl', 'absent-lbl', 'late-lbl'];
        case 'signature': {
            const block = findBlockById(selectedIds[0]);
            if (!block || !block.sigs) return [];
            return block.sigs.map((_, i) => `sig-${i}`);
        }
        default: return [];
    }
}

function selectSubElement(blockId, subId) {
    clearActiveTableCell();
    clearSubElementSelection();
    activeSubElement = { blockId, subId };
    const block = findBlockById(blockId);
    if (!block || !block._el) return;
    const el = block._el.querySelector(`[data-subid="${subId}"]`);
    if (el) el.classList.add('sub-element-selected');
    const panel = document.getElementById('sub-element-props-panel');
    panel.classList.remove('hidden');
    document.getElementById('sub-element-name').textContent = subId.replace(/-/g, ' ');
    document.getElementById('cell-props-panel').classList.add('hidden');
    const styles = (block.subStyles && block.subStyles[subId]) || {};
    document.getElementById('sub-prop-bg').value = styles.bg || '';
    document.getElementById('sub-prop-bg-hex').value = styles.bg || '';
    document.getElementById('sub-prop-color').value = styles.c || '';
    document.getElementById('sub-prop-color-hex').value = styles.c || '';
    document.getElementById('sub-prop-fw').value = styles.fw || '';
    document.getElementById('sub-prop-fs').value = styles.fs || '';
    document.getElementById('sub-prop-ff').value = styles.ff || '';
    document.getElementById('sub-prop-font-size').value = styles.fz || '';
    document.getElementById('sub-prop-ta').value = styles.ta || '';
    document.getElementById('sub-prop-padding').value = styles.p || '';
    document.getElementById('sub-prop-br').value = styles.br || '';
    switchTab('content');
    updateParentButtonVisibility();
}

function clearSubElementSelection() {
    if (activeSubElement) {
        const block = findBlockById(activeSubElement.blockId);
        if (block && block._el) {
            block._el.querySelectorAll('.sub-element-selected').forEach(el => el.classList.remove('sub-element-selected'));
        }
    }
    activeSubElement = null;
    document.getElementById('sub-element-props-panel').classList.add('hidden');
    updateParentButtonVisibility();
}

function onSubPropChange(key, value) {
    if (!activeSubElement) return;
    const { blockId, subId } = activeSubElement;
    const block = findBlockById(blockId);
    if (!block) return;
    if (!block.subStyles) block.subStyles = {};
    if (!block.subStyles[subId]) block.subStyles[subId] = {};
    block.subStyles[subId][key] = value;
    reRenderBlock(blockId);
    setTimeout(() => {
        const b = findBlockById(blockId);
        if (b && b._el) {
            const el = b._el.querySelector(`[data-subid="${subId}"]`);
            if (el) el.classList.add('sub-element-selected');
        }
    }, 20);
}

function onSubPropHexChange(key, value) {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        if (key === 'bg') document.getElementById('sub-prop-bg').value = value;
        if (key === 'c') document.getElementById('sub-prop-color').value = value;
        onSubPropChange(key, value);
    }
}

function attachSubElementListeners() {
    document.querySelectorAll('[data-subid]').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            const blockId = el.closest('.rc-block')?.dataset.id;
            if (blockId) selectSubElement(blockId, el.dataset.subid);
        };
    });
}

function updateParentButtonVisibility() {
    const btn = document.getElementById('parent-nav-btn');
    if (selectedIds.length !== 1) {
        btn.style.display = 'none';
        return;
    }
    const hasCell = activeTableCell !== null;
    const hasSub = activeSubElement !== null;
    const isChild = isChildOfGroup(selectedIds[0]);
    const block = findBlockById(selectedIds[0]);
    const hasGroupParent = block && block._parentGroupId;
    btn.style.display = (hasCell || hasSub || isChild || hasGroupParent) ? 'block' : 'none';
}

// ────────────────────── CELL UTILITIES ──────────────────────
function ensureCellObject(cell) {
    if (typeof cell === 'string' || typeof cell === 'number') return { t: String(cell), bg: '', c: '', p: '', fw: '', ta: '', br: '', fs: '', ff: '' };
    if (cell && typeof cell === 'object') return {
        t: cell.t !== undefined ? String(cell.t) : '', bg: cell.bg || '', c: cell.c || '',
        p: cell.p || '', fw: cell.fw || '', ta: cell.ta || '', br: cell.br || '', fs: cell.fs || '', ff: cell.ff || ''
    };
    return { t: '', bg: '', c: '', p: '', fw: '', ta: '', br: '', fs: '', ff: '' };
}

function getCellText(cell) {
    if (typeof cell === 'string' || typeof cell === 'number') return String(cell);
    if (cell && typeof cell === 'object') return String(cell.t !== undefined ? cell.t : '');
    return '';
}

function getCellStyleObj(cell, globalBlock) {
    const co = ensureCellObject(cell);
    const style = [];
    if (co.bg) style.push('background:' + co.bg);
    else if (globalBlock && globalBlock.cellBg) style.push('background:' + globalBlock.cellBg);
    if (co.c) style.push('color:' + co.c);
    else if (globalBlock && globalBlock.cellColor) style.push('color:' + globalBlock.cellColor);
    if (co.p) style.push('padding:' + co.p);
    if (co.fw) style.push('font-weight:' + co.fw);
    if (co.ta) style.push('text-align:' + co.ta);
    if (co.br) style.push('border-radius:' + co.br);
    if (co.fs) style.push('font-size:' + co.fs);
    if (co.ff) style.push('font-family:' + co.ff);
    else if (globalBlock && globalBlock.cellFont && !co.ff) style.push('font-family:' + globalBlock.cellFont);
    if (globalBlock && globalBlock.cellBorderW) style.push('border:' + globalBlock.cellBorderW + ' solid ' + (globalBlock.cellBorderC || '#d1d5db'));
    return style.join('; ');
}

function clearActiveTableCell() {
    if (activeTableCell) {
        const prevBlock = blocks.find(b => b.id === activeTableCell.blockId);
        if (prevBlock && prevBlock._el) {
            prevBlock._el.querySelectorAll('.table-cell-selected, .cell-selected').forEach(c => c.classList.remove('table-cell-selected', 'cell-selected'));
        }
    }
    activeTableCell = null;
    document.getElementById('cell-props-panel').classList.add('hidden');
    updateParentButtonVisibility();
}

function selectTableCell(blockId, row, col, tableType) {
    clearActiveTableCell();
    clearSubElementSelection();
    activeTableCell = { blockId, row, col, tableType: tableType || 'table' };
    const block = blocks.find(b => b.id === blockId);
    if (!block || !block._el) return;
    if (tableType === 'grades') {
        const allTds = block._el.querySelectorAll('.grades-tbl tbody td');
        const targetIndex = row * 5 + col;
        if (allTds[targetIndex]) allTds[targetIndex].classList.add('cell-selected');
    } else {
        const tdElements = block._el.querySelectorAll('.pdf-table td, .pdf-table th');
        const cols = block.cols || (block.data && block.data[0] ? block.data[0].length : 3);
        const targetIndex = row * cols + col;
        if (tdElements[targetIndex]) tdElements[targetIndex].classList.add('table-cell-selected');
    }
    switchTab('content');
    document.getElementById('sub-element-props-panel').classList.add('hidden');
    populateCellProperties(block, row, col, tableType);
    updateParentButtonVisibility();
}

function populateCellProperties(block, row, col, tableType) {
    const panel = document.getElementById('cell-props-panel');
    panel.classList.remove('hidden');
    document.getElementById('cell-coords').textContent = `Row ${row + 1}, Col ${col + 1}`;
    let cellData;
    if (tableType === 'grades') {
        const rowData = block.rows[row];
        const keys = ['subject', 'score', 'grade', 'remark'];
        const key = keys[col];
        const styles = (block.rowStyles && block.rowStyles[row] && block.rowStyles[row][key]) ? block.rowStyles[row][key] : {};
        cellData = { t: rowData ? rowData[key] : '', ff: '', ...styles };
    } else {
        const rawCell = (block.data && block.data[row] && block.data[row][col] !== undefined) ? block.data[row][col] : '';
        cellData = ensureCellObject(rawCell);
    }
    document.getElementById('cell-prop-bg').value = cellData.bg || '#ffffff';
    document.getElementById('cell-prop-bg-hex').value = cellData.bg || '';
    document.getElementById('cell-prop-color').value = cellData.c || '#1a1a1a';
    document.getElementById('cell-prop-color-hex').value = cellData.c || '';
    document.getElementById('cell-prop-padding').value = cellData.p || '';
    document.getElementById('cell-prop-fw').value = cellData.fw || '';
    document.getElementById('cell-prop-ta').value = cellData.ta || '';
    document.getElementById('cell-prop-ff').value = cellData.ff || '';
    document.getElementById('cell-prop-br').value = cellData.br || '';
    document.getElementById('cell-prop-fs').value = cellData.fs || '';
}

// ────────────────────── BLOCK FACTORY ──────────────────────
function newBlock(type) {
    const id = 'b' + (++idCounter);
    const base = {
        id, type, x: 20, y: 20, w: CW - 40, h: 'auto',
        bgType: 'none', bgColor: '#ffffff', gradAngle: 135,
        gradStops: [{color: '#1a2744', pos: 0}, {color: '#3b5998', pos: 100}],
        color: '', fontSize: '', fontWeight: '', fontFamily: '', fontStyle: '', textAlign: '',
        padding: '', borderRadius: '', zIndex: 0,
        borderWidth: '', borderStyle: 'solid', borderColor: '#e5e7eb',
        boxShadow: '', opacity: 1, children: [], subStyles: {}
    };
    switch(type) {
        case 'school-header': return { ...base, x: 0, y: 0, w: CW, h: 150, bgType: 'gradient', gradAngle: 135, gradStops: [{color: '#0f1d45', pos: 0}, {color: '#1e4488', pos: 70}, {color: '#c9a84c', pos: 100}], color: '#ffffff', schoolName: 'GREENFIELD ACADEMY', schoolSub: '123 Learning Lane · Edu City · (555) 000-1234', reportTitle: 'ACADEMIC PROGRESS REPORT — 2024/2025', logoImg: null };
        case 'student-info': return { ...base, y: 160, h: 200, bgType: 'solid', bgColor: '#ffffff', fields: [{label: 'Student Name', value: 'Jane Adaeze Smith'}, {label: 'Student ID', value: 'GFA-2024-089'}, {label: 'Grade / Class', value: 'Grade 8 — Section B'}, {label: 'Academic Year', value: '2024 / 2025'}, {label: 'Term', value: 'Second Term'}, {label: 'Date of Birth', value: 'March 12, 2012'}], photoImg: null };
        case 'grades': return { ...base, y: 370, h: 270, bgType: 'solid', bgColor: '#ffffff', title: 'Subject Performance', headerBg: '#1a2744', headerColor: '#ffffff', rows: [{subject: 'Mathematics', score: '92', grade: 'A', remark: 'Excellent'}, {subject: 'English Language', score: '85', grade: 'B', remark: 'Very Good'}, {subject: 'Science', score: '78', grade: 'C', remark: 'Good'}, {subject: 'Social Studies', score: '88', grade: 'B', remark: 'Very Good'}, {subject: 'Fine Arts', score: '95', grade: 'A', remark: 'Outstanding'}, {subject: 'Physical Ed.', score: '90', grade: 'A', remark: 'Excellent'}], rowStyles: [] };
        case 'comments': return { ...base, y: 650, h: 130, bgType: 'solid', bgColor: '#ffffff', title: "Teacher's Comment", text: 'Jane has demonstrated remarkable dedication this term...' };
        case 'attendance': return { ...base, y: 790, h: 120, bgType: 'solid', bgColor: '#ffffff', present: '78', absent: '4', late: '2' };
        case 'signature': return { ...base, y: 920, h: 110, bgType: 'none', sigs: ["Class Teacher's Signature", "Principal's Signature", "Parent / Guardian"] };
        case 'divider': return { ...base, h: 20, bgType: 'none', w: CW - 40, lineColor: '#e5e7eb' };
        case 'text': return { ...base, h: 60, bgType: 'none', text: 'Click here to edit this text block.' };
        case 'image': return { ...base, w: 180, h: 180, bgType: 'none', imgSrc: null };
        case 'cell': return { ...base, w: 120, h: 60, bgType: 'solid', bgColor: '#fafafa', borderWidth: '1px', text: 'Cell Content' };
        case 'table': return { ...base, y: 660, h: 200, w: CW - 60, bgType: 'solid', bgColor: '#ffffff', rows: 3, cols: 3, data: [['Subject Header', 'Score', 'Remark'], ['Subject Core', '88%', 'Very Good'], ['Subject Elective', '95%', 'Excellent']], cellBg: '#ffffff', cellColor: '#1a1a1a', cellFont: '', cellBorderW: '1px', cellBorderC: '#d1d5db', cellBorderR: '0px' };
        case 'group': return { ...base, w: 400, h: 300, bgType: 'solid', bgColor: 'rgba(240,180,41,.05)', borderWidth: '1.5px', borderStyle: 'dashed', borderColor: '#6c63ff', children: [] };
    }
    return base;
}

// ────────────────────── RENDERING ──────────────────────
function renderAll() {
    canvas.innerHTML = '';
    blocks.forEach(b => {
        const el = buildBlockEl(b);
        canvas.appendChild(el);
        b._el = el;
    });
    renderLayers();
    updateGroupPanels();
    renderPresetsSidebar();
    attachSubElementListeners();
    if (activeTableCell) {
        const block = blocks.find(b => b.id === activeTableCell.blockId);
        if (block && block._el) {
            if (activeTableCell.tableType === 'grades') {
                const allTds = block._el.querySelectorAll('.grades-tbl tbody td');
                const targetIndex = activeTableCell.row * 5 + activeTableCell.col;
                if (allTds[targetIndex]) allTds[targetIndex].classList.add('cell-selected');
            } else {
                const tdElements = block._el.querySelectorAll('.pdf-table td, .pdf-table th');
                const cols = block.cols || (block.data && block.data[0] ? block.data[0].length : 3);
                const targetIndex = activeTableCell.row * cols + activeTableCell.col;
                if (tdElements[targetIndex]) tdElements[targetIndex].classList.add('table-cell-selected');
            }
        }
    }
    if (activeSubElement) {
        const block = findBlockById(activeSubElement.blockId);
        if (block && block._el) {
            const el = block._el.querySelector(`[data-subid="${activeSubElement.subId}"]`);
            if (el) el.classList.add('sub-element-selected');
        }
    }
}

function buildBlockEl(b) {
    const el = document.createElement('div');
    el.className = 'rc-block' + (b.type === 'group' ? ' group-block' : '');
    if (selectedIds.includes(b.id)) el.classList.add('selected');
    if (selectedIds.length > 1 && selectedIds.includes(b.id)) el.classList.add('multi-selected');
    el.dataset.id = b.id;
    const isChild = b._parentGroupId !== undefined;
    el.style.cssText = getBlockCSS(b, isChild);
    el.innerHTML = getBlockHTML(b);
    applySubStylesToElement(el, b);
    const outline = document.createElement('div');
    outline.className = 'block-outline';
    el.appendChild(outline);
    if (!isChild) {
        const dh = document.createElement('div');
        dh.className = 'drag-handle';
        dh.dataset.drag = b.id;
        dh.textContent = '⠿ ' + getBlockLabel(b.type) + (b.type === 'group' ? ' 📦' : '');
        el.appendChild(dh);
        const del = document.createElement('button');
        del.className = 'block-delete';
        del.textContent = '✕';
        del.onclick = e => { e.stopPropagation(); deleteBlock(b.id); };
        el.appendChild(del);
        ['nw','ne','sw','se','n','s','e','w'].forEach(dir => {
            const rh = document.createElement('div');
            rh.className = 'resize-handle rh-' + dir;
            rh.dataset.id = b.id;
            rh.addEventListener('mousedown', e => onResizeMouseDown(e, dir));
            el.appendChild(rh);
        });
    }
    el.addEventListener('mousedown', e => onBlockMouseDown(e, b.id));
    el.addEventListener('click', e => {
        if (e.detail === 2) {
            e.preventDefault();
            e.stopPropagation();
            drillIntoChildren();
            return;
        }
        if (e.shiftKey) {
            toggleSelect(b.id);
            return;
        }
        if (selectedIds.includes(b.id)) {
            const target = e.target.closest('[contenteditable="true"]');
            if (target) { target.focus(); e.stopPropagation(); return; }
            e.stopPropagation();
            return;
        } else {
            e.stopPropagation();
            selectBlock(b.id);
        }
    });
    return el;
}

function getBlockCSS(b, isChild) {
    let bg = '';
    if (b.bgType === 'solid') bg = b.bgColor;
    else if (b.bgType === 'gradient' && b.gradStops?.length) {
        const stops = [...b.gradStops].sort((a, c) => a.pos - c.pos).map(s => `${s.color} ${s.pos}%`).join(', ');
        bg = `linear-gradient(${b.gradAngle}deg, ${stops})`;
    }
    const border = b.borderWidth ? `${b.borderWidth} ${b.borderStyle} ${b.borderColor}` : '';
    return [
        `position: absolute`, `left: ${b.x}px`, `top: ${b.y}px`, `width: ${b.w}px`,
        b.h !== 'auto' ? `height: ${b.h}px` : '', bg ? `background: ${bg}` : '',
        b.color ? `color: ${b.color}` : '', b.fontSize ? `font-size: ${b.fontSize}` : '',
        b.fontWeight ? `font-weight: ${b.fontWeight}` : '',
        b.fontStyle ? `font-style: ${b.fontStyle}` : '',
        b.fontFamily ? `font-family: ${b.fontFamily}` : '',
        b.textAlign ? `text-align: ${b.textAlign}` : '', b.padding ? `padding: ${b.padding}` : '',
        b.borderRadius ? `border-radius: ${b.borderRadius}` : '', b.zIndex ? `z-index: ${b.zIndex}` : '',
        border ? `border: ${border}` : '', b.boxShadow ? `box-shadow: ${b.boxShadow}` : '',
        b.opacity !== 1 ? `opacity: ${b.opacity}` : ''
    ].filter(Boolean).join('; ');
}

function getBlockLabel(type) {
    const labels = { 'school-header': 'Header', 'student-info': 'Student Info', 'grades': 'Grades', 'comments': 'Comments', 'attendance': 'Attendance', 'signature': 'Signatures', 'divider': 'Divider', 'text': 'Text', 'image': 'Image', 'cell': 'Cell', 'table': 'Table', 'group': 'Group' };
    return labels[type] || type;
}

function applySubStylesToElement(el, b) {
    if (b.subStyles) {
        Object.entries(b.subStyles).forEach(([subId, styles]) => {
            const subEl = el.querySelector(`[data-subid="${subId}"]`);
            if (subEl) {
                Object.entries(styles).forEach(([key, val]) => {
                    switch (key) {
                        case 'bg': subEl.style.background = val; break;
                        case 'c': subEl.style.color = val; break;
                        case 'fw': subEl.style.fontWeight = val; break;
                        case 'fs': subEl.style.fontStyle = val; break;
                        case 'ff': subEl.style.fontFamily = val; break;
                        case 'fz': subEl.style.fontSize = val; break;
                        case 'ta': subEl.style.textAlign = val; break;
                        case 'p': subEl.style.padding = val; break;
                        case 'br': subEl.style.borderRadius = val; break;
                    }
                });
            }
        });
    }
}

function getBlockHTML(b) {
    if (b.type === 'group') {
        const childrenHtml = (b.children || []).map(child => {
            const childEl = document.createElement('div');
            childEl.className = 'group-child';
            childEl.style.cssText = getBlockCSS(child, true);
            childEl.innerHTML = getBlockHTML(child);
            childEl.dataset.childId = child.id;
            return childEl.outerHTML;
        }).join('');
        return `<div style="position:relative;width:100%;height:100%;min-height:50px;overflow:hidden;pointer-events:auto;">${childrenHtml}</div>`;
    }
    switch(b.type) {
        case 'school-header': {
            const logo = b.logoImg ? `<img class="hd-logo" src="${b.logoImg}" data-subid="logo">` : `<div class="hd-logo-ph" onclick="uploadImage(event,'${b.id}','logoImg')" data-subid="logo">🏫</div>`;
            return `<div class="pdf-header">${logo}<div class="hd-school" contenteditable="true" onblur="syncBlockText(event,'${b.id}','schoolName')" data-subid="schoolName">${esc(b.schoolName)}</div><div class="hd-sub" contenteditable="true" onblur="syncBlockText(event,'${b.id}','schoolSub')" data-subid="schoolSub">${esc(b.schoolSub)}</div><div class="hd-title" contenteditable="true" onblur="syncBlockText(event,'${b.id}','reportTitle')" data-subid="reportTitle">${esc(b.reportTitle)}</div></div>`;
        }
        case 'student-info': {
            const fields = b.fields.map((f, i) => `<div class="si-field"><div class="si-label" data-subid="label-${i}">${esc(f.label)}</div><div class="si-value" contenteditable="true" onblur="syncStudentField(event,'${b.id}',${i})" data-subid="value-${i}">${esc(f.value)}</div></div>`).join('');
            const photo = b.photoImg ? `<img class="si-photo-img" src="${b.photoImg}" data-subid="photo">` : `<div class="si-photo-ph" onclick="uploadImage(event,'${b.id}','photoImg')" data-subid="photo">👤<br>Upload</div>`;
            return `<div class="pdf-student">${fields}<div class="si-photo-wrap">${photo}</div></div>`;
        }
        case 'grades': {
            const keys = ['subject', 'score', 'grade', 'remark'];
            const rows = b.rows.map((r, i) => {
                const cells = keys.map((key, ci) => {
                    const styles = (b.rowStyles && b.rowStyles[i] && b.rowStyles[i][key]) ? b.rowStyles[i][key] : {};
                    const styleStr = [styles.bg ? 'background:'+styles.bg : '', styles.c ? 'color:'+styles.c : '', styles.p ? 'padding:'+styles.p : '', styles.fw ? 'font-weight:'+styles.fw : '', styles.ta ? 'text-align:'+styles.ta : '', styles.br ? 'border-radius:'+styles.br : '', styles.fs ? 'font-size:'+styles.fs : '', styles.ff ? 'font-family:'+styles.ff : ''].filter(Boolean).join('; ');
                    return `<td style="${styleStr}" contenteditable="true" onclick="event.stopPropagation();onGradesCellClick(event,'${b.id}',${i},${ci})" onblur="syncGradeCell(event,'${b.id}',${i},'${key}')">${esc(r[key])}</td>`;
                }).join('');
                return `<tr>${cells}<td style="text-align:center"><button class="pdf-del-row" onclick="event.stopPropagation();deleteGradeRow('${b.id}',${i})">✕</button></td></tr>`;
            }).join('');
            return `<div class="pdf-grades"><h3 contenteditable="true" onblur="syncBlockText(event,'${b.id}','title')">${esc(b.title)}</h3><table class="grades-tbl"><thead><tr style="background:${b.headerBg};color:${b.headerColor}"><th>Subject</th><th style="text-align:center">Score (%)</th><th style="text-align:center">Grade</th><th>Remark</th><th style="width:30px"></th></tr></thead><tbody>${rows}</tbody></table><button class="pdf-add-row" onclick="event.stopPropagation();addGradeRow('${b.id}')">＋ Add Row</button></div>`;
        }
        case 'comments': return `<div class="pdf-comments"><h3 contenteditable="true" onblur="syncBlockText(event,'${b.id}','title')" data-subid="title">${esc(b.title)}</h3><div class="comment-body" contenteditable="true" onblur="syncBlockText(event,'${b.id}','text')" data-subid="body">${esc(b.text)}</div></div>`;
        case 'attendance': return `<div class="pdf-attendance"><h3>Attendance Summary</h3><div class="att-grid"><div class="att-card"><span class="att-val" contenteditable="true" onblur="syncBlockText(event,'${b.id}','present')" data-subid="present">${esc(b.present)}</span><div class="att-lbl" data-subid="present-lbl">Days Present</div></div><div class="att-card"><span class="att-val" contenteditable="true" onblur="syncBlockText(event,'${b.id}','absent')" data-subid="absent">${esc(b.absent)}</span><div class="att-lbl" data-subid="absent-lbl">Days Absent</div></div><div class="att-card"><span class="att-val" contenteditable="true" onblur="syncBlockText(event,'${b.id}','late')" data-subid="late">${esc(b.late)}</span><div class="att-lbl" data-subid="late-lbl">Days Late</div></div></div></div>`;
        case 'signature': {
            const sigs = b.sigs.map((s, i) => `<div class="sig-field"><div class="sig-line"></div><div class="sig-lbl" contenteditable="true" onblur="syncSignatureLabel(event,'${b.id}',${i})" data-subid="sig-${i}">${esc(s)}</div></div>`).join('');
            return `<div class="pdf-signature"><div class="sig-row">${sigs}</div></div>`;
        }
        case 'divider': return `<div class="pdf-divider"><hr style="border-top-color: ${b.lineColor || '#e5e7eb'}"></div>`;
        case 'text': return `<div class="pdf-text" contenteditable="true" onblur="syncBlockText(event,'${b.id}','text')">${esc(b.text)}</div>`;
        case 'image': if (b.imgSrc) { return `<div class="pdf-image"><img src="${b.imgSrc}" alt="image" draggable="false" style="pointer-events:none"></div>`; } return `<div class="pdf-img-ph"><span style="font-size:32px">🖼</span><span>Click to upload image</span><span style="font-size:9px">Use the button in the Content tab</span></div>`;
        case 'cell': return `<div class="pdf-cell" contenteditable="true" onblur="syncBlockText(event,'${b.id}','text')">${esc(b.text)}</div>`;
        case 'table': {
            const data = b.data || [];
            const rows = data.map((row, ri) => {
                const cells = row.map((cell, ci) => {
                    const isHeader = ri === 0;
                    const tag = isHeader ? 'th' : 'td';
                    const cellObj = ensureCellObject(cell);
                    const styleStr = getCellStyleObj(cell, b);
                    return `<${tag} style="${styleStr}" contenteditable="true" onclick="event.stopPropagation();onTableCellClick(event,'${b.id}',${ri},${ci})" onblur="syncTableCell(event,'${b.id}',${ri},${ci})">${esc(getCellText(cell))}</${tag}>`;
                }).join('');
                return `<tr>${cells}</tr>`;
            }).join('');
            return `<div class="pdf-table-wrap"><table class="pdf-table">${rows}</table><div class="table-controls"><button onclick="event.stopPropagation();addTableRow('${b.id}')">＋ Row</button><button onclick="event.stopPropagation();addTableCol('${b.id}')">＋ Column</button><button onclick="event.stopPropagation();removeTableRow('${b.id}')">✕ Del Row</button><button onclick="event.stopPropagation();removeTableCol('${b.id}')">✕ Del Col</button></div></div>`;
        }
        default: return '';
    }
}

function onTableCellClick(event, blockId, row, col) { event.stopPropagation(); if (activeTableCell && activeTableCell.blockId === blockId && activeTableCell.row === row && activeTableCell.col === col) { const block = blocks.find(b => b.id === blockId); if (block && block._el) { const td = block._el.querySelectorAll('.pdf-table td, .pdf-table th')[row * (block.cols || 3) + col]; if (td) td.focus(); } return; } selectTableCell(blockId, row, col, 'table'); if (!selectedIds.includes(blockId)) selectBlock(blockId); else populateProperties(blocks.find(b => b.id === blockId)); }
function onGradesCellClick(event, blockId, row, col) { event.stopPropagation(); if (activeTableCell && activeTableCell.blockId === blockId && activeTableCell.row === row && activeTableCell.col === col) { const block = blocks.find(b => b.id === blockId); if (block && block._el) { const allTds = block._el.querySelectorAll('.grades-tbl tbody td'); const targetIndex = row * 5 + col; if (allTds[targetIndex]) allTds[targetIndex].focus(); } return; } selectTableCell(blockId, row, col, 'grades'); if (!selectedIds.includes(blockId)) selectBlock(blockId); else populateProperties(blocks.find(b => b.id === blockId)); }

function addBlock(type) {
    saveSnapshot();
    const b = newBlock(type);
    const canvasScroll = document.getElementById('canvas-scroll');
    const visibleY = canvasScroll.scrollTop + 100;
    b.y = Math.max(20, visibleY);
    b.x = 20 + Math.random() * 80;
    blocks.push(b);
    clearActiveTableCell();
    clearSubElementSelection();
    renderAll();
    selectBlock(b.id);
    toast(`${getBlockLabel(type)} added`);
}
function deleteBlock(id) { saveSnapshot(); if (activeTableCell && activeTableCell.blockId === id) clearActiveTableCell(); if (activeSubElement && activeSubElement.blockId === id) clearSubElementSelection(); const b = blocks.find(x => x.id === id); if (b && b.type === 'group') { const childIds = (b.children || []).map(c => c.id); blocks = blocks.filter(bl => bl.id !== id && !childIds.includes(bl.id)); } else { blocks = blocks.filter(bl => bl.id !== id); } selectedIds = selectedIds.filter(sid => sid !== id); if (selectedIds.length === 0) selectedIds = blocks.length > 0 ? [blocks[0].id] : []; renderAll(); toast('Block deleted'); }
function deleteSelected() { saveSnapshot(); if (selectedIds.length === 0) return; const toDelete = new Set(selectedIds); if (activeTableCell && toDelete.has(activeTableCell.blockId)) clearActiveTableCell(); if (activeSubElement && toDelete.has(activeSubElement.blockId)) clearSubElementSelection(); const newBlocks = []; for (const b of blocks) { if (toDelete.has(b.id)) continue; if (b.type === 'group') { const childIds = (b.children || []).map(c => c.id); let keep = true; for (const cid of childIds) { if (toDelete.has(cid)) { keep = false; break; } } if (!keep) continue; } newBlocks.push(b); } blocks = newBlocks; selectedIds = []; if (blocks.length > 0) selectedIds = [blocks[0].id]; renderAll(); toast('Selection deleted'); }
function canvasClick(e) { if (e.target === canvas) { clearActiveTableCell(); clearSubElementSelection(); selectedIds = []; renderAll(); showEmptyProps(); } }

function showMultiSelectProps() { document.getElementById('props-empty').classList.add('hidden'); document.getElementById('props-panel').classList.remove('hidden'); const nameEl = document.getElementById('props-block-name'); nameEl.textContent = `📦 Multiple (${selectedIds.length})`; nameEl.style.color = '#f0b429'; document.getElementById('layout-multi-select-notice').classList.remove('hidden'); document.getElementById('layout-single-item-panel').classList.add('hidden'); document.getElementById('group-action-panel').classList.add('hidden'); document.getElementById('deconstruct-btn').classList.add('hidden'); document.getElementById('cell-props-panel').classList.add('hidden'); document.getElementById('sub-element-props-panel').classList.add('hidden'); switchTab('layout'); }
function showEmptyProps() { document.getElementById('props-empty').classList.remove('hidden'); document.getElementById('props-panel').classList.add('hidden'); document.getElementById('deconstruct-btn').classList.add('hidden'); document.getElementById('cell-props-panel').classList.add('hidden'); document.getElementById('sub-element-props-panel').classList.add('hidden'); document.getElementById('parent-nav-btn').style.display = 'none'; }
function switchTab(tab) { activeTab = tab; ['layout', 'style', 'content'].forEach(t => { const panel = document.getElementById('tab-' + t + '-panel'); if (panel) panel.classList.toggle('hidden', t !== tab); const btn = document.getElementById('tab-' + t); if (btn) btn.classList.toggle('active', t === tab); }); }
function populateProperties(b) {
    if (!b) return;
    document.getElementById('props-empty').classList.add('hidden');
    document.getElementById('props-panel').classList.remove('hidden');
    document.getElementById('layout-multi-select-notice').classList.add('hidden');
    document.getElementById('layout-single-item-panel').classList.remove('hidden');
    const nameEl = document.getElementById('props-block-name');
    nameEl.textContent = getBlockLabel(b.type);
    nameEl.style.color = b.type === 'group' ? '#f0b429' : '';
    const groupActionPanel = document.getElementById('group-action-panel');
    groupActionPanel.classList.toggle('hidden', b.type !== 'group');
    const decBtn = document.getElementById('deconstruct-btn');
    const complexTemplates = ['school-header', 'student-info', 'attendance', 'signature', 'comments', 'grades'];
    if (complexTemplates.includes(b.type)) { decBtn.classList.remove('hidden'); decBtn.textContent = `🧩 Deconstruct ${getBlockLabel(b.type)}`; } else { decBtn.classList.add('hidden'); }
    document.getElementById('prop-x').value = b.x; document.getElementById('prop-y').value = b.y;
    document.getElementById('prop-w').value = b.w; document.getElementById('prop-h').value = b.h === 'auto' ? '' : b.h;
    document.getElementById('prop-padding').value = b.padding || ''; document.getElementById('prop-radius').value = b.borderRadius || '';
    document.getElementById('prop-z').value = b.zIndex || 0;
    document.getElementById('prop-bg-type').value = b.bgType || 'none'; bgTypeChange(b.bgType || 'none', false);
    document.getElementById('prop-bg-color').value = b.bgColor || '#ffffff'; document.getElementById('prop-bg-hex').value = b.bgColor || '';
    document.getElementById('prop-grad-angle').value = b.gradAngle || 135; document.getElementById('grad-angle-lbl').textContent = (b.gradAngle || 135) + '°';
    renderGradientStops(b);
    document.getElementById('prop-color').value = b.color || '#000000'; document.getElementById('prop-color-hex').value = b.color || '';
    document.getElementById('prop-fs').value = b.fontSize ? parseInt(b.fontSize) : ''; document.getElementById('prop-fw').value = b.fontWeight || '';
    document.getElementById('prop-font-style').value = b.fontStyle || '';
    document.getElementById('prop-ff').value = b.fontFamily || '';
    const divLinePanel = document.getElementById('divider-line-color-panel');
    if (b.type === 'divider') {
        divLinePanel.classList.remove('hidden');
        document.getElementById('prop-div-line-color').value = b.lineColor || '#e5e7eb';
        document.getElementById('prop-div-line-hex').value = b.lineColor || '#e5e7eb';
    } else {
        divLinePanel.classList.add('hidden');
    }
    document.getElementById('prop-bw').value = b.borderWidth || '';
    document.getElementById('prop-bs').value = b.borderStyle || 'solid';
    document.getElementById('prop-bc').value = b.borderColor || '#e5e7eb';
    document.getElementById('prop-bc-hex').value = b.borderColor || '';
    populateContentFields(b);
    if (activeTableCell && activeTableCell.blockId === b.id) { document.getElementById('cell-props-panel').classList.remove('hidden'); document.getElementById('sub-element-props-panel').classList.add('hidden'); populateCellProperties(b, activeTableCell.row, activeTableCell.col, activeTableCell.tableType); }
    else if (activeSubElement && activeSubElement.blockId === b.id) { document.getElementById('sub-element-props-panel').classList.remove('hidden'); document.getElementById('cell-props-panel').classList.add('hidden'); }
    else { document.getElementById('cell-props-panel').classList.add('hidden'); document.getElementById('sub-element-props-panel').classList.add('hidden'); }
    updateParentButtonVisibility();
}
function renderGradientStops(b) { const stops = b.gradStops || [{color: '#1a2744', pos: 0}, {color: '#3b5998', pos: 100}]; document.getElementById('grad-stops').innerHTML = stops.map((s, i) => `<div class="grad-stop"><input type="color" value="${s.color}" oninput="updateGradStop(${i}, 'color', this.value)"><input type="number" class="prop-input" style="width:52px" value="${s.pos}" min="0" max="100" oninput="updateGradStop(${i}, 'pos', +this.value)"><span style="font-size:10px">%</span>${stops.length > 2 ? `<button onclick="removeGradStop(${i})" style="color:#ef4444;border:none;cursor:pointer;font-size:11px">✕</button>` : ''}</div>`).join(''); }
function populateContentFields(b) { const f = document.getElementById('content-fields'); let html = ''; switch(b.type) { case 'grades': html = `<div class="prop-group"><label class="prop-label">Table Header Background</label><div class="flex gap-2"><input type="color" class="prop-input w-10 h-8 p-0.5" value="${b.headerBg || '#1a2744'}" oninput="setAndRender('${b.id}','headerBg',this.value)"><input type="text" class="prop-input" value="${b.headerBg || '#1a2744'}" oninput="setAndRender('${b.id}','headerBg',this.value)"></div></div><div class="prop-group"><label class="prop-label">Header Text Color</label><input type="color" class="prop-input w-10 h-8 p-0.5" value="${b.headerColor || '#ffffff'}" oninput="setAndRender('${b.id}','headerColor',this.value)"></div><div class="prop-group"><label class="prop-label">Table Rows (${b.rows.length})</label><button onclick="addGradeRow('${b.id}')" class="w-full text-xs py-2 rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:text-primary transition-all">＋ Add New Row</button></div>`; break; case 'table': html = `<div class="prop-group"><label class="prop-label">Table Grid Size</label><p class="text-xs text-gray-500 mb-2">${b.rows} rows × ${b.cols} columns</p><div class="flex gap-2"><div class="prop-group"><label class="prop-label">Rows</label><input type="number" class="prop-input" value="${b.rows}" min="1" max="25" onchange="resizeTable('${b.id}','rows',+this.value)"></div><div class="prop-group"><label class="prop-label">Columns</label><input type="number" class="prop-input" value="${b.cols}" min="1" max="25" onchange="resizeTable('${b.id}','cols',+this.value)"></div></div></div><div class="prop-group"><label class="prop-label">Global Cell Defaults</label><div class="prop-group"><label class="prop-label">Default Cell Bg</label><input type="color" class="prop-input w-10 h-8 p-0.5" value="${b.cellBg || '#ffffff'}" oninput="setAndRender('${b.id}','cellBg',this.value)"></div><div class="prop-group"><label class="prop-label">Default Text Color</label><input type="color" class="prop-input w-10 h-8 p-0.5" value="${b.cellColor || '#1a1a1a'}" oninput="setAndRender('${b.id}','cellColor',this.value)"></div></div>`; break; case 'student-info': html = `<div class="prop-group"><label class="prop-label">Student Photo</label><button onclick="uploadImage(event,'${b.id}','photoImg')" class="w-full text-xs py-2 rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:text-primary transition-all">📸 Upload Photo</button>${b.photoImg ? `<button onclick="clearImage('${b.id}','photoImg')" class="w-full text-xs py-1.5 text-red-500 hover:text-red-400 mt-2 transition-colors">Clear Photo</button>` : ''}</div><div class="prop-group"><label class="prop-label">Student Fields</label>${b.fields.map((f,i) => `<div class="flex gap-2 mb-2"><input type="text" class="prop-input flex-1" value="${esc(f.label)}" placeholder="Label" oninput="updateStudentField('${b.id}',${i},'label',this.value)"><input type="text" class="prop-input flex-1" value="${esc(f.value)}" placeholder="Value" oninput="updateStudentField('${b.id}',${i},'value',this.value)"></div>`).join('')}</div>`; break; case 'school-header': html = `<div class="prop-group"><label class="prop-label">School Logo</label><button onclick="uploadImage(event,'${b.id}','logoImg')" class="w-full text-xs py-2 rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:text-primary transition-all">🏫 Upload School Logo</button>${b.logoImg ? `<button onclick="clearImage('${b.id}','logoImg')" class="w-full text-xs py-1.5 text-red-500 hover:text-red-400 mt-2 transition-colors">Clear Logo</button>` : ''}</div><div class="prop-group"><label class="prop-label">School Name</label><input type="text" class="prop-input" value="${esc(b.schoolName)}" oninput="setAndRender('${b.id}','schoolName',this.value)"></div><div class="prop-group"><label class="prop-label">Subtitle</label><input type="text" class="prop-input" value="${esc(b.schoolSub)}" oninput="setAndRender('${b.id}','schoolSub',this.value)"></div><div class="prop-group"><label class="prop-label">Report Title</label><input type="text" class="prop-input" value="${esc(b.reportTitle)}" oninput="setAndRender('${b.id}','reportTitle',this.value)"></div>`; break; case 'signature': html = `<div class="prop-group"><label class="prop-label">Signatures (${b.sigs.length})</label>${b.sigs.map((s,i) => `<div class="flex gap-2 mb-2"><input type="text" class="prop-input flex-1" value="${esc(s)}" oninput="updateSignatureLabel('${b.id}',${i},this.value)">${b.sigs.length>1?`<button onclick="removeSignature('${b.id}',${i})" class="text-red-500 hover:text-red-400 transition-colors">✕</button>`:''}</div>`).join('')}<button onclick="addSignature('${b.id}')" class="w-full text-xs py-2 rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:text-primary transition-all mt-2">＋ Add Signature Line</button></div>`; break; case 'text': html = `<div class="prop-group"><label class="prop-label">Text Content</label><textarea class="prop-input" rows="4" oninput="setAndRender('${b.id}','text',this.value)">${esc(b.text)}</textarea></div>`; break; case 'cell': html = `<div class="prop-group"><label class="prop-label">Cell Text</label><textarea class="prop-input" rows="3" oninput="setAndRender('${b.id}','text',this.value)">${esc(b.text)}</textarea></div>`; break; case 'image': html = `<div class="prop-group"><label class="prop-label">Image</label><button onclick="uploadImage(event,'${b.id}','imgSrc')" class="w-full text-xs py-2 rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:text-primary transition-all">🖼 Upload Image</button>${b.imgSrc ? `<button onclick="clearImage('${b.id}','imgSrc')" class="w-full text-xs py-1.5 text-red-500 hover:text-red-400 mt-2 transition-colors">Clear Image</button>` : ''}</div>`; break; default: html = `<p class="text-xs text-gray-500">Double click elements on the canvas to modify text content instantly.</p>`; } f.innerHTML = html; }

function liveSet(key, val) { if (selectedIds.length !== 1) return; const b = findBlockById(selectedIds[0]); if (!b) return; b[key] = val; applyStyle(b); }
function applyStyle(b) { const el = canvas.querySelector(`[data-id="${b.id}"]`); if (el) { el.style.cssText = getBlockCSS(b, false); } if (b.type === 'group') { reRenderBlock(b.id); } }
function setAndRender(id, key, val) { const b = findBlockById(id); if (!b) return; b[key] = val; reRenderBlock(id); }
function reRenderBlock(id) { const b = findBlockById(id); if (!b) return; const old = canvas.querySelector(`[data-id="${id}"]`); if (!old) return; const neu = buildBlockEl(b); canvas.replaceChild(neu, old); if (selectedIds.includes(id)) populateProperties(b); updateGroupPanels(); if (activeTableCell && activeTableCell.blockId === id) { const refreshedBlock = findBlockById(id); if (refreshedBlock && refreshedBlock._el) { if (activeTableCell.tableType === 'grades') { const allTds = refreshedBlock._el.querySelectorAll('.grades-tbl tbody td'); const targetIndex = activeTableCell.row * 5 + activeTableCell.col; if (allTds[targetIndex]) allTds[targetIndex].classList.add('cell-selected'); } else { const tdElements = refreshedBlock._el.querySelectorAll('.pdf-table td, .pdf-table th'); const cols = refreshedBlock.cols || (refreshedBlock.data && refreshedBlock.data[0] ? refreshedBlock.data[0].length : 3); const targetIndex = activeTableCell.row * cols + activeTableCell.col; if (tdElements[targetIndex]) tdElements[targetIndex].classList.add('table-cell-selected'); } } } if (activeSubElement && activeSubElement.blockId === id) { const refreshedBlock = findBlockById(id); if (refreshedBlock && refreshedBlock._el) { const el = refreshedBlock._el.querySelector(`[data-subid="${activeSubElement.subId}"]`); if (el) el.classList.add('sub-element-selected'); } } }

function onCellPropChange(key, value) { if (!activeTableCell) return; const { blockId, row, col, tableType } = activeTableCell; const block = findBlockById(blockId); if (!block) return; if (tableType === 'grades') { const keys = ['subject', 'score', 'grade', 'remark']; const fieldKey = keys[col]; if (!block.rowStyles) block.rowStyles = []; if (!block.rowStyles[row]) block.rowStyles[row] = {}; if (!block.rowStyles[row][fieldKey]) block.rowStyles[row][fieldKey] = {}; block.rowStyles[row][fieldKey][key] = value; } else { let cell = (block.data && block.data[row] && block.data[row][col] !== undefined) ? block.data[row][col] : ''; let cellObj = ensureCellObject(cell); cellObj[key] = value; if (!block.data) block.data = []; if (!block.data[row]) block.data[row] = []; block.data[row][col] = cellObj; } reRenderBlock(blockId); setTimeout(() => { const refreshedBlock = findBlockById(blockId); if (refreshedBlock) selectTableCell(blockId, row, col, tableType); }, 50); }
function onCellPropHexChange(key, value) { if (/^#[0-9a-fA-F]{6}$/.test(value)) { if (key === 'bg') document.getElementById('cell-prop-bg').value = value; if (key === 'c') document.getElementById('cell-prop-color').value = value; onCellPropChange(key, value); } }
function applyCellStyleToRow() { if (!activeTableCell) return; const { blockId, row, col, tableType } = activeTableCell; const block = findBlockById(blockId); if (!block) return; if (tableType === 'grades') { const keys = ['subject', 'score', 'grade', 'remark']; const sourceKey = keys[col]; const sourceStyle = (block.rowStyles && block.rowStyles[row] && block.rowStyles[row][sourceKey]) ? block.rowStyles[row][sourceKey] : {}; if (!block.rowStyles) block.rowStyles = []; if (!block.rowStyles[row]) block.rowStyles[row] = {}; keys.forEach(k => { block.rowStyles[row][k] = { ...sourceStyle }; }); } else { const sourceCell = (block.data && block.data[row] && block.data[row][col] !== undefined) ? block.data[row][col] : ''; const sourceObj = ensureCellObject(sourceCell); const cols = block.cols || (block.data && block.data[0] ? block.data[0].length : 3); if (!block.data) block.data = []; if (!block.data[row]) block.data[row] = []; for (let c = 0; c < cols; c++) { const existing = ensureCellObject(block.data[row][c] || ''); block.data[row][c] = { ...existing, bg: sourceObj.bg, c: sourceObj.c, p: sourceObj.p, fw: sourceObj.fw, ta: sourceObj.ta, br: sourceObj.br, fs: sourceObj.fs, ff: sourceObj.ff, t: existing.t }; } } reRenderBlock(blockId); setTimeout(() => selectTableCell(blockId, row, col, tableType), 50); toast('Style applied to entire row'); }
function applyCellStyleToCol() { if (!activeTableCell) return; const { blockId, row, col, tableType } = activeTableCell; const block = findBlockById(blockId); if (!block) return; if (tableType === 'grades') { const keys = ['subject', 'score', 'grade', 'remark']; const sourceKey = keys[col]; const sourceStyle = (block.rowStyles && block.rowStyles[row] && block.rowStyles[row][sourceKey]) ? block.rowStyles[row][sourceKey] : {}; if (!block.rowStyles) block.rowStyles = []; block.rows.forEach((_, r) => { if (!block.rowStyles[r]) block.rowStyles[r] = {}; block.rowStyles[r][sourceKey] = { ...sourceStyle }; }); } else { const sourceCell = (block.data && block.data[row] && block.data[row][col] !== undefined) ? block.data[row][col] : ''; const sourceObj = ensureCellObject(sourceCell); const rows = block.rows || (block.data ? block.data.length : 3); if (!block.data) block.data = []; for (let r = 0; r < rows; r++) { if (!block.data[r]) block.data[r] = []; const existing = ensureCellObject(block.data[r][col] || ''); block.data[r][col] = { ...existing, bg: sourceObj.bg, c: sourceObj.c, p: sourceObj.p, fw: sourceObj.fw, ta: sourceObj.ta, br: sourceObj.br, fs: sourceObj.fs, ff: sourceObj.ff, t: existing.t }; } } reRenderBlock(blockId); setTimeout(() => selectTableCell(blockId, row, col, tableType), 50); toast('Style applied to entire column'); }
function applyCellStyleToTable() { if (!activeTableCell) return; const { blockId, row, col, tableType } = activeTableCell; const block = findBlockById(blockId); if (!block) return; if (tableType === 'grades') { const keys = ['subject', 'score', 'grade', 'remark']; const sourceKey = keys[col]; const sourceStyle = (block.rowStyles && block.rowStyles[row] && block.rowStyles[row][sourceKey]) ? block.rowStyles[row][sourceKey] : {}; if (!block.rowStyles) block.rowStyles = []; block.rows.forEach((_, r) => { if (!block.rowStyles[r]) block.rowStyles[r] = {}; keys.forEach(k => { block.rowStyles[r][k] = { ...sourceStyle }; }); }); } else { const sourceCell = (block.data && block.data[row] && block.data[row][col] !== undefined) ? block.data[row][col] : ''; const sourceObj = ensureCellObject(sourceCell); const rows = block.rows || (block.data ? block.data.length : 3); const cols = block.cols || (block.data && block.data[0] ? block.data[0].length : 3); if (!block.data) block.data = []; for (let r = 0; r < rows; r++) { if (!block.data[r]) block.data[r] = []; for (let c = 0; c < cols; c++) { const existing = ensureCellObject(block.data[r][c] || ''); block.data[r][c] = { ...existing, bg: sourceObj.bg, c: sourceObj.c, p: sourceObj.p, fw: sourceObj.fw, ta: sourceObj.ta, br: sourceObj.br, fs: sourceObj.fs, ff: sourceObj.ff, t: existing.t }; } } } reRenderBlock(blockId); setTimeout(() => selectTableCell(blockId, row, col, tableType), 50); toast('Style applied to entire table'); }
function resetCellStyle() { if (!activeTableCell) return; const { blockId, row, col, tableType } = activeTableCell; const block = findBlockById(blockId); if (!block) return; if (tableType === 'grades') { const keys = ['subject', 'score', 'grade', 'remark']; const fieldKey = keys[col]; if (block.rowStyles && block.rowStyles[row] && block.rowStyles[row][fieldKey]) { delete block.rowStyles[row][fieldKey]; } } else { if (block.data && block.data[row] && block.data[row][col] !== undefined) { const cell = block.data[row][col]; if (typeof cell === 'object') { block.data[row][col] = cell.t || ''; } } } clearActiveTableCell(); reRenderBlock(blockId); toast('Cell style reset'); }

// Divider line color handlers
function onDivLineColorChange(v) {
    document.getElementById('prop-div-line-hex').value = v;
    if (selectedIds.length === 1) {
        const b = findBlockById(selectedIds[0]);
        if (b && b.type === 'divider') {
            b.lineColor = v;
            reRenderBlock(b.id);
        }
    }
}
function onDivLineHexChange(v) {
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        document.getElementById('prop-div-line-color').value = v;
        onDivLineColorChange(v);
    }
}

// Border handlers
function updateBorder() {
    if (selectedIds.length !== 1) return;
    const b = findBlockById(selectedIds[0]);
    if (!b) return;
    b.borderWidth = document.getElementById('prop-bw').value;
    b.borderStyle = document.getElementById('prop-bs').value;
    b.borderColor = document.getElementById('prop-bc').value;
    document.getElementById('prop-bc-hex').value = b.borderColor;
    applyStyle(b);
}
function onBorderColorChange(v) {
    document.getElementById('prop-bc-hex').value = v;
    updateBorder();
}
function onBorderHexChange(v) {
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        document.getElementById('prop-bc').value = v;
        updateBorder();
    }
}

function bgTypeChange(type, apply = true) { document.getElementById('bg-solid-panel').classList.toggle('hidden', type !== 'solid'); document.getElementById('bg-gradient-panel').classList.toggle('hidden', type !== 'gradient'); if (apply && selectedIds.length === 1) { const b = findBlockById(selectedIds[0]); if (b) { b.bgType = type; applyStyle(b); } } }
function onBgColorChange(v) { document.getElementById('prop-bg-hex').value = v; if (selectedIds.length !== 1) return; const b = findBlockById(selectedIds[0]); if (!b) return; b.bgColor = v; applyStyle(b); }
function onBgHexChange(v) { if (/^#[0-9a-fA-F]{6}$/.test(v)) { document.getElementById('prop-bg-color').value = v; onBgColorChange(v); } }
function onGradAngleChange(v) { document.getElementById('grad-angle-lbl').textContent = v + '°'; if (selectedIds.length !== 1) return; const b = findBlockById(selectedIds[0]); if (!b) return; b.gradAngle = +v; applyStyle(b); }
function updateGradStop(i, key, val) { if (selectedIds.length !== 1) return; const b = findBlockById(selectedIds[0]); if (!b || !b.gradStops[i]) return; b.gradStops[i][key] = val; applyStyle(b); }
function addGradStop() { if (selectedIds.length !== 1) return; saveSnapshot(); const b = findBlockById(selectedIds[0]); if (!b) return; b.gradStops = [...(b.gradStops || []), {color: '#ffffff', pos: 50}]; applyStyle(b); renderGradientStops(b); }
function removeGradStop(i) { if (selectedIds.length !== 1) return; saveSnapshot(); const b = findBlockById(selectedIds[0]); if (!b || b.gradStops.length <= 2) return; b.gradStops.splice(i, 1); applyStyle(b); renderGradientStops(b); }
function onTextColorChange(v) { document.getElementById('prop-color-hex').value = v; liveSet('color', v); }
function onColorHexChange(v) { if (/^#[0-9a-fA-F]{6}$/.test(v)) { document.getElementById('prop-color').value = v; liveSet('color', v); } }
function onOpacityChange(v) { /* not used */ }
function syncBlockText(e, id, key) { const b = findBlockById(id); if (b) b[key] = e.target.innerText; }
function syncStudentField(e, id, idx) { const b = findBlockById(id); if (b && b.fields[idx]) b.fields[idx].value = e.target.innerText; }
function syncGradeCell(e, id, row, key) { const b = findBlockById(id); if (b && b.rows[row]) b.rows[row][key] = e.target.innerText; }
function syncTableCell(e, id, row, col) { const b = findBlockById(id); if (!b || !b.data || !b.data[row]) return; const cell = b.data[row][col]; if (typeof cell === 'object') { cell.t = e.target.innerText; } else { b.data[row][col] = e.target.innerText; } }
function syncSignatureLabel(e, id, i) { const b = findBlockById(id); if (b && b.sigs[i] !== undefined) b.sigs[i] = e.target.innerText; }
function updateStudentField(id, idx, key, val) { const b = findBlockById(id); if (b && b.fields[idx]) { b.fields[idx][key] = val; reRenderBlock(id); } }
function addGradeRow(id) { saveSnapshot(); const b = findBlockById(id); if (!b) return; b.rows.push({subject: 'New Subject', score: '0', grade: '—', remark: '—'}); reRenderBlock(id); }
function deleteGradeRow(id, idx) { saveSnapshot(); const b = findBlockById(id); if (!b) return; b.rows.splice(idx, 1); if (b.rowStyles) b.rowStyles.splice(idx, 1); reRenderBlock(id); }
function addTableRow(id) { saveSnapshot(); const b = findBlockById(id); if (!b) return; const cols = b.cols || 3; b.data.push(Array(cols).fill('Cell')); b.rows = b.data.length; reRenderBlock(id); }
function addTableCol(id) { saveSnapshot(); const b = findBlockById(id); if (!b) return; b.data.forEach(row => row.push('Cell')); b.cols = b.data[0] ? b.data[0].length : 3; reRenderBlock(id); }
function removeTableRow(id) { saveSnapshot(); const b = findBlockById(id); if (!b || b.data.length <= 1) return; b.data.pop(); b.rows = b.data.length; reRenderBlock(id); }
function removeTableCol(id) { saveSnapshot(); const b = findBlockById(id); if (!b || b.cols <= 1) return; b.data.forEach(row => row.pop()); b.cols = b.data[0] ? b.data[0].length : 1; reRenderBlock(id); }
function resizeTable(id, dim, val) { saveSnapshot(); const b = findBlockById(id); if (!b || val < 1) return; if (dim === 'rows') { while (b.data.length < val) { b.data.push(Array(b.cols).fill('Cell')); } while (b.data.length > val) b.data.pop(); b.rows = b.data.length; } else if (dim === 'cols') { b.data.forEach(row => { while (row.length < val) row.push('Cell'); while (row.length > val) row.pop(); }); b.cols = b.data[0] ? b.data[0].length : 1; } reRenderBlock(id); }
function updateSignatureLabel(id, i, val) { const b = findBlockById(id); if (!b) return; b.sigs[i] = val; reRenderBlock(id); }
function addSignature(id) { saveSnapshot(); const b = findBlockById(id); if (!b) return; b.sigs.push('Signee Authority'); reRenderBlock(id); }
function removeSignature(id, i) { saveSnapshot(); const b = findBlockById(id); if (!b || b.sigs.length <= 1) return; b.sigs.splice(i, 1); reRenderBlock(id); }
function uploadImage(e, id, field) { e.stopPropagation(); fileTarget = {id, field}; document.getElementById('file-input').click(); }
function handleFileUpload(e) { const file = e.target.files[0]; if (!file || !fileTarget) return; const {id, field} = fileTarget; const reader = new FileReader(); reader.onload = ev => { const b = findBlockById(id); if (b) { saveSnapshot(); b[field] = ev.target.result; reRenderBlock(id); } }; reader.readAsDataURL(file); e.target.value = ''; fileTarget = null; }
function clearImage(id, field) { saveSnapshot(); const b = findBlockById(id); if (b) { b[field] = null; reRenderBlock(id); } toast('Image cleared'); }
function saveSelectedAsPreset() { if (selectedIds.length !== 1) return; const group = blocks.find(b => b.id === selectedIds[0]); if (!group || group.type !== 'group') return; const presetName = prompt("Enter a name for this custom component preset:", "Custom Studio Preset"); if (!presetName) return; const presetCopy = JSON.parse(JSON.stringify(group)); presetCopy.name = presetName; presetCopy.id = 'preset_' + Date.now(); customPresets.push(presetCopy); localStorage.setItem('rcstudio_presets', JSON.stringify(customPresets)); renderPresetsSidebar(); toast('Preset saved!'); }
function loadPresets() { try { const raw = localStorage.getItem('rcstudio_presets'); if (raw) { customPresets = JSON.parse(raw); } } catch (e) {} }
function renderPresetsSidebar() { const container = document.getElementById('custom-presets-list'); if (customPresets.length === 0) { container.innerHTML = `<p class="text-[10px] text-gray-500 dark:text-gray-400 italic">No custom presets saved.</p>`; return; } container.innerHTML = customPresets.map((p, index) => `<div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-all"><div class="flex items-center gap-1.5 cursor-pointer truncate mr-2" onclick="instantiatePreset('${p.id}')"><span class="text-xs">📦</span><span class="text-[11px] truncate font-medium">${esc(p.name)}</span></div><button onclick="deletePreset(event,'${p.id}')" class="text-red-500 hover:text-red-400 text-[10px] px-1 transition-colors">✕</button></div>`).join(''); }
function instantiatePreset(presetId) { const template = customPresets.find(p => p.id === presetId); if (!template) return; saveSnapshot(); const clone = JSON.parse(JSON.stringify(template)); idCounter++; clone.id = 'b' + idCounter; const maxY = blocks.reduce((m, bl) => Math.max(m, bl.y + (bl.h === 'auto' ? 80 : +bl.h)), 20); clone.y = maxY + 15; clone.x = 20; clone.children = (clone.children || []).map(c => { idCounter++; c.id = 'b' + idCounter; c._parentGroupId = clone.id; return c; }); blocks.push(clone); clearActiveTableCell(); clearSubElementSelection(); renderAll(); selectBlock(clone.id); toast('Custom preset instantiated'); }
function deletePreset(e, presetId) { e.stopPropagation(); customPresets = customPresets.filter(p => p.id !== presetId); localStorage.setItem('rcstudio_presets', JSON.stringify(customPresets)); renderPresetsSidebar(); toast('Preset deleted'); }
function deconstructCurrentTemplate() { if (selectedIds.length !== 1) return; const b = findBlockById(selectedIds[0]); if (!b) return; clearActiveTableCell(); clearSubElementSelection(); saveSnapshot(); const styleProps = (src) => ({ bgType: src.bgType, bgColor: src.bgColor, gradAngle: src.gradAngle, gradStops: src.gradStops ? JSON.parse(JSON.stringify(src.gradStops)) : undefined, color: src.color, fontSize: src.fontSize, fontWeight: src.fontWeight, fontFamily: src.fontFamily, fontStyle: src.fontStyle, textAlign: src.textAlign, padding: src.padding, borderRadius: src.borderRadius, borderWidth: src.borderWidth, borderStyle: src.borderStyle, borderColor: src.borderColor, boxShadow: src.boxShadow, opacity: src.opacity }); const primitives = []; const startX = b.x, startY = b.y, W = b.w, H = b.h === 'auto' ? 120 : b.h; if (b.type === 'attendance') { primitives.push({ ...newBlock('text'), x: startX + 15, y: startY + 12, w: W - 30, h: 25, text: 'ATTENDANCE SUMMARY', fontWeight: '700', fontSize: '12px', zIndex: 2, ...styleProps(b) }); const colW = Math.floor((W - 40) / 3); const stats = [{ num: b.present || '0', label: 'Days Present' }, { num: b.absent || '0', label: 'Days Absent' }, { num: b.late || '0', label: 'Days Late' }]; stats.forEach((stat, i) => { const cardX = startX + 15 + (i * (colW + 10)); const bg = { ...newBlock('cell'), x: cardX, y: startY + 45, w: colW, h: 60, text: '', zIndex: 1, ...styleProps(b), bgColor: b.bgColor || '#f9fafb', borderRadius: b.borderRadius || '6px' }; const val = { ...newBlock('text'), x: cardX + 5, y: startY + 50, w: colW - 10, h: 30, text: stat.num, fontWeight: '700', fontSize: '24px', textAlign: 'center', zIndex: 3, color: b.color || '#1a1a1a' }; const lbl = { ...newBlock('text'), x: cardX + 5, y: startY + 80, w: colW - 10, h: 20, text: stat.label, fontWeight: '500', fontSize: '8px', textAlign: 'center', color: '#6b7280', zIndex: 3 }; primitives.push(bg, val, lbl); }); } else if (b.type === 'comments') { primitives.push({ ...newBlock('cell'), x: startX, y: startY, w: W, h: H, text: '', zIndex: 1, ...styleProps(b) }); primitives.push({ ...newBlock('text'), x: startX + 15, y: startY + 15, w: W - 30, h: 25, text: b.title || "Teacher's Comment", fontWeight: '700', fontSize: '13px', zIndex: 2, color: b.color || '#333' }); primitives.push({ ...newBlock('text'), x: startX + 15, y: startY + 45, w: W - 30, h: H - 60, text: b.text || "Type your evaluation here.", fontWeight: '400', fontSize: '11px', zIndex: 2, color: b.color || '#333' }); } else if (b.type === 'school-header') { const bgCell = { ...newBlock('cell'), x: startX, y: startY, w: W, h: H, text: '', zIndex: 1, bgType: b.bgType, bgColor: b.bgColor, gradAngle: b.gradAngle, gradStops: b.gradStops ? JSON.parse(JSON.stringify(b.gradStops)) : undefined }; primitives.push(bgCell); primitives.push({ ...newBlock('image'), x: startX + (W / 2) - 35, y: startY + 12, w: 70, h: 70, imgSrc: b.logoImg || null, zIndex: 2 }); primitives.push({ ...newBlock('text'), x: startX + 20, y: startY + 88, w: W - 40, h: 30, text: b.schoolName, fontSize: '18px', fontWeight: '700', textAlign: 'center', color: b.color || '#ffffff', zIndex: 3 }); primitives.push({ ...newBlock('text'), x: startX + 20, y: startY + 112, w: W - 40, h: 20, text: b.schoolSub, fontSize: '11px', textAlign: 'center', color: b.color || '#ffffff', opacity: 0.9, zIndex: 3 }); primitives.push({ ...newBlock('text'), x: startX + 20, y: startY + 130, w: W - 40, h: 20, text: b.reportTitle, fontSize: '12px', fontWeight: '600', textAlign: 'center', color: b.color || '#ffffff', zIndex: 3 }); } else if (b.type === 'student-info') { primitives.push({ ...newBlock('cell'), x: startX, y: startY, w: W, h: H, text: '', zIndex: 1, ...styleProps(b) }); primitives.push({ ...newBlock('image'), x: startX + W - 110, y: startY + 15, w: 95, h: 110, imgSrc: b.photoImg || null, zIndex: 2 }); const itemW = Math.floor((W - 130) / 2), rowH = 32; b.fields.forEach((field, i) => { const col = i % 2, row = Math.floor(i / 2); const fieldX = startX + (col * itemW), fieldY = startY + (row * rowH); primitives.push({ ...newBlock('cell'), x: fieldX, y: fieldY, w: 80, h: rowH, text: field.label, bgType: 'solid', bgColor: '#f5f5f5', fontSize: '9px', fontWeight: '700', borderWidth: '1px', borderColor: '#ddd', zIndex: 2 }); primitives.push({ ...newBlock('cell'), x: fieldX + 80, y: fieldY, w: itemW - 80, h: rowH, text: field.value, bgType: 'solid', bgColor: '#ffffff', fontSize: '11px', borderWidth: '1px', borderColor: '#ddd', zIndex: 2 }); }); } else if (b.type === 'signature') { const sigCount = b.sigs.length, colW = Math.floor((W - (sigCount * 20)) / sigCount); b.sigs.forEach((sigText, i) => { const sigX = startX + 10 + (i * (colW + 20)); primitives.push({ ...newBlock('divider'), x: sigX, y: startY + 30, w: colW, h: 10, zIndex: 1 }); primitives.push({ ...newBlock('text'), x: sigX, y: startY + 45, w: colW, h: 25, text: sigText, fontSize: '10px', fontWeight: '600', textAlign: 'center', zIndex: 2, color: b.color || '#6b7280' }); }); } else if (b.type === 'grades') { primitives.push({ ...newBlock('text'), x: startX, y: startY, w: W, h: 25, text: b.title || 'Subject Performance', fontWeight: '700', fontSize: '13px', zIndex: 1, color: b.color || '#1a1a1a' }); const tableData = [['Subject', 'Score', 'Grade', 'Remark']]; b.rows.forEach(r => { tableData.push([r.subject, r.score, r.grade, r.remark]); }); primitives.push({ ...newBlock('table'), x: startX, y: startY + 30, w: W, h: H - 30, rows: tableData.length, cols: 4, data: tableData, cellBg: '#ffffff', cellColor: '#1a1a1a', cellBorderC: '#eee', cellBorderW: '1px', zIndex: 1 }); } if (primitives.length > 0) { primitives.forEach(p => { idCounter++; p.id = 'b' + idCounter; }); blocks = blocks.filter(x => x.id !== b.id); blocks.push(...primitives); selectedIds = [primitives[0].id]; renderAll(); populateProperties(primitives[0]); } toast(`Deconstructed into ${primitives.length} modular blocks!`); }
function groupSelected() { if (selectedIds.length < 2) { toast('Select at least 2 blocks to group', 'error'); return; } saveSnapshot(); clearActiveTableCell(); clearSubElementSelection(); const selected = blocks.filter(b => selectedIds.includes(b.id)); if (selected.some(b => b.type === 'group')) { toast('Cannot group an existing group directly.', 'error'); return; } if (selected.some(b => b._parentGroupId !== undefined)) { toast('Cannot group elements nested inside an existing group', 'error'); return; } let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0; selected.forEach(b => { const w = b.w || 100, h = b.h === 'auto' ? 60 : (b.h || 60); if (b.x < minX) minX = b.x; if (b.y < minY) minY = b.y; if (b.x + w > maxX) maxX = b.x + w; if (b.y + h > maxY) maxY = b.y + h; }); const groupX = minX - 10, groupY = minY - 10, groupW = maxX - minX + 20, groupH = maxY - minY + 20; const group = newBlock('group'); group.x = Math.max(0, groupX); group.y = Math.max(0, groupY); group.w = Math.max(100, groupW); group.h = Math.max(50, groupH); group.bgType = 'solid'; group.bgColor = 'rgba(108,99,255,0.05)'; group.borderWidth = '1.5px'; group.borderStyle = 'dashed'; group.borderColor = '#6c63ff'; group.children = selected.map(b => { const child = JSON.parse(JSON.stringify(b)); child.x = b.x - group.x; child.y = b.y - group.y; child._parentGroupId = group.id; delete child._el; return child; }); const selectedIdsSet = new Set(selectedIds); blocks = blocks.filter(b => !selectedIdsSet.has(b.id)); blocks.push(group); selectedIds = [group.id]; renderAll(); populateProperties(group); toast(`Grouped ${selected.length} items`); }
function ungroupSelected() { if (selectedIds.length !== 1) { toast('Select a single group to ungroup', 'error'); return; } saveSnapshot(); clearActiveTableCell(); clearSubElementSelection(); const group = blocks.find(b => b.id === selectedIds[0]); if (!group || group.type !== 'group') { toast('Selected block is not a grouped component', 'error'); return; } const children = group.children || []; if (children.length === 0) { toast('This group has no nested elements', 'error'); return; } blocks = blocks.filter(b => b.id !== group.id); const newIds = []; children.forEach(child => { const restored = JSON.parse(JSON.stringify(child)); restored.x = group.x + child.x; restored.y = group.y + child.y; restored._parentGroupId = undefined; restored.id = 'b' + (++idCounter); if (restored.type === 'group') { restored.children = (restored.children || []).map(gc => { gc._parentGroupId = restored.id; return gc; }); } blocks.push(restored); newIds.push(restored.id); }); selectedIds = newIds; renderAll(); if (newIds.length === 1) { populateProperties(findBlockById(newIds[0])); } else { showMultiSelectProps(); } toast(`Ungrouped into ${children.length} separate blocks`); }
function updateGroupPanels() { const groupActionPanel = document.getElementById('group-action-panel'); if (selectedIds.length === 1) { const b = findBlockById(selectedIds[0]); if (b && b.type === 'group') { groupActionPanel.classList.remove('hidden'); return; } } groupActionPanel.classList.add('hidden'); }
function renderLayers() { const list = document.getElementById('layers-list'); list.innerHTML = [...blocks].reverse().map(b => { const isGroup = b.type === 'group'; const childCount = isGroup ? (b.children || []).length : 0; return `<div class="layer-item ${selectedIds.includes(b.id) ? 'active' : ''}" onclick="selectBlock('${b.id}')"><span>${getBlockLabel(b.type)}${isGroup ? ' 📦' : ''}</span>${childCount > 0 ? `<span class="text-[9px] text-gray-500">(${childCount})</span>` : ''}<span class="ml-auto text-[10px] text-gray-600">${b.id}</span></div>`; }).join(''); }
function renderLayerLabel() { renderLayers(); }
function savePage() { try { const data = blocks.map(b => { const copy = JSON.parse(JSON.stringify(b)); delete copy._el; return copy; }); localStorage.setItem('rcstudio_blocks', JSON.stringify(data)); localStorage.setItem('rcstudio_counter', idCounter); toast('Saved to browser workspace ✓'); } catch (e) { toast('Failed to backup save'); } }
function loadPage() { loadPresets(); try { const raw = localStorage.getItem('rcstudio_blocks'); if (raw) { blocks = JSON.parse(raw); idCounter = +(localStorage.getItem('rcstudio_counter') || 0); clearActiveTableCell(); clearSubElementSelection(); historyStack = [getStateSnapshot()]; historyIndex = 0; updateUndoRedoButtons(); renderAll(); if (blocks.length > 0) { selectedIds = [blocks[0].id]; populateProperties(findBlockById(blocks[0].id)); } return; } } catch (e) {} loadDefaults(); }
function loadDefaults() { blocks = []; ['school-header', 'student-info', 'grades', 'comments', 'attendance', 'signature'].forEach(type => blocks.push(newBlock(type))); clearActiveTableCell(); clearSubElementSelection(); historyStack = [getStateSnapshot()]; historyIndex = 0; updateUndoRedoButtons(); renderAll(); if (blocks.length > 0) { selectedIds = [blocks[0].id]; populateProperties(findBlockById(blocks[0].id)); } }
function exportPDF() { const prevSelected = [...selectedIds]; const prevCell = activeTableCell ? { ...activeTableCell } : null; const prevSub = activeSubElement ? { ...activeSubElement } : null; clearActiveTableCell(); clearSubElementSelection(); selectedIds = []; renderAll(); const el = document.getElementById('report-canvas'); const opt = { margin: 0, filename: 'custom-report-card.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false }, jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' } }; toast('Rendering Academic Report…'); html2pdf().set(opt).from(el).save().then(() => { selectedIds = prevSelected; if (prevCell) activeTableCell = prevCell; if (prevSub) activeSubElement = prevSub; renderAll(); toast('Export complete! ✓'); }); }
function toast(msg, type = 'success') { const t = document.getElementById('toast'); t.textContent = msg; t.style.transform = 'translateX(-50%) translateY(0)'; t.style.background = type === 'error' ? '#ef4444' : '#1173d4'; clearTimeout(t._timeout); t._timeout = setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(80px)'; }, 2200); }
document.addEventListener('keydown', e => {
    if (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.key === 'Escape') {
        if (activeSubElement) { clearSubElementSelection(); if (selectedIds.length === 1) { const b = findBlockById(selectedIds[0]); if (b) populateProperties(b); } return; }
        if (activeTableCell) { clearActiveTableCell(); if (selectedIds.length === 1) { const b = findBlockById(selectedIds[0]); if (b) populateProperties(b); } else { showEmptyProps(); } return; }
        if (selectedIds.length === 1) { const id = selectedIds[0]; const parent = getParentGroup(id); if (parent) { selectBlock(parent.id); return; } const block = findBlockById(id); if (block && block._parentGroupId) { const p = findBlockById(block._parentGroupId); if (p) selectBlock(p.id); return; } }
        clearActiveTableCell(); clearSubElementSelection(); selectedIds = []; renderAll(); showEmptyProps();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); savePage(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undo(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); redo(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'g') { e.preventDefault(); groupSelected(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'u') { e.preventDefault(); ungroupSelected(); }
    if (selectedIds.length === 1) { const b = findBlockById(selectedIds[0]); if (b && b._parentGroupId === undefined) { const step = e.shiftKey ? 10 : 1; if (e.key === 'ArrowLeft') { e.preventDefault(); saveSnapshot(); b.x = Math.max(0, b.x - step); applyStyle(b); document.getElementById('prop-x').value = b.x; } if (e.key === 'ArrowRight') { e.preventDefault(); saveSnapshot(); b.x += step; applyStyle(b); document.getElementById('prop-x').value = b.x; } if (e.key === 'ArrowUp') { e.preventDefault(); saveSnapshot(); b.y = Math.max(0, b.y - step); applyStyle(b); document.getElementById('prop-y').value = b.y; } if (e.key === 'ArrowDown') { e.preventDefault(); saveSnapshot(); b.y += step; applyStyle(b); document.getElementById('prop-y').value = b.y; } } }
});

canvas.addEventListener('mousedown', e => { if (e.shiftKey) { const blockEl = e.target.closest('.rc-block'); if (blockEl) { e.preventDefault(); e.stopPropagation(); const id = blockEl.dataset.id; toggleSelect(id); } } }, true);
canvas.addEventListener('mousedown', e => { if (e.shiftKey) return; if (e.target === canvas) { e.preventDefault(); const rect = canvas.getBoundingClientRect(); const startX = e.clientX - rect.left, startY = e.clientY - rect.top; const marquee = document.createElement('div'); marquee.className = 'selection-marquee'; marquee.style.left = startX + 'px'; marquee.style.top = startY + 'px'; canvas.appendChild(marquee); function onMouseMove(ev) { const currentX = ev.clientX - rect.left, currentY = ev.clientY - rect.top; const x1 = Math.min(startX, currentX), y1 = Math.min(startY, currentY), x2 = Math.max(startX, currentX), y2 = Math.max(startY, currentY); marquee.style.left = x1 + 'px'; marquee.style.top = y1 + 'px'; marquee.style.width = (x2 - x1) + 'px'; marquee.style.height = (y2 - y1) + 'px'; const insideIds = []; blocks.forEach(b => { const blockHeight = b.h === 'auto' ? (b._el ? b._el.offsetHeight : 80) : +b.h; const overlaps = !(b.x > x2 || b.x + b.w < x1 || b.y > y2 || b.y + blockHeight < y1); if (overlaps && b._parentGroupId === undefined) { insideIds.push(b.id); } }); selectedIds = insideIds; blocks.forEach(b => { if (b._el) { b._el.classList.toggle('selected', selectedIds.includes(b.id)); b._el.classList.toggle('multi-selected', selectedIds.length > 1 && selectedIds.includes(b.id)); } }); } function onMouseUp() { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); if (marquee.parentNode) marquee.parentNode.removeChild(marquee); clearActiveTableCell(); clearSubElementSelection(); renderAll(); if (selectedIds.length === 1) { const b = findBlockById(selectedIds[0]); if (b) populateProperties(b); } else if (selectedIds.length > 1) { showMultiSelectProps(); } else { showEmptyProps(); } } document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); } });
function onBlockMouseDown(e, id) { if (!e.target.closest('[data-drag]')) return; e.preventDefault(); if (!selectedIds.includes(id)) selectBlock(id); const b = findBlockById(id); if (!b || b._parentGroupId !== undefined) return; const el = canvas.querySelector(`[data-id="${id}"]`); if (!el) return; const dragGroup = blocks.filter(bl => selectedIds.includes(bl.id) && bl._parentGroupId === undefined); dragState = { type: 'move', startX: e.clientX, startY: e.clientY, targets: dragGroup.map(t => ({ id: t.id, startX: t.x, startY: t.y, w: t.w, el: canvas.querySelector(`[data-id="${t.id}"]`) })) }; saveSnapshot(); el.classList.add('dragging'); }
function onResizeMouseDown(e, dir) { e.preventDefault(); e.stopPropagation(); const id = e.currentTarget.dataset.id; const b = findBlockById(id); if (!b || b._parentGroupId !== undefined) return; const el = canvas.querySelector(`[data-id="${id}"]`); if (!el) return; dragState = { id, type: 'resize', dir, startX: e.clientX, startY: e.clientY, w: b.w, h: b.h === 'auto' ? el.offsetHeight : +b.h, x: b.x, y: b.y }; saveSnapshot(); el.classList.add('dragging'); }
document.addEventListener('mousemove', e => { if (!dragState) return; if (dragState.type === 'move') { const dx = e.clientX - dragState.startX, dy = e.clientY - dragState.startY; dragState.targets.forEach(target => { const b = findBlockById(target.id); if (!b) return; let nx = target.startX + dx, ny = target.startY + dy; nx = Math.max(0, Math.min(nx, CW - target.w)); ny = Math.max(0, ny); b.x = Math.round(nx); b.y = Math.round(ny); if (target.el) { target.el.style.left = b.x + 'px'; target.el.style.top = b.y + 'px'; } if (selectedIds.length === 1 && selectedIds[0] === target.id) { document.getElementById('prop-x').value = b.x; document.getElementById('prop-y').value = b.y; } }); } else if (dragState.type === 'resize') { const b = findBlockById(dragState.id); if (!b) return; const el = canvas.querySelector(`[data-id="${dragState.id}"]`); if (!el) return; const dx = e.clientX - dragState.startX, dy = e.clientY - dragState.startY, dir = dragState.dir; let nw = dragState.w, nh = dragState.h, nx = dragState.x, ny = dragState.y; if (dir.includes('e')) nw = Math.max(60, dragState.w + dx); if (dir.includes('s')) nh = Math.max(30, dragState.h + dy); if (dir.includes('w')) { nw = Math.max(60, dragState.w - dx); nx = dragState.x + (dragState.w - nw); } if (dir.includes('n')) { nh = Math.max(30, dragState.h - dy); ny = dragState.y + (dragState.h - nh); } b.w = Math.round(nw); b.h = Math.round(nh); b.x = Math.round(nx); b.y = Math.round(ny); el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; el.style.width = b.w + 'px'; el.style.height = b.h + 'px'; if (selectedIds.length === 1 && selectedIds[0] === dragState.id) { document.getElementById('prop-x').value = b.x; document.getElementById('prop-y').value = b.y; document.getElementById('prop-w').value = b.w; document.getElementById('prop-h').value = b.h; } } });
document.addEventListener('mouseup', () => { if (dragState) { if (dragState.type === 'move') { dragState.targets.forEach(target => { if (target.el) target.el.classList.remove('dragging'); }); } else if (dragState.id) { const el = canvas.querySelector(`[data-id="${dragState.id}"]`); if (el) el.classList.remove('dragging'); } } dragState = null; });

loadPage();