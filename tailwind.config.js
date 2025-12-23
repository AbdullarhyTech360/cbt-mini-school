/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/templates/**/*.html",
    "./app/static/js/**/*.js",
    "./templates/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#1173d4',
        'primary-10': '#e3f2fd',
        'primary-20': '#bbdefb',
        'primary-30': '#90caf9',
        'background-light': '#f6f7f8',
        'background-dark': '#141b25',
        'success': '#10b981',
        'error': '#ef4444',
        'brand-indigo': '#3b82f6',
        'brand-indigo-700': '#1e40af',
        'brand-indigo-900': '#0f172a',
        'accent-teal': '#14b8a6',
        'accent-teal-700': '#0f766e',
        'subtle-gray': '#e6eef8',
        'neutral-50': '#f8fafc',
        'neutral-100': '#f1f5f9',
        'neutral-300': '#cbd5e1',
        'neutral-500': '#64748b',
        'danger': '#ef4444',
        'success': '#16a34a',
      },
      borderRadius: {
        'lg-2xl': '1.25rem'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      }
    },
  },
  plugins: [],
}
