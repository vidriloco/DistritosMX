// Theme Manager for MapAdminApp
// Handles theme configuration and switching

class ThemeManager {
    constructor() {
        this.currentTheme = 'highContrast';
        this.themes = {
            default: {
                name: 'Default',
                colors: {
                    primary: '#FFA500',
                    secondary: '#3B82F6',
                    background: '#FFFFFF',
                    surface: '#F8F9FA',
                    text: {
                        primary: '#374151',
                        secondary: '#6B7280',
                        muted: '#9CA3AF'
                    },
                    border: {
                        light: '#E5E7EB',
                        medium: '#D1D5DB',
                        dark: '#9CA3AF'
                    },
                    status: {
                        success: '#10B981',
                        warning: '#F59E0B',
                        error: '#EF4444',
                        info: '#3B82F6'
                    },
                    hover: {
                        background: '#F9FAFB',
                        border: '#9CA3AF'
                    },
                    active: {
                        background: '#DBEAFE',
                        border: '#3B82F6',
                        text: '#1E40AF'
                    }
                },
                shadows: {
                    small: '0 2px 4px rgba(0,0,0,0.1)',
                    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                },
                borderRadius: {
                    small: '1px',
                    medium: '2px',
                    large: '3px',
                    xlarge: '4px'
                },
                typography: {
                    fontFamily: "'Ruda', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
                    fontSize: {
                        xs: '10px',
                        sm: '12px',
                        base: '13px',
                        lg: '14px',
                        xl: '16px',
                        '2xl': '18px',
                        '3xl': '20px',
                        '4xl': '24px'
                    },
                    fontWeight: {
                        normal: '400',
                        medium: '500',
                        semibold: '600',
                        bold: '700'
                    }
                },
                textTransform: {
                    title: 'uppercase',
                    section: 'uppercase'
                }
            },
            dark: {
                name: 'Dark',
                colors: {
                    primary: '#FFA500',
                    secondary: '#60A5FA',
                    background: '#1F2937',
                    surface: '#374151',
                    text: {
                        primary: '#F9FAFB',
                        secondary: '#D1D5DB',
                        muted: '#9CA3AF'
                    },
                    border: {
                        light: '#4B5563',
                        medium: '#6B7280',
                        dark: '#9CA3AF'
                    },
                    status: {
                        success: '#34D399',
                        warning: '#FBBF24',
                        error: '#F87171',
                        info: '#60A5FA'
                    },
                    hover: {
                        background: '#4B5563',
                        border: '#9CA3AF'
                    },
                    active: {
                        background: '#1E40AF',
                        border: '#3B82F6',
                        text: '#DBEAFE'
                    }
                },
                shadows: {
                    small: '0 2px 4px rgba(0,0,0,0.3)',
                    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
                    large: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
                },
                borderRadius: {
                    small: '4px',
                    medium: '6px',
                    large: '8px',
                    xlarge: '12px'
                },
                typography: {
                    fontFamily: "'Ruda', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
                    fontSize: {
                        xs: '10px',
                        sm: '12px',
                        base: '13px',
                        lg: '14px',
                        xl: '16px',
                        '2xl': '18px',
                        '3xl': '20px',
                        '4xl': '24px'
                    },
                    fontWeight: {
                        normal: '400',
                        medium: '500',
                        semibold: '600',
                        bold: '700'
                    }
                },
                textTransform: {
                    title: 'uppercase',
                    section: 'uppercase'
                }
            },
            highContrast: {
                name: 'High Contrast',
                colors: {
                    primary: '#FF6B35',
                    secondary: '#0066CC',
                    background: '#FFFFFF',
                    surface: '#F0F0F0',
                    text: {
                        primary: '#000000',
                        secondary: '#333333',
                        muted: '#666666'
                    },
                    border: {
                        light: '#CCCCCC',
                        medium: '#999999',
                        dark: '#666666'
                    },
                    status: {
                        success: '#008000',
                        warning: '#FF8C00',
                        error: '#FF0000',
                        info: '#0066CC'
                    },
                    hover: {
                        background: '#E6E6E6',
                        border: '#666666'
                    },
                    active: {
                        background: '#0066CC',
                        border: '#0066CC',
                        text: '#FFFFFF'
                    }
                },
                shadows: {
                    small: '0 2px 4px rgba(0,0,0,0.2)',
                    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                    large: '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)'
                },
                borderRadius: {
                    small: '4px',
                    medium: '6px',
                    large: '8px',
                    xlarge: '12px'
                },
                typography: {
                    fontFamily: "'Ruda', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
                    fontSize: {
                        xs: '10px',
                        sm: '12px',
                        base: '13px',
                        lg: '14px',
                        xl: '16px',
                        '2xl': '18px',
                        '3xl': '20px',
                        '4xl': '24px'
                    },
                    fontWeight: {
                        normal: '400',
                        medium: '500',
                        semibold: '600',
                        bold: '700'
                    }
                },
                textTransform: {
                    title: 'uppercase',
                    section: 'uppercase'
                }
            },
            nature: {
                name: 'Nature',
                colors: {
                    primary: '#10B981',
                    secondary: '#059669',
                    background: '#F0FDF4',
                    surface: '#ECFDF5',
                    text: {
                        primary: '#065F46',
                        secondary: '#047857',
                        muted: '#6B7280'
                    },
                    border: {
                        light: '#D1FAE5',
                        medium: '#A7F3D0',
                        dark: '#6EE7B7'
                    },
                    status: {
                        success: '#10B981',
                        warning: '#F59E0B',
                        error: '#EF4444',
                        info: '#3B82F6'
                    },
                    hover: {
                        background: '#D1FAE5',
                        border: '#6EE7B7'
                    },
                    active: {
                        background: '#10B981',
                        border: '#059669',
                        text: '#FFFFFF'
                    }
                },
                shadows: {
                    small: '0 2px 4px rgba(16, 185, 129, 0.1)',
                    medium: '0 4px 6px -1px rgba(16, 185, 129, 0.1), 0 2px 4px -1px rgba(16, 185, 129, 0.06)',
                    large: '0 10px 15px -3px rgba(16, 185, 129, 0.1), 0 4px 6px -2px rgba(16, 185, 129, 0.05)'
                },
                borderRadius: {
                    small: '4px',
                    medium: '6px',
                    large: '8px',
                    xlarge: '12px'
                },
                typography: {
                    fontFamily: "'Ruda', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
                    fontSize: {
                        xs: '10px',
                        sm: '12px',
                        base: '13px',
                        lg: '14px',
                        xl: '16px',
                        '2xl': '18px',
                        '3xl': '20px',
                        '4xl': '24px'
                    },
                    fontWeight: {
                        normal: '400',
                        medium: '500',
                        semibold: '600',
                        bold: '700'
                    }
                },
                textTransform: {
                    title: 'uppercase',
                    section: 'uppercase'
                }
            },
            happy: {
                name: 'Happy',
                colors: {
                    primary: '#FF6B35',
                    secondary: '#4ECDC4',
                    background: '#FFFFFF',
                    surface: '#F8F9FA',
                    text: {
                        primary: '#2C3E50',
                        secondary: '#5A6C7D',
                        muted: '#95A5A6'
                    },
                    border: {
                        light: '#E9ECEF',
                        medium: '#DEE2E6',
                        dark: '#CED4DA'
                    },
                    status: {
                        success: '#27AE60',
                        warning: '#F39C12',
                        error: '#E74C3C',
                        info: '#3498DB'
                    },
                    hover: {
                        background: '#F8F9FA',
                        border: '#4ECDC4'
                    },
                    active: {
                        background: '#FF6B35',
                        border: '#FF6B35',
                        text: '#FFFFFF'
                    }
                },
                shadows: {
                    small: '0 2px 8px rgba(255, 107, 53, 0.15)',
                    medium: '0 4px 12px rgba(255, 107, 53, 0.2), 0 2px 4px rgba(255, 107, 53, 0.1)',
                    large: '0 8px 25px rgba(255, 107, 53, 0.25), 0 4px 10px rgba(255, 107, 53, 0.15)'
                },
                borderRadius: {
                    small: '8px',
                    medium: '12px',
                    large: '10px', // Specific 10px for external panel corners
                    xlarge: '20px'
                },
                typography: {
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
                    fontSize: {
                        xs: '12px',
                        sm: '14px',
                        base: '16px',
                        lg: '18px',
                        xl: '20px',
                        '2xl': '24px',
                        '3xl': '28px',
                        '4xl': '32px'
                    },
                    fontWeight: {
                        normal: '400',
                        medium: '500',
                        semibold: '600',
                        bold: '700'
                    }
                },
                textTransform: {
                    title: 'none',
                    section: 'none'
                }
            }
        };
        
        this.init();
    }

