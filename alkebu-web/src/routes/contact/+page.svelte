<script>
    import { urlFor } from '$lib/payload';
    import Meta from '$lib/components/Meta.svelte'
    
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

<style>
    .input-group :last-child {
        border-top-left-radius: var(--rounded-btn, 0.5rem);
        border-top-right-radius: var(--rounded-btn, 0.5rem);
        border-bottom-left-radius: var(--rounded-btn, 0.5rem);
        border-bottom-right-radius: var(--rounded-btn, 0.5rem);
    }
</style>

<Meta {metadata} />

<section class="page-header" style="background-image: url({urlFor(section1.section1image).width(1920).height(300).auto('format').url()});">
    <div class="container">
        <h2>Contact</h2>
        <ul class="thm-breadcrumb list-unstyled">
            <li><a href="/">Home</a></li>
            <li><span>Contact</span></li>
        </ul>
    </div>
</section>

<section class="location">
    <div class="container px-24 mx-auto">
        <div class="row">
            <div class="col-xl-3 col-lg-3 col-md-6">
                <div class="location_single">
                    <h2>Nashville</h2>
                    <p>2721 Jefferson St.</p>
                    <p>Nasvhille, TN 37208</p>
                    <a href="mailto:info@alkebulanimages.com">info@alkebulanimages.com</a><br>
                    <a href="tel:615-321-4111">615 321 4111</a>
                </div>
            </div>
            <!-- <div class="col-xl-3 col-lg-3 col-md-6">
                <div class="location_single">
                    <h2>broklyn</h2>
                    <p>22 Texas West Hills</p>
                    <a href="mailto:needhelp@agrikol.com">needhelp@agrikol.com</a><br>
                    <a href="tel:666-888-0000">666 888 0000</a>
                </div>
            </div>
            <div class="col-xl-3 col-lg-3 col-md-6">
                <div class="location_single">
                    <h2>New York</h2>f
                    <p>22 Texas West Hills</p>
                    <a href="mailto:needhelp@agrikol.com">needhelp@agrikol.com</a><br>
                    <a href="tel:666-888-0000">666 888 0000</a>
                </div>
            </div>
            <div class="col-xl-3 col-lg-3 col-md-6">
                <div class="location_single">
                    <h2>Dubai</h2>
                    <p>22 Texas West Hills</p>
                    <a href="mailto:needhelp@agrikol.com">needhelp@agrikol.com</a><br>
                    <a href="tel:666-888-0000">666 888 0000</a>
                </div>
            </div> -->
        </div>
    </div>
</section>


<section class="contact-one">
    <div class="px-8 mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-12 ">
            <div class="col-span-7 box-border pr-8">
                <div class="contact-one__form__wrap justify-start">
                    <div class="block-title text-left">
                        <p>contact with us</p>
                        <h3>write us a message</h3>
                        <div class="leaf">
                            <img loading="lazy" src="/assets/images/resources/leaf.png" alt="">
                        </div>
                    </div>
                    <form method="POST" data-netlify="true" name="contact" class="contact-one__form">
                        <div class="grid grid-cols-2 gap-2 box-border">
                            <div class="col-span-1">
                                <div class="input-group">
                                    <input type="text" name="name" placeholder="Your Name">
                                </div>
                            </div>
                            <div class="col-span-1">
                                <div class="input-group">
                                    <input type="text" name="email" placeholder="Email Address">
                                </div>
                            </div>
                            <div class="col-span-1">
                                <div class="input-group">
                                    <input type="text" name="phone" placeholder="Phone Number">
                                </div>
                            </div>
                            <div class="col-span-1">
                                <div class="input-group">
                                    <input type="text" name="subject" placeholder="Subject">
                                </div>
                            </div>
                            <div class="col-span-2">
                                <div class="input-group">
                                    <textarea name="message" placeholder="Write Message"></textarea>
                                </div>
                            </div>
                            <div class="col-span-2">
                                <div class="input-group contact__btn">
                                    <button type="submit" class="btn-primary">Send message</button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <div class="col-span-5">
                <div class="lg:ml-16 mb-10 text-center">
                    <div class="mb-16">
                        <img class="w-full rounded-md" loading="lazy" src="{urlFor(section2.section2image).width(360).height(333).auto('format').url()}" alt={section2.section2image.alt}>
                    </div>
                    <div class="block-title text-center">
                        <p>get in touch with us</p>
                        <h3>Have a question?</h3>
                        <div class="leaf">
                            <img class="!inline" loading="lazy" src="/assets/images/resources/leaf.png" alt="">
                        </div>
                    </div>
                    <div class="have_questions_text">
                        <p>
                            Click 'Explore' to see the range of products we have available online. 
                            as we develop our online presence there may be products we carry in store that we have yet to make available 
                            on the website so please contact us directly by email to the left or give us a call!
                        </p>
                    </div>
                    <div class="have_questions_btn">
                        <a href="/about/" class="btn-outline">Learn More</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<section class="mt-5">
    <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3220.9624727559294!2d-86.82259398390549!3d36.167467810757074!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x886466d290aff66f%3A0x696718ce3d00bfd4!2sAlkebu-Lan%20Images!5e0!3m2!1sen!2sus!4v1603918587239!5m2!1sen!2sus"
        class="google-map__contact" allowfullscreen title="Google Map of Store"></iframe>
</section>