/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{ts,tsx}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['"DM Sans"', 'sans-serif'],
				display: ['"Space Grotesk"', 'sans-serif'],
				mono: ['"SFMono-Regular"', 'Consolas', 'monospace'],
			},
			colors: {
				background: '#0a0d14',
				foreground: '#f4f7fb',
				surface: '#151c28',
				border: 'rgba(181, 201, 225, .14)',
				primary: '#5ca7ff',
				secondary: '#8b7cff',
				success: '#4fd39a',
				warning: '#f2b866',
				danger: '#f4777c',
				muted: '#9aa8ba',
				ink: '#18231f',
				moss: '#23735b',
				mint: '#d8f3e7',
				coral: '#e56b50',
				paper: '#f6f8f5',
			},
			borderRadius: {
				panel: '16px',
				control: '10px',
			},
			boxShadow: {
				panel: '0 12px 32px rgba(4, 10, 20, .22)',
				glow: '0 0 32px rgba(92, 167, 255, .16)',
			},
		},
			screens: {
				tablet: '900px',
				mobile: '700px',
			},
	},
	plugins: [],
};