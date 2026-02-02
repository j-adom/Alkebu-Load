<script>
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { Search, ShoppingBag, Menu, X, Phone, Mail, ChevronDown, Facebook, Twitter, Instagram } from 'lucide-svelte';
	import CartIconButton from '$lib/components/cart/CartIconButton.svelte';
	
	let mobileMenuOpen = $state(false);
	let scrolled = $state(false);
	let shopDropdownOpen = $state(false);
	
	let activeUrl = $derived($page.url.pathname);
	
	// Handle scroll for sticky header effect
	$effect(() => {
		if (!browser) return;
		
		const handleScroll = () => {
			scrolled = window.scrollY > 100;
		};
		
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	});
	
	// Close mobile menu on route change
	$effect(() => {
		if (activeUrl) {
			mobileMenuOpen = false;
		}
	});
	
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
	
	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
	
	function isActive(path) {
		if (path === '/') return activeUrl === '/';
		return activeUrl.startsWith(path);
	}
</script>

<!-- Top Bar -->
<div class="bg-gradient-to-r from-primary/10 via-background to-secondary/10 border-b border-border hidden lg:block">
	<div class="container mx-auto px-4">
		<div class="flex items-center justify-between h-10 text-sm">
			<div class="flex items-center gap-6">
				<a href="mailto:info@alkebulanimages.com" class="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
					<Mail size={14} />
					info@alkebulanimages.com
				</a>
				<a href="tel:615-321-4111" class="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
					<Phone size={14} />
					615-321-4111
				</a>
			</div>
			<div class="flex items-center gap-4">
				<a href="https://www.facebook.com/AlkebulanImages/" target="_blank" rel="noopener" class="text-muted-foreground hover:text-primary transition-colors" aria-label="Facebook">
					<Facebook size={16} />
				</a>
				<a href="https://twitter.com/alkebulanimages" target="_blank" rel="noopener" class="text-muted-foreground hover:text-primary transition-colors" aria-label="Twitter">
					<Twitter size={16} />
				</a>
				<a href="https://www.instagram.com/alkebulanimages" target="_blank" rel="noopener" class="text-muted-foreground hover:text-primary transition-colors" aria-label="Instagram">
					<Instagram size={16} />
				</a>
			</div>
		</div>
	</div>
</div>

<!-- Main Navigation -->
<header 
	class="sticky top-0 z-50 transition-all duration-300
		{scrolled ? 'bg-background/95 backdrop-blur-md shadow-soft border-b border-border' : 'bg-background border-b border-transparent'}"
