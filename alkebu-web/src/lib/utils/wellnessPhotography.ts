// Store photography for the house product lines. CMS photography takes
// precedence; exact slugs keep these images off unrelated products.
export const scentedOilPhotos = [
  {
    url: '/assets/images/products/scented-oil/shop-shelves.webp',
    width: 1672,
    height: 941,
    alt: 'Scented oils in glass bottles on the wooden shelves at Alkebu-Lan Images',
    caption: 'The scented-oil collection in our shop.',
  },
  {
    url: '/assets/images/products/scented-oil/bottle-sizes.webp',
    width: 1672,
    height: 941,
    alt: 'Five sample bottles: 2 oz, 1 oz, half oz, roll-on, and quarter oz',
    caption: 'Compare bottle sizes. Sample bottles are shown empty; current prices and availability appear with your selection.',
  },
];

export const whippedSheaPhotos = [
  {
    url: '/assets/images/products/whipped-shea-butter/group.webp',
    width: 1672,
    height: 941,
    alt: 'Four jars of Alkebu-Lan Images whipped shea butter on patterned cloth, with one jar open',
    caption: 'A selection of our whipped shea butters, photographed in the shop. Choose your scent.',
  },
  {
    url: '/assets/images/products/whipped-shea-butter/texture.webp',
    width: 1122,
    height: 1402,
    alt: 'An open Frank & Myrrh whipped shea butter jar showing the butter’s texture, with its lid resting alongside',
    caption: 'A closer look at the texture. Frank & Myrrh is pictured.',
  },
];

export function getWellnessPhotography(product: any) {
  if (product?.slug === 'whipped-shea-butter') return whippedSheaPhotos;
  return product?.slug === 'scented-oil' ? scentedOilPhotos : [];
}
