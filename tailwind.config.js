/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/templates/**/*.html",
    "./app/static/js/**/*.js",
    "./templates/**/*.html",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary': '#3b82f6',
        'primary-dark': '#2563eb',
        'primary-glow': 'rgba(59,130,246,0.15)',
        'accent': '#8b5cf6',
        'accent-warm': '#f59e0b',
        'accent-teal': '#14b8a6',
        'success': '#10b981',
        'error': '#ef4444',
        'danger': '#ef4444',
        'bg-deep': '#0c1222',
        'bg-card': '#1a2332',
        'bg-card-hover': '#1f2b3d',
        'bg-elevated': '#243044',
        'bg-surface': '#0f172a',
      },
      borderRadius: {
        'lg-2xl': '1.25rem'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        'glow-blue': '0 0 60px rgba(59,130,246,0.15)',
        'glow-purple': '0 0 60px rgba(139,92,246,0.15)',
        'glow-teal': '0 0 60px rgba(20,184,166,0.15)',
      },
      animation: {
        'float': 'float 8s ease-in-out infinite',
        'float-slow': 'float 12s ease-in-out infinite',
        'float-slower': 'float 16s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}
