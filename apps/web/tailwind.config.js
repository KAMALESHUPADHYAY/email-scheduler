/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // MailPilot & Figma color palette
        primary: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          DEFAULT: '#6366F1',
          light: '#EEF2FF',
          hover: '#4F46E5',
        },
        figmaGreen: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#22C55E',
          700: '#0B7B3E',
          light: '#EBF7EE',
        },
        // Clean neutral scale for dense Figma UI
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6', // Light grey input fill & search bar
          200: '#E5E7EB', // 1px border lines
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280', // Muted text
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827', // Dark text
        },
        // Figma badge semantic tokens
        scheduled: {
          bg: '#FFF3E8', // Peach / orange pill background
          text: '#C05621', // Dark peach text
          border: '#FEEBC8',
        },
        sent: {
          bg: '#F1F3F5', // Grey pill background
          text: '#495057', // Grey pill text
          border: '#E9ECEF',
        },
        failed: {
          bg: '#FEE2E2',
          text: '#DC2626',
          border: '#FECACA',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        pixel: ['Courier New', 'Courier', 'monospace'],
      },
      borderRadius: {
        input: '8px',
        card: '12px',
        pill: '9999px',
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['13px', '18px'],
        base: ['14px', '20px'],
        lg: ['16px', '24px'],
        xl: ['18px', '26px'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        popover: '0 4px 12px 0 rgba(0, 0, 0, 0.08)',
        modal: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
