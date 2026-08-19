import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: 'hsl(var(--destructive))',
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			// Arthafiloka semantic colors
  			income: '#0F9B58',
  			expense: '#E03E3E',
  			transfer: '#2383E2',
  			warning: '#D9730D',
  			info: '#2383E2',
  			// Owner colors
  			arul: '#2383E2',
  			fifi: '#E255A1',
  			shared: '#9B59B6',
  			// Brand: coklat capybara (aksen modul produktivitas)
  			capybara: 'hsl(var(--capybara))',
  		},
  		fontFamily: {
  			sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
  			mono: ['var(--font-mono)', 'monospace'],
  		},
  		fontSize: {
  			'2xl-title': ['24px', { lineHeight: '32px', fontWeight: '600' }],
  			'xl-header': ['20px', { lineHeight: '28px', fontWeight: '600' }],
  			'lg-card': ['16px', { lineHeight: '24px', fontWeight: '500' }],
  			'base-body': ['14px', { lineHeight: '20px', fontWeight: '400' }],
  			'sm-label': ['12px', { lineHeight: '16px', fontWeight: '400' }],
  			'xs-badge': ['11px', { lineHeight: '14px', fontWeight: '500' }],
  		},
  		spacing: {
  			'nav-height': '64px',
  			'fab-bottom': '80px',
  			'safe-bottom': 'env(safe-area-inset-bottom)',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'sheet': '16px',
  			'card-custom': '12px',
  			'fab': '16px',
  		},
  		boxShadow: {
  			'sm-custom': '0 1px 2px rgba(0,0,0,0.04)',
  			'md-custom': '0 4px 12px rgba(0,0,0,0.08)',
  			'sheet': '0 -4px 24px rgba(0,0,0,0.12)',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in-up': {
  				from: {
  					opacity: '0',
  					transform: 'translate(-50%, 4px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translate(-50%, 0)'
  				}
  			},
  			'bounce-soft': {
  				'0%, 100%': {
  					transform: 'translateY(-1px)'
  				},
  				'50%': {
  					transform: 'translateY(-3px)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in-up': 'fade-in-up 200ms ease-out',
  			'bounce-soft': 'bounce-soft 1.6s ease-in-out infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config