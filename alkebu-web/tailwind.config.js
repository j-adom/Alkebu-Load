import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
const config = {
	darkMode: ["class"],
	content: ["./src/**/*.{html,js,svelte,ts}"],
	safelist: ["dark"],
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px"
			}
		},
		extend: {
			colors: {
				// Afrocentric Color Palette
				kente: {
					gold: "#D4AF37",
					terracotta: "#C45C35",
					forest: "#2D5A3D",
					indigo: "#3D4F7C",
					cream: "#FDF5E6"
				},
				// Brand colors mapped to theme system
				border: "hsl(var(--border) / <alpha-value>)",
				input: "hsl(var(--input) / <alpha-value>)",
				ring: "hsl(var(--ring) / <alpha-value>)",
				background: "hsl(var(--background) / <alpha-value>)",
				foreground: "hsl(var(--foreground) / <alpha-value>)",
				primary: {
					DEFAULT: "hsl(var(--primary) / <alpha-value>)",
					foreground: "hsl(var(--primary-foreground) / <alpha-value>)"
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
					foreground: "hsl(var(--secondary-foreground) / <alpha-value>)"
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
					foreground: "hsl(var(--destructive-foreground) / <alpha-value>)"
				},
				muted: {
					DEFAULT: "hsl(var(--muted) / <alpha-value>)",
					foreground: "hsl(var(--muted-foreground) / <alpha-value>)"
				},
				accent: {
					DEFAULT: "hsl(var(--accent) / <alpha-value>)",
					foreground: "hsl(var(--accent-foreground) / <alpha-value>)"
				},
				popover: {
					DEFAULT: "hsl(var(--popover) / <alpha-value>)",
					foreground: "hsl(var(--popover-foreground) / <alpha-value>)"
				},
				card: {
					DEFAULT: "hsl(var(--card) / <alpha-value>)",
					foreground: "hsl(var(--card-foreground) / <alpha-value>)"
				}
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
				xl: "1rem",
				"2xl": "1.5rem"
			},
			fontFamily: {
				sans: ["Inter", ...fontFamily.sans],
				display: ["Outfit", ...fontFamily.sans],
				serif: ["Lora", ...fontFamily.serif]
			},
			animation: {
				"fade-in": "fadeIn 0.3s ease-out",
				"fade-in-up": "fadeInUp 0.4s ease-out",
				"slide-in-right": "slideInRight 0.3s ease-out",
				"slide-in-left": "slideInLeft 0.3s ease-out",
				"scale-in": "scaleIn 0.2s ease-out",
				"bounce-subtle": "bounceSubtle 0.5s ease-out",
				"pulse-soft": "pulseSoft 2s ease-in-out infinite",
				"shimmer": "shimmer 2s linear infinite"
			},
			keyframes: {
				fadeIn: {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" }
				},
				fadeInUp: {
					"0%": { opacity: "0", transform: "translateY(10px)" },
					"100%": { opacity: "1", transform: "translateY(0)" }
				},
				slideInRight: {
					"0%": { opacity: "0", transform: "translateX(100%)" },
					"100%": { opacity: "1", transform: "translateX(0)" }
				},
				slideInLeft: {
					"0%": { opacity: "0", transform: "translateX(-100%)" },
					"100%": { opacity: "1", transform: "translateX(0)" }
				},
				scaleIn: {
					"0%": { opacity: "0", transform: "scale(0.95)" },
					"100%": { opacity: "1", transform: "scale(1)" }
				},
				bounceSubtle: {
					"0%, 100%": { transform: "translateY(0)" },
					"50%": { transform: "translateY(-5px)" }
				},
				pulseSoft: {
					"0%, 100%": { opacity: "1" },
					"50%": { opacity: "0.7" }
				},
				shimmer: {
					"0%": { backgroundPosition: "-200% 0" },
					"100%": { backgroundPosition: "200% 0" }
				}
			},
			boxShadow: {
				"soft": "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
				"medium": "0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 30px -5px rgba(0, 0, 0, 0.08)",
				"strong": "0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 20px 50px -15px rgba(0, 0, 0, 0.12)",
				"glow": "0 0 30px rgba(212, 175, 55, 0.3)",
				"glow-terracotta": "0 0 30px rgba(196, 92, 53, 0.3)"
			},
			transitionTimingFunction: {
				"smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
				"bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)"
			},
			backdropBlur: {
				xs: "2px"
			}
		}
	},
	plugins: []
};

export default config;