    init() {
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem('mapAdminTheme');
        if (savedTheme && this.themes[savedTheme]) {
            this.currentTheme = savedTheme;
        }
        
        this.applyTheme(this.currentTheme);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getTheme(themeName = null) {
        const theme = themeName || this.currentTheme;
        return this.themes[theme] || this.themes.default;
    }

    getAvailableThemes() {
        return Object.keys(this.themes).map(key => ({
            key: key,
            name: this.themes[key].name
        }));
    }

    applyTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn(`Theme "${themeName}" not found, using default`);
            themeName = 'default';
        }

        this.currentTheme = themeName;
        const theme = this.themes[themeName];

        // Save theme preference
        localStorage.setItem('mapAdminTheme', themeName);

        // Apply CSS custom properties
        this.applyCSSVariables(theme);

        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: themeName, themeData: theme }
        }));
    }

    applyCSSVariables(theme) {
        const root = document.documentElement;
        
        // Apply colors
        Object.entries(theme.colors).forEach(([category, values]) => {
            if (typeof values === 'object') {
                Object.entries(values).forEach(([key, value]) => {
                    root.style.setProperty(`--color-${category}-${key}`, value);
                });
            } else {
                root.style.setProperty(`--color-${category}`, values);
            }
        });

        // Apply shadows
        Object.entries(theme.shadows).forEach(([key, value]) => {
            root.style.setProperty(`--shadow-${key}`, value);
        });

        // Apply border radius
        Object.entries(theme.borderRadius).forEach(([key, value]) => {
            root.style.setProperty(`--border-radius-${key}`, value);
        });

        // Apply typography
        root.style.setProperty('--font-family', theme.typography.fontFamily);
        Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
            root.style.setProperty(`--font-size-${key}`, value);
        });
        Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
            root.style.setProperty(`--font-weight-${key}`, value);
        });
    }

    // Helper method to get CSS variable value
    getCSSVariable(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name);
    }

    // Method to generate theme-specific styles
    generateThemeStyles() {
        const theme = this.getTheme();
        return `
            :root {
                /* Colors */
                --color-primary: ${theme.colors.primary};
                --color-secondary: ${theme.colors.secondary};
                --color-background: ${theme.colors.background};
                --color-surface: ${theme.colors.surface};
                
                /* Text Colors */
                --color-text-primary: ${theme.colors.text.primary};
                --color-text-secondary: ${theme.colors.text.secondary};
                --color-text-muted: ${theme.colors.text.muted};
                
                /* Border Colors */
                --color-border-light: ${theme.colors.border.light};
                --color-border-medium: ${theme.colors.border.medium};
                --color-border-dark: ${theme.colors.border.dark};
                
                /* Status Colors */
                --color-status-success: ${theme.colors.status.success};
                --color-status-warning: ${theme.colors.status.warning};
                --color-status-error: ${theme.colors.status.error};
                --color-status-info: ${theme.colors.status.info};
                
                /* Hover Colors */
                --color-hover-background: ${theme.colors.hover.background};
                --color-hover-border: ${theme.colors.hover.border};
                
                /* Active Colors */
                --color-active-background: ${theme.colors.active.background};
                --color-active-border: ${theme.colors.active.border};
                --color-active-text: ${theme.colors.active.text};
                
                /* Shadows */
                --shadow-small: ${theme.shadows.small};
                --shadow-medium: ${theme.shadows.medium};
                --shadow-large: ${theme.shadows.large};
                
                /* Border Radius */
                --border-radius-small: ${theme.borderRadius.small};
                --border-radius-medium: ${theme.borderRadius.medium};
                --border-radius-large: ${theme.borderRadius.large};
                --border-radius-xlarge: ${theme.borderRadius.xlarge};
                
                /* Typography */
                --font-family: ${theme.typography.fontFamily};
                --font-size-xs: ${theme.typography.fontSize.xs};
                --font-size-sm: ${theme.typography.fontSize.sm};
                --font-size-base: ${theme.typography.fontSize.base};
                --font-size-lg: ${theme.typography.fontSize.lg};
                --font-size-xl: ${theme.typography.fontSize.xl};
                --font-size-2xl: ${theme.typography.fontSize['2xl']};
                --font-size-3xl: ${theme.typography.fontSize['3xl']};
                --font-size-4xl: ${theme.typography.fontSize['4xl']};
                --font-weight-normal: ${theme.typography.fontWeight.normal};
                --font-weight-medium: ${theme.typography.fontWeight.medium};
                --font-weight-semibold: ${theme.typography.fontWeight.semibold};
                --font-weight-bold: ${theme.typography.fontWeight.bold};

                /* Text Transform */
                --text-transform-title-uppercase: ${theme.textTransform.title};
                --text-transform-section-uppercase: ${theme.textTransform.section};
            }
        `;
    }
}

// Create global instance
window.ThemeManager = new ThemeManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
} 