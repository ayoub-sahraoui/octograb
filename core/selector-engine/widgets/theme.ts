/** Shared design tokens for selector engine widgets. */
export const THEME = {
    colors: {
        primary: '#3ba68c',
        primaryLight: '#5cc4a8',
        primaryBg: '#f0faf7',
        primaryBorder: '#a8e1cd',
        primarySubtle: '#d4ece5',
        text: '#1a2e28',
        textMuted: '#6b8c84',
        textSecondary: '#4a6b62',
        surface: '#ffffff',
        overlayBg: 'rgba(15, 40, 35, 0.55)',
    },
    fonts: {
        sans: `'DM Sans', system-ui, sans-serif`,
        mono: `'IBM Plex Mono', monospace`,
    },
    radius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
    },
    shadow: {
        card: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(59,166,140,0.2)',
        tooltip: '0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(59,166,140,0.15)',
        buttons: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
    },
    zIndex: '2147483647',
    zIndexOverlay: '2147483646',
} as const;
