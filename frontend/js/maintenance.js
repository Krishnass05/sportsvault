// SportVault Maintenance Module

let allMaintenance = [];
let equipment = [];

// Load all maintenance records
async function loadMaintenance() {
    try {
        const data = await apiRequest('/maintenance');
        allMaintenance = data.maintenance;
        renderMaintenance(allMaintenance);
    } catch (error) {
        console.error('Failed to load maintenance records:', error);
        showAlert('Failed to load maintenance records', 'error');
    }
}

// Load equipment for dropdown
async function loadEquipmentForDropdown() {
    try {
        const data = await apiRequest('/equipment');
        equipment = data.equipment;

        const equipmentSelect = document.getElementById('maintenance-equipment');
        if (equipmentSelect) {
            equipmentSelect.innerHTML = '<option value="">Select Equipment</option>' +
                equipment.map(e => `<option value="${e.id}">${escapeHtml(e.name)} (${escapeHtml(e.category)})</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load equipment:', error);
    }
}

// Render maintenance records
function renderMaintenance(records) {
    const tbody = document.getElementById('maintenance-tbody');
    const user = getCurrentUser();

    if (!tbody) return;

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No maintenance records found</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(record => {
        const statusClass = getMaintenanceStatusClass(record.status);

        return `
            <tr>
                <td>${escapeHtml(record.equipment_name)}</td>
                <td>${escapeHtml(record.issue_description.substring(0, 50))}${record.issue_description.length > 50 ? '...' : ''}</td>
                <td>${escapeHtml(record.reported_by_name)}</td>
                <td>${formatDate(record.reported_date)}</td>
                <td><span class="badge ${statusClass}">${record.status}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="viewMaintenance(${record.id})">View</button>
                    ${user.role === 'admin' ? `
                        ${record.status !== 'completed' && record.status !== 'cancelled' ? `
                            <button class="btn btn-success btn-sm" onclick="updateMaintenanceStatus(${record.id}, 'completed')">Complete</button>
                        ` : ''}
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// Get maintenance status badge class
function getMaintenanceStatusClass(status) {
    switch (status) {
        case 'completed': return 'badge-success';
        case 'in_progress': return 'badge-warning';
        case 'reported': return 'badge-info';
        case 'cancelled': return 'badge-secondary';
        default: return 'badge-secondary';
    }
}

// Create maintenance record (admin only)
async function createMaintenance(event) {
    event.preventDefault();

    const formData = {
        equipment_id: document.getElementById('maintenance-equipment').value,
        issue_description: document.getElementById('maintenance-description').value,
        repair_cost: parseFloat(document.getElementById('maintenance-cost').value) || 0,
        notes: document.getElementById('maintenance-notes').value
    };

    if (!formData.equipment_id || !formData.issue_description) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }

    try {
        await apiRequest('/maintenance', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        showAlert('Maintenance record created successfully', 'success');
        closeModal('add-maintenance-modal');
        event.target.reset();
        loadMaintenance();
    } catch (error) {
        showAlert(error.message || 'Failed to create maintenance record', 'error');
    }
}

// View maintenance details
function viewMaintenance(id) {
    const record = allMaintenance.find(m => m.id === id);
    if (!record) return;

    document.getElementById('view-equipment-name').textContent = record.equipment_name;
    document.getElementById('view-issue-description').textContent = record.issue_description;
    document.getElementById('view-reported-by').textContent = record.reported_by_name;
    document.getElementById('view-reported-date').textContent = formatDate(record.reported_date);
    document.getElementById('view-status').textContent = record.status;
    document.getElementById('view-repair-cost').textContent = record.repair_cost ? `₹${record.repair_cost}` : 'N/A';
    document.getElementById('view-notes').textContent = record.notes || 'N/A';
    document.getElementById('view-completed-date').textContent = record.completed_date ? formatDate(record.completed_date) : 'N/A';

    openModal('view-maintenance-modal');
}

// Update maintenance status (admin only)
async function updateMaintenanceStatus(id, status) {
    try {
        await apiRequest(`/maintenance/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });

        showAlert('Maintenance status updated successfully', 'success');
        loadMaintenance();
    } catch (error) {
        showAlert(error.message || 'Failed to update maintenance status', 'error');
    }
}

// Load maintenance stats
async function loadMaintenanceStats() {
    try {
        const data = await apiRequest('/maintenance/stats');

        const statsContainer = document.getElementById('maintenance-stats');
        if (statsContainer) {
            const statusHtml = data.statusCounts.map(s =>
                `<span class="badge ${getMaintenanceStatusClass(s.status)}">${s.status}: ${s.count}</span>`
            ).join(' ');

            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">₹${data.totalRepairCost}</div>
                    <div class="stat-label">Total Repair Cost</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.recentCount}</div>
                    <div class="stat-label">Recent Issues (30 days)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">₹${data.totalRepairCost}</div>
                    <div class="stat-label">Total Spent</div>
                </div>
                <div style="margin-top: 1rem;">
                    ${statusHtml}
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load maintenance stats:', error);
    }
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Initialize maintenance page
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    loadMaintenance();
    loadMaintenanceStats();

    const user = getCurrentUser();

    if (user.role === 'admin') {
        loadEquipmentForDropdown();

        const addForm = document.getElementById('add-maintenance-form');
        if (addForm) {
            addForm.addEventListener('submit', createMaintenance);
        }
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
});
