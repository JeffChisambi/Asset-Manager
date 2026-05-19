/**
 * Malawi-first synonym & slang mapping.
 * Maps local language, slang, and common misspellings to canonical search terms.
 */

export const SYNONYM_MAP: Record<string, string[]> = {
  // Chichewa / local language
  foni: ["phone", "mobile", "smartphone"],
  "ma foni": ["phones", "mobile phones"],
  nsapato: ["shoes", "sneakers", "footwear"],
  "ma nsapato": ["shoes", "sneakers"],
  mankhwala: ["medicine", "pharmacy", "drugs", "health"],
  chakudya: ["food", "groceries", "meals"],
  zovala: ["clothes", "clothing", "fashion", "wear"],
  "ka shop": ["small store", "vendor", "shop"],
  katundu: ["goods", "products", "items"],
  ndalama: ["money", "payment", "finance"],
  nyumba: ["house", "home", "housing", "property"],
  galimoto: ["car", "vehicle", "transport"],

  // Slang & phonetic typing
  iphon: ["iphone", "apple phone"],
  iphone: ["iphone", "apple", "ios phone"],
  sumsang: ["samsung", "galaxy"],
  samsun: ["samsung", "galaxy"],
  adidaz: ["adidas"],
  nyk: ["nike"],
  nikey: ["nike"],
  jeans: ["jeans", "denim", "pants", "trousers"],
  "ma jeans": ["jeans", "denim", "trousers"],
  tshirt: ["t-shirt", "shirt", "top"],
  laptop: ["laptop", "computer", "pc", "notebook"],
  kompyuta: ["computer", "laptop", "desktop"],

  // Product categories
  phoni: ["phone", "smartphone"],
  mkate: ["bread", "bakery"],
  mafuta: ["oil", "cooking oil", "fuel"],
  tomato: ["tomatoes", "vegetables", "produce"],

  // Services / professionals
  "graphic designer": ["graphic designer", "designer", "poster maker", "logo"],
  "poster maker": ["graphic designer", "designer", "printing"],
  "laptop repair": ["laptop repair", "computer repair", "technician"],
  "phone repair": ["phone repair", "screen replacement", "mobile technician"],
  plumber: ["plumber", "plumbing", "pipes"],
  electrician: ["electrician", "electrical", "wiring"],
  carpenter: ["carpenter", "woodwork", "furniture repair"],
  painter: ["painter", "painting", "interior design"],
  tailor: ["tailor", "sewing", "clothes alteration", "dressmaker"],
  driver: ["driver", "chauffeur", "taxi", "transport"],
  cleaner: ["cleaner", "cleaning", "housekeeping"],
  photographer: ["photographer", "photography", "photos"],

  // English informal / typo-tolerant
  cheap: ["affordable", "budget", "low price", "deal"],
  "near me": ["nearby", "close", "local", "location"],
  best: ["top rated", "popular", "recommended"],
  new: ["latest", "new arrival", "fresh"],
  sale: ["discount", "offer", "promo", "deal"],
  second: ["second hand", "used", "pre-owned"],
  "second hand": ["used", "pre-owned", "refurbished"],
};

/**
 * Returns all synonym expansions for a given token.
 */
export function expandToken(token: string): string[] {
  const lower = token.toLowerCase().trim();
  const expansions = new Set<string>([lower]);

  // Direct lookup
  if (SYNONYM_MAP[lower]) {
    SYNONYM_MAP[lower].forEach((s) => expansions.add(s.toLowerCase()));
  }

  // Partial match (the token contains or is contained by a key)
  for (const [key, values] of Object.entries(SYNONYM_MAP)) {
    if (key.includes(lower) || lower.includes(key)) {
      values.forEach((s) => expansions.add(s.toLowerCase()));
    }
  }

  return Array.from(expansions);
}

/**
 * Expands all tokens in a multi-word query into a flat list of search terms.
 */
export function expandQuery(query: string): string[] {
  const rawTokens = query.toLowerCase().trim().split(/\s+/);
  const expanded = new Set<string>();

  // Add all raw tokens
  rawTokens.forEach((t) => expanded.add(t));

  // Add single-token expansions
  rawTokens.forEach((t) => {
    expandToken(t).forEach((e) => expanded.add(e));
  });

  // Try the full phrase as a key
  const phrase = rawTokens.join(" ");
  expandToken(phrase).forEach((e) => expanded.add(e));

  // Try bigrams from consecutive tokens
  for (let i = 0; i < rawTokens.length - 1; i++) {
    const bigram = rawTokens[i] + " " + rawTokens[i + 1];
    expandToken(bigram).forEach((e) => expanded.add(e));
  }

  return Array.from(expanded).filter((t) => t.length > 0);
}
