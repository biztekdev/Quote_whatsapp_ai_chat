// Dashboard JavaScript
class DashboardApp {
    constructor() {
        this.apiBase = '/api/dashboard';
        this.currentPage = 1;
        this.currentSection = 'dashboard';
        this.init();
    }

    async init() {
        await this.loadDashboardStats();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('userSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchUsers();
        });
        
        document.getElementById('productSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchProducts();
        });
        
        document.getElementById('quoteSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchQuotes();
        });
    }

    // Utility Methods
    showLoading() {
        document.getElementById('loading').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showAlert(message, type = 'success') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show alert-custom`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    // API Methods
    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'API call failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            this.showAlert(error.message, 'danger');
            throw error;
        }
    }

    // Dashboard Stats
    async loadDashboardStats() {
        try {
            this.showLoading();
            const response = await this.apiCall('/stats');
            this.renderStats(response.data);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
        }
    }

    renderStats(stats) {
        const container = document.getElementById('stats-container');
        container.innerHTML = `
            <div class="col-md-3">
                <div class="stats-card success">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h3>${stats.users.total}</h3>
                            <p class="mb-0">Total Users</p>
                            <small>${stats.users.recent} new this week</small>
                        </div>
                        <div class="align-self-center">
                            <i class="fas fa-users fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card info">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h3>${stats.products.total}</h3>
                            <p class="mb-0">Products</p>
                            <small>${stats.products.active} active</small>
                        </div>
                        <div class="align-self-center">
                            <i class="fas fa-box fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card warning">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h3>${stats.quotes.total}</h3>
                            <p class="mb-0">Total Quotes</p>
                            <small>${stats.quotes.pending} pending</small>
                        </div>
                        <div class="align-self-center">
                            <i class="fas fa-file-invoice-dollar fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h3>${stats.conversations.active}</h3>
                            <p class="mb-0">Active Chats</p>
                            <small>${stats.conversations.completed} completed</small>
                        </div>
                        <div class="align-self-center">
                            <i class="fas fa-comments fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Section Management
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected section
        document.getElementById(`${sectionName}-section`).style.display = 'block';
        
        // Add active class to clicked nav link
        event.target.classList.add('active');
        
        this.currentSection = sectionName;
        
        // Load data for the section
        this.loadSectionData(sectionName);
    }

    async loadSectionData(sectionName) {
        switch(sectionName) {
            case 'users':
                await this.loadUsers();
                break;
            case 'categories':
                await this.loadCategories();
                break;
            case 'products':
                await this.loadProducts();
                await this.loadCategoriesForFilter();
                break;
            case 'materials':
                await this.loadMaterials();
                break;
            case 'finish-categories':
                await this.loadFinishCategories();
                break;
            case 'finishes':
                await this.loadFinishes();
                break;
            case 'quotes':
                await this.loadQuotes();
                break;
            case 'conversations':
                await this.loadConversations();
                break;
        }
    }

    // Users Management
    async loadUsers(page = 1, search = '') {
        try {
            this.showLoading();
            const response = await this.apiCall(`/users?page=${page}&search=${search}`);
            this.renderUsers(response.data);
            this.renderPagination(response.pagination, 'users');
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
        }
    }

    renderUsers(users) {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.phone}</td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="badge bg-primary">${user.totalQuotes}</span></td>
                <td>
                    <span class="badge bg-${user.isActive ? 'success' : 'danger'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${this.formatDate(user.createdAt)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="app.editUser('${user._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="app.deleteUser('${user._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async searchUsers() {
        const search = document.getElementById('userSearch').value;
        await this.loadUsers(1, search);
    }

    // Categories Management
    async loadCategories() {
        try {
            this.showLoading();
            const response = await this.apiCall('/categories');
            this.renderCategories(response.data);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
        }
    }

    renderCategories(categories) {
        const tbody = document.getElementById('categories-table-body');
        tbody.innerHTML = categories.map(category => `
            <tr>
                <td>${category.name}</td>
                <td>${category.description || 'N/A'}</td>
                <td>${category.sortOrder}</td>
                <td>
                    <span class="badge bg-${category.isActive ? 'success' : 'danger'}">
                        ${category.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${this.formatDate(category.createdAt)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="app.editCategory('${category._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="app.deleteCategory('${category._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Products Management
    async loadProducts(categoryId = '') {
        try {
            this.showLoading();
            const url = categoryId ? `/products?categoryId=${categoryId}` : '/products';
            const response = await this.apiCall(url);
            this.renderProducts(response.data);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
        }
    }

    async loadCategoriesForFilter() {
        try {
            const response = await this.apiCall('/categories');
            const select = document.getElementById('productCategoryFilter');
            select.innerHTML = '<option value="">All Categories</option>' +
                response.data.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');
        } catch (error) {
            console.error('Error loading categories for filter:', error);
        }
    }

    renderProducts(products) {
        const tbody = document.getElementById('products-table-body');
        tbody.innerHTML = products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.categoryId?.name || 'N/A'}</td>
                <td>${this.formatCurrency(product.basePrice)}</td>
                <td>
                    <small>
                        ${product.dimensionFields.map(d => d.name).join(', ')}
                    </small>
                </td>
                <td>
                    <span class="badge bg-${product.isActive ? 'success' : 'danger'}">
                        ${product.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="app.editProduct('${product._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="app.deleteProduct('${product._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    filterProducts() {
        const categoryId = document.getElementById('productCategoryFilter').value;
        this.loadProducts(categoryId);
    }

    // Materials Management
    async loadMaterials() {
        try {
            this.showLoading();
            const response = await this.apiCall('/materials');
            this.renderMaterials(response.data);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
        }
    }

    renderMaterials(materials) {
        const tbody = document.getElementById('materials-table-body');
        tbody.innerHTML = materials.map(material => `
            <tr>
                <td>${material.name}</td>
                <td>${material.categoryId?.name || 'N/A'}</td>
                <td>${this.formatCurrency(material.pricePerUnit)}</td>
                <td>${material.unit}</td>
                <td>${material.thickness || 'N/A'}</td>
                <td>
                    <span class="badge bg-${material.isActive ? 'success' : 'danger'}">
                        ${material.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="app.editMaterial('${material._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="app.deleteMaterial('${material._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Finish Categories Management
    async loadFinishCategories() {
        try {
            this.showLoading();
            const response = await this.apiCall('/finish-categories');
            this.renderFinishCategories(response.data);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
        }
    }

    renderFinishCategories(categories) {
        const tbody = document.getElementById('finish-categories-table-body');
        tbody.innerHTML = categories.map(category => `
            <tr>
                <td>${category.name}</td>
                <td>${category.description || 'N/A'}</td>
                <td>${category.sortOrder}</td>
                <td>
                    <span class="badge bg-${category.isActive ? 'success' : 'danger'}">
                        ${category.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="app.editFinishCategory('${category._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="app.deleteFinishCategory('${category._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Finishes Management
    async loadFinishes() {
        try {
            this.showLoading();
            const response = await this.apiCall('/finishes');
            this.renderFinishes(response.data);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
        }
    }

    renderFinishes(finishes) {
        const tbody = document.getElementById('finishes-table-body');
        tbody.innerHTML = finishes.map(finish => `
            <tr>
                <td>${finish.name}</td>
                <td>${finish.categoryId?.name || 'N/A'}</td>
                <td>${finish.productCategoryId?.name || 'N/A'}</td>
                <td>${finish.priceType}</td>
                <td>${this.formatCurrency(finish.price)}</td>
                <td>
                    <span class="badge bg-${finish.isActive ? 'success' : 'danger'}">
                        ${finish.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="app.editFinish('${finish._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="app.deleteFinish('${finish._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Quotes Management
    async loadQuotes(page = 1, status = '') {
        try {
            this.showLoading();
            let url = `/quotes?page=${page}`;
            if (status) url += `&status=${status}`;
            
            const response = await this.apiCall(url);
            this.renderQuotes(response.data);
            this.renderPagination(response.pagination, 'quotes');
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
        }
    }

    renderQuotes(quotes) {
        const tbody = document.getElementById('quotes-table-body');
        tbody.innerHTML = quotes.map(quote => `
            <tr>
                <td>${quote.quoteNumber}</td>
                <td>${quote.userId?.name || 'N/A'}</td>
                <td>${quote.productId?.name || 'N/A'}</td>
                <td>${this.formatCurrency(quote.pricing.totalPrice)}</td>
                <td>
                    <span class="badge bg-${this.getStatusColor(quote.status)}">
                        ${quote.status}
                    </span>
                </td>
                <td>${this.formatDate(quote.createdAt)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-info" onclick="app.viewQuote('${quote._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <div class="dropdown">
                            <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                Status
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="app.updateQuoteStatus('${quote._id}', 'pending')">Pending</a></li>
                                <li><a class="dropdown-item" href="#" onclick="app.updateQuoteStatus('${quote._id}', 'sent')">Sent</a></li>
                                <li><a class="dropdown-item" href="#" onclick="app.updateQuoteStatus('${quote._id}', 'accepted')">Accepted</a></li>
                                <li><a class="dropdown-item" href="#" onclick="app.updateQuoteStatus('${quote._id}', 'rejected')">Rejected</a></li>
                            </ul>
                        </div>
                        <button class="btn btn-outline-danger" onclick="app.deleteQuote('${quote._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getStatusColor(status) {
        const colors = {
            'pending': 'warning',
            'sent': 'info',
            'accepted': 'success',
            'rejected': 'danger',
            'expired': 'secondary'
        };
        return colors[status] || 'secondary';
    }

    filterQuotes() {
        const status = document.getElementById('quoteStatusFilter').value;
        this.loadQuotes(1, status);
    }

    async updateQuoteStatus(quoteId, status) {
        try {
            await this.apiCall(`/quotes/${quoteId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
            this.showAlert('Quote status updated successfully');
            this.loadQuotes();
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    // Conversations Management
    async loadConversations() {
        try {
            this.showLoading();
            const response = await this.apiCall('/conversations');
            this.renderConversations(response.data);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
        }
    }

    renderConversations(conversations) {
        const tbody = document.getElementById('conversations-table-body');
        tbody.innerHTML = conversations.map(conv => `
            <tr>
                <td>${conv.userId?.name || 'N/A'}</td>
                <td>${conv.phone}</td>
                <td><span class="badge bg-info">${conv.currentStep}</span></td>
                <td>${this.formatDate(conv.lastMessageAt)}</td>
                <td>
                    <span class="badge bg-${conv.isActive ? 'success' : 'secondary'}">
                        ${conv.isActive ? 'Active' : 'Completed'}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-warning" onclick="app.resetConversation('${conv._id}')">
                            <i class="fas fa-redo"></i> Reset
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async resetConversation(conversationId) {
        try {
            await this.apiCall(`/conversations/${conversationId}/reset`, {
                method: 'PUT'
            });
            this.showAlert('Conversation reset successfully');
            this.loadConversations();
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    // Pagination
    renderPagination(pagination, section) {
        const container = document.getElementById(`${section}-pagination`);
        if (!container || pagination.pages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        let paginationHTML = '<nav><ul class="pagination">';
        
        // Previous button
        if (pagination.page > 1) {
            paginationHTML += `<li class="page-item">
                <a class="page-link" href="#" onclick="app.goToPage(${pagination.page - 1}, '${section}')">Previous</a>
            </li>`;
        }
        
        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            if (i === pagination.page) {
                paginationHTML += `<li class="page-item active">
                    <span class="page-link">${i}</span>
                </li>`;
            } else {
                paginationHTML += `<li class="page-item">
                    <a class="page-link" href="#" onclick="app.goToPage(${i}, '${section}')">${i}</a>
                </li>`;
            }
        }
        
        // Next button
        if (pagination.page < pagination.pages) {
            paginationHTML += `<li class="page-item">
                <a class="page-link" href="#" onclick="app.goToPage(${pagination.page + 1}, '${section}')">Next</a>
            </li>`;
        }
        
        paginationHTML += '</ul></nav>';
        container.innerHTML = paginationHTML;
    }

    goToPage(page, section) {
        this.currentPage = page;
        if (section === 'users') {
            this.loadUsers(page);
        } else if (section === 'quotes') {
            this.loadQuotes(page);
        }
    }

    // Modal Methods (Placeholders - will be implemented based on specific forms needed)
    showAddUserModal() {
        this.showAlert('Add User modal - To be implemented', 'info');
    }

    showAddCategoryModal() {
        this.showAlert('Add Category modal - To be implemented', 'info');
    }

    showAddProductModal() {
        this.showAlert('Add Product modal - To be implemented', 'info');
    }

    showAddMaterialModal() {
        this.showAlert('Add Material modal - To be implemented', 'info');
    }

    showAddFinishCategoryModal() {
        this.showAlert('Add Finish Category modal - To be implemented', 'info');
    }

    showAddFinishModal() {
        this.showAlert('Add Finish modal - To be implemented', 'info');
    }

    // Edit methods (placeholders)
    editUser(id) {
        this.showAlert(`Edit User ${id} - To be implemented`, 'info');
    }

    editCategory(id) {
        this.showAlert(`Edit Category ${id} - To be implemented`, 'info');
    }

    editProduct(id) {
        this.showAlert(`Edit Product ${id} - To be implemented`, 'info');
    }

    editMaterial(id) {
        this.showAlert(`Edit Material ${id} - To be implemented`, 'info');
    }

    editFinishCategory(id) {
        this.showAlert(`Edit Finish Category ${id} - To be implemented`, 'info');
    }

    editFinish(id) {
        this.showAlert(`Edit Finish ${id} - To be implemented`, 'info');
    }

    viewQuote(id) {
        this.showAlert(`View Quote ${id} - To be implemented`, 'info');
    }

    // Delete methods
    async deleteUser(id) {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                await this.apiCall(`/users/${id}`, { method: 'DELETE' });
                this.showAlert('User deleted successfully');
                this.loadUsers();
            } catch (error) {
                // Error already handled in apiCall
            }
        }
    }

    async deleteCategory(id) {
        if (confirm('Are you sure you want to delete this category?')) {
            try {
                await this.apiCall(`/categories/${id}`, { method: 'DELETE' });
                this.showAlert('Category deleted successfully');
                this.loadCategories();
            } catch (error) {
                // Error already handled in apiCall
            }
        }
    }

    async deleteProduct(id) {
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                await this.apiCall(`/products/${id}`, { method: 'DELETE' });
                this.showAlert('Product deleted successfully');
                this.loadProducts();
            } catch (error) {
                // Error already handled in apiCall
            }
        }
    }

    async deleteMaterial(id) {
        if (confirm('Are you sure you want to delete this material?')) {
            try {
                await this.apiCall(`/materials/${id}`, { method: 'DELETE' });
                this.showAlert('Material deleted successfully');
                this.loadMaterials();
            } catch (error) {
                // Error already handled in apiCall
            }
        }
    }

    async deleteFinishCategory(id) {
        if (confirm('Are you sure you want to delete this finish category?')) {
            try {
                await this.apiCall(`/finish-categories/${id}`, { method: 'DELETE' });
                this.showAlert('Finish category deleted successfully');
                this.loadFinishCategories();
            } catch (error) {
                // Error already handled in apiCall
            }
        }
    }

    async deleteFinish(id) {
        if (confirm('Are you sure you want to delete this finish?')) {
            try {
                await this.apiCall(`/finishes/${id}`, { method: 'DELETE' });
                this.showAlert('Finish deleted successfully');
                this.loadFinishes();
            } catch (error) {
                // Error already handled in apiCall
            }
        }
    }

    async deleteQuote(id) {
        if (confirm('Are you sure you want to delete this quote?')) {
            try {
                await this.apiCall(`/quotes/${id}`, { method: 'DELETE' });
                this.showAlert('Quote deleted successfully');
                this.loadQuotes();
            } catch (error) {
                // Error already handled in apiCall
            }
        }
    }
}

// Global functions for HTML onclick events
function showSection(sectionName) {
    app.showSection(sectionName);
}

// Initialize the app
const app = new DashboardApp();
