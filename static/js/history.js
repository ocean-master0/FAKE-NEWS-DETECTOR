/**
 * Advanced History Management System for Fake News Detector
 * Manages localStorage-based result history with full CRUD operations
 * 
 * Features:
 * - Complete history management (Create, Read, Update, Delete)
 * - Local storage persistence
 * - Statistics and analytics
 * - Search and filtering
 * - Export functionality
 * - Performance optimization
 * - Error handling
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        STORAGE_KEY: 'fakeNewsHistory',
        MAX_HISTORY_ITEMS: 100,
        DISPLAY_LIMIT: 12,
        LOAD_MORE_INCREMENT: 6,
        SELECTORS: {
            HISTORY_SECTION: '#historySection',
            HISTORY_GRID: '#historyGrid',
            CLEAR_BUTTON: '.clear-history-btn',
            SEARCH_INPUT: '#historySearch',
            FILTER_SELECT: '#historyFilter',
            EXPORT_BUTTON: '#exportHistory'
        },
        CLASSES: {
            FADE_IN: 'fade-in',
            VISIBLE: 'visible',
            LOADING: 'loading'
        }
    };

    /**
     * Advanced History Management Class
     */
    class HistoryManager {
        constructor() {
            this.history = [];
            this.filteredHistory = [];
            this.currentFilter = 'all';
            this.currentSearch = '';
            this.displayOffset = 0;
            this.isInitialized = false;
            
            this.initialize();
        }

        /**
         * Initialize the history manager
         */
        initialize() {
            try {
                this.loadFromStorage();
                this.setupEventListeners();
                this.setupSearch();
                this.setupFilters();
                this.updateDisplay();
                
                this.isInitialized = true;
                console.log('History manager initialized successfully');
                
            } catch (error) {
                console.error('Failed to initialize history manager:', error);
                this.showToast('Failed to initialize history', 'error');
            }
        }

        /**
         * Load history from localStorage
         * @returns {Array} Loaded history array
         */
        loadFromStorage() {
            try {
                const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
                this.history = stored ? JSON.parse(stored) : [];
                
                // Validate and clean history data
                this.history = this.history.filter(item => this.validateHistoryItem(item));
                
                // Sort by timestamp (newest first)
                this.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                this.applyCurrentFilters();
                return this.history;
                
            } catch (error) {
                console.error('Error loading history from storage:', error);
                this.history = [];
                return [];
            }
        }

        /**
         * Validate history item structure
         * @param {Object} item - History item to validate
         * @returns {boolean} True if valid
         */
        validateHistoryItem(item) {
            const requiredFields = ['id', 'result', 'confidence', 'timestamp'];
            return requiredFields.every(field => item && item.hasOwnProperty(field));
        }

        /**
         * Save history to localStorage
         */
        saveToStorage() {
            try {
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.history));
            } catch (error) {
                console.error('Error saving history to storage:', error);
                this.showToast('Failed to save history', 'error');
            }
        }

        /**
         * Add new result to history
         * @param {Object} data - Analysis result data
         */
        addToHistory(data) {
            try {
                const historyItem = {
                    id: this.generateUniqueId(),
                    result: data.result,
                    confidence: data.confidence,
                    headline: data.headline || '',
                    content: data.content || '',
                    timestamp: new Date().toISOString(),
                    dateCreated: new Date().toLocaleDateString(),
                    timeCreated: new Date().toLocaleTimeString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href
                };

                // Add to beginning of array (newest first)
                this.history.unshift(historyItem);

                // Limit history size
                if (this.history.length > CONFIG.MAX_HISTORY_ITEMS) {
                    this.history = this.history.slice(0, CONFIG.MAX_HISTORY_ITEMS);
                }

                this.saveToStorage();
                this.applyCurrentFilters();
                this.updateDisplay();
                
                console.log('Added to history:', historyItem);
                this.showToast('Result saved to history', 'success');
                
            } catch (error) {
                console.error('Error adding to history:', error);
                this.showToast('Failed to save to history', 'error');
            }
        }

        /**
         * Generate unique ID for history items
         * @returns {string} Unique identifier
         */
        generateUniqueId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }

        /**
         * Remove item from history by ID
         * @param {string} id - Item ID to remove
         * @returns {boolean} True if item was removed
         */
        removeFromHistory(id) {
            try {
                const originalLength = this.history.length;
                this.history = this.history.filter(item => item.id !== id);
                
                if (this.history.length < originalLength) {
                    this.saveToStorage();
                    this.applyCurrentFilters();
                    this.updateDisplay();
                    this.showToast('History item deleted', 'info');
                    return true;
                }
                
                return false;
                
            } catch (error) {
                console.error('Error removing from history:', error);
                this.showToast('Failed to delete item', 'error');
                return false;
            }
        }

        /**
         * Update existing history item
         * @param {string} id - Item ID to update
         * @param {Object} updates - Updates to apply
         * @returns {boolean} True if item was updated
         */
        updateHistoryItem(id, updates) {
            try {
                const itemIndex = this.history.findIndex(item => item.id === id);
                
                if (itemIndex === -1) {
                    return false;
                }
                
                this.history[itemIndex] = {
                    ...this.history[itemIndex],
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                
                this.saveToStorage();
                this.applyCurrentFilters();
                this.updateDisplay();
                
                return true;
                
            } catch (error) {
                console.error('Error updating history item:', error);
                return false;
            }
        }

        /**
         * Clear all history with confirmation
         */
        clearAllHistory() {
            if (this.history.length === 0) {
                this.showToast('History is already empty', 'info');
                return;
            }

            // Create custom confirmation dialog for better UX
            this.showConfirmationDialog(
                'Clear History',
                'Are you sure you want to clear all history? This action cannot be undone.',
                () => {
                    try {
                        this.history = [];
                        this.filteredHistory = [];
                        this.saveToStorage();
                        this.updateDisplay();
                        this.showToast('All history cleared', 'success');
                    } catch (error) {
                        console.error('Error clearing history:', error);
                        this.showToast('Failed to clear history', 'error');
                    }
                }
            );
        }

        /**
         * Get history statistics
         * @returns {Object} Statistics object
         */
        getStatistics() {
            const stats = {
                total: this.history.length,
                real: this.history.filter(item => item.result === 'Real').length,
                fake: this.history.filter(item => item.result === 'Fake').length,
                avgConfidence: 0,
                highConfidence: 0,
                lowConfidence: 0,
                recentActivity: this.getRecentActivity()
            };

            if (stats.total > 0) {
                const totalConfidence = this.history.reduce((sum, item) => sum + item.confidence, 0);
                stats.avgConfidence = Math.round(totalConfidence / stats.total);
                
                stats.highConfidence = this.history.filter(item => item.confidence >= 80).length;
                stats.lowConfidence = this.history.filter(item => item.confidence < 60).length;
            }

            return stats;
        }

        /**
         * Get recent activity summary
         * @returns {Object} Recent activity data
         */
        getRecentActivity() {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            return {
                today: this.history.filter(item => new Date(item.timestamp) > oneDayAgo).length,
                thisWeek: this.history.filter(item => new Date(item.timestamp) > oneWeekAgo).length
            };
        }

        /**
         * Search history items
         * @param {string} query - Search query
         */
        searchHistory(query) {
            this.currentSearch = query.toLowerCase();
            this.displayOffset = 0;
            this.applyCurrentFilters();
            this.updateDisplay();
        }

        /**
         * Filter history by result type
         * @param {string} filter - Filter type ('all', 'real', 'fake')
         */
        filterHistory(filter) {
            this.currentFilter = filter;
            this.displayOffset = 0;
            this.applyCurrentFilters();
            this.updateDisplay();
        }

        /**
         * Apply current search and filter settings
         */
        applyCurrentFilters() {
            let filtered = [...this.history];

            // Apply search filter
            if (this.currentSearch) {
                filtered = filtered.filter(item => {
                    const searchableText = [
                        item.headline || '',
                        item.content || '',
                        item.result || ''
                    ].join(' ').toLowerCase();
                    
                    return searchableText.includes(this.currentSearch);
                });
            }

            // Apply result filter
            if (this.currentFilter && this.currentFilter !== 'all') {
                filtered = filtered.filter(item => 
                    item.result.toLowerCase() === this.currentFilter.toLowerCase()
                );
            }

            this.filteredHistory = filtered;
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // Clear history button
            const clearButton = document.querySelector(CONFIG.SELECTORS.CLEAR_BUTTON);
            if (clearButton) {
                clearButton.addEventListener('click', () => this.clearAllHistory());
            }

            // Export button
            const exportButton = document.querySelector(CONFIG.SELECTORS.EXPORT_BUTTON);
            if (exportButton) {
                exportButton.addEventListener('click', () => this.exportHistory());
            }
        }

        /**
         * Setup search functionality
         */
        setupSearch() {
            const searchInput = document.querySelector(CONFIG.SELECTORS.SEARCH_INPUT);
            if (!searchInput) return;

            // Debounced search
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchHistory(e.target.value);
                }, 300);
            });

            // Clear search on escape
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.target.value = '';
                    this.searchHistory('');
                }
            });
        }

        /**
         * Setup filter functionality
         */
        setupFilters() {
            const filterSelect = document.querySelector(CONFIG.SELECTORS.FILTER_SELECT);
            if (!filterSelect) return;

            filterSelect.addEventListener('change', (e) => {
                this.filterHistory(e.target.value);
            });
        }

        /**
         * Update the history display
         */
        updateDisplay() {
            const historySection = document.querySelector(CONFIG.SELECTORS.HISTORY_SECTION);
            const historyGrid = document.querySelector(CONFIG.SELECTORS.HISTORY_GRID);
            const clearButton = document.querySelector(CONFIG.SELECTORS.CLEAR_BUTTON);

            if (!historyGrid) return;

            // Show/hide history section
            if (this.history.length === 0) {
                if (historySection) {
                    historySection.style.display = 'none';
                }
                return;
            }

            if (historySection) {
                historySection.style.display = 'block';
            }

            // Update clear button state
            if (clearButton) {
                clearButton.disabled = this.history.length === 0;
            }

            // Clear existing content
            historyGrid.innerHTML = '';

            // Add statistics header
            this.addStatisticsHeader(historyGrid);

            // Add no results message if needed
            if (this.filteredHistory.length === 0 && (this.currentSearch || this.currentFilter !== 'all')) {
                this.addNoResultsMessage(historyGrid);
                return;
            }

            // Add history items
            const itemsToDisplay = this.filteredHistory.slice(0, CONFIG.DISPLAY_LIMIT + this.displayOffset);
            
            itemsToDisplay.forEach((item, index) => {
                const historyCard = this.createHistoryCard(item, index);
                historyGrid.appendChild(historyCard);

                // Add animation delay
                setTimeout(() => {
                    historyCard.classList.add(CONFIG.CLASSES.FADE_IN);
                }, index * 50);
            });

            // Add "Load More" button if needed
            if (this.filteredHistory.length > itemsToDisplay.length) {
                this.addLoadMoreButton(historyGrid);
            }
        }

        /**
         * Add statistics header to history display
         * @param {Element} container - Container element
         */
        addStatisticsHeader(container) {
            const stats = this.getStatistics();
            const statsDiv = document.createElement('div');
            statsDiv.className = 'history-stats';
            
            statsDiv.innerHTML = `
                <div class="stats-header">
                    <h3><i class="fas fa-chart-bar"></i> Analysis History</h3>
                    <div class="stats-summary">
                        ${this.currentSearch ? `<span class="search-info">Search: "${this.currentSearch}"</span>` : ''}
                        ${this.currentFilter !== 'all' ? `<span class="filter-info">Filter: ${this.currentFilter}</span>` : ''}
                    </div>
                </div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-icon total">
                            <i class="fas fa-list"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${stats.total}</div>
                            <div class="stat-label">Total Analyses</div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon real">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${stats.real}</div>
                            <div class="stat-label">Real News</div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon fake">
                            <i class="fas fa-times-circle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${stats.fake}</div>
                            <div class="stat-label">Fake News</div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon confidence">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${stats.avgConfidence}%</div>
                            <div class="stat-label">Avg Confidence</div>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(statsDiv);
        }

        /**
         * Add no results message
         * @param {Element} container - Container element
         */
        addNoResultsMessage(container) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            
            noResults.innerHTML = `
                <div class="no-results-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>No Results Found</h3>
                <p>Try adjusting your search terms or filters</p>
                <div class="no-results-actions">
                    <button class="btn-secondary" onclick="document.querySelector('#historySearch').value = ''; window.historyManager.searchHistory('')">
                        <i class="fas fa-times"></i> Clear Search
                    </button>
                    <button class="btn-secondary" onclick="document.querySelector('#historyFilter').value = 'all'; window.historyManager.filterHistory('all')">
                        <i class="fas fa-filter"></i> Clear Filters
                    </button>
                </div>
            `;
            
            container.appendChild(noResults);
        }

        /**
         * Create history card element
         * @param {Object} item - History item data
         * @param {number} index - Item index for animation
         * @returns {Element} History card element
         */
        createHistoryCard(item, index) {
            const card = document.createElement('div');
            card.className = 'history-item';
            card.setAttribute('data-id', item.id);
            
            const isReal = item.result === 'Real';
            const date = new Date(item.timestamp).toLocaleDateString();
            const time = new Date(item.timestamp).toLocaleTimeString();
            const confidenceClass = this.getConfidenceClass(item.confidence);
            
            card.innerHTML = `
                <div class="history-header">
                    <div class="history-result ${isReal ? 'real' : 'fake'}">
                        <i class="fas ${isReal ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        <span>${item.result}</span>
                    </div>
                    <div class="history-confidence">
                        <div class="confidence-value ${confidenceClass}">${item.confidence}%</div>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${item.confidence}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="history-content">
                    ${item.headline ? `
                        <div class="history-headline">${this.truncateText(item.headline, 80)}</div>
                    ` : ''}
                    <div class="history-text">${this.truncateText(item.content, 150)}</div>
                </div>
                
                <div class="history-footer">
                    <div class="history-meta">
                        <div class="history-date">
                            <i class="fas fa-calendar"></i>
                            <span>${date}</span>
                        </div>
                        <div class="history-time">
                            <i class="fas fa-clock"></i>
                            <span>${time}</span>
                        </div>
                    </div>
                    <div class="history-actions">
                        <button class="action-btn view-btn" title="View Details" onclick="window.historyManager.viewHistoryItem('${item.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn copy-btn" title="Copy Content" onclick="window.historyManager.copyHistoryItem('${item.id}')">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="action-btn delete-btn" title="Delete Item" onclick="window.historyManager.removeFromHistory('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            return card;
        }

        /**
         * Get confidence class based on percentage
         * @param {number} confidence - Confidence percentage
         * @returns {string} CSS class name
         */
        getConfidenceClass(confidence) {
            if (confidence >= 90) return 'very-high';
            if (confidence >= 75) return 'high';
            if (confidence >= 60) return 'medium';
            return 'low';
        }

        /**
         * Truncate text to specified length
         * @param {string} text - Text to truncate
         * @param {number} maxLength - Maximum length
         * @returns {string} Truncated text
         */
        truncateText(text, maxLength) {
            if (!text || text.length <= maxLength) return text || '';
            return text.substring(0, maxLength - 3) + '...';
        }

        /**
         * Add "Load More" button
         * @param {Element} container - Container element
         */
        addLoadMoreButton(container) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'load-more-btn';
            loadMoreBtn.innerHTML = `
                <i class="fas fa-chevron-down"></i>
                <span>Load More (${this.filteredHistory.length - CONFIG.DISPLAY_LIMIT - this.displayOffset} remaining)</span>
            `;
            
            loadMoreBtn.addEventListener('click', () => {
                this.displayOffset += CONFIG.LOAD_MORE_INCREMENT;
                this.updateDisplay();
            });
            
            container.appendChild(loadMoreBtn);
        }

        /**
         * View history item details in modal
         * @param {string} id - Item ID
         */
        viewHistoryItem(id) {
            const item = this.history.find(h => h.id === id);
            if (!item) return;

            // Create modal content
            const modalContent = `
                <div class="history-detail-modal">
                    <div class="modal-header">
                        <h2><i class="fas fa-file-alt"></i> Analysis Details</h2>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-section">
                            <h3>Result</h3>
                            <div class="result-display ${item.result.toLowerCase()}">
                                <i class="fas ${item.result === 'Real' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                <span>${item.result} News</span>
                                <div class="confidence">${item.confidence}% confidence</div>
                            </div>
                        </div>
                        ${item.headline ? `
                            <div class="detail-section">
                                <h3>Headline</h3>
                                <p class="detail-text">${item.headline}</p>
                            </div>
                        ` : ''}
                        <div class="detail-section">
                            <h3>Content</h3>
                            <p class="detail-text">${item.content}</p>
                        </div>
                        <div class="detail-section">
                            <h3>Analysis Info</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <strong>Date:</strong> ${item.dateCreated}
                                </div>
                                <div class="info-item">
                                    <strong>Time:</strong> ${item.timeCreated}
                                </div>
                                <div class="info-item">
                                    <strong>Content Length:</strong> ${item.content.length} characters
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-primary" onclick="window.historyManager.copyHistoryItem('${id}')">
                            <i class="fas fa-copy"></i> Copy Content
                        </button>
                        <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                            Close
                        </button>
                    </div>
                </div>
            `;

            this.showModal(modalContent);
        }

        /**
         * Copy history item content to clipboard
         * @param {string} id - Item ID
         */
        async copyHistoryItem(id) {
            const item = this.history.find(h => h.id === id);
            if (!item) return;

            const content = [
                `Result: ${item.result}`,
                `Confidence: ${item.confidence}%`,
                item.headline ? `Headline: ${item.headline}` : '',
                `Content: ${item.content}`,
                `Date: ${item.dateCreated} ${item.timeCreated}`
            ].filter(Boolean).join('\n\n');

            try {
                await navigator.clipboard.writeText(content);
                this.showToast('Content copied to clipboard!', 'success');
            } catch (error) {
                this.showToast('Failed to copy content', 'error');
            }
        }

        /**
         * Export history to CSV file
         */
        exportHistory() {
            if (this.history.length === 0) {
                this.showToast('No history to export', 'info');
                return;
            }

            try {
                const csvContent = this.generateCSV();
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                
                if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `fake-news-history-${new Date().toISOString().split('T')[0]}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    this.showToast('History exported successfully!', 'success');
                }
            } catch (error) {
                console.error('Export failed:', error);
                this.showToast('Failed to export history', 'error');
            }
        }

        /**
         * Generate CSV content from history
         * @returns {string} CSV content
         */
        generateCSV() {
            const headers = ['Date', 'Time', 'Result', 'Confidence', 'Headline', 'Content'];
            const rows = this.history.map(item => [
                item.dateCreated || '',
                item.timeCreated || '',
                item.result || '',
                item.confidence || '',
                (item.headline || '').replace(/"/g, '""'),
                (item.content || '').replace(/"/g, '""')
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(field => `"${field}"`).join(','))
            ].join('\n');

            return csvContent;
        }

        /**
         * Show modal dialog
         * @param {string} content - Modal HTML content
         */
        showModal(content) {
            // Remove existing modal
            const existingModal = document.querySelector('.history-modal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.className = 'modal history-modal';
            modal.innerHTML = `
                <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
                <div class="modal-content">
                    ${content}
                </div>
            `;

            document.body.appendChild(modal);
            
            // Focus management for accessibility
            const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }

        /**
         * Show confirmation dialog
         * @param {string} title - Dialog title
         * @param {string} message - Dialog message
         * @param {Function} onConfirm - Confirmation callback
         */
        showConfirmationDialog(title, message, onConfirm) {
            const content = `
                <div class="confirmation-dialog">
                    <div class="dialog-header">
                        <h3><i class="fas fa-exclamation-triangle"></i> ${title}</h3>
                    </div>
                    <div class="dialog-body">
                        <p>${message}</p>
                    </div>
                    <div class="dialog-footer">
                        <button class="btn-danger" onclick="this.closest('.modal').remove(); (${onConfirm.toString()})()">
                            <i class="fas fa-trash"></i> Confirm
                        </button>
                        <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancel
                        </button>
                    </div>
                </div>
            `;

            this.showModal(content);
        }

        /**
         * Show toast notification
         * @param {string} message - Notification message
         * @param {string} type - Notification type
         */
        showToast(message, type = 'info') {
            if (typeof window.showToast === 'function') {
                window.showToast(message, type);
            } else if (window.FakeNewsDetector) {
                window.FakeNewsDetector.showToast(message, type);
            } else {
                console.log(`Toast: ${message} (${type})`);
            }
        }

        /**
         * Get history item by ID
         * @param {string} id - Item ID
         * @returns {Object|null} History item or null
         */
        getHistoryItem(id) {
            return this.history.find(item => item.id === id) || null;
        }

        /**
         * Get filtered history
         * @returns {Array} Filtered history array
         */
        getFilteredHistory() {
            return [...this.filteredHistory];
        }

        /**
         * Get total history count
         * @returns {number} Total history count
         */
        getTotalCount() {
            return this.history.length;
        }

        /**
         * Import history from JSON
         * @param {Array} importedHistory - History data to import
         */
        importHistory(importedHistory) {
            try {
                if (!Array.isArray(importedHistory)) {
                    throw new Error('Invalid history format');
                }

                const validItems = importedHistory.filter(item => this.validateHistoryItem(item));
                
                // Merge with existing history, avoiding duplicates
                const existingIds = new Set(this.history.map(item => item.id));
                const newItems = validItems.filter(item => !existingIds.has(item.id));
                
                this.history = [...newItems, ...this.history];
                
                // Limit total items
                if (this.history.length > CONFIG.MAX_HISTORY_ITEMS) {
                    this.history = this.history.slice(0, CONFIG.MAX_HISTORY_ITEMS);
                }
                
                this.saveToStorage();
                this.applyCurrentFilters();
                this.updateDisplay();
                
                this.showToast(`Imported ${newItems.length} history items`, 'success');
                
            } catch (error) {
                console.error('Import failed:', error);
                this.showToast('Failed to import history', 'error');
            }
        }

        /**
         * Cleanup and destroy the history manager
         */
        destroy() {
            this.history = [];
            this.filteredHistory = [];
            this.isInitialized = false;
            
            console.log('History manager destroyed');
        }
    }

    // Initialize history manager when DOM is ready
    function initializeHistoryManager() {
        try {
            const historyManager = new HistoryManager();
            
            // Export to global scope for external access
            window.HistoryManager = historyManager;
            window.historyManager = historyManager;
            
        } catch (error) {
            console.error('Failed to initialize history manager:', error);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeHistoryManager);
    } else {
        initializeHistoryManager();
    }

})();
