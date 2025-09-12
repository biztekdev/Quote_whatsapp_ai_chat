// Dashboard JavaScript
class DashboardApp {
    constructor() {
        this.apiBase = '/api/dashboard';
        this.currentPage = 1;
        this.currentSection = 'dashboard';
        this.authToken = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.init();
    }

    async init() {
        // If no token, redirect immediately without showing loading screen
        if (!this.authToken) {
            console.log('No auth token found, redirecting to login');
            this.redirectToLogin();
            return;
        }
        
        // Add timeout to prevent infinite loading
        const timeout = setTimeout(() => {
            console.error('Authentication check timed out');
            this.redirectToLogin();
        }, 5000); // 5 second timeout
        
        try {
        // Check authentication first
            console.log('Starting authentication check...');
            const isAuthenticated = await this.checkAuth();
            clearTimeout(timeout);
            console.log('Authentication check result:', isAuthenticated);
            
            if (!isAuthenticated) {
                console.log('Authentication failed, returning');
            return;
        }
            
            // Hide loading screen and show main content
            console.log('Authentication successful, hiding loading screen...');
            const loadingElement = document.getElementById('auth-loading');
            const mainElement = document.getElementById('main-content');
            
            if (loadingElement) {
                // Use CSS class method for more reliable hiding
                loadingElement.classList.add('hidden');
                loadingElement.style.display = 'none';
                console.log('Loading screen hidden');
            } else {
                console.error('Loading element not found');
            }
            
            if (mainElement) {
                mainElement.style.display = 'block';
                console.log('Main content shown');
            } else {
                console.error('Main content element not found');
        }
        
        this.updateUserInfo();
        await this.loadDashboardStats();
        this.setupEventListeners();
        this.setupLogsSection();
            console.log('Dashboard initialization complete');
        } catch (error) {
            clearTimeout(timeout);
            console.error('Init error:', error);
            this.redirectToLogin();
        }
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

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const hamburgerBtn = document.querySelector('.hamburger-btn');
            
            if (sidebar && window.innerWidth <= 991.98) {
                if (!sidebar.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                    sidebar.classList.remove('show');
                }
            }
        });
    }

    // Authentication Methods
    async checkAuth() {
        try {
            // Verify token is still valid
            await this.verifyToken();
            console.log('Token verification successful');
            return true;
        } catch (error) {
            console.log('Token verification failed, redirecting to login');
            this.redirectToLogin();
            return false;
        }
    }
    
    async verifyToken() {
        try {
            console.log('Verifying token...', this.authToken ? 'Token exists' : 'No token');
            
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            console.log('Verify response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Verify response data:', data);
            
            if (!data.success) {
                throw new Error('Token verification failed');
            }
            
            return data;
        } catch (error) {
            console.error('Token verification error:', error);
            this.redirectToLogin();
            throw error;
        }
    }
    
    redirectToLogin() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
    
    updateUserInfo() {
        const userNameEl = document.getElementById('user-name');
        const userRoleEl = document.getElementById('user-role');
        
        if (userNameEl) {
            userNameEl.textContent = this.user.name || this.user.username || 'Admin';
        }
        
        if (userRoleEl) {
            userRoleEl.textContent = this.user.role || 'Administrator';
        }
    }
    
    async logout() {
        try {
            // Call logout API
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Clear local storage and redirect
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        }
    }

    // Utility Methods
    showLoading() {
        document.getElementById('loading').style.display = 'block';
    }

        setupLogsSection() {
            // Logs section is already in HTML, no need to add navigation
            // The showSection function will handle logs loading
        }

        async loadLogs(page = 1, limit = 50) {
            this.showLogsLoading();
            this.hideLogsError();
            try {
                const response = await fetch(`/api/logs?page=${page}&limit=${limit}`, {
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
                
                if (response.status === 401) {
                    this.redirectToLogin();
                    return;
                }
                
                const data = await response.json();
                if (data.success) {
                    this.renderLogs(data.data);
                    this.renderLogsPagination(data.pagination);
                } else {
                    this.showLogsError(data.error || 'Failed to load logs');
                }
            } catch (error) {
                console.error('Error loading logs:', error);
                this.showLogsError('Failed to load logs: ' + error.message);
            }
            this.hideLogsLoading();
        }

        renderLogs(logs) {
            const tbody = document.getElementById('logs-table-body');
            if (!logs || logs.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-muted py-4">
                            <i class="fas fa-file-alt fa-2x mb-2"></i>
                            <br>No logs available
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = logs.map(log => `
                <tr>
                    <td>
                        <small class="text-muted">${new Date(log.timestamp).toLocaleString()}</small>
                    </td>
                    <td>
                        <span class="badge bg-${this.getLogLevelColor(log.level)}">
                            ${log.level.toUpperCase()}
                        </span>
                    </td>
                    <td>
                        <div class="log-message" style="max-width: 400px; word-wrap: break-word;">
                            ${this.escapeHtml(log.message)}
                        </div>
                    </td>
                    <td>
                        <small class="text-muted">${log.source || 'System'}</small>
                    </td>
                </tr>
            `).join('');
        }

        renderLogsPagination(pagination) {
            const container = document.getElementById('logs-pagination');
            if (!container || !pagination || pagination.pages <= 1) {
                if (container) container.innerHTML = '';
                return;
            }
            
            container.innerHTML = '';
            
            // Previous button
            if (pagination.page > 1) {
                const prevBtn = document.createElement('button');
                prevBtn.className = 'btn btn-sm btn-outline-primary me-1';
                prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
                prevBtn.onclick = () => this.loadLogs(pagination.page - 1, pagination.limit);
                container.appendChild(prevBtn);
            }
            
            // Page numbers
            for (let i = 1; i <= pagination.pages; i++) {
                const btn = document.createElement('button');
                btn.className = `btn btn-sm ${i === pagination.page ? 'btn-primary' : 'btn-outline-primary'} mx-1`;
                btn.textContent = i;
                btn.onclick = () => this.loadLogs(i, pagination.limit);
                container.appendChild(btn);
            }
            
            // Next button
            if (pagination.page < pagination.pages) {
                const nextBtn = document.createElement('button');
                nextBtn.className = 'btn btn-sm btn-outline-primary ms-1';
                nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
                nextBtn.onclick = () => this.loadLogs(pagination.page + 1, pagination.limit);
                container.appendChild(nextBtn);
            }
        }

        // Logs helper methods
        showLogsLoading() {
            document.getElementById('logs-loading').style.display = 'block';
            document.getElementById('logs-content').style.display = 'none';
        }

        hideLogsLoading() {
            document.getElementById('logs-loading').style.display = 'none';
            document.getElementById('logs-content').style.display = 'block';
        }

        showLogsError(message) {
            document.getElementById('logs-error-message').textContent = message;
            document.getElementById('logs-error').style.display = 'block';
        }

        hideLogsError() {
            document.getElementById('logs-error').style.display = 'none';
        }

        getLogLevelColor(level) {
            const colors = {
                'error': 'danger',
                'warn': 'warning',
                'info': 'info',
                'debug': 'secondary',
                'verbose': 'light'
            };
            return colors[level.toLowerCase()] || 'secondary';
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Logs action methods
        async refreshLogs() {
            await this.loadLogs();
        }

        async clearLogs() {
            if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
                try {
                    this.showLogsLoading();
                    const response = await fetch('/api/logs', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.authToken}`
                        }
                    });
                    
                    if (response.status === 401) {
                        this.redirectToLogin();
                        return;
                    }
                    
                    const data = await response.json();
                    if (data.success) {
                        this.showAlert('Logs cleared successfully', 'success');
                        await this.loadLogs();
                    } else {
                        this.showLogsError(data.error || 'Failed to clear logs');
                    }
                } catch (error) {
                    console.error('Error clearing logs:', error);
                    this.showLogsError('Failed to clear logs: ' + error.message);
                }
                this.hideLogsLoading();
            }
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
                    'Authorization': `Bearer ${this.authToken}`,
                    ...options.headers
                },
                ...options
            });
            
            // Handle authentication errors
            if (response.status === 401) {
                this.redirectToLogin();
                return;
            }
            
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
                <div class="stats-card success">
                <div class="stats-icon success">
                    <i class="fas fa-users"></i>
                        </div>
                <h3 class="stats-value">${stats.users.total || 0}</h3>
                <p class="stats-label">Total Users</p>
                <div class="stats-change ${stats.users.recent > 0 ? 'positive' : 'neutral'}">
                    <i class="fas fa-${stats.users.recent > 0 ? 'arrow-up' : 'minus'} me-1"></i>
                    ${stats.users.recent > 0 ? `${stats.users.recent} new this week` : 'No new users this week'}
                        </div>
                    </div>
                <div class="stats-card info">
                <div class="stats-icon info">
                    <i class="fas fa-box"></i>
                        </div>
                <h3 class="stats-value">${stats.products.total || 0}</h3>
                <p class="stats-label">Products</p>
                <div class="stats-change ${stats.products.active > 0 ? 'positive' : 'neutral'}">
                    <i class="fas fa-${stats.products.active > 0 ? 'check-circle' : 'exclamation-circle'} me-1"></i>
                    ${stats.products.active > 0 ? `${stats.products.active} active` : 'No active products'}
                        </div>
                    </div>
                <div class="stats-card warning">
                <div class="stats-icon warning">
                    <i class="fas fa-file-invoice-dollar"></i>
                        </div>
                <h3 class="stats-value">${stats.quotes.total || 0}</h3>
                <p class="stats-label">Total Quotes</p>
                <div class="stats-change ${stats.quotes.pending > 0 ? 'negative' : 'neutral'}">
                    <i class="fas fa-${stats.quotes.pending > 0 ? 'clock' : 'check-circle'} me-1"></i>
                    ${stats.quotes.pending > 0 ? `${stats.quotes.pending} pending` : 'No pending quotes'}
                        </div>
                    </div>
                <div class="stats-card">
                <div class="stats-icon primary">
                    <i class="fas fa-comments"></i>
                        </div>
                <h3 class="stats-value">${stats.conversations.active || 0}</h3>
                <p class="stats-label">Active Chats</p>
                <div class="stats-change ${stats.conversations.completed > 0 ? 'positive' : 'neutral'}">
                    <i class="fas fa-${stats.conversations.completed > 0 ? 'check-circle' : 'info-circle'} me-1"></i>
                    ${stats.conversations.completed > 0 ? `${stats.conversations.completed} completed` : 'No completed chats'}
                </div>
            </div>
        `;
    }

    // Section Management
    showSection(sectionName) {
        // Update page title
        const pageTitle = document.getElementById('page-title');
        const sectionTitles = {
            'dashboard': '<i class="fas fa-tachometer-alt"></i> Dashboard Overview',
            'users': '<i class="fas fa-users"></i> Users Management',
            'categories': '<i class="fas fa-folder"></i> Product Categories',
            'products': '<i class="fas fa-box"></i> Products Management',
            'materials': '<i class="fas fa-layer-group"></i> Materials Management',
            'finishes': '<i class="fas fa-paint-brush"></i> Product Finishes',
            'quotes': '<i class="fas fa-file-invoice-dollar"></i> Quotes Management',
            'conversations': '<i class="fas fa-comments"></i> Active Conversations',
            'logs': '<i class="fas fa-file-alt"></i> System Logs'
        };
        
        if (pageTitle && sectionTitles[sectionName]) {
            pageTitle.innerHTML = sectionTitles[sectionName];
        }
        
        // Hide all sections with fade out
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
            section.classList.remove('fade-in');
        });
        
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected section with fade in
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            setTimeout(() => {
                targetSection.classList.add('fade-in');
            }, 50);
        }
        
        // Add active class to clicked nav link
        if (event && event.target) {
            event.target.classList.add('active');
        }
        
        this.currentSection = sectionName;
        
        // Close sidebar on mobile after navigation
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth <= 991.98) {
            sidebar.classList.remove('show');
        }
        
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
            case 'finishes':
                await this.loadFinishes();
                break;
            case 'quotes':
                await this.loadQuotes();
                break;
            case 'conversations':
                await this.loadConversations();
                break;
            case 'logs':
                await this.loadLogs();
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
        
        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fas fa-users fa-3x mb-3"></i>
                            <h5>No Users Found</h5>
                            <p class="mb-0">No users have been registered yet.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = users.map(user => {
            // Validate user ID
            const userId = user._id || user.id;
            if (!userId) {
                console.error('User missing ID:', user);
                return `
                    <tr>
                        <td colspan="7" class="text-center text-danger">
                            <i class="fas fa-exclamation-triangle"></i> Invalid user data
                        </td>
                    </tr>
                `;
            }
            
            return `
                <tr>
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.phone || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                    <td><span class="badge bg-primary">${user.totalQuotes || 0}</span></td>
                <td>
                    <span class="badge bg-${user.isActive ? 'success' : 'danger'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${this.formatDate(user.createdAt)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-info" onclick="app.viewUser('${userId}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-primary" onclick="app.editUser('${userId}')" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                            <button class="btn btn-outline-danger" onclick="app.deleteUser('${userId}')" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
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
        if (!categories || categories.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fas fa-folder fa-3x mb-3"></i>
                            <h5>No Categories Found</h5>
                            <p class="mb-0">No product categories have been created yet.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        tbody.innerHTML = categories.map(category => `
            <tr>
                <td>${category.name}</td>
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
            // Filter only active categories
            const activeCategories = response.data.filter(cat => cat.isActive === true);
            select.innerHTML = '<option value="">All Categories</option>' +
                activeCategories.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');
        } catch (error) {
            console.error('Error loading categories for filter:', error);
        }
    }

    renderProducts(products) {
        const tbody = document.getElementById('products-table-body');
        
        if (!products || products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fas fa-box fa-3x mb-3"></i>
                            <h5>No Products Found</h5>
                            <p class="mb-0">No products have been added yet.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.categoryId?.name || 'N/A'}</td>
                <td>
                    <small>
                        ${product.dimensionFields && product.dimensionFields.length > 0 
                            ? product.dimensionFields.map(d => d.name).join(', ')
                            : 'No dimensions defined'
                        }
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
        if (!materials || materials.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fas fa-layer-group fa-3x mb-3"></i>
                            <h5>No Materials Found</h5>
                            <p class="mb-0">No materials have been added yet.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        tbody.innerHTML = materials.map(material => `
            <tr>
                <td>${material.name}</td>
                <td>${material.categoryId?.name || 'N/A'}</td>
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
        if (!finishes || finishes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fas fa-paint-brush fa-3x mb-3"></i>
                            <h5>No Finishes Found</h5>
                            <p class="mb-0">No product finishes have been added yet.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        tbody.innerHTML = finishes.map(finish => `
            <tr>
                <td>${finish.name}</td>
                <td>${finish.attribute}</td>
                <td>${finish.productCategoryId?.name || 'N/A'}</td>
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
        
        if (!quotes || quotes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fas fa-file-invoice-dollar fa-3x mb-3"></i>
                            <h5>No Quotes Found</h5>
                            <p class="mb-0">No quotes have been generated yet.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = quotes.map(quote => `
            <tr>
                <td>${quote.quoteNumber || 'N/A'}</td>
                <td>${quote.userId?.name || 'N/A'}</td>
                <td>${quote.productId?.name || 'N/A'}</td>
                <td>${this.formatCurrency(quote.pricing?.totalPrice || 0)}</td>
                <td>
                    <span class="badge bg-${this.getStatusColor(quote.status)}">
                        ${quote.status || 'Unknown'}
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

    // Modal Methods
    showAddUserModal() {
        const modalHtml = `
            <div class="modal fade" id="addUserModal" tabindex="-1" aria-labelledby="addUserModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="addUserModalLabel">
                                <i class="fas fa-user-plus me-2"></i>Add New User
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addUserForm">
                                <div class="mb-3">
                                    <label for="userName" class="form-label">Full Name *</label>
                                    <input type="text" class="form-control" id="userName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="userPhone" class="form-label">Phone Number *</label>
                                    <input type="tel" class="form-control" id="userPhone" required>
                                </div>
                                <div class="mb-3">
                                    <label for="userEmail" class="form-label">Email Address</label>
                                    <input type="email" class="form-control" id="userEmail">
                                    <div class="form-text">Email is optional</div>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="userActive" checked>
                                        <label class="form-check-label" for="userActive">
                                            Active User
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="app.saveUser()">
                                <i class="fas fa-save me-1"></i>Save User
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalHtml, 'addUserModal');
    }

    showAddCategoryModal() {
        console.log('showAddCategoryModal called');
        const modalHtml = `
            <div class="modal fade" id="addCategoryModal" tabindex="-1" aria-labelledby="addCategoryModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="addCategoryModalLabel">
                                <i class="fas fa-folder-plus me-2"></i>Add New Category
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addCategoryForm">
                                <div class="mb-3">
                                    <label for="categoryName" class="form-label">Category Name *</label>
                                    <input type="text" class="form-control" id="categoryName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="categoryDescription" class="form-label">Description</label>
                                    <textarea class="form-control" id="categoryDescription" rows="3"></textarea>
                                </div>
                                <div class="mb-3">
                                    <label for="categorySortOrder" class="form-label">Sort Order</label>
                                    <input type="number" class="form-control" id="categorySortOrder" value="0">
                                </div>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="categoryActive" checked>
                                        <label class="form-check-label" for="categoryActive">
                                            Active Category
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="app.saveCategory()">
                                <i class="fas fa-save me-1"></i>Save Category
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('About to call showModal for addCategoryModal');
        this.showModal(modalHtml, 'addCategoryModal');
        console.log('showModal call completed');
    }

    showAddProductModal() {
        const modalHtml = `
            <div class="modal fade" id="addProductModal" tabindex="-1" aria-labelledby="addProductModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="addProductModalLabel">
                                <i class="fas fa-box-plus me-2"></i>Add New Product
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addProductForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="productName" class="form-label">Product Name *</label>
                                            <input type="text" class="form-control" id="productName" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="productCategory" class="form-label">Category *</label>
                                            <select class="form-control" id="productCategory" required>
                                                <option value="">Select Category</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="productDescription" class="form-label">Description</label>
                                    <textarea class="form-control" id="productDescription" rows="3"></textarea>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="productBasePrice" class="form-label">Base Price *</label>
                                            <input type="number" class="form-control" id="productBasePrice" step="0.01" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="productSortOrder" class="form-label">Sort Order</label>
                                            <input type="number" class="form-control" id="productSortOrder" value="0">
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="productActive" checked>
                                        <label class="form-check-label" for="productActive">
                                            Active Product
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="app.saveProduct()">
                                <i class="fas fa-save me-1"></i>Save Product
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalHtml, 'addProductModal');
        this.loadCategoriesForProductModal();
    }

    // Helper method to show modals
    showModal(modalHtml, modalId) {
        console.log('showModal called with modalId:', modalId);
        
        // Remove existing modal if it exists
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to container
        const modalContainer = document.getElementById('modals-container');
        if (!modalContainer) {
            console.error('modals-container not found!');
            return;
        }
        modalContainer.innerHTML = modalHtml;
        
        // Show modal
        const modalElement = document.getElementById(modalId);
        if (!modalElement) {
            console.error('Modal element not found after creation!');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        console.log('Modal shown successfully');
    }

    // Load categories for product modal
    async loadCategoriesForProductModal() {
        try {
            const response = await this.apiCall('/categories');
            const select = document.getElementById('productCategory');
            select.innerHTML = '<option value="">Select Category</option>' +
                response.data.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');
        } catch (error) {
            console.error('Error loading categories for product modal:', error);
        }
    }

    // Save methods
    async saveUser() {
        try {
            const userData = {
                name: document.getElementById('userName').value,
                phone: document.getElementById('userPhone').value,
                email: document.getElementById('userEmail').value,
                isActive: document.getElementById('userActive').checked
            };
            
            
            await this.apiCall('/users', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            
            this.showAlert('User added successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
            this.loadUsers();
        } catch (error) {
            this.showAlert('Failed to add user: ' + error.message, 'danger');
        }
    }

    async saveCategory() {
        try {
            const categoryData = {
                name: document.getElementById('categoryName').value,
                description: document.getElementById('categoryDescription').value,
                sortOrder: parseInt(document.getElementById('categorySortOrder').value) || 0,
                isActive: document.getElementById('categoryActive').checked
            };
            
            await this.apiCall('/categories', {
                method: 'POST',
                body: JSON.stringify(categoryData)
            });
            
            this.showAlert('Category added successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addCategoryModal')).hide();
            this.loadCategories();
        } catch (error) {
            this.showAlert('Failed to add category: ' + error.message, 'danger');
        }
    }

    async saveProduct() {
        try {
            const productData = {
                name: document.getElementById('productName').value,
                categoryId: document.getElementById('productCategory').value,
                description: document.getElementById('productDescription').value,
                basePrice: parseFloat(document.getElementById('productBasePrice').value),
                sortOrder: parseInt(document.getElementById('productSortOrder').value) || 0,
                isActive: document.getElementById('productActive').checked,
                dimensionFields: [] // Will be implemented later
            };
            
            await this.apiCall('/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
            
            this.showAlert('Product added successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
            this.loadProducts();
        } catch (error) {
            this.showAlert('Failed to add product: ' + error.message, 'danger');
        }
    }

    showAddMaterialModal() {
        const modalHtml = `
            <div class="modal fade" id="addMaterialModal" tabindex="-1" aria-labelledby="addMaterialModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="addMaterialModalLabel">
                                <i class="fas fa-layer-group-plus me-2"></i>Add New Material
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addMaterialForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="materialName" class="form-label">Material Name *</label>
                                            <input type="text" class="form-control" id="materialName" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="materialCategory" class="form-label">Category *</label>
                                            <select class="form-control" id="materialCategory" required>
                                                <option value="">Select Category</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label for="materialPricePerUnit" class="form-label">Price per Unit *</label>
                                            <input type="number" class="form-control" id="materialPricePerUnit" step="0.01" required>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label for="materialUnit" class="form-label">Unit *</label>
                                            <select class="form-control" id="materialUnit" required>
                                                <option value="">Select Unit</option>
                                                <option value="sqft">Square Feet (sqft)</option>
                                                <option value="sqm">Square Meters (sqm)</option>
                                                <option value="piece">Piece</option>
                                                <option value="kg">Kilogram (kg)</option>
                                                <option value="lb">Pound (lb)</option>
                                                <option value="meter">Meter</option>
                                                <option value="foot">Foot</option>
                                                <option value="inch">Inch</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label for="materialThickness" class="form-label">Thickness</label>
                                            <input type="text" class="form-control" id="materialThickness" placeholder="e.g., 1/4 inch, 6mm">
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="materialActive" checked>
                                        <label class="form-check-label" for="materialActive">
                                            Active Material
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="app.saveMaterial()">
                                <i class="fas fa-save me-1"></i>Save Material
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalHtml, 'addMaterialModal');
        this.loadCategoriesForMaterialModal();
    }

    // Load categories for material modal
    async loadCategoriesForMaterialModal() {
        try {
            const response = await this.apiCall('/categories');
            const select = document.getElementById('materialCategory');
            select.innerHTML = '<option value="">Select Category</option>' +
                response.data.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');
        } catch (error) {
            console.error('Error loading categories for material modal:', error);
        }
    }

    // Save material
    async saveMaterial() {
        try {
            const materialData = {
                name: document.getElementById('materialName').value,
                categoryId: document.getElementById('materialCategory').value,
                pricePerUnit: parseFloat(document.getElementById('materialPricePerUnit').value),
                unit: document.getElementById('materialUnit').value,
                thickness: document.getElementById('materialThickness').value || null,
                isActive: document.getElementById('materialActive').checked
            };
            
            await this.apiCall('/materials', {
                method: 'POST',
                body: JSON.stringify(materialData)
            });
            
            this.showAlert('Material added successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addMaterialModal')).hide();
            this.loadMaterials();
        } catch (error) {
            this.showAlert('Failed to add material: ' + error.message, 'danger');
        }
    }



    showAddFinishModal() {
        const modalHtml = `
            <div class="modal fade" id="addFinishModal" tabindex="-1" aria-labelledby="addFinishModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="addFinishModalLabel">
                                <i class="fas fa-paint-brush-plus me-2"></i>Add New Finish
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addFinishForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="finishName" class="form-label">Finish Name *</label>
                                            <input type="text" class="form-control" id="finishName" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="finishProductCategory" class="form-label">Product Category *</label>
                                            <select class="form-control" id="finishProductCategory" required>
                                                <option value="">Select Product Category</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <div class="form-check mt-4">
                                                <input class="form-check-input" type="checkbox" id="finishActive" checked>
                                                <label class="form-check-label" for="finishActive">
                                                    Active Finish
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="app.saveFinish()">
                                <i class="fas fa-save me-1"></i>Save Finish
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalHtml, 'addFinishModal');
        this.loadCategoriesForFinishModal();
    }

    // Load categories for finish modal
    async loadCategoriesForFinishModal() {
        try {
            // Load product categories
            const productCategoriesResponse = await this.apiCall('/categories');
            const productCategorySelect = document.getElementById('finishProductCategory');
            productCategorySelect.innerHTML = '<option value="">Select Product Category</option>' +
                productCategoriesResponse.data.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');
        } catch (error) {
            console.error('Error loading categories for finish modal:', error);
        }
    }

    // Save finish
    async saveFinish() {
        try {
            const finishData = {
                name: document.getElementById('finishName').value,
                productCategoryId: document.getElementById('finishProductCategory').value,
                isActive: document.getElementById('finishActive').checked
            };
            
            await this.apiCall('/finishes', {
                method: 'POST',
                body: JSON.stringify(finishData)
            });
            
            this.showAlert('Finish added successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addFinishModal')).hide();
            this.loadFinishes();
        } catch (error) {
            this.showAlert('Failed to add finish: ' + error.message, 'danger');
        }
    }

    // Edit methods (placeholders)
    async editUser(id) {
        try {
            // Fetch user data
            const response = await this.apiCall(`/users/${id}`);
            const user = response.data;
            
            const modalHtml = `
                <div class="modal fade" id="editUserModal" tabindex="-1" aria-labelledby="editUserModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="editUserModalLabel">
                                    <i class="fas fa-user-edit me-2"></i>Edit User
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editUserForm">
                                    <input type="hidden" id="editUserId" value="${user._id}">
                                    <div class="mb-3">
                                        <label for="editUserName" class="form-label">Full Name *</label>
                                        <input type="text" class="form-control" id="editUserName" value="${user.name}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="editUserPhone" class="form-label">Phone Number *</label>
                                        <input type="tel" class="form-control" id="editUserPhone" value="${user.phone}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="editUserEmail" class="form-label">Email Address</label>
                                        <input type="email" class="form-control" id="editUserEmail" value="${user.email || ''}">
                                    </div>
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="editUserActive" ${user.isActive ? 'checked' : ''}>
                                            <label class="form-check-label" for="editUserActive">
                                                Active User
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="app.updateUser()">
                                    <i class="fas fa-save me-1"></i>Update User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            this.showModal(modalHtml, 'editUserModal');
        } catch (error) {
            this.showAlert('Failed to load user data: ' + error.message, 'danger');
        }
    }

    // Update user
    async updateUser() {
        try {
            const userId = document.getElementById('editUserId').value;
            const userData = {
                name: document.getElementById('editUserName').value,
                phone: document.getElementById('editUserPhone').value,
                email: document.getElementById('editUserEmail').value,
                isActive: document.getElementById('editUserActive').checked
            };
            
            await this.apiCall(`/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
            
            this.showAlert('User updated successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            this.loadUsers();
        } catch (error) {
            this.showAlert('Failed to update user: ' + error.message, 'danger');
        }
    }

    async editCategory(id) {
        try {
            // Fetch category data
            const response = await this.apiCall(`/categories/${id}`);
            const category = response.data;
            
            const modalHtml = `
                <div class="modal fade" id="editCategoryModal" tabindex="-1" aria-labelledby="editCategoryModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="editCategoryModalLabel">
                                    <i class="fas fa-folder-edit me-2"></i>Edit Category
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editCategoryForm">
                                    <input type="hidden" id="editCategoryId" value="${category._id}">
                                    <div class="mb-3">
                                        <label for="editCategoryName" class="form-label">Category Name *</label>
                                        <input type="text" class="form-control" id="editCategoryName" value="${category.name}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="editCategoryDescription" class="form-label">Description</label>
                                        <textarea class="form-control" id="editCategoryDescription" rows="3">${category.description || ''}</textarea>
                                    </div>
                                    <div class="mb-3">
                                        <label for="editCategorySortOrder" class="form-label">Sort Order</label>
                                        <input type="number" class="form-control" id="editCategorySortOrder" value="${category.sortOrder || 0}">
                                    </div>
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="editCategoryActive" ${category.isActive ? 'checked' : ''}>
                                            <label class="form-check-label" for="editCategoryActive">
                                                Active Category
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="app.updateCategory()">
                                    <i class="fas fa-save me-1"></i>Update Category
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            this.showModal(modalHtml, 'editCategoryModal');
        } catch (error) {
            this.showAlert('Failed to load category data: ' + error.message, 'danger');
        }
    }

    // Update category
    async updateCategory() {
        try {
            const categoryId = document.getElementById('editCategoryId').value;
            const categoryData = {
                name: document.getElementById('editCategoryName').value,
                description: document.getElementById('editCategoryDescription').value,
                sortOrder: parseInt(document.getElementById('editCategorySortOrder').value) || 0,
                isActive: document.getElementById('editCategoryActive').checked
            };
            
            await this.apiCall(`/categories/${categoryId}`, {
                method: 'PUT',
                body: JSON.stringify(categoryData)
            });
            
            this.showAlert('Category updated successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editCategoryModal')).hide();
            this.loadCategories();
        } catch (error) {
            this.showAlert('Failed to update category: ' + error.message, 'danger');
        }
    }

    async editProduct(id) {
        try {
            // Fetch product data
            const response = await this.apiCall(`/products/${id}`);
            const product = response.data;
            
            const modalHtml = `
                <div class="modal fade" id="editProductModal" tabindex="-1" aria-labelledby="editProductModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="editProductModalLabel">
                                    <i class="fas fa-box-edit me-2"></i>Edit Product
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editProductForm">
                                    <input type="hidden" id="editProductId" value="${product._id}">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editProductName" class="form-label">Product Name *</label>
                                                <input type="text" class="form-control" id="editProductName" value="${product.name}" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editProductCategory" class="form-label">Category *</label>
                                                <select class="form-control" id="editProductCategory" required>
                                                    <option value="">Select Category</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="editProductDescription" class="form-label">Description</label>
                                        <textarea class="form-control" id="editProductDescription" rows="3">${product.description || ''}</textarea>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editProductBasePrice" class="form-label">Base Price *</label>
                                                <input type="number" class="form-control" id="editProductBasePrice" value="${product.basePrice || ''}" step="0.01" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editProductSortOrder" class="form-label">Sort Order</label>
                                                <input type="number" class="form-control" id="editProductSortOrder" value="${product.sortOrder || 0}">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="editProductActive" ${product.isActive ? 'checked' : ''}>
                                            <label class="form-check-label" for="editProductActive">
                                                Active Product
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="app.updateProduct()">
                                    <i class="fas fa-save me-1"></i>Update Product
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            this.showModal(modalHtml, 'editProductModal');
            this.loadCategoriesForEditProductModal();
        } catch (error) {
            this.showAlert('Failed to load product data: ' + error.message, 'danger');
        }
    }

    // Load categories for edit product modal
    async loadCategoriesForEditProductModal() {
        try {
            const response = await this.apiCall('/categories');
            const select = document.getElementById('editProductCategory');
            select.innerHTML = '<option value="">Select Category</option>' +
                response.data.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');
            
            // Set the current category as selected
            const currentCategoryId = document.getElementById('editProductId').value;
            // We need to get the product data again to set the selected category
            const productResponse = await this.apiCall(`/products/${currentCategoryId}`);
            const product = productResponse.data;
            if (product.categoryId) {
                select.value = product.categoryId._id || product.categoryId;
            }
        } catch (error) {
            console.error('Error loading categories for edit product modal:', error);
        }
    }

    // Update product
    async updateProduct() {
        try {
            const productId = document.getElementById('editProductId').value;
            const productData = {
                name: document.getElementById('editProductName').value,
                categoryId: document.getElementById('editProductCategory').value,
                description: document.getElementById('editProductDescription').value,
                basePrice: parseFloat(document.getElementById('editProductBasePrice').value),
                sortOrder: parseInt(document.getElementById('editProductSortOrder').value) || 0,
                isActive: document.getElementById('editProductActive').checked
            };
            
            await this.apiCall(`/products/${productId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
            
            this.showAlert('Product updated successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();
            this.loadProducts();
        } catch (error) {
            this.showAlert('Failed to update product: ' + error.message, 'danger');
        }
    }

    async editMaterial(id) {
        try {
            // Fetch material data
            const response = await this.apiCall(`/materials/${id}`);
            const material = response.data;
            
            const modalHtml = `
                <div class="modal fade" id="editMaterialModal" tabindex="-1" aria-labelledby="editMaterialModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="editMaterialModalLabel">
                                    <i class="fas fa-layer-group-edit me-2"></i>Edit Material
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editMaterialForm">
                                    <input type="hidden" id="editMaterialId" value="${material._id}">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editMaterialName" class="form-label">Material Name *</label>
                                                <input type="text" class="form-control" id="editMaterialName" value="${material.name}" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editMaterialCategory" class="form-label">Category *</label>
                                                <select class="form-control" id="editMaterialCategory" required>
                                                    <option value="">Select Category</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label for="editMaterialPricePerUnit" class="form-label">Price per Unit *</label>
                                                <input type="number" class="form-control" id="editMaterialPricePerUnit" value="${material.pricePerUnit || ''}" step="0.01" required>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label for="editMaterialUnit" class="form-label">Unit *</label>
                                                <select class="form-control" id="editMaterialUnit" required>
                                                    <option value="">Select Unit</option>
                                                    <option value="sqft">Square Feet (sqft)</option>
                                                    <option value="sqm">Square Meters (sqm)</option>
                                                    <option value="piece">Piece</option>
                                                    <option value="kg">Kilogram (kg)</option>
                                                    <option value="lb">Pound (lb)</option>
                                                    <option value="meter">Meter</option>
                                                    <option value="foot">Foot</option>
                                                    <option value="inch">Inch</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label for="editMaterialThickness" class="form-label">Thickness</label>
                                                <input type="text" class="form-control" id="editMaterialThickness" value="${material.thickness || ''}" placeholder="e.g., 1/4 inch, 6mm">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="editMaterialActive" ${material.isActive ? 'checked' : ''}>
                                            <label class="form-check-label" for="editMaterialActive">
                                                Active Material
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="app.updateMaterial()">
                                    <i class="fas fa-save me-1"></i>Update Material
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            this.showModal(modalHtml, 'editMaterialModal');
            this.loadCategoriesForEditMaterialModal();
        } catch (error) {
            this.showAlert('Failed to load material data: ' + error.message, 'danger');
        }
    }

    // Load categories for edit material modal
    async loadCategoriesForEditMaterialModal() {
        try {
            const response = await this.apiCall('/categories');
            const select = document.getElementById('editMaterialCategory');
            select.innerHTML = '<option value="">Select Category</option>' +
                response.data.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');
            
            // Set the current category as selected
            const currentMaterialId = document.getElementById('editMaterialId').value;
            const materialResponse = await this.apiCall(`/materials/${currentMaterialId}`);
            const material = materialResponse.data;
            if (material.categoryId) {
                select.value = material.categoryId._id || material.categoryId;
            }
            
            // Set the current unit as selected
            const unitSelect = document.getElementById('editMaterialUnit');
            if (material.unit) {
                unitSelect.value = material.unit;
            }
        } catch (error) {
            console.error('Error loading categories for edit material modal:', error);
        }
    }

    // Update material
    async updateMaterial() {
        try {
            const materialId = document.getElementById('editMaterialId').value;
            const materialData = {
                name: document.getElementById('editMaterialName').value,
                categoryId: document.getElementById('editMaterialCategory').value,
                pricePerUnit: parseFloat(document.getElementById('editMaterialPricePerUnit').value),
                unit: document.getElementById('editMaterialUnit').value,
                thickness: document.getElementById('editMaterialThickness').value || null,
                isActive: document.getElementById('editMaterialActive').checked
            };
            
            await this.apiCall(`/materials/${materialId}`, {
                method: 'PUT',
                body: JSON.stringify(materialData)
            });
            
            this.showAlert('Material updated successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editMaterialModal')).hide();
            this.loadMaterials();
        } catch (error) {
            this.showAlert('Failed to update material: ' + error.message, 'danger');
        }
    }



    async editFinish(id) {
        try {
            // Fetch finish data
            const response = await this.apiCall(`/finishes/${id}`);
            const finish = response.data;
            
            const modalHtml = `
                <div class="modal fade" id="editFinishModal" tabindex="-1" aria-labelledby="editFinishModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="editFinishModalLabel">
                                    <i class="fas fa-paint-brush-edit me-2"></i>Edit Finish
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editFinishForm">
                                    <input type="hidden" id="editFinishId" value="${finish._id}">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editFinishName" class="form-label">Finish Name *</label>
                                                <input type="text" class="form-control" id="editFinishName" value="${finish.name}" required>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editFinishProductCategory" class="form-label">Product Category *</label>
                                                <select class="form-control" id="editFinishProductCategory" required>
                                                    <option value="">Select Product Category</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <div class="form-check mt-4">
                                                    <input class="form-check-input" type="checkbox" id="editFinishActive" ${finish.isActive ? 'checked' : ''}>
                                                    <label class="form-check-label" for="editFinishActive">
                                                        Active Finish
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="app.updateFinish()">
                                    <i class="fas fa-save me-1"></i>Update Finish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            this.showModal(modalHtml, 'editFinishModal');
            this.loadCategoriesForEditFinishModal();
        } catch (error) {
            this.showAlert('Failed to load finish data: ' + error.message, 'danger');
        }
    }

    // Load categories for edit finish modal
    async loadCategoriesForEditFinishModal() {
        try {
            // Load product categories
            const productCategoriesResponse = await this.apiCall('/categories');
            const productCategorySelect = document.getElementById('editFinishProductCategory');
            productCategorySelect.innerHTML = '<option value="">Select Product Category</option>' +
                productCategoriesResponse.data.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');
            
            // Set the current values as selected
            const currentFinishId = document.getElementById('editFinishId').value;
            const finishResponse = await this.apiCall(`/finishes/${currentFinishId}`);
            const finish = finishResponse.data;
            
            if (finish.productCategoryId) {
                productCategorySelect.value = finish.productCategoryId._id || finish.productCategoryId;
            }
        } catch (error) {
            console.error('Error loading categories for edit finish modal:', error);
        }
    }

    // Update finish
    async updateFinish() {
        try {
            const finishId = document.getElementById('editFinishId').value;
            const finishData = {
                name: document.getElementById('editFinishName').value,
                productCategoryId: document.getElementById('editFinishProductCategory').value,
                isActive: document.getElementById('editFinishActive').checked
            };
            
            await this.apiCall(`/finishes/${finishId}`, {
                method: 'PUT',
                body: JSON.stringify(finishData)
            });
            
            this.showAlert('Finish updated successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editFinishModal')).hide();
            this.loadFinishes();
        } catch (error) {
            this.showAlert('Failed to update finish: ' + error.message, 'danger');
        }
    }

    viewQuote(id) {
        this.showAlert(`View Quote ${id} - To be implemented`, 'info');
    }

    // Delete methods
    async deleteUser(id) {
        // Get user name for display in modal
        const userName = document.querySelector(`button[onclick="app.deleteUser('${id}')"]`)?.closest('tr')?.querySelector('td:first-child')?.textContent || 'User';
        
        this.showDeleteModal('user', userName, async () => {
            try {
                await this.apiCall(`/users/${id}`, { method: 'DELETE' });
                this.showAlert('User deleted successfully', 'success');
                this.loadUsers();
            } catch (error) {
                // Error already handled in apiCall
            }
        });
    }

    async deleteCategory(id) {
        // Get category name for display in modal
        const categoryName = document.querySelector(`button[onclick="app.deleteCategory('${id}')"]`)?.closest('tr')?.querySelector('td:first-child')?.textContent || 'Category';
        
        this.showDeleteModal('category', categoryName, async () => {
            try {
                await this.apiCall(`/categories/${id}`, { method: 'DELETE' });
                this.showAlert('Category deleted successfully', 'success');
                this.loadCategories();
            } catch (error) {
                // Error already handled in apiCall
            }
        });
    }

    async deleteProduct(id) {
        // Get product name for display in modal
        const productName = document.querySelector(`button[onclick="app.deleteProduct('${id}')"]`)?.closest('tr')?.querySelector('td:first-child')?.textContent || 'Product';
        
        this.showDeleteModal('product', productName, async () => {
            try {
                await this.apiCall(`/products/${id}`, { method: 'DELETE' });
                this.showAlert('Product deleted successfully', 'success');
                this.loadProducts();
            } catch (error) {
                // Error already handled in apiCall
            }
        });
    }

    async deleteMaterial(id) {
        // Get material name for display in modal
        const materialName = document.querySelector(`button[onclick="app.deleteMaterial('${id}')"]`)?.closest('tr')?.querySelector('td:first-child')?.textContent || 'Material';
        
        this.showDeleteModal('material', materialName, async () => {
            try {
                await this.apiCall(`/materials/${id}`, { method: 'DELETE' });
                this.showAlert('Material deleted successfully', 'success');
                this.loadMaterials();
            } catch (error) {
                // Error already handled in apiCall
            }
        });
    }


    async deleteFinish(id) {
        // Get finish name for display in modal
        const finishName = document.querySelector(`button[onclick="app.deleteFinish('${id}')"]`)?.closest('tr')?.querySelector('td:first-child')?.textContent || 'Finish';
        
        this.showDeleteModal('finish', finishName, async () => {
            try {
                await this.apiCall(`/finishes/${id}`, { method: 'DELETE' });
                this.showAlert('Finish deleted successfully', 'success');
                this.loadFinishes();
            } catch (error) {
                // Error already handled in apiCall
            }
        });
    }

    async deleteQuote(id) {
        // Get quote ID for display in modal
        const quoteId = document.querySelector(`button[onclick="app.deleteQuote('${id}')"]`)?.closest('tr')?.querySelector('td:first-child')?.textContent || `Quote #${id}`;
        
        this.showDeleteModal('quote', quoteId, async () => {
            try {
                await this.apiCall(`/quotes/${id}`, { method: 'DELETE' });
                this.showAlert('Quote deleted successfully', 'success');
                this.loadQuotes();
            } catch (error) {
                // Error already handled in apiCall
            }
        });
    }

    // Toggle sidebar for mobile
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('show');
        }
    }

    // Show delete confirmation modal
    showDeleteModal(itemType, itemName, deleteFunction) {
        const modalHtml = `
            <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-labelledby="deleteConfirmModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title" id="deleteConfirmModalLabel">
                                <i class="fas fa-exclamation-triangle me-2"></i>Confirm Delete
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="text-center">
                                <i class="fas fa-trash-alt fa-3x text-danger mb-3"></i>
                                <h5>Are you sure you want to delete this ${itemType}?</h5>
                                <p class="text-muted mb-0">${itemName}</p>
                                <div class="alert alert-warning mt-3">
                                    <i class="fas fa-exclamation-triangle me-2"></i>
                                    This action cannot be undone.
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times me-1"></i>Cancel
                            </button>
                            <button type="button" class="btn btn-danger" onclick="app.confirmDelete()">
                                <i class="fas fa-trash me-1"></i>Delete ${itemType}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalHtml, 'deleteConfirmModal');
        
        // Store the delete function for later execution
        this.pendingDeleteFunction = deleteFunction;
    }

    // Confirm delete action
    async confirmDelete() {
        if (this.pendingDeleteFunction) {
            await this.pendingDeleteFunction();
            bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
            this.pendingDeleteFunction = null;
        }
    }

    // ERP Sync Methods
    async syncCategoriesWithERP() {
        try {
            await this.erpSync('product-categories', 'Product Categories');
        } catch (error) {
            console.error('ERP sync error:', error);
        }
    }

    async syncProductsWithERP() {
        try {
            await this.erpSync('products', 'Products');
        } catch (error) {
            console.error('ERP sync error:', error);
        }
    }

    async syncMaterialsWithERP() {
        try {
            await this.erpSync('materials', 'Materials');
        } catch (error) {
            console.error('ERP sync error:', error);
        }
    }


    async syncFinishesWithERP() {
        try {
            await this.erpSync('finishes', 'Finishes');
        } catch (error) {
            console.error('ERP sync error:', error);
        }
    }

    async erpSync(endpoint, type) {
        const button = document.querySelector(`button[onclick*="sync${type.replace(' ', '')}WithERP"]`);
        if (button) {
            button.disabled = true;
            const icon = button.querySelector('i');
            const originalClass = icon.className;
            icon.className = 'fas fa-spinner fa-spin';
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        }

        try {
            const response = await fetch(`/api/sync/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.showAlert(`${type} synced successfully with ERP`, 'success');
                // Refresh the current section data
                this.loadSectionData(this.currentSection);
            } else {
                throw new Error(data.error || 'Sync failed');
            }
        } catch (error) {
            this.showAlert(`Failed to sync ${type} with ERP: ${error.message}`, 'danger');
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sync-alt"></i> ERP Sync';
                setTimeout(() => {
                    button.className = 'btn btn-warning me-2';
                }, 2000);
            }
        }
    }

    // View Methods
    async viewUser(id) {
        try {
            // Validate ID
            if (!id || id === 'undefined' || id === 'null') {
                this.showAlert('Invalid user ID', 'danger');
                return;
            }
            
            console.log('Viewing user with ID:', id);
            const response = await this.apiCall(`/users/${id}`);
            const user = response.data;
            
            const modalHtml = `
                <div class="modal fade" id="viewUserModal" tabindex="-1" aria-labelledby="viewUserModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-info text-white">
                                <h5 class="modal-title" id="viewUserModalLabel">
                                    <i class="fas fa-user me-2"></i>User Details
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Full Name:</label>
                                            <p class="form-control-plaintext">${user.name}</p>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Phone Number:</label>
                                            <p class="form-control-plaintext">${user.phone}</p>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Email Address:</label>
                                            <p class="form-control-plaintext">${user.email || 'N/A'}</p>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Status:</label>
                                            <p class="form-control-plaintext">
                                                <span class="badge bg-${user.isActive ? 'success' : 'danger'}">
                                                    ${user.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-12">
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">Created Date:</label>
                                            <p class="form-control-plaintext">${this.formatDate(user.createdAt)}</p>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label fw-bold">User ID:</label>
                                            <p class="form-control-plaintext text-muted small">${user._id}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" onclick="app.editUser('${user._id}')">
                                    <i class="fas fa-edit me-1"></i>Edit User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            this.showModal(modalHtml, 'viewUserModal');
        } catch (error) {
            this.showAlert('Failed to load user details: ' + error.message, 'danger');
        }
    }

    async viewCategories() {
        try {
            const response = await this.apiCall('/categories');
            const categories = response.data;
            this.showViewModal('Categories', categories, [
                { key: 'name', label: 'Name' },
                { key: 'description', label: 'Description' },
                { key: 'isActive', label: 'Active', type: 'boolean' },
                { key: 'createdAt', label: 'Created', type: 'date' }
            ]);
        } catch (error) {
            this.showAlert('Failed to load categories: ' + error.message, 'danger');
        }
    }

    async viewProducts() {
        try {
            const response = await this.apiCall('/products');
            const products = response.data;
            this.showViewModal('Products', products, [
                { key: 'name', label: 'Name' },
                { key: 'category', label: 'Category', type: 'object', objectKey: 'name' },
                { key: 'price', label: 'Price', type: 'currency' },
                { key: 'isActive', label: 'Active', type: 'boolean' },
                { key: 'createdAt', label: 'Created', type: 'date' }
            ]);
        } catch (error) {
            this.showAlert('Failed to load products: ' + error.message, 'danger');
        }
    }

    async viewMaterials() {
        try {
            const response = await this.apiCall('/materials');
            const materials = response.data;
            this.showViewModal('Materials', materials, [
                { key: 'name', label: 'Name' },
                { key: 'category', label: 'Category', type: 'object', objectKey: 'name' },
                { key: 'price', label: 'Price', type: 'currency' },
                { key: 'isActive', label: 'Active', type: 'boolean' },
                { key: 'createdAt', label: 'Created', type: 'date' }
            ]);
        } catch (error) {
            this.showAlert('Failed to load materials: ' + error.message, 'danger');
        }
    }


    async viewFinishes() {
        try {
            const response = await this.apiCall('/finishes');
            const finishes = response.data;
            this.showViewModal('Finishes', finishes, [
                { key: 'name', label: 'Name' },
                { key: 'isActive', label: 'Active', type: 'boolean' },
                { key: 'createdAt', label: 'Created', type: 'date' }
            ]);
        } catch (error) {
            this.showAlert('Failed to load finishes: ' + error.message, 'danger');
        }
    }

    showViewModal(title, data, columns) {
        const modalHtml = `
            <div class="modal fade" id="viewModal" tabindex="-1" aria-labelledby="viewModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title" id="viewModalLabel">
                                <i class="fas fa-eye me-2"></i>View All ${title}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="table-responsive">
                                <table class="table table-striped table-hover">
                                    <thead class="table-dark">
                                        <tr>
                                            ${columns.map(col => `<th>${col.label}</th>`).join('')}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${data.map(item => `
                                            <tr>
                                                ${columns.map(col => `<td>${this.formatViewValue(item[col.key], col)}</td>`).join('')}
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div class="mt-3 text-muted">
                                <small>Total ${title.toLowerCase()}: ${data.length}</small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modalHtml, 'viewModal');
    }

    formatViewValue(value, column) {
        if (value === null || value === undefined) return '-';
        
        switch (column.type) {
            case 'boolean':
                return value ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>';
            case 'currency':
                return `$${parseFloat(value).toFixed(2)}`;
            case 'date':
                return new Date(value).toLocaleDateString();
            case 'object':
                return column.objectKey ? (value[column.objectKey] || '-') : JSON.stringify(value);
            default:
                return value;
        }
    }
}

// Global functions for HTML onclick events
function showSection(sectionName) {
    app.showSection(sectionName);
}

function logout() {
    app.logout();
}

function toggleSidebar() {
    app.toggleSidebar();
}

function confirmDelete() {
    app.confirmDelete();
}


// Initialize the app
const app = new DashboardApp();
