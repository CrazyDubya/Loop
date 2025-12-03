/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Loop Studio color palette
        loop: {
          // Primary colors
          primary: '#6366f1',      // Indigo for primary actions
          secondary: '#8b5cf6',    // Violet for secondary
          accent: '#06b6d4',       // Cyan for accents

          // Background colors
          bg: {
            dark: '#1e1e2e',       // Dark mode background
            darker: '#181825',     // Darker panels
            light: '#f8fafc',      // Light mode background
            lighter: '#ffffff'    // Light panels
          },

          // Node type colors (matching graph concepts)
          node: {
            event: '#22c55e',      // Green - regular events
            decision: '#eab308',   // Yellow - decision points
            location: '#3b82f6',   // Blue - locations
            encounter: '#f97316',  // Orange - encounters
            discovery: '#a855f7',  // Purple - discoveries
            death: '#ef4444',      // Red - death nodes
            reset: '#f43f5e'       // Rose - reset triggers
          },

          // Status colors
          status: {
            success: '#22c55e',
            warning: '#eab308',
            error: '#ef4444',
            info: '#3b82f6'
          },

          // Emotional state colors
          emotion: {
            hopeful: '#22c55e',
            curious: '#06b6d4',
            frustrated: '#f97316',
            desperate: '#ef4444',
            numb: '#6b7280',
            determined: '#3b82f6',
            broken: '#881337',
            calm: '#14b8a6',
            angry: '#dc2626',
            resigned: '#9ca3af'
          }
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.2s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    }
  },
  plugins: []
};
