/**
 * SAMPLE catalogue for development and demos only. Every product created from
 * this file is flagged `is_sample = true`, which shows a preview banner on
 * every page and a "sample listing" note on each product. None of these
 * prices, materials or stock levels describe real Babajan Sumangali products.
 *
 * Photography: Unsplash stand-ins in public/images/preview (see CREDITS.md).
 * They do not show Babajan Sumangali garments and must be replaced before launch.
 */

export const sampleCategories = [
  { department: "women", slug: "kurta-sets", name: "Kurta Sets", description: "Coordinated kurta sets for everyday elegance and celebrations.", sortOrder: 1 },
  { department: "women", slug: "sarees", name: "Sarees", description: "Drapes for ceremonies, gatherings, and the moments in between.", sortOrder: 2 },
  { department: "women", slug: "lehengas", name: "Lehengas", description: "Occasion-ready lehengas for weddings and festive evenings.", sortOrder: 3 },
  { department: "women", slug: "kurtas", name: "Kurtas", description: "Easy, expressive kurtas for every day.", sortOrder: 4 },
  { department: "men", slug: "kurtas", name: "Kurtas", description: "Versatile kurtas, from relaxed afternoons to evening occasions.", sortOrder: 1 },
  { department: "men", slug: "sherwanis", name: "Sherwanis", description: "Structured ceremonial wear for weddings and milestone moments.", sortOrder: 2 },
  { department: "men", slug: "kurta-sets", name: "Kurta Sets", description: "Coordinated kurta sets, thoughtfully styled.", sortOrder: 3 },
  { department: "men", slug: "bandhgalas", name: "Bandhgalas", description: "Contemporary tailoring with a heritage-inspired collar.", sortOrder: 4 },
] as const;

export const sampleCollections = [
  {
    slug: "festive-edit",
    name: "The Festive Edit",
    tagline: "Find a look that feels right for the moments worth celebrating.",
    description: "A considered selection for festivals and family gatherings — for women and men, styled to be worn your own way.",
    image: { file: "ed-lehenga-back", alt: "Back view of an embroidered magenta lehenga" },
    isFeatured: true,
    sortOrder: 1,
  },
  {
    slug: "wedding-and-occasion",
    name: "Wedding & Occasion",
    tagline: "Thoughtful looks for ceremonies, gatherings, and celebrations.",
    description: "Explore thoughtful looks for ceremonies, gatherings, and celebrations — from sangeet evenings to the reception.",
    image: { file: "ed-couple-walk", alt: "A couple in wedding attire walking together down a tree-lined path" },
    isFeatured: true,
    sortOrder: 2,
  },
  {
    slug: "everyday-elegance",
    name: "Everyday Elegance",
    tagline: "Considered pieces for the days in between.",
    description: "Versatile pieces that bring quiet refinement to everyday dressing.",
    image: { file: "w-kurtaset-white", alt: "Woman in an ivory floral kurta set" },
    isFeatured: false,
    sortOrder: 3,
  },
];

/** Editorial imagery for homepage/department content blocks. */
export const sampleEditorial = {
  hero: { file: "ed-couple-dance", alt: "A couple in festive attire dancing together outdoors" },
  women: { file: "w-saree-navy", alt: "Woman in a midnight-navy saree" },
  men: { file: "m-sherwani-navy", alt: "Man in a royal-navy bandhgala" },
  /** Light-backdrop studio shots that blend into the ivory page as cut-outs. */
  accents: [
    { file: "w-saree-rose", alt: "Woman in a rose-pink saree" },
    { file: "m-kurta-yellow", alt: "Man in a mustard-yellow kurta" },
  ],
};

type SampleProduct = {
  slug: string;
  name: string;
  styleCode: string;
  department: "women" | "men";
  category: string;
  styleLine: string;
  description: string;
  materials: string;
  fit: string;
  care: string;
  measurements?: string;
  includedItems?: string;
  colourName: string;
  colourHex: string;
  images: { file: string; alt: string }[];
  occasions: string[];
  tags: string[];
  price: number; // rupees
  compareAtPrice?: number; // rupees
  sizes: string[];
  stock: number[];
  collections: string[];
  daysAgo: number;
};

