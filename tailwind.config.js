/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'chat-darkest': '#0b1727',
        'chat-darker': '#111827',
        'chat-dark': '#1f2937',
        'chat-muted': '#374151',
        'chat-accent': '#00a884',
        'chat-accent-secondary': '#0ea5e9'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 }
        },
        pulseSoft: {
          '0%, 100%': { opacity: 0.75 },
          '50%': { opacity: 1 }
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out both',
        'slide-up': 'slideUp 0.35s ease-out both',
        'pulse-soft': 'pulseSoft 2.2s ease-in-out infinite'
      },
      boxShadow: {
        bubble: '0 4px 20px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
};
