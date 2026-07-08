// Per-track identity: each partnership track carries its own Adinkra symbol +
// accent color (see the design spec's "Signature" section). Terracotta stays
// the shared hover accent so the set reads as one family; the symbol/accent
// pair is what tells the three tracks apart. Symbols are distinct from the
// homepage's basket/crocs/sankofa set: CC0 SVGs by GeorgesMbakop via Wikimedia
// Commons, self-hosted in static/assets/images/adinkra/.
export const partnershipPages = {
  wholesale: {
    type: 'wholesale',
    path: '/wholesale',
    accent: '#D4AF37', // Kente Gold
    symbol: '/assets/images/adinkra/nteasee.svg',
    symbolMeaning: 'Nteasee — understanding and cooperation',
    seo: {
      title: 'Wholesale Books and Cultural Products',
      description:
        'Partner with Alkebu-Lan Images for bulk orders, wholesale books, cultural products, and resale-friendly sourcing.',
    },
    hero: {
      eyebrow: 'Wholesale',
      headline: 'Stock your shelves with books that matter.',
      subhead:
        "Source books, apparel, wellness items, and cultural goods for your shop, program, or organization with help from Nashville's Black-owned bookstore.",
      cta: 'Start a wholesale inquiry',
      // Same photo as the homepage "Wholesale" card, for visual continuity
      // from click to landing (homePage global section4[0], self-hosted).
      image: '/assets/images/partnership/wholesale-warehouse.jpg',
      imageAlt: 'A high-bay warehouse aisle stacked with cases of stock',
      trustRow: ['Nashville Black-owned', 'Bulk & resale friendly', 'Pickup or nationwide shipping'],
    },
    // Unsplash (free license): photo-1613577553731-e102e5de62f5, self-hosted pre-optimized
    midImage: {
      src: '/assets/images/partnership/wholesale-stack.jpg',
      alt: 'A stack of hardcover books ready to ship',
      width: 1600,
      height: 1064,
    },
    fit: [
      'Retailers and pop-up shops',
      'Organizations buying in bulk',
      'Campus stores and cultural vendors',
      'Distribution and resale partners',
    ],
    benefits: [
      {
        title: 'Bulk sourcing',
        body: 'Tell us what you need and we will help identify available titles and products.',
      },
      {
        title: 'Cultural curation',
        body: 'We can recommend products aligned with Black literature, wellness, art, and community programming.',
      },
      {
        title: 'Flexible fulfillment',
        body: 'Coordinate local pickup, shipping, or follow-up for larger orders.',
      },
    ],
    process: [
      'Share the products and quantities you need.',
      'We review availability and fit.',
      'We follow up with pricing and next steps.',
    ],
    form: {
      heading: 'Wholesale Inquiry',
      submitLabel: 'Send wholesale inquiry',
      detailGroup: 'wholesaleDetails',
      detailLegend: 'Order details',
      detailFields: [
        { name: 'expectedOrderVolume', label: 'Expected order volume', type: 'text', required: true },
        {
          name: 'productInterests',
          label: 'Product interests',
          type: 'checkboxes',
          required: true,
          options: ['books', 'apparel', 'health_beauty', 'home_goods'],
        },
        {
          name: 'resaleOrDistributionNeeds',
          label: 'Resale or distribution needs',
          type: 'textarea',
        },
      ],
    },
  },
  institutional: {
    type: 'institutional',
    path: '/institutional-contracts',
    accent: '#3D4F7C', // Kente Indigo
    symbol: '/assets/images/adinkra/nyansapo.svg',
    symbolMeaning: 'Nyansapo, the wisdom knot — wisdom, ingenuity, learning',
    seo: {
      title: 'Institutional Book Orders',
      description:
        'Books and culturally relevant materials for schools, libraries, churches, and institutions.',
    },
    hero: {
      eyebrow: 'Institutional Contracts',
      headline: 'Books that serve your readers, on institutional terms.',
      subhead:
        'Work with Alkebu-Lan Images on curated orders, purchase-order friendly workflows, and materials that serve your audience.',
      cta: 'Start an institutional inquiry',
      // Same photo as the homepage "Institutional" card, for visual continuity
      // from click to landing (homePage global section4[1], self-hosted).
      image: '/assets/images/partnership/institutional-classroom.jpg',
      imageAlt: 'A young student reading and writing at a classroom table',
      trustRow: ['Purchase orders & invoices', 'Tax-exempt friendly', 'Curated to your readers'],
    },
    // Unsplash (free license): photo-1720659201108-4efe526b289c, self-hosted pre-optimized
    midImage: {
      src: '/assets/images/partnership/institutional-aisle.jpg',
      alt: 'A student browsing a school library aisle',
      width: 1600,
      height: 1067,
    },
    fit: [
      'Schools and universities',
      'Libraries',
      'Churches and cultural institutions',
      'Programs using purchase orders or invoices',
    ],
    benefits: [
      {
        title: 'Audience-aware curation',
        body: 'We help match titles and materials to your readers, students, or community.',
      },
      {
        title: 'Institution-friendly details',
        body: 'Share purchasing method, tax-exempt status, and timeline from the start.',
      },
      {
        title: 'Follow-up with context',
        body: 'Your inquiry lands with enough structure for staff to respond clearly.',
      },
    ],
    process: [
      'Describe your institution and audience.',
      'We review purchasing and timeline details.',
      'We follow up with recommended next steps.',
    ],
    form: {
      heading: 'Institutional Inquiry',
      submitLabel: 'Send institutional inquiry',
      detailGroup: 'institutionalDetails',
      detailLegend: 'Institution details',
      detailFields: [
        {
          name: 'institutionType',
          label: 'Institution type',
          type: 'select',
          required: true,
          options: ['school', 'university', 'library', 'church', 'cultural_institution', 'government', 'other'],
        },
        {
          name: 'purchasingMethod',
          label: 'Purchasing method',
          type: 'select',
          required: true,
          options: ['card', 'purchase_order', 'invoice', 'check', 'not_sure'],
        },
        {
          name: 'taxExemptStatus',
          label: 'Tax-exempt status',
          type: 'select',
          options: ['yes', 'no', 'not_sure'],
        },
        {
          name: 'audienceOrStudentGroup',
          label: 'Audience or student group',
          type: 'textarea',
        },
        { name: 'targetTimeline', label: 'Target timeline', type: 'text' },
      ],
    },
  },
  nonprofit: {
    type: 'nonprofit',
    path: '/non-profit-projects',
    accent: '#2D5A3D', // Kente Forest
    symbol: '/assets/images/adinkra/boa-me-na-me-mmoa-wo.svg',
    symbolMeaning: 'Boa Me Na Me Mmoa Wo — help me and let me help you',
    seo: {
      title: 'Non-profit Projects',
      description:
        'Community project, book drive, sponsorship, and mission-aligned partnership inquiries for Alkebu-Lan Images.',
    },
    hero: {
      eyebrow: 'Non-profit Projects',
      headline: 'Put books to work for your mission.',
      subhead:
        'Tell us about your program, book drive, sponsorship idea, or community initiative so we can explore the right fit.',
      cta: 'Start a project inquiry',
      // Same photo as the homepage "Non-profit" card, for visual continuity
      // from click to landing (homePage global section4[2], self-hosted).
      image: '/assets/images/partnership/nonprofit-future.jpg',
      imageAlt: 'A child at a community march holding a hand-lettered "Our Future Matters" sign',
      trustRow: ['Mission-first review', 'Book drives to sponsorships', 'Rooted in community'],
    },
    // Unsplash (free license): photo-1773224811488-070c7dce2657, self-hosted pre-optimized
    midImage: {
      src: '/assets/images/partnership/nonprofit-lending.jpg',
      alt: 'A neighborhood lending library stocked with books at dusk',
      width: 1600,
      height: 901,
    },
    fit: [
      'Community programs',
      'Book drives and literacy projects',
      'Mission-aligned sponsorships',
      'Grassroots and non-profit organizations',
    ],
    benefits: [
      {
        title: 'Project context first',
        body: 'The form captures mission, timeline, budget, and support requested.',
      },
      {
        title: 'Community-centered review',
        body: 'Staff can understand the purpose before responding.',
      },
      {
        title: 'History that follows up',
        body: 'Inquiries are stored so the conversation picks up where it left off.',
      },
    ],
    process: [
      'Share your project and mission.',
      'We review fit, timeline, and support requested.',
      'We follow up with next steps.',
    ],
    form: {
      heading: 'Non-profit Project Inquiry',
      submitLabel: 'Send project inquiry',
      detailGroup: 'nonprofitDetails',
      detailLegend: 'Project details',
      detailFields: [
        {
          name: 'projectType',
          label: 'Project type',
          type: 'select',
          required: true,
          options: ['book_drive', 'sponsorship', 'program_support', 'event', 'other'],
        },
        {
          name: 'missionOrProgramContext',
          label: 'Mission or program context',
          type: 'textarea',
        },
        { name: 'targetTimeline', label: 'Target timeline', type: 'text' },
        {
          name: 'budgetRange',
          label: 'Budget range',
          type: 'select',
          options: ['under_500', '500_1000', '1000_2500', '2500_plus', 'not_sure'],
        },
        {
          name: 'supportRequested',
          label: 'Support requested',
          type: 'select',
          required: true,
          options: ['discounted_books', 'donation', 'sponsorship', 'curation', 'not_sure'],
        },
      ],
    },
  },
};

export const partnershipPageList = Object.values(partnershipPages);

export function getPartnershipPageByPath(path) {
  return partnershipPageList.find((page) => page.path === path);
}
