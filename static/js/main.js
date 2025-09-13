/**
 * Fixed Main JavaScript for Fake News Detector
 * Proper frontend-backend connection with error handling
 */

(function() {
    'use strict';

    // Application configuration
    const CONFIG = {
        API_ENDPOINTS: {
            PREDICT: '/predict'
        },
        SELECTORS: {
            ANALYZER_FORM: '#analyzerForm',
            NEWS_HEADLINE: '#newsHeadline',
            NEWS_CONTENT: '#newsContent',
            ANALYZE_BTN: '#analyzeBtn',
            RESULTS_CONTAINER: '#resultsContainer',
            MOBILE_TOGGLE: '#mobileMenuToggle',
            MOBILE_MENU: '#mobileMenu',
            THEME_TOGGLE: '#themeToggle'
        },
        LIMITS: {
            CONTENT_MAX: 5000,
            HEADLINE_MAX: 200
        }
    };

    /**
     * Main Application Class - FIXED VERSION
     */
    class FakeNewsDetectorFixed {
        constructor() {
            this.isInitialized = false;
            this.elements = {};
            this.initialize();
        }

        /**
         * Initialize the application
         */
        initialize() {
            try {
                console.log('🚀 Initializing Fake News Detector Frontend...');
                
                this.cacheElements();
                this.setupAnalyzer();
                this.setupMobileNavigation();
                this.setupCharacterCounters();
                this.setupContentTools();
                
                this.isInitialized = true;
                console.log('✅ Frontend initialized successfully');
                
            } catch (error) {
                console.error('❌ Failed to initialize application:', error);
                this.showToast('Application initialization failed', 'error');
            }
        }

        /**
         * Cache DOM elements
         */
        cacheElements() {
            this.elements = {
                analyzerForm: document.querySelector(CONFIG.SELECTORS.ANALYZER_FORM),
                newsHeadline: document.querySelector(CONFIG.SELECTORS.NEWS_HEADLINE),
                newsContent: document.querySelector(CONFIG.SELECTORS.NEWS_CONTENT),
                analyzeBtn: document.querySelector(CONFIG.SELECTORS.ANALYZE_BTN),
                resultsContainer: document.querySelector(CONFIG.SELECTORS.RESULTS_CONTAINER),
                mobileToggle: document.querySelector(CONFIG.SELECTORS.MOBILE_TOGGLE),
                mobileMenu: document.querySelector(CONFIG.SELECTORS.MOBILE_MENU)
            };

            // Log missing elements for debugging
            Object.keys(this.elements).forEach(key => {
                if (!this.elements[key]) {
                    console.warn(`⚠️ Element not found: ${CONFIG.SELECTORS[key.toUpperCase().replace(/([A-Z])/g, '_$1')]}`);
                }
            });
        }

        /**
         * Setup news analyzer - MAIN FIX HERE
         */
        setupAnalyzer() {
            const { analyzerForm, analyzeBtn, newsContent } = this.elements;
            
            if (!analyzerForm) {
                console.error('❌ Analyzer form not found!');
                return;
            }

            // Form submission handler
            analyzerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('📝 Form submission triggered');
                await this.submitAnalysis();
            });

            // Button click handler (backup)
            if (analyzeBtn) {
                analyzeBtn.addEventListener('click', async (e) => {
                    if (e.target.closest('form')) return; // Let form handle it
                    e.preventDefault();
                    await this.submitAnalysis();
                });
            }

            console.log('✅ Analyzer setup complete');
        }

        /**
         * Submit analysis - FIXED API CONNECTION
         */
        async submitAnalysis() {
            const { newsHeadline, newsContent, analyzeBtn } = this.elements;
            
            if (!newsContent) {
                this.showToast('Content textarea not found', 'error');
                return;
            }

            const headline = newsHeadline ? newsHeadline.value.trim() : '';
            const content = newsContent.value.trim();

            // Validation
            if (!content) {
                this.showToast('Please enter article content to analyze', 'warning');
                newsContent.focus();
                return;
            }

            if (content.length > CONFIG.LIMITS.CONTENT_MAX) {
                this.showToast(`Content too long. Maximum ${CONFIG.LIMITS.CONTENT_MAX} characters allowed.`, 'error');
                return;
            }

            try {
                console.log('🔍 Starting analysis...');
                this.setLoadingState(true);
                
                const startTime = performance.now();
                
                // API Call - FIXED STRUCTURE
                const response = await fetch(CONFIG.API_ENDPOINTS.PREDICT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        headline: headline,
                        content: content
                    })
                });

                console.log('📡 API Response received:', response.status);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('📊 Analysis result:', data);

                if (!data.success) {
                    throw new Error(data.error || 'Analysis failed');
                }

                const processingTime = performance.now() - startTime;
                
                // Display results - FIXED FUNCTION CALL
                this.displayResults(data, processingTime);
                
                // Store result globally
                window.lastAnalysisResult = data;
                
                // Dispatch custom event
                window.dispatchEvent(new CustomEvent('analysisComplete', { 
                    detail: data 
                }));

                this.showToast('Analysis completed successfully!', 'success');

            } catch (error) {
                console.error('❌ Analysis failed:', error);
                this.showToast(error.message || 'Analysis failed. Please try again.', 'error');
            } finally {
                this.setLoadingState(false);
            }
        }

        /**
         * Display analysis results - FIXED IMPLEMENTATION
         */
        displayResults(data, processingTime) {
            const { resultsContainer } = this.elements;
            
            if (!resultsContainer) {
                console.error('❌ Results container not found!');
                return;
            }

            // Update result badge
            const resultBadge = document.getElementById('resultBadge');
            const resultIcon = document.getElementById('resultIcon');
            const resultText = document.getElementById('resultText');
            
            if (resultBadge && resultIcon && resultText) {
                const isReal = data.result === 'Real';
                
                resultBadge.className = `result-badge ${isReal ? 'real' : 'fake'}`;
                resultIcon.className = `result-icon fas ${isReal ? 'fa-check-circle' : 'fa-times-circle'}`;
                resultText.textContent = `${data.result} News`;
            }

            // Update confidence display
            const confidenceValue = document.getElementById('confidenceValue');
            const confidenceFill = document.getElementById('confidenceFill');
            
            if (confidenceValue && confidenceFill) {
                confidenceValue.textContent = `${data.confidence}%`;
                
                // Animate confidence bar
                confidenceFill.style.width = '0%';
                confidenceFill.className = `confidence-fill ${this.getConfidenceClass(data.confidence)}`;
                
                setTimeout(() => {
                    confidenceFill.style.width = `${data.confidence}%`;
                }, 200);
            }

            // Update metrics
            const contentLength = document.getElementById('contentLength');
            const processingTimeEl = document.getElementById('processingTime');
            
            if (contentLength && data.content) {
                contentLength.textContent = `${data.content.length} characters`;
            }
            
            if (processingTimeEl) {
                processingTimeEl.textContent = `${Math.round(processingTime)}ms`;
            }

            // Update timestamp
            const resultTimestamp = document.getElementById('resultTimestamp');
            if (resultTimestamp) {
                resultTimestamp.textContent = new Date().toLocaleString();
            }

            // Show results container
            resultsContainer.style.display = 'block';
            setTimeout(() => {
                resultsContainer.classList.add('visible');
                resultsContainer.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);

            console.log('✅ Results displayed successfully');
        }

        /**
         * Get confidence CSS class
         */
        getConfidenceClass(confidence) {
            if (confidence >= 95) return 'very-high';
            if (confidence >= 80) return 'high';
            if (confidence >= 65) return 'medium';
            return 'low';
        }

        /**
         * Set loading state
         */
        setLoadingState(isLoading) {
            const { analyzeBtn } = this.elements;
            if (!analyzeBtn) return;

            const btnContent = analyzeBtn.querySelector('.btn-content');
            const btnLoading = analyzeBtn.querySelector('.btn-loading');

            if (isLoading) {
                analyzeBtn.disabled = true;
                analyzeBtn.classList.add('loading');
                
                if (btnContent) btnContent.style.opacity = '0';
                if (btnLoading) btnLoading.style.opacity = '1';
                
            } else {
                analyzeBtn.disabled = false;
                analyzeBtn.classList.remove('loading');
                
                if (btnContent) btnContent.style.opacity = '1';
                if (btnLoading) btnLoading.style.opacity = '0';
            }
        }

        /**
         * Setup character counters
         */
        setupCharacterCounters() {
            const { newsHeadline, newsContent } = this.elements;
            
            if (newsHeadline) {
                this.setupCounter(newsHeadline, 'headlineCount', CONFIG.LIMITS.HEADLINE_MAX);
            }
            
            if (newsContent) {
                this.setupCounter(newsContent, 'contentCount', CONFIG.LIMITS.CONTENT_MAX);
            }
        }

        /**
         * Setup individual counter
         */
        setupCounter(input, counterId, maxLength) {
            const counter = document.getElementById(counterId);
            if (!counter) return;

            const updateCounter = () => {
                const length = input.value.length;
                counter.textContent = `${length}/${maxLength}`;
                
                // Color coding
                counter.classList.remove('warning', 'error');
                if (length > maxLength * 0.9) {
                    counter.classList.add('error');
                } else if (length > maxLength * 0.7) {
                    counter.classList.add('warning');
                }
            };

            input.addEventListener('input', updateCounter);
            updateCounter(); // Initial update
        }

        /**
         * Setup content tools
         */
        setupContentTools() {
            const { newsContent } = this.elements;
            if (!newsContent) return;

            const clearBtn = document.getElementById('clearContent');
            const pasteBtn = document.getElementById('pasteContent');

            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    newsContent.value = '';
                    newsContent.dispatchEvent(new Event('input'));
                    newsContent.focus();
                    this.showToast('Content cleared', 'info');
                });
            }

            if (pasteBtn) {
                pasteBtn.addEventListener('click', async () => {
                    try {
                        const text = await navigator.clipboard.readText();
                        newsContent.value = text;
                        newsContent.dispatchEvent(new Event('input'));
                        this.showToast('Content pasted successfully!', 'success');
                    } catch (error) {
                        this.showToast('Failed to paste content. Please paste manually.', 'warning');
                    }
                });
            }
        }

        /**
         * Setup mobile navigation
         */
        setupMobileNavigation() {
            const { mobileToggle, mobileMenu } = this.elements;
            
            if (!mobileToggle || !mobileMenu) return;

            mobileToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!mobileToggle.contains(e.target) && !mobileMenu.contains(e.target)) {
                    mobileMenu.classList.remove('active');
                }
            });
        }

        /**
         * Show toast notification
         */
        showToast(message, type = 'info', duration = 4000) {
            const toastContainer = this.getOrCreateToastContainer();
            const toast = this.createToastElement(message, type);
            
            toastContainer.appendChild(toast);
            
            // Animate in
            setTimeout(() => toast.classList.add('show'), 100);
            
            // Auto remove
            setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }

        /**
         * Get or create toast container
         */
        getOrCreateToastContainer() {
            let container = document.querySelector('.toast-container');
            
            if (!container) {
                container = document.createElement('div');
                container.className = 'toast-container';
                document.body.appendChild(container);
            }
            
            return container;
        }

        /**
         * Create toast element
         */
        createToastElement(message, type) {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-times-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };
            
            toast.innerHTML = `
                <i class="${icons[type] || icons.info}"></i>
                <span class="toast-message">${message}</span>
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // Add close functionality
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => this.removeToast(toast));
            
            return toast;
        }

        /**
         * Remove toast element
         */
        removeToast(toast) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    // Initialize when DOM is ready
    function initializeApp() {
        try {
            const app = new FakeNewsDetectorFixed();
            
            // Export to global scope
            window.FakeNewsDetector = app;
            
            console.log('🎉 Fake News Detector ready!');
            
        } catch (error) {
            console.error('💥 Failed to initialize app:', error);
        }
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

})();
