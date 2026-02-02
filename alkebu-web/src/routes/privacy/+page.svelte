<script>
  import { urlFor } from '$lib/payload';

  let { data } = $props();
  const {settings} = data
</script>

<svelte:head>
	<title>Privacy Policy | Alkebu-Lan Images</title>
</svelte:head>

<section class="page-header" style="background-image: url({urlFor(settings.banner).width(1920).height(300).auto('format').url()});">
    <div class="container">
        <h2>Privacy Policy</h2>
        <ul class="thm-breadcrumb list-unstyled">
            <li><a href="/">Home</a></li>
            <li><span>Privacy Policy</span></li>
        </ul>
    </div>
</section>

<section>
    <div class="container">
        <br>
        <div class="">
            <p><span>SECTION 1 - WHAT DO WE DO WITH YOUR INFORMATION?</span></p>
            <p><span>- When you purchase something from our store, as part of the buying and selling process, we collect the personal information you give us such as your name, address and email address.</span></p>
            <p><span>- When you browse our store, we also automatically receive your computer’s internet protocol (IP) address in order to provide us with information that helps us learn about your browser and operating system.</span></p>
            <p><span>- Email marketing (if applicable): We may send you emails about our store, new products and other updates.</span></p>
            <br><p><span>SECTION 2 - CONSENT</span></p>
            <p><span>How do you get my consent?</span></p>
            <p><span>- When you provide us with personal information to complete a transaction, verify your credit card, place an order, arrange for a delivery or return a purchase, we imply that you consent to our collecting it and using it for that specific reason only.</span></p>
            <p><span>- If we ask for your personal information for a secondary reason, like marketing, we will either ask you directly for your expressed consent, or provide you with an opportunity to say no.</span></p>
            <p><span>How do I withdraw my consent?</span></p>
            <p><span>- If after you opt-in, you change your mind, you may withdraw your consent for us to contact you, for the continued collection, use or disclosure of your information, at anytime, by contacting us at info@alkebulanimages.com or mailing us at:</span></p>
            <br><p><span>&emsp;&emsp;Alkebu-Lan Images</span></p>
            <p><span>&emsp;&emsp;2721 Jefferson St., Nashville, TN 37208, USA</span></p>
            <br><p><span>SECTION 3 - DISCLOSURE</span></p>
            <p><span>We may disclose your personal information if we are required by law to do so or if you violate our Terms of Service.</span></p>
            <br><p><span>SECTION 4 - PAYMENTS & CHECKOUT</span></p>
            <p><span>Our store uses Stripe Checkout for payment processing and Payload CMS to manage e-commerce data. Stripe stores your payment information securely on PCI DSS compliant infrastructure.</span></p>
            <p><span>Payload CMS stores your order history, cart information, and shipping details inside encrypted databases hosted on our infrastructure. We never see or store your full payment details.</span></p>
            <br><p><span>SECTION 5 - THIRD-PARTY SERVICES</span></p>
            <p><span>In general, the third-party providers used by us will only collect, use and disclose your information to the extent necessary to allow them to perform the services they provide to us.</span></p>
            <p><span>However, certain third-party service providers, such as payment gateways and other payment transaction processors, have their own privacy policies in respect to the information we are required to provide to them for your purchase-related transactions.&nbsp;</span></p>
            <p><span>For these providers, we recommend that you read their privacy policies so you can understand the manner in which your personal information will be handled by these providers.</span></p>
            <p><span>In particular, remember that certain providers may be located in or have facilities that are located a different jurisdiction than either you or us. So if you elect to proceed with a transaction that involves the services of a third-party service provider, then your information may become subject to the laws of the jurisdiction(s) in which that service provider or its facilities are located.</span></p>
            <p><span>As an example, if you are located in Canada and your transaction is processed by a payment gateway located in the United States, then your personal information used in completing that transaction may be subject to disclosure under United States legislation, including the Patriot Act.</span></p>
            <p><span>Once you leave our store’s website or are redirected to a third-party website or application, you are no longer governed by this Privacy Policy or our website’s Terms of Service.</span></p>
            <p><span>Links</span></p>
            <p><span>When you click on links on our store, they may direct you away from our site. We are not responsible for the privacy practices of other sites and encourage you to read their privacy statements.</span></p>
            <br><p><span>SECTION 6 - SECURITY</span></p>
            <p><span>To protect your personal information, we take reasonable precautions and follow industry best practices to make sure it is not inappropriately lost, misused, accessed, disclosed, altered or destroyed.</span></p>
            <p><span>If you provide us with your credit card information, the information is encrypted using secure socket layer technology (SSL) and stored with a AES-256 encryption. Although no method of transmission over the Internet or electronic storage is 100% secure, we follow all PCI-DSS requirements and implement additional generally accepted industry standards.</span></p>
            <br><p><span>SECTION 7 - COOKIES</span></p>
            <p><span>This website uses Google Analytics, a web analytics service provided by Google Inc. (following: Google). Google Analytics uses so-called "cookies", ie text files that are stored on your computer and that allow an analysis of the use of the website by you. The information generated by the cookie about your use of this website is usually transmitted to a Google server in the USA and stored there.</span></p>
            <p><span>However, due to the activation of IP anonymization on these websites, your IP address will be shortened beforehand by Google within member states of the European Union or in other contracting states of the Agreement on the European Economic Area. Only in exceptional cases will the full IP address be sent to a Google server in the US and shortened there. On behalf of the operator of this website, Google will use this information to evaluate your use of the website, to compile reports on website activity and to provide other services related to website activity and internet usage to the website operator. The IP address provided by Google Analytics as part of Google Analytics will not be merged with other Google data.</span></p>
            <p><span>The purposes of the data processing are the evaluation of the use of the website and the compilation of reports on activities on the website. Based on the use of the website and the Internet, other related services will be provided. The processing is based on the legitimate interest of the website operator.</span></p>
            <br><p><span>SECTION 8 - AGE OF CONSENT</span></p>
            <p><span>By using this site, you represent that you are at least the age of majority in your state or province of residence, or that you are the age of majority in your state or province of residence and you have given us your consent to allow any of your minor dependents to use this site.</span></p>
            <br><p><span>SECTION 9 - CHANGES TO THIS PRIVACY POLICY</span></p>
            <p><span>We reserve the right to modify this privacy policy at any time, so please review it frequently. Changes and clarifications will take effect immediately upon their posting on the website. If we make material changes to this policy, we will notify you here that it has been updated, so that you are aware of what information we collect, how we use it, and under what circumstances, if any, we use and/or disclose it.</span></p>
            <p><span>If our store is acquired or merged with another company, your information may be transferred to the new owners so that we may continue to sell products to you.</span></p>
            <p><span>QUESTIONS AND CONTACT INFORMATION</span></p>
            <br><p><span>If you would like to: access, correct, amend or delete any personal information we have about you, register a complaint, or simply want more information contact our Privacy Compliance Officer at info@alkebulanimages.com or by mail at:</span></p>
            <p><br>
                <span>&emsp;&emsp;Alkebu-Lan Images</span>
                <br>
                <span>&emsp;&emsp;2721 Jefferson St., Nashville, TN 37208, USA</span>
            </p><br>
        </div>
    </div>
</section>