const W = ["XS", "S", "M", "L", "XL", "XXL"];
const M = ["S", "M", "L", "XL", "XXL"];
const MC = ["38", "40", "42", "44", "46"];

const sampleNote = "\n\nSample listing for demonstration only.";

export const sampleProducts: SampleProduct[] = [
  // ── Women ──
  {
    slug: "meher-ivory-kurta-set", name: "Meher Kurta Set", styleCode: "BS-W-KS-101", department: "women", category: "kurta-sets",
    styleLine: "A considered look for everyday occasions.",
    description: "A straight-cut ivory kurta with a scattered floral print, paired with matching trousers." + sampleNote,
    materials: "Cotton blend (sample data).", fit: "Straight, relaxed fit. Kurta falls below the knee.", care: "Gentle hand wash in cold water. Dry in shade.",
    measurements: "Kurta length approx. 44 in (size M).", includedItems: "Kurta and trousers.",
    colourName: "Ivory Floral", colourHex: "#EFE9DD",
    images: [{ file: "w-kurtaset-white", alt: "Woman wearing an ivory floral-print kurta and trousers, shown from the front" }],
    occasions: ["Everyday", "Festive"], tags: ["cotton", "set", "floral"], price: 4950, sizes: W, stock: [2, 6, 8, 5, 3, 1], collections: ["everyday-elegance", "festive-edit"], daysAgo: 3,
  },
  {
    slug: "saba-blush-kurta-set", name: "Saba Kurta Set", styleCode: "BS-W-KS-105", department: "women", category: "kurta-sets",
    styleLine: "Soft colour, clean lines.",
    description: "A straight kurta in blush pink with a fine floral print, paired with straight trousers." + sampleNote,
    materials: "Rayon blend (sample data).", fit: "Straight, relaxed fit.", care: "Gentle machine wash, cold. Do not tumble dry.", includedItems: "Kurta and trousers.",
    colourName: "Blush", colourHex: "#E6C3BC",
    images: [{ file: "w-kurtaset-pink", alt: "Woman wearing a blush-pink floral kurta and trousers" }],
    occasions: ["Everyday", "Work"], tags: ["floral", "set"], price: 3450, sizes: W, stock: [0, 4, 6, 6, 2, 2], collections: ["everyday-elegance"], daysAgo: 1,
  },
  {
    slug: "phool-floral-co-ord-set", name: "Phool Co-ord Set", styleCode: "BS-W-KS-109", department: "women", category: "kurta-sets",
    styleLine: "Relaxed print, polished finish.",
    description: "A printed tunic shirt with a notched collar and matching straight trousers." + sampleNote,
    materials: "Viscose blend (sample data).", fit: "Relaxed fit.", care: "Gentle machine wash, cold.", includedItems: "Tunic and trousers.",
    colourName: "Charcoal Floral", colourHex: "#3E3A3C",
    images: [{ file: "w-coord-floral", alt: "Woman wearing a dark floral-print tunic shirt and matching trousers" }],
    occasions: ["Everyday", "Travel"], tags: ["co-ord", "print"], price: 3890, sizes: W, stock: [3, 5, 5, 4, 2, 1], collections: ["everyday-elegance"], daysAgo: 0,
  },
  {
    slug: "sunehri-marigold-kurta", name: "Sunehri Kurta", styleCode: "BS-W-KT-110", department: "women", category: "kurtas",
    styleLine: "Sunshine colour for festive mornings.",
    description: "A flared kurta in marigold yellow with contrast cuffs and a fluid hem." + sampleNote,
    materials: "Cotton blend (sample data).", fit: "A-line, relaxed fit.", care: "Gentle hand wash, cold.",
    colourName: "Marigold", colourHex: "#E9B53A",
    images: [{ file: "w-kurta-yellow", alt: "Woman wearing a marigold-yellow flared kurta with contrast cuffs" }],
    occasions: ["Festive", "Haldi"], tags: ["yellow", "flared"], price: 2890, sizes: W, stock: [4, 6, 6, 5, 3, 2], collections: ["festive-edit"], daysAgo: 2,
  },
  {
    slug: "zoya-rose-saree", name: "Zoya Saree", styleCode: "BS-W-SR-103", department: "women", category: "sarees",
    styleLine: "A soft drape for daytime celebrations.",
    description: "A lightweight rose-pink saree with a subtle sheen, supplied with an unstitched blouse piece." + sampleNote,
    materials: "Georgette (sample data).", fit: "Free size drape. Blouse piece is unstitched.", care: "Dry clean only.",
    measurements: "Saree 5.5 m; blouse piece 0.8 m.", includedItems: "Saree and unstitched blouse piece.",
    colourName: "Rose Pink", colourHex: "#EFB6CF",
    images: [{ file: "w-saree-rose", alt: "Woman wearing a rose-pink draped saree, shown full length" }],
    occasions: ["Festive", "Day event"], tags: ["drape", "lightweight"], price: 8600, compareAtPrice: 9800, sizes: ["Free size"], stock: [7], collections: ["festive-edit"], daysAgo: 10,
  },
  {
    slug: "tara-midnight-saree", name: "Tara Saree", styleCode: "BS-W-SR-108", department: "women", category: "sarees",
    styleLine: "Quiet sparkle for the evening.",
    description: "A deep midnight-blue saree with a sequinned border and a coordinating blouse." + sampleNote,
    materials: "Satin blend (sample data).", fit: "Free size drape.", care: "Dry clean only.", includedItems: "Saree and blouse piece.",
    colourName: "Midnight Navy", colourHex: "#16203F",
    images: [{ file: "w-saree-navy", alt: "Woman wearing a midnight-navy saree with a sequinned border" }],
    occasions: ["Evening", "Reception"], tags: ["navy", "sequin"], price: 7200, sizes: ["Free size"], stock: [4], collections: ["wedding-and-occasion"], daysAgo: 4,
  },
  {
    slug: "kesar-saffron-saree", name: "Kesar Saree", styleCode: "BS-W-SR-111", department: "women", category: "sarees",
    styleLine: "Warm, radiant, and made for ceremonies.",
    description: "A saffron saree with a contrast red border and a woven pallu." + sampleNote,
    materials: "Silk blend (sample data).", fit: "Free size drape.", care: "Dry clean only.", includedItems: "Saree and unstitched blouse piece.",
    colourName: "Saffron", colourHex: "#E0761F",
    images: [{ file: "w-saree-saffron", alt: "Woman in a saffron saree with a red border, hands joined in greeting" }],
    occasions: ["Festive", "Puja"], tags: ["woven", "border"], price: 9400, sizes: ["Free size"], stock: [5], collections: ["festive-edit"], daysAgo: 6,
  },
  {
    slug: "ruhani-crimson-lehenga", name: "Ruhani Lehenga", styleCode: "BS-W-LH-104", department: "women", category: "lehengas",
    styleLine: "For ceremonies and celebrations to remember.",
    description: "A crimson lehenga with an ivory dupatta and an embellished blouse." + sampleNote,
    materials: "Silk blend with net dupatta (sample data).", fit: "Adjustable drawstring waist; blouse fitted with side zip.", care: "Dry clean only.",
    includedItems: "Lehenga skirt, blouse, dupatta.",
    colourName: "Crimson", colourHex: "#9E1B32",
    images: [{ file: "w-bridal-red", alt: "Woman in a crimson bridal lehenga with an ivory dupatta and statement jewellery" }],
    occasions: ["Wedding", "Sangeet"], tags: ["bridal", "embellished"], price: 32500, sizes: ["XS", "S", "M", "L", "XL"], stock: [1, 2, 2, 1, 0], collections: ["wedding-and-occasion"], daysAgo: 14,
  },
  {
    slug: "noor-maroon-velvet-lehenga", name: "Noor Velvet Lehenga", styleCode: "BS-W-LH-102", department: "women", category: "lehengas",
    styleLine: "Rich velvet, graceful detail.",
    description: "A maroon velvet lehenga with zari detailing and a matching embroidered dupatta." + sampleNote,
    materials: "Velvet with lining (sample data).", fit: "Fitted blouse, flared skirt.", care: "Dry clean only.", includedItems: "Lehenga, blouse, dupatta.",
    colourName: "Maroon", colourHex: "#5E1424",
    images: [{ file: "w-bridal-maroon", alt: "Woman in a maroon velvet bridal lehenga with gold detailing and dupatta" }],
    occasions: ["Wedding", "Reception"], tags: ["velvet", "bridal"], price: 36800, sizes: ["XS", "S", "M", "L", "XL"], stock: [1, 1, 2, 1, 1], collections: ["wedding-and-occasion"], daysAgo: 8,
  },
  {
    slug: "inaya-fuchsia-lehenga", name: "Inaya Lehenga", styleCode: "BS-W-LH-106", department: "women", category: "lehengas",
    styleLine: "Bold colour for the sangeet.",
    description: "A fuchsia lehenga with an all-over embroidered skirt and a sheer dupatta." + sampleNote,
    materials: "Silk blend with net dupatta (sample data).", fit: "Fitted bodice, full flared skirt.", care: "Dry clean only.", includedItems: "Lehenga, blouse, dupatta.",
    colourName: "Fuchsia", colourHex: "#C2185B",
    images: [
      { file: "w-lehenga-pink", alt: "Woman in a fuchsia lehenga standing in a doorway" },
      { file: "ed-lehenga-back", alt: "Back view of an embroidered magenta lehenga and blouse" },
    ],
    occasions: ["Sangeet", "Festive"], tags: ["embroidered", "flared"], price: 24900, sizes: W, stock: [0, 0, 0, 0, 0, 0], collections: ["festive-edit", "wedding-and-occasion"], daysAgo: 20,
  },
  // ── Men ──
  {
    slug: "arjun-white-kurta", name: "Arjun Kurta", styleCode: "BS-M-KT-201", department: "men", category: "kurtas",
    styleLine: "Modern silhouette, considered details.",
    description: "A crisp white kurta with a mandarin collar and concealed placket." + sampleNote,
    materials: "Cotton blend (sample data).", fit: "Regular fit. Falls just above the knee.", care: "Gentle machine wash, cold. Iron on reverse.",
    measurements: "Length approx. 40 in (size M).",
    colourName: "White", colourHex: "#F4F4F2",
    images: [{ file: "m-kurta-white", alt: "Man wearing a white mandarin-collar kurta, shown from the front" }],
    occasions: ["Everyday", "Festive"], tags: ["mandarin collar"], price: 3950, sizes: M, stock: [3, 8, 8, 5, 2], collections: ["everyday-elegance", "festive-edit"], daysAgo: 2,
  },
  {
    slug: "basant-mustard-kurta", name: "Basant Kurta", styleCode: "BS-M-KT-208", department: "men", category: "kurtas",
    styleLine: "Light, easy, festive.",
    description: "A mustard-yellow kurta with a band collar, worn with white trousers." + sampleNote,
    materials: "Cotton (sample data).", fit: "Regular fit.", care: "Machine wash, cold.",
    colourName: "Mustard", colourHex: "#E8B923",
    images: [{ file: "m-kurta-yellow", alt: "Man wearing a mustard-yellow kurta with white trousers" }],
    occasions: ["Haldi", "Festive"], tags: ["yellow"], price: 2950, sizes: M, stock: [5, 9, 9, 6, 4], collections: ["festive-edit"], daysAgo: 0,
  },
  {
    slug: "vihaan-mint-kurta", name: "Vihaan Kurta", styleCode: "BS-M-KT-206", department: "men", category: "kurtas",
    styleLine: "A calm colour for long celebrations.",
    description: "A mint-green long kurta with a band collar and side slits." + sampleNote,
    materials: "Cotton silk blend (sample data).", fit: "Regular fit; knee length.", care: "Dry clean recommended.",
    colourName: "Mint", colourHex: "#A8D5BA",
    images: [{ file: "m-kurta-mint", alt: "Man wearing a mint-green long kurta outdoors" }],
    occasions: ["Festive", "Mehendi"], tags: ["pastel"], price: 4250, sizes: M, stock: [0, 2, 3, 3, 1], collections: ["everyday-elegance"], daysAgo: 7,
  },
  {
    slug: "dev-lavender-kurta-jacket-set", name: "Dev Kurta & Jacket Set", styleCode: "BS-M-KS-207", department: "men", category: "kurta-sets",
    styleLine: "Layered, light, and occasion-ready.",
    description: "A lavender kurta and trousers paired with an embellished sleeveless jacket." + sampleNote,
    materials: "Silk blend (sample data).", fit: "Regular fit; jacket tailored.", care: "Dry clean only.", includedItems: "Kurta, trousers, jacket.",
    colourName: "Lavender", colourHex: "#C7B6DA",
    images: [{ file: "m-kurta-lavender", alt: "Man wearing a lavender kurta set with an embellished sleeveless jacket" }],
    occasions: ["Sangeet", "Festive"], tags: ["layered", "jacket"], price: 6900, sizes: M, stock: [2, 4, 4, 3, 1], collections: ["festive-edit", "wedding-and-occasion"], daysAgo: 5,
  },
  {
    slug: "rehan-dusty-rose-kurta-set", name: "Rehan Kurta Set", styleCode: "BS-M-KS-204", department: "men", category: "kurta-sets",
    styleLine: "Effortless, coordinated, ready to wear.",
    description: "A dusty-rose kurta and trousers with a coordinating draped stole." + sampleNote,
    materials: "Linen blend (sample data).", fit: "Relaxed fit.", care: "Gentle machine wash, cold.", includedItems: "Kurta, trousers, stole.",
    colourName: "Dusty Rose", colourHex: "#D9A3A0",
    images: [{ file: "m-kurtaset-pink", alt: "Man seated wearing a dusty-rose kurta set with a draped stole" }],
    occasions: ["Festive", "Mehendi"], tags: ["set", "stole"], price: 5400, sizes: M, stock: [4, 6, 7, 4, 3], collections: ["everyday-elegance"], daysAgo: 9,
  },
  {
    slug: "samar-navy-bandhgala", name: "Samar Bandhgala", styleCode: "BS-M-BG-205", department: "men", category: "bandhgalas",
    styleLine: "Contemporary tailoring, heritage-inspired collar.",
    description: "A navy bandhgala with a closed collar and tonal texture, paired with trousers." + sampleNote,
    materials: "Jacquard blend with lining (sample data).", fit: "Tailored fit; sizes refer to chest measurement in inches.", care: "Dry clean only.",
    includedItems: "Bandhgala jacket and trousers.",
    colourName: "Royal Navy", colourHex: "#1A2E5A",
    images: [{ file: "m-sherwani-navy", alt: "Man wearing a royal-navy bandhgala, seated on steps" }],
    occasions: ["Reception", "Evening"], tags: ["tailoring"], price: 18500, compareAtPrice: 21000, sizes: MC, stock: [1, 3, 3, 2, 0], collections: ["wedding-and-occasion"], daysAgo: 16,
  },
  {
    slug: "kabir-ivory-sherwani", name: "Kabir Sherwani", styleCode: "BS-M-SH-202", department: "men", category: "sherwanis",
    styleLine: "For the ceremonies that matter most.",
    description: "An ivory sherwani with tonal embroidery at the collar and placket, paired with a churidar." + sampleNote,
    materials: "Silk blend with lining (sample data).", fit: "Tailored fit; sizes refer to chest measurement in inches.", care: "Dry clean only.",
    includedItems: "Sherwani and churidar.",
    colourName: "Ivory", colourHex: "#EFE7D6",
    images: [{ file: "m-sherwani-ivory", alt: "Man wearing an ivory embroidered sherwani and a turban" }],
    occasions: ["Wedding", "Reception"], tags: ["embroidered", "groom"], price: 38000, sizes: MC, stock: [1, 2, 2, 1, 1], collections: ["wedding-and-occasion"], daysAgo: 12,
  },
  {
    slug: "imran-crimson-sherwani", name: "Imran Sherwani", styleCode: "BS-M-SH-209", department: "men", category: "sherwanis",
    styleLine: "Deep colour, defined structure.",
    description: "A crimson sherwani with a gold-tone pocket square detail, worn with ivory trousers." + sampleNote,
    materials: "Brocade blend with lining (sample data).", fit: "Tailored fit; sizes refer to chest measurement in inches.", care: "Dry clean only.",
    includedItems: "Sherwani and trousers.",
    colourName: "Crimson", colourHex: "#A3172B",
    images: [{ file: "m-sherwani-red", alt: "Man wearing a crimson sherwani with ivory trousers" }],
    occasions: ["Wedding", "Sangeet"], tags: ["groom"], price: 34500, sizes: MC, stock: [0, 1, 2, 1, 0], collections: ["wedding-and-occasion", "festive-edit"], daysAgo: 22,
  },
];
