<script>
  import { Facebook, Twitter, Instagram, MapPin, Mail, Phone, Send, ArrowRight } from 'lucide-svelte';

  let email = $state('');
  let isSubmitting = $state(false);
  let submitted = $state(false);

  async function handleNewsletterSubmit(e) {
    e.preventDefault();
    if (!email) return;
    
    isSubmitting = true;
    // TODO: Implement actual newsletter signup
    await new Promise(r => setTimeout(r, 1000));
    submitted = true;
    isSubmitting = false;
  }
</script>

<footer class="bg-gradient-to-b from-card to-muted/50 border-t border-border">
  <div class="container mx-auto px-4 py-12 md:py-16">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
      
      <!-- About Section -->
      <div class="lg:col-span-1">
        <h3 class="text-lg font-bold text-foreground mb-4 font-display">About Alkebu-Lan Images</h3>
        <p class="text-muted-foreground text-sm leading-relaxed mb-6">
          Since 1986, Nashville's center for promoting positivity in Black culture and empowering Black lifestyles through books, art, and community.
        </p>
        
        <!-- Newsletter Signup -->
        <div class="mt-6">
          <p class="text-sm text-foreground font-medium mb-3">Join our newsletter</p>
          {#if submitted}
            <div class="bg-accent/10 text-accent rounded-xl p-3 text-sm animate-fade-in">
              ✓ Thanks for subscribing!
            </div>
          {:else}
            <form onsubmit={handleNewsletterSubmit} class="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email" 
                bind:value={email}
                required
                class="input-modern flex-1 text-sm py-2.5"
                aria-label="Email address for newsletter"
              >
              <button 
                type="submit" 
                disabled={isSubmitting}
                class="btn-primary btn-sm px-3"
                aria-label="Subscribe to newsletter"
              >
                {#if isSubmitting}
                  <span class="animate-spin">⋯</span>
                {:else}
                  <Send size={16} />
                {/if}
              </button>
            </form>
          {/if}
        </div>
      </div>
      
      <!-- Quick Links -->
      <div>
        <h3 class="text-lg font-bold text-foreground mb-4 font-display">Explore</h3>
        <ul class="space-y-3">
          <li>
            <a href="/about/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">
              <ArrowRight size={14} class="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              About Us
            </a>
          </li>
          <li>
            <a href="/shop/books/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">
              <ArrowRight size={14} class="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              Shop Books
            </a>
          </li>
          <li>
            <a href="/blog/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">
              <ArrowRight size={14} class="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              Blog
            </a>
          </li>
          <li>
            <a href="/events/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">
              <ArrowRight size={14} class="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              Events
            </a>
          </li>
          <li>
            <a href="/search/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">
              <ArrowRight size={14} class="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              Search
            </a>
          </li>
        </ul>
      </div>
      
      <!-- Customer Service -->
      <div>
        <h3 class="text-lg font-bold text-foreground mb-4 font-display">Customer Service</h3>
        <ul class="space-y-3">
          <li>
            <a href="/contact/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">
              <ArrowRight size={14} class="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              Contact Us
            </a>
          </li>
          <li>
            <a href="/return-policy/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">
              <ArrowRight size={14} class="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              Return Policy
            </a>
          </li>
          <li>
            <a href="/privacy/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">
              <ArrowRight size={14} class="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              Privacy Policy
            </a>
          </li>
          <li>
            <a href="/terms-of-service/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">
              <ArrowRight size={14} class="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              Terms of Service
            </a>
          </li>
        </ul>
      </div>
      
      <!-- Contact Info -->
      <div>
        <h3 class="text-lg font-bold text-foreground mb-4 font-display">Visit Us</h3>
        <div class="space-y-4">
          <div class="flex gap-3">
            <MapPin size={18} class="text-primary shrink-0 mt-0.5" />
            <p class="text-sm text-muted-foreground">
              2721 Jefferson St<br>Nashville, TN 37208
            </p>
          </div>
          <a href="mailto:info@alkebulanimages.com" class="flex gap-3 text-muted-foreground hover:text-primary transition-colors">
            <Mail size={18} class="shrink-0" />
            <span class="text-sm">info@alkebulanimages.com</span>
          </a>
          <a href="tel:615-321-4111" class="flex gap-3 text-muted-foreground hover:text-primary transition-colors">
            <Phone size={18} class="shrink-0" />
            <span class="text-sm">615-321-4111</span>
          </a>
          
          <!-- Social Links -->
          <div class="flex gap-3 pt-2">
            <a 
              href="https://www.facebook.com/AlkebulanImages/" 
              target="_blank"
              rel="noopener noreferrer"
              class="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
              aria-label="Follow us on Facebook"
            >
              <Facebook size={18} />
            </a>
            <a 
              href="http://www.twitter.com/alkebulanimages" 
              target="_blank"
              rel="noopener noreferrer"
              class="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
              aria-label="Follow us on Twitter"
            >
              <Twitter size={18} />
            </a>
            <a 
              href="http://www.instagram.com/alkebulanimages" 
              target="_blank"
              rel="noopener noreferrer"
              class="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
              aria-label="Follow us on Instagram"
            >
              <Instagram size={18} />
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Bottom Bar -->
  <div class="border-t border-border bg-muted/30">
    <div class="container mx-auto px-4 py-4">
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Alkebu-Lan Images. All rights reserved.</p>
        <div class="flex gap-6">
          <a href="/privacy/" class="hover:text-primary transition-colors">Privacy</a>
          <a href="/terms-of-service/" class="hover:text-primary transition-colors">Terms</a>
        </div>
      </div>
    </div>
  </div>
</footer>
