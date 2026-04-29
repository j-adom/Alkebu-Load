<script>
  import { urlFor } from '$lib/payload';

  let { data } = $props();
  const settings = $derived(data.settings || {});
</script>

<svelte:head>
  <title>Privacy Policy | Alkebu-Lan Images</title>
  <meta name="description" content="Privacy policy for Alkebu-Lan Images. Learn how we collect, use, and protect your personal information, and how to request data removal." />
</svelte:head>

<section class="page-header" style="background-image: url({urlFor(settings.banner).width(1920).height(300).auto('format').url()});">
  <div class="container">
    <h2>Privacy Policy</h2>
    <ul class="flex items-center gap-2 text-sm text-white/80">
      <li><a href="/">Home</a></li>
      <li><span>Privacy Policy</span></li>
    </ul>
  </div>
</section>

<section class="py-12 lg:py-16">
  <div class="container mx-auto px-6 lg:px-12 max-w-4xl">
    <p class="text-sm text-muted-foreground mb-8">Last updated: April 2026</p>

    <div class="prose max-w-none space-y-10">

      <!-- Intro -->
      <div>
        <p class="text-lg text-foreground leading-relaxed">
          Alkebu-Lan Images ("we," "us," or "our") operates the website alkebulanimages.com and the physical retail store located at 2721 Jefferson St., Nashville, TN 37208. This Privacy Policy describes how we collect, use, store, and protect your personal information when you visit our website, make a purchase, call our store, or otherwise interact with our business.
        </p>
        <p class="text-foreground/80 mt-4">
          By using our website or providing your information to us, you agree to the practices described in this policy. If you do not agree, please do not use our website or provide us with your personal information.
        </p>
      </div>

      <!-- What We Collect -->
      <div>
        <h2 class="text-2xl font-bold text-foreground mb-4">1. Information We Collect</h2>
        <p class="text-foreground/80 mb-4">We collect information in the following ways:</p>

        <div class="space-y-4">
          <div class="bg-muted rounded-lg p-5">
            <h3 class="font-semibold text-foreground mb-2">Information You Provide Directly</h3>
            <ul class="list-disc list-inside space-y-1 text-sm text-foreground/80 pl-2">
              <li>Name, email address, phone number, and shipping/billing address when you place an order</li>
              <li>Phone number when you call our store</li>
              <li>Email address when you sign up for communications or submit an inquiry</li>
              <li>Payment information (processed securely by Stripe; we never see or store your full card details)</li>
              <li>Any information you voluntarily share via email, phone, text message, or in-store interactions</li>
            </ul>
          </div>

          <div class="bg-muted rounded-lg p-5">
            <h3 class="font-semibold text-foreground mb-2">Information Collected Automatically</h3>
            <ul class="list-disc list-inside space-y-1 text-sm text-foreground/80 pl-2">
              <li>IP address, browser type, operating system, and device information</li>
              <li>Pages visited, time spent on pages, and referring URLs</li>
              <li>Search queries made on our website</li>
              <li>Cart and browsing activity to improve your shopping experience</li>
              <li>Cookies and similar tracking technologies (see Cookies section below)</li>
            </ul>
          </div>

          <div class="bg-muted rounded-lg p-5">
            <h3 class="font-semibold text-foreground mb-2">Information from Third-Party Sources</h3>
            <ul class="list-disc list-inside space-y-1 text-sm text-foreground/80 pl-2">
              <li>Payment confirmation data from our payment processor</li>
              <li>Inventory and order data from our retail point-of-sale system</li>
              <li>Aggregate engagement metrics from our self-hosted, privacy-focused analytics</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- How We Use It -->
      <div>
        <h2 class="text-2xl font-bold text-foreground mb-4">2. How We Use Your Information</h2>
        <p class="text-foreground/80 mb-4">We use the information we collect for the following purposes:</p>
        <ul class="list-disc list-inside space-y-2 text-foreground/80 pl-2">
          <li><strong>Processing and fulfilling orders</strong> - including shipping, payment processing, and sending order confirmations and updates</li>
          <li><strong>Customer service</strong> - responding to inquiries, resolving issues, and communicating about your orders or account</li>
          <li><strong>Transactional communications</strong> - sending order confirmations, shipping notifications, and other messages directly related to your purchases or inquiries</li>
          <li><strong>Store communications via text message</strong> - when you call our store phone number, we may respond via text message to provide information, answer questions, or follow up on your inquiry (see Section 3 below)</li>
          <li><strong>Improving our services</strong> - analyzing website usage, search patterns, and shopping behavior to improve our product offerings and website experience</li>
          <li><strong>Legal compliance</strong> - complying with applicable laws, regulations, and legal processes</li>
        </ul>
      </div>

      <!-- Text Messaging -->
      <div class="bg-card rounded-xl p-6 lg:p-8 border-2 border-primary/20">
        <h2 class="text-2xl font-bold text-foreground mb-4">3. Text Messaging & Phone Communications</h2>
        <p class="text-foreground/80 mb-4">
          Alkebu-Lan Images uses a business phone system to manage calls and conversational text messages with our customers. Our SMS program is designed for <strong>one-to-one conversational messaging</strong> in response to customer-initiated contact — for example, replying to a question you asked, confirming the status of an order or special request, or following up on an in-store conversation. We do not send marketing or promotional text blasts.
        </p>

        <div class="space-y-4">
          <div>
            <h3 class="font-semibold text-foreground mb-2">When and How You Opt In</h3>
            <p class="text-sm text-foreground/80">
              You consent to receive text messages from us when you (1) call our store phone number and engage in a conversation in which you give explicit verbal consent to be texted (see verbal opt-in script below), (2) provide your mobile number through our website, an in-store form, or an order — and indicate you would like a text response, or (3) reply to a text we send confirming your interest in continuing by text. We will only text you about <strong>your specific inquiry, order, or request</strong>. Message frequency varies based on the conversation. <strong>Consent to receive text messages is not a condition of any purchase.</strong>
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-foreground mb-2">Verbal Opt-In Script (Phone Calls)</h3>
            <p class="text-sm text-foreground/80 mb-3">
              When a customer calls our store and the conversation indicates a text follow-up would be useful (for example, sending product details, an order update, or a special-request confirmation), our staff use the following script to capture explicit verbal consent before any text message is sent:
            </p>
            <div class="bg-muted rounded-lg p-4 text-sm text-foreground/90 italic border-l-4 border-primary">
              <p class="mb-2">
                <strong class="not-italic">Staff:</strong> "This is [staff name] with Alkebu-Lan Images. I can send that information to you by text message if you'd like. We'd only text you about this specific request. Message and data rates may apply, and you can reply STOP at any time to opt out. Would you like me to send a text to the phone number you're calling from?"
              </p>
              <p class="mb-2">
                <strong class="not-italic">Customer must respond:</strong> "Yes" (or equivalent affirmative).
              </p>
              <p>
                <strong class="not-italic">Staff confirms:</strong> "Great. I'll text you shortly. Reply STOP at any time to stop receiving texts from us."
              </p>
            </div>
            <p class="text-sm text-foreground/80 mt-3">
              Staff are trained to <strong>not</strong> send any text message until the customer has given explicit verbal consent using this script. If a customer does not affirmatively agree, we follow up by phone callback or email instead. Verbal consent is logged with the date and time so we can verify opt-in if questioned.
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-foreground mb-2">Message and Data Rates</h3>
            <p class="text-sm text-foreground/80">
              <strong>Message and data rates may apply</strong> based on your mobile carrier plan. Alkebu-Lan Images does not charge for text messages, but your carrier may charge you for sending or receiving SMS messages. Contact your wireless provider for details about your plan.
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-foreground mb-2">How to Opt Out (Reply STOP or UNSUBSCRIBE)</h3>
            <p class="text-sm text-foreground/80">
              You may opt out of text messages at any time by replying <strong>STOP</strong> or <strong>UNSUBSCRIBE</strong> to any text message from us. We also honor <strong>END</strong>, <strong>CANCEL</strong>, and <strong>QUIT</strong> as opt-out commands. After you reply with any of these keywords, we will send a single confirmation message and will not text you again unless you opt back in. You may opt back in by replying <strong>START</strong> or by contacting us. After opting out, we will only respond to your inquiries via phone callback or email.
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-foreground mb-2">How to Get Help (Reply HELP)</h3>
            <p class="text-sm text-foreground/80">
              For help with our text message program, reply <strong>HELP</strong> to any text from us, email <a href="mailto:info@alkebulanimages.com" class="text-primary hover:underline">info@alkebulanimages.com</a>, or call <a href="tel:6153214111" class="text-primary hover:underline">(615) 321-4111</a>. We will respond with information about how to opt out and how to reach a person.
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-foreground mb-2">How We Handle Your SMS Information</h3>
            <p class="text-sm text-foreground/80 mb-3">
              <strong>Customer data is not shared with 3rd parties for promotional or marketing purposes.</strong> <strong>Mobile opt-in and consent are never shared with anyone for any purpose.</strong> Any information sharing that may be mentioned elsewhere in this policy excludes mobile opt-in data.
            </p>
            <p class="text-sm text-foreground/80 mb-3">
              We do not transfer, share, sell, rent, or disclose consumer SMS opt-in data, consent records, or mobile numbers to any external organizations except service providers strictly necessary to deliver the messaging service, and never for marketing purposes. Consumer SMS and mobile data is not transferred, shared, sold, rented, or disclosed to outside organizations except when needed to deliver the messaging service. SMS opt-in data, consent records, and mobile numbers are not shared with third parties for marketing or other non-essential purposes.
            </p>
            <p class="text-sm text-foreground/80 mb-2">In addition:</p>
            <ul class="list-disc list-inside space-y-1 text-sm text-foreground/80 pl-2">
              <li>We do <strong>not</strong> send unsolicited marketing or promotional text messages</li>
              <li>We do <strong>not</strong> use auto-dialers, bulk texting tools, or marketing campaigns over SMS</li>
              <li>We do <strong>not</strong> require text-message consent as a condition of buying anything from us</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Consent -->
      <div>
        <h2 class="text-2xl font-bold text-foreground mb-4">4. Consent</h2>

        <h3 class="font-semibold text-foreground mb-2">When do we obtain your consent?</h3>
        <p class="text-foreground/80 mb-4">
          When you provide personal information to complete a transaction, place an order, or initiate contact with us (including by phone), you consent to our collecting and using that information for the specific purpose of fulfilling that interaction. For any secondary use of your information, such as email marketing, we will obtain your express consent or provide a clear opportunity to opt out.
        </p>

        <h3 class="font-semibold text-foreground mb-2">How do I withdraw my consent?</h3>
        <p class="text-foreground/80">
          You may withdraw your consent at any time by contacting us at <a href="mailto:info@alkebulanimages.com" class="text-primary hover:underline">info@alkebulanimages.com</a>, calling <a href="tel:6153214111" class="text-primary hover:underline">(615) 321-4111</a>, or writing to us at our store address. Upon withdrawal, we will stop using your information for the purposes you have withdrawn consent for, except where we are legally required to retain certain records (such as completed transaction records for tax and accounting purposes).
        </p>
      </div>

      <!-- Data Removal -->
      <div class="bg-accent/10 rounded-xl p-6 lg:p-8 border border-accent/20">
        <h2 class="text-2xl font-bold text-foreground mb-4">5. Your Data Rights & Removal Requests</h2>
        <p class="text-foreground/80 mb-4">
          You have the right to access, correct, and request deletion of the personal information we hold about you.
        </p>

        <div class="space-y-4">
          <div>
            <h3 class="font-semibold text-foreground mb-2">You may request to:</h3>
            <ul class="list-disc list-inside space-y-1 text-sm text-foreground/80 pl-2">
              <li><strong>Access</strong> the personal information we have on file for you</li>
              <li><strong>Correct</strong> any inaccurate information</li>
              <li><strong>Delete</strong> your personal information from our systems and customer lists</li>
              <li><strong>Opt out</strong> of any marketing or communication lists</li>
              <li><strong>Export</strong> a copy of your data in a portable format</li>
            </ul>
          </div>

          <div>
            <h3 class="font-semibold text-foreground mb-2">How to submit a request</h3>
            <p class="text-sm text-foreground/80 mb-2">
              Send your request to <a href="mailto:info@alkebulanimages.com" class="text-primary hover:underline">info@alkebulanimages.com</a> with the subject line "Data Request" and include your full name and the email address associated with your account or orders.
            </p>
            <p class="text-sm text-foreground/80">
              We will respond to your request within <strong>30 days</strong>. We may need to verify your identity before processing the request. Certain data related to completed financial transactions may be retained as required by tax and accounting regulations.
            </p>
          </div>
        </div>
      </div>

      <!-- Disclosure -->
      <div>
        <h2 class="text-2xl font-bold text-foreground mb-4">6. When We Disclose Your Information</h2>
        <p class="text-foreground/80 mb-3">We may disclose your personal information only in the following circumstances:</p>
        <ul class="list-disc list-inside space-y-2 text-foreground/80 pl-2">
          <li>To <strong>service providers</strong> who assist us in operating our business (payment processing, shipping, email delivery) - these providers only receive the information necessary to perform their services</li>
          <li>When <strong>required by law</strong>, such as in response to a subpoena, court order, or legal process</li>
          <li>If you <strong>violate our Terms of Service</strong></li>
          <li>To protect our rights, property, or safety, or the rights, property, or safety of others</li>
          <li>In the event of a <strong>business transfer</strong>, such as a merger, acquisition, or sale of assets, in which case you will be notified</li>
        </ul>
        <p class="text-foreground/80 mt-3">
          <strong>We do not sell, rent, or trade your personal information to third parties for their marketing purposes.</strong>
        </p>
      </div>

      <!-- Payments -->
      <div>
        <h2 class="text-2xl font-bold text-foreground mb-4">7. Payment Processing & Security</h2>
        <p class="text-foreground/80 mb-3">
          Our online store uses <strong>Stripe</strong> for secure payment processing. When you make a purchase:
        </p>
        <ul class="list-disc list-inside space-y-2 text-foreground/80 pl-2">
          <li>Your payment card information is transmitted directly to Stripe using TLS encryption and is never stored on our servers</li>
          <li>Stripe is PCI DSS Level 1 compliant, the highest level of certification available</li>
          <li>We store your order history, shipping details, and transaction records in our secure content management system with encrypted database storage</li>
          <li>We never see or store your full credit card number, CVV, or other sensitive payment data</li>
        </ul>
      </div>

      <!-- Third-Party Services -->
      <div>
        <h2 class="text-2xl font-bold text-foreground mb-4">8. Third-Party Services</h2>
        <p class="text-foreground/80 mb-3">
          We use third-party service providers to operate our business. Each provider only receives the information necessary to perform their function. The categories of providers we rely on include:
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="bg-muted rounded-lg p-4">
            <p class="font-semibold text-foreground text-sm">Payment Processing</p>
            <p class="text-xs text-foreground/60">PCI-compliant payment processor (Stripe)</p>
          </div>
          <div class="bg-muted rounded-lg p-4">
            <p class="font-semibold text-foreground text-sm">Shipping & Fulfillment</p>
            <p class="text-xs text-foreground/60">USPS, UPS, and partnered shipping platforms</p>
          </div>
          <div class="bg-muted rounded-lg p-4">
            <p class="font-semibold text-foreground text-sm">Point-of-Sale & Inventory</p>
            <p class="text-xs text-foreground/60">Retail point-of-sale provider</p>
          </div>
          <div class="bg-muted rounded-lg p-4">
            <p class="font-semibold text-foreground text-sm">Business Phone & SMS</p>
            <p class="text-xs text-foreground/60">Business phone and conversational SMS provider</p>
          </div>
          <div class="bg-muted rounded-lg p-4">
            <p class="font-semibold text-foreground text-sm">Email Delivery</p>
            <p class="text-xs text-foreground/60">Transactional email service for order and contact replies</p>
          </div>
          <div class="bg-muted rounded-lg p-4">
            <p class="font-semibold text-foreground text-sm">Hosting & Security</p>
            <p class="text-xs text-foreground/60">Web hosting, content delivery, and bot protection</p>
          </div>
          <div class="bg-muted rounded-lg p-4">
            <p class="font-semibold text-foreground text-sm">Web Analytics</p>
            <p class="text-xs text-foreground/60">Self-hosted, privacy-focused analytics (no cookies, no third-party data sharing)</p>
          </div>
        </div>
        <p class="text-foreground/80 mt-4 text-sm">
          We name the payment processor (Stripe) explicitly because customers interact with their payment interface directly during checkout. Other providers operate behind the scenes and are listed by category. Each provider maintains their own privacy practices. Once you leave our website or interact with a third-party service, you are subject to that provider's policies.
        </p>
      </div>

      <!-- Cookies -->
      <div>
        <h2 class="text-2xl font-bold text-foreground mb-4">9. Cookies, Tracking, and Analytics</h2>
        <p class="text-foreground/80 mb-3">
          Our website uses cookies and similar technologies only where necessary to deliver the site:
        </p>
        <ul class="list-disc list-inside space-y-2 text-foreground/80 pl-2">
          <li><strong>Essential cookies</strong> — required for shopping cart functionality, login sessions, and checkout to work</li>
          <li><strong>Preference cookies</strong> — remember your settings (such as theme or saved address fields) for future visits</li>
        </ul>
        <p class="text-foreground/80 mt-4 mb-3">
          For web analytics we use a <strong>self-hosted, privacy-focused analytics service</strong>. This service measures aggregate page views and basic engagement metrics (such as which pages are popular and roughly where visitors come from) without using cookies, without assigning persistent identifiers to you, and without sharing data with any third-party advertising or marketing service. We do not use Google Analytics, Meta Pixel, TikTok Pixel, or other cross-site tracking pixels.
        </p>
        <p class="text-foreground/80 mt-3">
          You can control cookies through your browser settings. To opt out of analytics, you can enable your browser's <em>Do Not Track</em> setting, use a privacy-focused browser, or block the analytics script with a content blocker. Disabling essential cookies may limit certain website functionality, including the ability to add items to your cart or complete checkout.
        </p>
      </div>

      <!-- Data Security -->
      <div>
        <h2 class="text-2xl font-bold text-foreground mb-4">10. Data Security</h2>
        <p class="text-foreground/80">
          We take reasonable precautions and follow industry best practices to protect your personal information from unauthorized access, alteration, disclosure, or destruction. Our website uses SSL/TLS encryption for all data transmitted between your browser and our servers. While no method of electronic storage or transmission is 100% secure, we implement commercially reasonable security measures consistent with industry standards.
        </p>
      </div>

      <!-- Children -->
      <div>
        <h2 class="text-2xl font-bold text-foreground mb-4">11. Age Requirement</h2>
        <p class="text-foreground/80">
          Our website and online store are intended for users who are at least 18 years of age, or the age of majority in their state or province of residence. By using this site, you represent that you meet this requirement. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us so we can promptly delete it.
        </p>
      </div>

      <!-- Changes -->
      <div>
        <h2 class="text-2xl font-bold text-foreground mb-4">12. Changes to This Policy</h2>
        <p class="text-foreground/80">
          We reserve the right to update this Privacy Policy at any time. Changes take effect immediately upon posting to this page. The "Last updated" date at the top reflects the most recent revision. For material changes that significantly affect how we handle your data, we will make reasonable efforts to notify you via email or a prominent notice on our website.
        </p>
      </div>

      <!-- Contact -->
      <div class="bg-card rounded-xl p-6 lg:p-8 border border-border">
        <h2 class="text-2xl font-bold text-foreground mb-4">13. Contact Us</h2>
        <p class="text-foreground/80 mb-4">
          For questions about this Privacy Policy, to submit a data access or removal request, or to file a complaint, contact us:
        </p>
        <div class="space-y-3 text-sm text-foreground/80">
          <div class="flex items-center gap-3">
            <i class="far fa-envelope text-primary text-lg"></i>
            <a href="mailto:info@alkebulanimages.com" class="text-primary hover:underline">info@alkebulanimages.com</a>
          </div>
          <div class="flex items-center gap-3">
            <i class="far fa-phone text-primary text-lg"></i>
            <a href="tel:6153214111" class="text-primary hover:underline">(615) 321-4111</a>
          </div>
          <div class="flex items-start gap-3">
            <i class="far fa-map-marker-alt text-primary text-lg mt-0.5"></i>
            <address class="not-italic">
              Alkebu-Lan Images<br>
              2721 Jefferson St.<br>
              Nashville, TN 37208, USA
            </address>
          </div>
        </div>
      </div>

    </div>
  </div>
</section>