>
	<div class="container mx-auto px-4">
		<div class="flex items-center justify-between h-16 lg:h-20">
			<!-- Mobile Menu Button -->
			<button 
				type="button" 
				class="lg:hidden p-2 -ml-2 text-foreground hover:text-primary transition-colors"
				onclick={toggleMobileMenu}
				aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
			>
				{#if mobileMenuOpen}
					<X size={24} />
				{:else}
					<Menu size={24} />
				{/if}
			</button>
			
			<!-- Logo -->
			<a href="/" class="flex-shrink-0">
				<img 
					src="/assets/images/resources/logo.png" 
					alt="Alkebu-Lan Images" 
					class="h-12 lg:h-16 w-auto transition-all duration-300 {scrolled ? 'h-10 lg:h-12' : ''}"
				/>
			</a>
			
			<!-- Desktop Navigation -->
			<nav class="hidden lg:flex items-center gap-1">
				<a 
					href="/" 
					class="px-4 py-2 rounded-lg font-medium transition-colors
						{isActive('/') && activeUrl === '/' ? 'text-primary bg-primary/10' : 'text-foreground hover:text-primary hover:bg-muted'}"
				>
					Home
				</a>
				<a 
					href="/about" 
					class="px-4 py-2 rounded-lg font-medium transition-colors
						{isActive('/about') ? 'text-primary bg-primary/10' : 'text-foreground hover:text-primary hover:bg-muted'}"
				>
					About
				</a>
				
				<!-- Shop Dropdown -->
				<div class="relative group">
					<a 
						href="/shop" 
						class="flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors
							{isActive('/shop') ? 'text-primary bg-primary/10' : 'text-foreground hover:text-primary hover:bg-muted'}"
					>
						Shop
						<ChevronDown size={16} class="transition-transform group-hover:rotate-180" />
					</a>
					<div class="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
						<div class="bg-card rounded-xl border border-border shadow-medium py-2 min-w-[200px]">
							<a href="/shop/books" class="block px-4 py-2 text-foreground hover:text-primary hover:bg-muted transition-colors">
								Books
							</a>
							<a href="/shop/apparel" class="block px-4 py-2 text-foreground hover:text-primary hover:bg-muted transition-colors">
								Apparel
							</a>
							<a href="/shop/health-and-beauty" class="block px-4 py-2 text-foreground hover:text-primary hover:bg-muted transition-colors">
								Health & Beauty
							</a>
							<a href="/shop/home-goods" class="block px-4 py-2 text-foreground hover:text-primary hover:bg-muted transition-colors">
								Art & Imports
							</a>
						</div>
					</div>
				</div>
				
				<a 
					href="/blog" 
					class="px-4 py-2 rounded-lg font-medium transition-colors
						{isActive('/blog') ? 'text-primary bg-primary/10' : 'text-foreground hover:text-primary hover:bg-muted'}"
				>
					Blog
				</a>
				<a 
					href="/events" 
					class="px-4 py-2 rounded-lg font-medium transition-colors
						{isActive('/events') ? 'text-primary bg-primary/10' : 'text-foreground hover:text-primary hover:bg-muted'}"
				>
					Events
				</a>
				<a 
					href="/contact" 
					class="px-4 py-2 rounded-lg font-medium transition-colors
						{isActive('/contact') ? 'text-primary bg-primary/10' : 'text-foreground hover:text-primary hover:bg-muted'}"
				>
					Contact
				</a>
			</nav>
			
			<!-- Right Side Actions -->
			<div class="flex items-center gap-2">
				<a 
					href="/search" 
					class="p-2 rounded-full text-foreground hover:text-primary hover:bg-muted transition-colors"
					aria-label="Search"
				>
					<Search size={20} />
				</a>
				<CartIconButton />
			</div>
		</div>
	</div>
</header>

<!-- Mobile Menu Overlay -->
{#if mobileMenuOpen}
	<div 
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
		onclick={closeMobileMenu}
		role="button"
		tabindex="-1"
		aria-label="Close menu"
	></div>
{/if}

<!-- Mobile Menu Drawer -->
<aside 
	class="fixed top-0 left-0 z-50 h-full w-80 max-w-[85vw] bg-card border-r border-border shadow-strong
		transform transition-transform duration-300 ease-smooth lg:hidden
		{mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}"
>
	<div class="flex flex-col h-full">
		<!-- Header -->
		<div class="flex items-center justify-between p-4 border-b border-border">
			<img src="/assets/images/resources/logo.png" alt="Alkebu-Lan Images" class="h-10" />
			<button 
				type="button" 
				class="p-2 text-foreground hover:text-primary transition-colors"
				onclick={closeMobileMenu}
				aria-label="Close menu"
			>
				<X size={24} />
			</button>
		</div>
		
		<!-- Navigation Links -->
		<nav class="flex-1 overflow-y-auto p-4">
			<div class="space-y-1">
				<a 
					href="/" 
					class="block px-4 py-3 rounded-xl font-medium transition-colors
						{isActive('/') && activeUrl === '/' ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted'}"
				>
					Home
				</a>
				<a 
					href="/about" 
					class="block px-4 py-3 rounded-xl font-medium transition-colors
						{isActive('/about') ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted'}"
				>
					About Us
				</a>
				
				<!-- Shop Section -->
				<div class="py-2">
					<button 
						type="button"
						class="w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors
							{isActive('/shop') ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted'}"
						onclick={() => shopDropdownOpen = !shopDropdownOpen}
					>
						Shop
						<ChevronDown size={18} class="transition-transform {shopDropdownOpen ? 'rotate-180' : ''}" />
					</button>
					{#if shopDropdownOpen}
						<div class="mt-1 ml-4 space-y-1 animate-fade-in">
							<a href="/shop/books" class="block px-4 py-2 text-muted-foreground hover:text-primary transition-colors">
								Books
							</a>
							<a href="/shop/apparel" class="block px-4 py-2 text-muted-foreground hover:text-primary transition-colors">
								Apparel
							</a>
							<a href="/shop/health-and-beauty" class="block px-4 py-2 text-muted-foreground hover:text-primary transition-colors">
								Health & Beauty
							</a>
							<a href="/shop/home-goods" class="block px-4 py-2 text-muted-foreground hover:text-primary transition-colors">
								Art & Imports
							</a>
						</div>
					{/if}
				</div>
				
				<a 
					href="/blog" 
					class="block px-4 py-3 rounded-xl font-medium transition-colors
						{isActive('/blog') ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted'}"
				>
					Blog
				</a>
				<a 
					href="/events" 
					class="block px-4 py-3 rounded-xl font-medium transition-colors
						{isActive('/events') ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted'}"
				>
					Events
				</a>
				<a 
					href="/contact" 
					class="block px-4 py-3 rounded-xl font-medium transition-colors
						{isActive('/contact') ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-muted'}"
				>
					Contact Us
				</a>
			</div>
		</nav>
		
		<!-- Footer -->
		<div class="p-4 border-t border-border space-y-4">
			<div class="space-y-2 text-sm">
				<a href="mailto:info@alkebulanimages.com" class="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
					<Mail size={16} />
					info@alkebulanimages.com
				</a>
				<a href="tel:615-321-4111" class="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
					<Phone size={16} />
					615-321-4111
				</a>
			</div>
			<div class="flex gap-4">
				<a href="https://www.facebook.com/AlkebulanImages/" target="_blank" rel="noopener" class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all" aria-label="Facebook">
					<Facebook size={18} />
				</a>
				<a href="https://twitter.com/alkebulanimages" target="_blank" rel="noopener" class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all" aria-label="Twitter">
					<Twitter size={18} />
				</a>
				<a href="https://www.instagram.com/alkebulanimages" target="_blank" rel="noopener" class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all" aria-label="Instagram">
					<Instagram size={18} />
				</a>
			</div>
		</div>
	</div>
</aside>
