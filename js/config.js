// =============================================================
// EDIT THIS FILE TO CONFIGURE THE STORE
// =============================================================

const CONFIG = {
  brand: "Chef Knife",
  tagline: "Heirloom-grade chef knife sets, handcrafted in Sialkot, Pakistan.",

  // !! Update once you have a final domain (e.g. https://chef-knife.pk).
  // Used for canonical URLs, sitemap, and Open Graph tags.
  siteUrl: "https://chef-knife.pk",

  // Company / legal info — we are the physical manufacturer, not a reseller.
  // Note: precise street address intentionally omitted from the public site.
  company: {
    legalName: "PKF - Pakistan Knives Factory",
    addressLine1: "Small Industrial Area",
    city: "Sialkot",
    postalCode: "51310",
    country: "Pakistan",
    countryCode: "PK"
  },

  // WhatsApp in international format, digits only. The number itself is never
  // displayed publicly — only used to build the wa.me deep link.
  whatsapp: "923107919165",

  currency: "PKR",
  shippingNote: "Free delivery across Pakistan. 3–5 business days.",

  payment: {
    // JazzCash merchant account (paid via QR scan or *786*10# + TILL ID)
    jazzcash: {
      shopName: "AIMAN JAVEED Shop",
      number: "0340 427 9944",
      tillId: "983298157",
      ussd: "*786*10#",
      qr: "images/qr-jazzcash.png"
    },
    // HBL bank transfer
    bank: {
      bankName: "HBL — Habib Bank",
      accountName: "AIMAN JAVED",
      iban: "PK25 HABB 0011827900599903"
    },
    // EasyPaisa "digital bank" merchant — paid via QR scan or Send Money to this number
    easypaisa: {
      accountName: "AIMAN JAVED",
      number: "0340 427 9944",
      qr: "images/qr-easypaisa.png"
    }
  },

  notifyEmail: "orders@pakistanknifefactory.com",

  // -----------------------------------------------------------------
  // Trustpilot integration (REVIEWS)
  // -----------------------------------------------------------------
  // Activation steps:
  //   1. Create a Business account: https://business.trustpilot.com/signup
  //   2. Verify the chef-knife.pk domain (Trustpilot will email a TXT record
  //      to add to your DNS — same dashboard where you add Netlify DNS).
  //   3. Once approved, find your Business Unit ID in the dashboard URL:
  //      https://business.trustpilot.com/reviews/<businessUnitId>
  //   4. Paste that ID below. Every Trustpilot widget across the site will
  //      activate automatically on next page load.
  //
  // While `businessUnitId` is empty, no widgets render and no Trustpilot
  // script loads — your page stays clean and fast.
  // -----------------------------------------------------------------
  // -----------------------------------------------------------------
  // Google Ads conversion tracking
  // -----------------------------------------------------------------
  // conversionLabel: create a "Purchase" conversion action in Google Ads
  // (Tools → Conversions → New conversion action → Website) and paste
  // the label part of the snippet here  (e.g. "AbCdEfGhIjKlMnOp12").
  // Leave empty to disable conversion firing until you have the label.
  // -----------------------------------------------------------------
  gads: {
    id: "AW-18168906554",
    conversionLabel: ""   // ← paste your conversion label here
  },

  trustpilot: {
    businessUnitId: "",         // e.g. "5e5d7f4a8b4f7a0001a3c1e2"
    locale: "en-US",            // change to "ur-PK" on /ur/ pages if Trustpilot adds Urdu later
    reviewUrl: "https://www.trustpilot.com/review/chef-knife.pk"
  }
};

const PRODUCTS = [
  {
    id: "sapphire",
    slug: "chef-knife-set-sapphire",
    name: "Sapphire Chef Knife Set",
    shortName: "The Sapphire Set",
    tagline: "Heirloom chef knife + paring knife — sapphire-blue resin handle",
    price: 6700,
    sku: "LEO-SAPPHIRE-2P",
    images: [
      "images/sapphire-new.png",
      "images/sapphire-2.jpg",
      "images/sapphire-3.jpg"
    ],
    description:
      "A two-piece heirloom chef knife set built around hand-poured sapphire-blue acrylic resin handles — each one slightly unique, no two sets alike. The 8-inch chef knife is full-tang, hand-ground from high-carbon stainless steel, balanced for daily kitchen work. The matching 3.5-inch paring knife handles every precision task. Both blades are mirror-polished and hand-finished at our PKF - Pakistan Knives Factory workshop in Sialkot. Presented in a satin-lined gift box, ready to keep — or to give.",
    includes: [
      "8-inch full-tang chef knife — high-carbon stainless steel",
      "3.5-inch paring knife — hand-ground edge",
      "Sapphire-blue acrylic resin handles, triple-riveted",
      "Hand-finished black presentation gift box, satin-lined"
    ]
  },
  {
    id: "teak",
    slug: "chef-knife-set-teak",
    name: "Teak Chef Knife Set",
    shortName: "The Teak Set",
    tagline: "Heirloom chef knife + paring knife — natural teak wood handle",
    price: 6700,
    sku: "LEO-TEAK-2P",
    images: [
      "images/teak-1.jpg",
      "images/teak-2.jpg",
      "images/teak-3.jpg",
      "images/teak-4.jpg"
    ],
    description:
      "Our heritage chef knife set. A wide-bellied 8-inch chef knife paired with a matching paring knife, both fitted with natural teak wood handles — close-grained, warm-toned, no two pieces alike. Teak's natural oils make it stable, hard-wearing and a pleasure to hold. Full-tang construction, single-piece high-carbon stainless steel blades, hand-ground and mirror-polished at our PKF - Pakistan Knives Factory workshop in Sialkot. Designed to last a generation, presented in a hand-finished satin-lined gift box.",
    includes: [
      "8-inch full-tang chef knife — high-carbon stainless steel",
      "3.5-inch paring knife — hand-ground edge",
      "Natural teak wood handles, triple-riveted (each piece unique)",
      "Hand-finished black presentation gift box, satin-lined"
    ]
  }
];
