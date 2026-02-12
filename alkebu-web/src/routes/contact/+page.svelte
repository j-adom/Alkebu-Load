<script>
  import { urlFor } from '$lib/payload';
  import Meta from '$lib/components/Meta.svelte'
  import { MapPin, Mail, Phone, ChevronRight, Send, ArrowRight } from 'lucide-svelte';

  const metadata = {
    title: 'Contact Us | Alkebu-Lan Images',
    description: `We are located at 2721 Jefferson St, Nashville, TN 37208`,
    image: '/assets/images/resources/logo.png',
    imageAlt: 'Alkebu-Lan Images Logo',
    url: '/contact/'
  }

  let { data } = $props();
  const { section1, section2 } = data.contact
</script>

<Meta {metadata} />

<!-- Modern Page Header -->
<section
  class="relative py-20 md:py-28 bg-cover bg-center overflow-hidden"
  style="background-image: url({urlFor(section1.section1image).width(1920).height(600).auto('format').url()});"
>
  <div class="absolute inset-0 bg-gradient-to-br from-kente-forest/90 via-kente-indigo/80 to-kente-forest/90"></div>
  <div class="container relative z-10 mx-auto px-4 text-center">
    <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-display">
      Contact Us
    </h1>
    <p class="text-xl text-white/80 mb-6">We'd love to hear from you</p>
    <nav class="flex items-center justify-center gap-2 text-white/80">
      <a href="/" class="hover:text-kente-gold transition-colors">Home</a>
      <ChevronRight class="w-4 h-4" />
      <span class="text-kente-gold">Contact</span>
    </nav>
  </div>
</section>

<!-- Location Info Card -->
<section class="section bg-background">
  <div class="container mx-auto px-4">
    <!-- Location Card -->
    <div class="max-w-md mx-auto mb-16">
      <div class="card-modern p-8 text-center">
        <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin class="w-8 h-8 text-primary" />
        </div>
        <h2 class="text-2xl font-bold mb-4">Nashville Store</h2>
        <div class="space-y-2 text-muted-foreground mb-6">
          <p>2721 Jefferson St.</p>
          <p>Nashville, TN 37208</p>
        </div>
        <div class="space-y-3">
          <a
            href="mailto:info@alkebulanimages.com"
            class="flex items-center justify-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <Mail class="w-5 h-5" />
            info@alkebulanimages.com
          </a>
          <a
            href="tel:615-321-4111"
            class="flex items-center justify-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <Phone class="w-5 h-5" />
            (615) 321-4111
          </a>
        </div>
      </div>
    </div>

    <!-- Contact Form & Info Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
      <!-- Contact Form -->
      <div class="lg:col-span-7">
        <div class="card-modern p-8">
          <div class="mb-8">
            <p class="text-primary font-semibold uppercase tracking-wide mb-2">Contact With Us</p>
            <h2 class="text-3xl font-bold font-display">Write Us a Message</h2>
            <div class="w-16 h-1 bg-primary mt-4"></div>
          </div>

          <form method="POST" data-netlify="true" name="contact" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="name" class="block text-sm font-medium mb-2">Your Name</label>
                <input type="text" id="name" name="name" placeholder="John Doe" class="input-modern" required>
              </div>
              <div>
                <label for="email" class="block text-sm font-medium mb-2">Email Address</label>
                <input type="email" id="email" name="email" placeholder="john@example.com" class="input-modern" required>
              </div>
              <div>
                <label for="phone" class="block text-sm font-medium mb-2">Phone Number</label>
                <input type="tel" id="phone" name="phone" placeholder="(615) 555-0123" class="input-modern">
              </div>
              <div>
                <label for="subject" class="block text-sm font-medium mb-2">Subject</label>
                <input type="text" id="subject" name="subject" placeholder="How can we help?" class="input-modern" required>
              </div>
              <div class="md:col-span-2">
                <label for="message" class="block text-sm font-medium mb-2">Message</label>
                <textarea id="message" name="message" placeholder="Write your message..." class="textarea-modern" rows="5" required></textarea>
              </div>
              <div class="md:col-span-2">
                <button type="submit" class="btn-primary">
                  <Send class="w-5 h-5" />
                  Send Message
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="lg:col-span-5">
        <div class="sticky top-24 space-y-8">
          <!-- Image -->
          <img
            class="w-full rounded-2xl shadow-medium"
            loading="lazy"
            src="{urlFor(section2.section2image).width(500).height(400).auto('format').url()}"
            alt={section2.section2image?.alt || 'Alkebu-Lan Images'}
          >

          <!-- Info Card -->
          <div class="card-modern p-8 text-center">
            <p class="text-primary font-semibold uppercase tracking-wide mb-2">Get in Touch</p>
            <h3 class="text-2xl font-bold mb-4">Have a Question?</h3>
            <div class="w-12 h-1 bg-primary mx-auto mb-6"></div>
            <p class="text-muted-foreground mb-6">
              Click 'Explore' to see the range of products we have available online.
              As we develop our online presence there may be products we carry in store that we have yet to make available
              on the website so please contact us directly by email or give us a call!
            </p>
            <a href="/about/" class="btn-outline inline-flex items-center gap-2">
              Learn More
              <ArrowRight class="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Map Section -->
<section class="h-[400px] md:h-[500px]">
  <iframe
    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3220.9624727559294!2d-86.82259398390549!3d36.167467810757074!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x886466d290aff66f%3A0x696718ce3d00bfd4!2sAlkebu-Lan%20Images!5e0!3m2!1sen!2sus!4v1603918587239!5m2!1sen!2sus"
    class="w-full h-full border-0"
    allowfullscreen
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
    title="Google Map of Store"
  ></iframe>
</section>