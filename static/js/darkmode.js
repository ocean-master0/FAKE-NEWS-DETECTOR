/**
 * Advanced Dark Mode Management System
 * Handles theme switching, persistence, and system preferences
 * 
 * Features:
 * - Automatic system theme detection
 * - Smooth theme transitions
 * - Local storage persistence
 * - Custom event dispatching
 * - Performance optimized
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        STORAGE_KEY: 'fakeNewsDetector_theme',
        TRANSITION_DURATION: 300,
        THEMES: {
            LIGHT: 'light',
            DARK: 'dark'
        },
        SELECTORS: {
            TOGGLE: '#themeToggle',
            MOBILE_TOGGLE: '#mobileThemeToggle',
            BODY: 'body',
            HTML: 'html'
        }
    };

    // Theme Manager Class
    class ThemeManager {
        constructor() {
            this.currentTheme = null;
            this.toggleButtons = [];
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            this.initialize();
        }

        /**
         * Initialize the theme system
         */
        initialize() {
            try {
                this.setupToggleButtons();
                this.detectInitialTheme();
                this.addEventListeners();
                this.addTransitionStyles();
                
                console.log('Dark mode system initialized successfully');
            } catch (error) {
                console.error('Failed to initialize dark mode:', error);
            }
        }

        /**
         * Setup theme toggle buttons
         */
        setupToggleButtons() {
            // Desktop toggle button
            const desktopToggle = document.querySelector(CONFIG.SELECTORS.TOGGLE);
            if (desktopToggle) {
                this.toggleButtons.push(desktopToggle);
            }

            // Mobile toggle button (if exists)
            const mobileToggle = document.querySelector(CONFIG.SELECTORS.MOBILE_TOGGLE);
            if (mobileToggle) {
                this.toggleButtons.push(mobileToggle);
            }

            // Alternative selectors for theme toggles
            const altToggles = document.querySelectorAll('[data-theme-toggle]');
            altToggles.forEach(toggle => {
                if (!this.toggleButtons.includes(toggle)) {
                    this.toggleButtons.push(toggle);
                }
            });
        }

        /**
         * Detect and set initial theme
         */
        detectInitialTheme() {
            const savedTheme = this.getSavedTheme();
            const systemTheme = this.getSystemTheme();
            
            // Priority: saved theme > system preference > light theme
            const initialTheme = savedTheme || systemTheme || CONFIG.THEMES.LIGHT;
            
            this.setTheme(initialTheme, false); // Don't animate initial theme
        }

        /**
         * Get saved theme from localStorage
         * @returns {string|null} Saved theme or null
         */
        getSavedTheme() {
            try {
                const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
                return Object.values(CONFIG.THEMES).includes(saved) ? saved : null;
            } catch (error) {
                console.warn('Could not access localStorage for theme:', error);
                return null;
            }
        }

        /**
         * Get system theme preference
         * @returns {string} System theme preference
         */
        getSystemTheme() {
            return this.mediaQuery.matches ? CONFIG.THEMES.DARK : CONFIG.THEMES.LIGHT;
        }

        /**
         * Save theme to localStorage
         * @param {string} theme - Theme to save
         */
        saveTheme(theme) {
            try {
                localStorage.setItem(CONFIG.STORAGE_KEY, theme);
            } catch (error) {
                console.warn('Could not save theme to localStorage:', error);
            }
        }

        /**
         * Set theme with optional animation
         * @param {string} theme - Theme to set
         * @param {boolean} animate - Whether to animate the transition
         */
        setTheme(theme, animate = true) {
            if (!Object.values(CONFIG.THEMES).includes(theme)) {
                console.warn('Invalid theme:', theme);
                return;
            }

            const previousTheme = this.currentTheme;
            this.currentTheme = theme;

            // Apply theme transition animation
            if (animate && previousTheme && previousTheme !== theme) {
                this.addTransitionClass();
            }

            // Update DOM
            document.documentElement.setAttribute('data-theme', theme);
            document.body.classList.toggle('dark-theme', theme === CONFIG.THEMES.DARK);
            
            // Update toggle buttons
            this.updateToggleButtons(theme);
            
            // Save preference
            this.saveTheme(theme);
            
            // Dispatch custom event
            this.dispatchThemeChangeEvent(theme, previousTheme);
            
            // Remove transition class after animation
            if (animate && previousTheme && previousTheme !== theme) {
                setTimeout(() => {
                    this.removeTransitionClass();
                }, CONFIG.TRANSITION_DURATION);
            }

            // Show notification
            if (animate && previousTheme && previousTheme !== theme) {
                this.showThemeChangeNotification(theme);
            }
        }

        /**
         * Toggle between light and dark themes
         */
        toggleTheme() {
            const newTheme = this.currentTheme === CONFIG.THEMES.DARK 
                ? CONFIG.THEMES.LIGHT 
                : CONFIG.THEMES.DARK;
            
            this.setTheme(newTheme);
        }

        /**
         * Update toggle button states and icons
         * @param {string} theme - Current theme
         */
        updateToggleButtons(theme) {
            this.toggleButtons.forEach(button => {
                if (!button) return;

                // Update ARIA attributes for accessibility
                button.setAttribute('aria-label', 
                    `Switch to ${theme === CONFIG.THEMES.DARK ? 'light' : 'dark'} theme`
                );
                
                // Update button state
                button.classList.toggle('theme-dark', theme === CONFIG.THEMES.DARK);
                button.classList.toggle('theme-light', theme === CONFIG.THEMES.LIGHT);

                // Update icons
                const sunIcon = button.querySelector('.fa-sun');
                const moonIcon = button.querySelector('.fa-moon');
                
                if (sunIcon && moonIcon) {
                    if (theme === CONFIG.THEMES.DARK) {
                        sunIcon.style.opacity = '1';
                        sunIcon.style.transform = 'rotate(0deg)';
                        moonIcon.style.opacity = '0';
                        moonIcon.style.transform = 'rotate(180deg)';
                    } else {
                        sunIcon.style.opacity = '0';
                        sunIcon.style.transform = 'rotate(180deg)';
                        moonIcon.style.opacity = '1';
                        moonIcon.style.transform = 'rotate(0deg)';
                    }
                }

                // Handle checkbox-style toggles
                if (button.type === 'checkbox') {
                    button.checked = theme === CONFIG.THEMES.DARK;
                }
            });
        }

        /**
         * Add event listeners
         */
        addEventListeners() {
            // Toggle button click handlers
            this.toggleButtons.forEach(button => {
                if (button) {
                    if (button.type === 'checkbox') {
                        button.addEventListener('change', (e) => {
                            const theme = e.target.checked ? CONFIG.THEMES.DARK : CONFIG.THEMES.LIGHT;
                            this.setTheme(theme);
                        });
                    } else {
                        button.addEventListener('click', (e) => {
                            e.preventDefault();
                            this.toggleTheme();
                        });
                    }
                }
            });

            // System theme change listener
            this.mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!this.getSavedTheme()) {
                    const systemTheme = e.matches ? CONFIG.THEMES.DARK : CONFIG.THEMES.LIGHT;
                    this.setTheme(systemTheme);
                }
            });

            // Keyboard shortcut (Ctrl/Cmd + Shift + D)
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                    e.preventDefault();
                    this.toggleTheme();
                }
            });
        }

        /**
         * Add CSS transition styles for smooth theme switching
         */
        addTransitionStyles() {
            if (document.getElementById('theme-transition-styles')) return;

            const style = document.createElement('style');
            style.id = 'theme-transition-styles';
            style.textContent = `
                .theme-transitioning,
                .theme-transitioning *,
                .theme-transitioning *::before,
                .theme-transitioning *::after {
                    transition: 
                        background-color ${CONFIG.TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1),
                        color ${CONFIG.TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1),
                        border-color ${CONFIG.TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1),
                        box-shadow ${CONFIG.TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                
                /* Optimize transition performance */
                .theme-transitioning {
                    contain: style layout;
                    will-change: background-color, color;
                }
                
                /* Remove transitions from elements that shouldn't animate */
                .theme-transitioning .no-theme-transition,
                .theme-transitioning .no-theme-transition * {
                    transition: none !important;
                }
            `;
            
            document.head.appendChild(style);
        }

        /**
         * Add transition class for smooth theme switching
         */
        addTransitionClass() {
            document.documentElement.classList.add('theme-transitioning');
        }

        /**
         * Remove transition class after animation completes
         */
        removeTransitionClass() {
            document.documentElement.classList.remove('theme-transitioning');
        }

        /**
         * Dispatch custom theme change event
         * @param {string} newTheme - New theme
         * @param {string} previousTheme - Previous theme
         */
        dispatchThemeChangeEvent(newTheme, previousTheme) {
            const event = new CustomEvent('themeChanged', {
                detail: {
                    theme: newTheme,
                    previousTheme: previousTheme,
                    timestamp: Date.now()
                }
            });
            
            window.dispatchEvent(event);
            document.dispatchEvent(event);
        }

        /**
         * Show theme change notification
         * @param {string} theme - Current theme
         */
        showThemeChangeNotification(theme) {
            if (typeof window.showToast === 'function') {
                const message = `Switched to ${theme} mode`;
                const icon = theme === CONFIG.THEMES.DARK ? '🌙' : '☀️';
                
                window.showToast(`${icon} ${message}`, 'info', 2000);
            }
        }

        /**
         * Get current theme
         * @returns {string} Current theme
         */
        getCurrentTheme() {
            return this.currentTheme;
        }

        /**
         * Check if dark mode is active
         * @returns {boolean} True if dark mode is active
         */
        isDarkMode() {
            return this.currentTheme === CONFIG.THEMES.DARK;
        }

        /**
         * Reset theme to system preference
         */
        resetToSystemTheme() {
            try {
                localStorage.removeItem(CONFIG.STORAGE_KEY);
                const systemTheme = this.getSystemTheme();
                this.setTheme(systemTheme);
            } catch (error) {
                console.warn('Could not reset to system theme:', error);
            }
        }
    }

    // Initialize theme manager when DOM is ready
    function initializeThemeManager() {
        try {
            const themeManager = new ThemeManager();
            
            // Export to global scope for external access
            window.ThemeManager = themeManager;
            window.DarkMode = {
                setTheme: (theme) => themeManager.setTheme(theme),
                toggleTheme: () => themeManager.toggleTheme(),
                getCurrentTheme: () => themeManager.getCurrentTheme(),
                isDarkMode: () => themeManager.isDarkMode(),
                resetToSystemTheme: () => themeManager.resetToSystemTheme()
            };
            
        } catch (error) {
            console.error('Failed to initialize theme manager:', error);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeThemeManager);
    } else {
        initializeThemeManager();
    }

    // Fallback initialization after window load
    window.addEventListener('load', () => {
        if (!window.ThemeManager) {
            console.warn('Theme manager not initialized, attempting fallback initialization');
            initializeThemeManager();
        }
    });

})();
