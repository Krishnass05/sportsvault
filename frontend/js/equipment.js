// SportVault Equipment Module

let allEquipment = [];

// Load all equipment
async function loadEquipment() {
    try {
        const data = await apiRequest('/equipment');
        allEquipment = data.equipment;
        renderEquipment(allEquipment);
    } catch (error) {
        console.error('Failed to load equipment:', error);
        showAlert('Failed to load equipment', 'error');
    }
}

// Render equipment list
function renderEquipment(equipment) {
    const container = document.getElementById('equipment-container');
    const user = getCurrentUser();

    if (!container) return;

    if (equipment.length === 0) {
        container.innerHTML = '<div class="empty-state">No equipment found</div>';
        return;
    }

    container.innerHTML = equipment.map(item => {
        const isAvailable = item.available_quantity > 0 && item.status === 'available';
        const statusClass = getStatusClass(item.status);

        return `
            <div class="equipment-card">
                <div class="equipment-card-header">
                    <h3>${escapeHtml(item.name)}</h3>
                    <span class="badge ${statusClass}">${item.status}</span>
                </div>
                <div class="equipment-card-body">
                    <p><strong>Category:</strong> ${escapeHtml(item.category)}</p>
                    <p><strong>Description:</strong> ${escapeHtml(item.description || 'N/A')}</p>
                    <p><strong>Total:</strong> ${item.total_quantity} | <strong>Available:</strong> ${item.available_quantity}</p>
                </div>
                <div class="equipment-card-footer">
                    ${user.role === 'student' ? `
                        <button class="btn btn-primary btn-sm" 
                                onclick="issueEquipment(${item.id})" 
                                ${!isAvailable ? 'disabled' : ''}>
                            ${isAvailable ? 'Issue' : 'Unavailable'}
                        </button>
                    ` : `
                        <div>
                            <button class="btn btn-secondary btn-sm" onclick="editEquipment(${item.id})">Edit</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteEquipment(${item.id})">Delete</button>
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');

    // Show limit info for students
    if (user.role === 'student') {
        showIssueLimitInfo();
    }
}

// Show issue limit information for students
async function showIssueLimitInfo() {
    try {
        // Check if limit info already exists
        if (document.getElementById('equipment-limit-info')) return;

        const data = await apiRequest('/equipment/my/equipment');
        const issuedItems = data.equipment || [];

        const container = document.getElementById('equipment-container');
        if (!container) return;

        // Group items by equipment name for display
        const equipmentCounts = {};
        issuedItems.forEach(item => {
            equipmentCounts[item.name] = (equipmentCounts[item.name] || 0) + 1;
        });

        // Build dropdown content
        let dropdownContent = '';
        if (issuedItems.length > 0) {
            Object.entries(equipmentCounts).forEach(([name, count]) => {
                dropdownContent += `<div style="padding: 0.5rem 1rem; border-bottom: 1px solid #e9ecef;">${escapeHtml(name)} <span style="color: #6c757d;">(${count})</span></div>`;
            });
        } else {
            dropdownContent = '<div style="padding: 0.5rem 1rem; color: #6c757d;">No items currently issued</div>';
        }

        const limitInfoDiv = document.createElement('div');
        limitInfoDiv.id = 'equipment-limit-info';
        limitInfoDiv.className = 'card';
        limitInfoDiv.style.marginBottom = '1.5rem';
        limitInfoDiv.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">Equipment Issue Limit</h3>
            </div>
            <div style="padding: 1rem;">
                <p>You can issue a maximum of <strong>2 items</strong> of the same equipment type.</p>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-secondary btn-sm" onclick="toggleIssuedItemsDropdown()" style="display: flex; align-items: center; gap: 0.5rem;">
                        <span>Currently Issued Items (${issuedItems.length})</span>
                        <span id="dropdown-arrow">▼</span>
                    </button>
                    <div id="issued-items-dropdown" style="display: none; margin-top: 0.5rem; border: 1px solid #dee2e6; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                        ${dropdownContent}
                    </div>
                </div>
            </div>
        `;

        // Insert at the beginning
        container.parentElement.insertBefore(limitInfoDiv, container);
    } catch (error) {
        console.error('Failed to load issue limit info:', error);
    }
}

// Toggle issued items dropdown
function toggleIssuedItemsDropdown() {
    const dropdown = document.getElementById('issued-items-dropdown');
    const arrow = document.getElementById('dropdown-arrow');
    if (dropdown) {
        const isVisible = dropdown.style.display !== 'none';
        dropdown.style.display = isVisible ? 'none' : 'block';
        if (arrow) arrow.textContent = isVisible ? '▼' : '▲';
    }
}

// Get status badge class
function getStatusClass(status) {
    switch (status) {
        case 'available': return 'badge-success';
        case 'issued': return 'badge-warning';
        case 'maintenance': return 'badge-info';
        case 'damaged': return 'badge-danger';
        default: return 'badge-secondary';
    }
}

// Load my issued equipment (student only)
async function loadMyEquipment() {
    try {
        const data = await apiRequest('/equipment/my/equipment');
        const tbody = document.getElementById('my-equipment-tbody');

        if (!tbody) return;

        if (data.equipment.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">You have no issued equipment</td></tr>';
            return;
        }

        tbody.innerHTML = data.equipment.map(item => `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.category)}</td>
                <td>${formatDate(item.issue_date)}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="returnEquipment(${item.equipment_id})">Return</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load my equipment:', error);
    }
}

