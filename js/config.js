// =============================================================
// EDIT THIS FILE TO CONFIGURE THE STORE
// =============================================================

const CONFIG = {
  brand: "Chef Knife",
  tagline: "Premium chef knife sets, handcrafted in Sialkot, Pakistan.",

  // !! Update once you have a final domain (e.g. https://chefknife.pk).
  // Used for canonical URLs, sitemap, and Open Graph tags.
  siteUrl: "https://chefknife.pk",

  // Company / legal info
  company: {
    legalName: "Pakistan Knife Factory (PKF)",
    addressLine1: "148 Fatimah Jinnah Road",
    city: "Sialkot",
    postalCode: "51310",
    country: "Pakistan",
    countryCode: "PK"
  },

  // WhatsApp in international format, digits only.
  whatsapp: "923107919165",
  whatsappDisplay: "+92 310 791 9165",

  currency: "PKR",
  shippingNote: "Free delivery across Pakistan. 3–5 business days.",

  payment: {
    easypaisaNumber: "0310 7919165",
    jazzcashNumber: "0310 7919165",
    accountName: "Pakistan Knife Factory",
    easypaisaQR: "images/qr-easypaisa.png",
    jazzcashQR: "images/qr-jazzcash.png"
  },

  notifyEmail: "orders@pakistanknifefactory.com"
};

const PRODUCTS = [
  {
    id: "sapphire",
    slug: "chef-knife-set-sapphire",
    name: "Sapphire Chef Knife Set",
    shortName: "The Sapphire Set",
    tagline: "Chef knife + paring knife — blue resin handle",
    price: 0,
    sku: "LEO-SAPPHIRE-2P",
    images: [
      "images/sapphire-1.jpg"
    ],
    description:
      "A two-piece chef knife set built around hand-poured blue acrylic resin handles, each one unique. The 8-inch chef knife handles every daily task — slicing, dicing, mincing — while the slim paring knife takes care of precision work. Single-piece stainless steel blades, finely ground and polished by hand at our Sialkot workshop.",
    includes: [
      "8-inch chef knife",
      "3.5-inch paring knife",
      "Blue acrylic resin handles, triple-riveted",
      "Black presentation gift box"
    ]
  },
  {
    id: "olive",
    slug: "chef-knife-set-olive",
    name: "Olive Chef Knife Set",
    shortName: "The Olive Set",
    tagline: "Chef knife + paring knife — olive wood handle",
    price: 0,
    sku: "LEO-OLIVE-2P",
    images: [
      "images/olive-1.jpg"
    ],
    description:
      "Our heritage chef knife set. Wide-bellied 8-inch chef knife paired with a matching paring knife, both fitted with natural olive wood handles — no two pieces alike. Designed to last a generation, presented in a hand-finished black gift box.",
    includes: [
      "8-inch chef knife",
      "3.5-inch paring knife",
      "Natural olive wood handles, triple-riveted",
      "Black presentation gift box"
    ]
  }
];
