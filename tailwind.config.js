/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./web/index.html",
    "./web/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d1117',
        foreground: '#e6edf3',
        card: '#161b22',
        'card-foreground': '#e6edf3',
        popover: '#161b22',
        'popover-foreground': '#e6edf3',
        primary: '#58a6ff',
        'primary-foreground': '#ffffff',
        secondary: '#21262d',
        'secondary-foreground': '#e6edf3',
        muted: '#30363d',
        'muted-foreground': '#8b949e',
        accent: '#a371f7',
        'accent-foreground': '#ffffff',
        destructive: '#f85149',
        'destructive-foreground': '#ffffff',
        border: '#30363d',
        input: '#21262d',
        ring: '#58a6ff',
        success: '#3fb950',
        warning: '#d29922',
        cyan: '#39c5cf',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        sm: '4px',
      },
    },
  },
  plugins: [],
}

