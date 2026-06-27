export const partnershipPages = {
  wholesale: {
    type: 'wholesale',
    path: '/wholesale',
    seo: {
      title: 'Wholesale Books and Cultural Products | Alkebu-Lan Images',
      description:
        'Partner with Alkebu-Lan Images for bulk orders, wholesale books, cultural products, and resale-friendly sourcing.',
    },
    hero: {
      eyebrow: 'Wholesale Solutions',
      headline: 'Bulk ordering rooted in culture and community.',
      body: "Source books, apparel, wellness items, and cultural goods for your shop, program, or organization with help from Nashville's Black-owned bookstore.",
      cta: 'Start a wholesale inquiry',
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
    seo: {
      title: 'Institutional Book Orders | Alkebu-Lan Images',
      description:
        'Books and culturally relevant materials for schools, libraries, churches, and institutions.',
    },
    hero: {
      eyebrow: 'Institutional Contracts',
      headline: 'Books and resources for classrooms, libraries, and institutions.',
      body: 'Work with Alkebu-Lan Images on curated orders, purchase-order friendly workflows, and materials that serve your audience.',
      cta: 'Start an institutional inquiry',
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
        body: 'Your inquiry lands in Payload with enough structure for staff to respond clearly.',
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
    seo: {
      title: 'Non-profit Projects | Alkebu-Lan Images',
      description:
        'Community project, book drive, sponsorship, and mission-aligned partnership inquiries for Alkebu-Lan Images.',
    },
    hero: {
      eyebrow: 'Non-profit Projects',
      headline: 'Mission-aligned support for community projects.',
      body: 'Tell us about your program, book drive, sponsorship idea, or community initiative so we can explore the right fit.',
      cta: 'Start a project inquiry',
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
        title: 'CRM-ready history',
        body: 'Inquiries are stored for follow-up now and future CRM sync later.',
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
