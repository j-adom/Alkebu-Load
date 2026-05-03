// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	interface Window {
		rybbit?: {
			pageview?: () => void;
			event?: (name: string, properties?: Record<string, string | number>) => void;
			identify?: (userId: string) => void;
			clearUserId?: () => void;
			getUserId?: () => string | null;
			trackOutbound?: (url: string, text?: string, target?: string) => void;
		};
	}

	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				email: string;
				name?: string;
				role: string;
			};
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
