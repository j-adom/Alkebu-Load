const fashionCategories = [
  { slug: "clothing", name: "Clothing", type: "fashion" },
  { slug: "african-fashion", name: "African Fashion", type: "fashion" },
  { slug: "jewelry", name: "Jewelry", type: "fashion" },
  { slug: "crystal-jewelry", name: "Crystal Jewelry", type: "fashion" },
  { slug: "handmade-jewelry", name: "Handmade Jewelry", type: "fashion" },
  { slug: "accessories", name: "Accessories", type: "fashion" },
  { slug: "activist-wear", name: "Activist Wear", type: "fashion" },
  { slug: "cultural-wear", name: "Cultural Wear", type: "fashion" },
  { slug: "spiritual-jewelry", name: "Spiritual Jewelry", type: "fashion" },
  { slug: "casual-fashion", name: "Casual Fashion", type: "fashion" },
  { slug: "statement-pieces", name: "Statement Pieces", type: "fashion" },
  { slug: "gift-items", name: "Gift Items", type: "fashion" },
  { slug: "mens-fashion", name: "Men's Fashion", type: "fashion" },
  { slug: "womens-fashion", name: "Women's Fashion", type: "fashion" },
  { slug: "unisex", name: "Unisex", type: "fashion" }
];
const wellnessCategories = [
  { slug: "essential-oils", name: "Essential Oils", type: "wellness" },
  { slug: "fragrance-oils", name: "Fragrance Oils", type: "wellness" },
  { slug: "natural-cosmetics", name: "Natural Cosmetics", type: "wellness" },
  { slug: "body-care", name: "Body Care", type: "wellness" },
  { slug: "hair-care", name: "Hair Care", type: "wellness" },
  { slug: "skincare", name: "Skincare", type: "wellness" },
  { slug: "health-supplements", name: "Health Supplements", type: "wellness" },
  { slug: "herbal-medicine", name: "Herbal Medicine", type: "wellness" },
  { slug: "incense", name: "Incense", type: "wellness" },
  { slug: "sage-cleansing", name: "Sage & Cleansing", type: "wellness" },
  { slug: "spiritual-tools", name: "Spiritual Tools", type: "wellness" },
  { slug: "meditation-supplies", name: "Meditation Supplies", type: "wellness" },
  { slug: "ritual-supplies", name: "Ritual Supplies", type: "wellness" },
  { slug: "home-fragrance", name: "Home Fragrance", type: "wellness" },
  { slug: "candles", name: "Candles", type: "wellness" },
  { slug: "african-imports", name: "African Imports", type: "wellness" },
  { slug: "household-goods", name: "Household Goods", type: "wellness" },
  { slug: "art-decor", name: "Art & Decor", type: "wellness" },
  { slug: "kitchen-dining", name: "Kitchen & Dining", type: "wellness" }
];
const oilCategories = [
  { slug: "fragrance-oils", name: "Fragrance Oils", type: "oils" },
  { slug: "incense", name: "Incense", type: "oils" },
  { slug: "sage-cleansing", name: "Sage & Cleansing", type: "oils" },
  { slug: "spiritual-tools", name: "Spiritual Tools", type: "oils" },
  { slug: "home-fragrance", name: "Home Fragrance", type: "oils" }
];
const wellnessCollections = [
  { slug: "sacred-scents", name: "Sacred Scents", type: "wellness" },
  { slug: "natural-beauty", name: "Natural Beauty", type: "wellness" },
  { slug: "african-wellness", name: "African Wellness", type: "wellness" },
  { slug: "healing-collection", name: "Healing Collection", type: "wellness" },
  { slug: "cleansing-protection", name: "Cleansing & Protection", type: "wellness" },
  { slug: "meditation-essentials", name: "Meditation Essentials", type: "wellness" },
  { slug: "aromatherapy-set", name: "Aromatherapy Set", type: "wellness" },
  { slug: "travel-size", name: "Travel Size", type: "wellness" },
  { slug: "gift-sets", name: "Gift Sets", type: "wellness" },
  { slug: "beginner-friendly", name: "Beginner Friendly", type: "wellness" },
  { slug: "premium-collection", name: "Premium Collection", type: "wellness" },
  { slug: "african-imports", name: "African Imports", type: "wellness" },
  { slug: "new-arrivals", name: "New Arrivals", type: "wellness" },
  { slug: "bestsellers", name: "Bestsellers", type: "wellness" },
  { slug: "staff-picks", name: "Staff Picks", type: "wellness" }
];
const oilCollections = [
  { slug: "popular-scents", name: "Popular Scents", type: "oils" },
  { slug: "new-arrivals", name: "New Arrivals", type: "oils" },
  { slug: "bestsellers", name: "Bestsellers", type: "oils" },
  { slug: "cleansing-sage", name: "Cleansing & Sage", type: "oils" },
  { slug: "gift-sets", name: "Gift Sets", type: "oils" },
  { slug: "travel-size", name: "Travel Size", type: "oils" },
  { slug: "staff-picks", name: "Staff Picks", type: "oils" }
];
const bookGenres = [
  { slug: "history", name: "History", type: "genre" },
  { slug: "biography-autobiography", name: "Biography & Autobiography", type: "genre" },
  { slug: "literature-fiction", name: "Literature & Fiction", type: "genre" },
  { slug: "religion-spirituality", name: "Religion & Spirituality", type: "genre" },
  { slug: "politics-social-science", name: "Politics & Social Science", type: "genre" },
  { slug: "education-academia", name: "Education & Academia", type: "genre" },
  { slug: "business-economics", name: "Business & Economics", type: "genre" },
  { slug: "health-wellness", name: "Health & Wellness", type: "genre" },
  { slug: "children-young-adult", name: "Children & Young Adult", type: "genre" },
  { slug: "arts-culture", name: "Arts & Culture", type: "genre" }
];
const bookCollections = [
  { slug: "civil-rights-movement", name: "Civil Rights Movement", type: "book-collection" },
  { slug: "african-diaspora", name: "African Diaspora", type: "book-collection" },
  { slug: "pan-africanism", name: "Pan-Africanism", type: "book-collection" },
  { slug: "black-business-leaders", name: "Black Business Leaders", type: "book-collection" },
  { slug: "essential-black-history", name: "Essential Black History", type: "book-collection" },
  { slug: "contemporary-black-voices", name: "Contemporary Black Voices", type: "book-collection" },
  { slug: "african-literature-classics", name: "African Literature Classics", type: "book-collection" },
  { slug: "spirituality-consciousness", name: "Spirituality & Consciousness", type: "book-collection" },
  { slug: "youth-education", name: "Youth & Education", type: "book-collection" },
  { slug: "staff-picks", name: "Staff Picks", type: "book-collection" },
  { slug: "new-arrivals", name: "New Arrivals", type: "book-collection" },
  { slug: "bestsellers", name: "Bestsellers", type: "book-collection" }
];
const homeGoodsCategories = [
  { slug: "incense", name: "Incense & Aromatherapy", type: "home-goods" },
  { slug: "sage-cleansing", name: "Sage & Cleansing", type: "home-goods" },
  { slug: "spiritual-tools", name: "Spiritual Tools", type: "home-goods" },
  { slug: "home-fragrance", name: "Home Fragrance", type: "home-goods" },
  { slug: "art", name: "African Art & Decor", type: "home-goods" },
  { slug: "imports", name: "Cultural Imports", type: "home-goods" },
  { slug: "home", name: "Home Decor", type: "home-goods" }
];
export {
  bookCollections as a,
  bookGenres as b,
  wellnessCollections as c,
  oilCollections as d,
  fashionCategories as f,
  homeGoodsCategories as h,
  oilCategories as o,
  wellnessCategories as w
};