// Issue equipment (student only)
async function issueEquipment(equipmentId) {
    try {
        await apiRequest(`/equipment/${equipmentId}/issue`, {
            method: 'POST'
        });

        showAlert('Equipment issued successfully', 'success');
        loadEquipment();
        loadMyEquipment();
    } catch (error) {
        showAlert(error.message || 'Failed to issue equipment', 'error');
    }
}

// Return equipment (student only)
async function returnEquipment(equipmentId) {
    try {
        await apiRequest(`/equipment/${equipmentId}/return`, {
            method: 'POST'
        });

        showAlert('Equipment returned successfully', 'success');
        loadEquipment();
        loadMyEquipment();
    } catch (error) {
        showAlert(error.message || 'Failed to return equipment', 'error');
    }
}

// Add new equipment (admin only)
async function addEquipment(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('equipment-name').value,
        category: document.getElementById('equipment-category').value,
        description: document.getElementById('equipment-description').value,
        total_quantity: parseInt(document.getElementById('equipment-quantity').value)
    };

    try {
        await apiRequest('/equipment', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        showAlert('Equipment added successfully', 'success');
        closeModal('add-equipment-modal');
        event.target.reset();
        loadEquipment();
    } catch (error) {
        showAlert(error.message || 'Failed to add equipment', 'error');
    }
}

// Edit equipment (admin only)
async function editEquipment(equipmentId) {
    const item = allEquipment.find(e => e.id === equipmentId);
    if (!item) return;

    document.getElementById('edit-equipment-id').value = item.id;
    document.getElementById('edit-equipment-name').value = item.name;
    document.getElementById('edit-equipment-category').value = item.category;
    document.getElementById('edit-equipment-description').value = item.description || '';
    document.getElementById('edit-equipment-quantity').value = item.total_quantity;
    document.getElementById('edit-equipment-status').value = item.status;

    openModal('edit-equipment-modal');
}

// Update equipment (admin only)
async function updateEquipment(event) {
    event.preventDefault();

    const equipmentId = document.getElementById('edit-equipment-id').value;
    const formData = {
        name: document.getElementById('edit-equipment-name').value,
        category: document.getElementById('edit-equipment-category').value,
        description: document.getElementById('edit-equipment-description').value,
        total_quantity: parseInt(document.getElementById('edit-equipment-quantity').value),
        status: document.getElementById('edit-equipment-status').value
    };

    try {
        await apiRequest(`/equipment/${equipmentId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });

        showAlert('Equipment updated successfully', 'success');
        closeModal('edit-equipment-modal');
        loadEquipment();
    } catch (error) {
        showAlert(error.message || 'Failed to update equipment', 'error');
    }
}

// Delete equipment (admin only)
async function deleteEquipment(equipmentId) {
    if (!confirm('Are you sure you want to delete this equipment?')) {
        return;
    }

    try {
        await apiRequest(`/equipment/${equipmentId}`, {
            method: 'DELETE'
        });

        showAlert('Equipment deleted successfully', 'success');
        loadEquipment();
    } catch (error) {
        showAlert(error.message || 'Failed to delete equipment', 'error');
    }
}

// Search equipment
function searchEquipment(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = allEquipment.filter(item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery)
    );
    renderEquipment(filtered);
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
    return new Date(dateString).toLocaleDateString();
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

// Initialize equipment page
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    loadEquipment();

    const user = getCurrentUser();

    if (user.role === 'student') {
        loadMyEquipment();
    }

    // Event listeners
    const addForm = document.getElementById('add-equipment-form');
    if (addForm) {
        addForm.addEventListener('submit', addEquipment);
    }

    const editForm = document.getElementById('edit-equipment-form');
    if (editForm) {
        editForm.addEventListener('submit', updateEquipment);
    }

    const searchInput = document.getElementById('search-equipment');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => searchEquipment(e.target.value));
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
});
