export type Lang = "en" | "ta";

export interface Landmark {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  roof: "flat" | "gopuram" | "shelter" | "stall" | "house" | "park";
  en: string;
  ta: string;
  subEn: string;
  subTa: string;
  maps?: string;
  npcEn?: string;
  npcTa?: string;
  quoteEn?: string;
  quoteTa?: string;
  /** door-facing override in radians (default: faces the nearest street) */
  face?: number;
}

// REAL Kosapet transcription (1 unit = 8 m, x east, z south).
// Origin: Masilamani St x Raman St junction (lon 79.13600, lat 12.90950).
// Street geometry verified against OpenStreetMap way data (shared junction
// nodes included). Names marked (?) are my best guess — please correct them.
export interface Street {
  id: string; en: string; ta: string;
  kind: "h" | "v"; at: number; from: number; to: number;
  signX: number; signZ: number;
}

export const STREETS: Street[] = [
  { id: "main", en: "Masilamani St", ta: "மசிலாமணி தெரு", kind: "h", at: 0, from: -23, to: 42, signX: -19, signZ: -5 },
  { id: "kasthamettu", en: "Kasthamettu St", ta: "கஸ்தமேட்டு தெரு", kind: "v", at: -22.9, from: -27.8, to: -2.5, signX: -26.5, signZ: -14 },
  { id: "avalakara", en: "Avalkara St", ta: "அவல்கார தெரு", kind: "v", at: -31.9, from: -33.2, to: 14.4, signX: -28, signZ: -20 },
  { id: "raman", en: "Raman St", ta: "ராமன் தெரு", kind: "v", at: 2.7, from: -35, to: 30, signX: 6.5, signZ: -20 },
  { id: "bungalow", en: "Bungalow St", ta: "பங்களா தெரு", kind: "h", at: -26.8, from: -31.9, to: -8.7, signX: -14, signZ: -31 },
  { id: "vinayaga", en: "Vinayaga Mudali St", ta: "விநாயக முதலி தெரு", kind: "h", at: -33.2, from: -39.2, to: -8.3, signX: -36, signZ: -37.5 },
  { id: "thirumalai", en: "Thirumalai Reddy St", ta: "திருமலை ரெட்டி தெரு", kind: "v", at: -19.7, from: -46, to: -32.6, signX: -16, signZ: -40 },
  { id: "anna", en: "Anna Salai", ta: "அண்ணா சாலை", kind: "v", at: -50, from: -40, to: -3, signX: -46, signZ: -30 },
  { id: "lpm", en: "Lakshmana Perumal St", ta: "லட்சுமண பெருமாள் தெரு", kind: "h", at: 19.3, from: -32, to: 9, signX: -28, signZ: 15 },
  { id: "subramani", en: "Subramani Samy Kovil St (?)", ta: "சுப்ரமணி கோவில் தெரு (?)", kind: "v", at: 15.6, from: -28, to: 0, signX: 19.5, signZ: -19 },
  { id: "sundar", en: "Sundareswarar Koil St (?)", ta: "சுந்தரேஸ்வரர் கோவில் தெரு (?)", kind: "v", at: 36.6, from: -26, to: 30, signX: 40, signZ: -20 },
  { id: "palani", en: "Palani Achari St (?)", ta: "பழனி ஆசாரி தெரு (?)", kind: "h", at: -12, from: -4, to: 38, signX: -6, signZ: -8 },
  { id: "kolakaran", en: "Kolakaran St (?)", ta: "கோலக்காரன் தெரு (?)", kind: "v", at: 10.9, from: 0, to: 20, signX: 15, signZ: 10 },
  { id: "ashoka", en: "Ashoka Natesan St", ta: "அசோக நடேசன் தெரு", kind: "v", at: -27.7, from: -48, to: -32.8, signX: -24, signZ: -40 },
  { id: "reddy", en: "Reddiyappa Mudali St", ta: "ரெட்டியப்ப முதலி தெரு", kind: "v", at: -8.1, from: -48, to: -1.8, signX: -3.5, signZ: -20 },
  { id: "vinakayam", en: "Vinakayam St", ta: "விநாயகம் தெரு", kind: "v", at: -15.2, from: -48, to: -33.3, signX: -11.5, signZ: -40 },
  { id: "nallanna", en: "Nallannapillai St (?)", ta: "நல்லண்ணப்பிள்ளை தெரு (?)", kind: "h", at: 30.4, from: -30, to: 22, signX: -27, signZ: 26 },
  { id: "kacheri", en: "Kacheri St (?)", ta: "கச்சேரி தெரு (?)", kind: "h", at: 12, from: 12, to: 40, signX: 27, signZ: 7.5 },
  { id: "valli", en: "Valliammal St (?)", ta: "வள்ளியம்மாள் தெரு (?)", kind: "v", at: 49, from: -2, to: 20, signX: 44, signZ: 16 },
];

export const LANDMARKS: Landmark[] = [
  // TN23 pin is TEMPORARY — tell me the real spot (street + metres from a junction).
  { id: "tn23", x: -14, z: 7.5, w: 9, d: 5, h: 3.5, color: "#e9ae63", roof: "flat",
    en: "TN23 Cycle Works (?)", ta: "TN23 சைக்கிள் கடை (?)", subEn: "Puncture · Chain · Brake", subTa: "பஞ்சர் · செயின் · பிரேக்",
    maps: "https://maps.app.goo.gl/G9otxqLXbkLnTV2K7",
    npcEn: "Kannan", npcTa: "கண்ணன்", quoteEn: "The puncture kit is on the workbench. Take care of the customer's cycle!", quoteTa: "பஞ்சர் கிட்டு ஒர்க்பெஞ்சில் இருக்கு. கஸ்டமர் சைக்கிளை பத்திரமா சரி பண்ணு!" },
  { id: "mamu", x: 21, z: 6.5, w: 4, d: 3.5, h: 2.5, color: "#7d492c", roof: "stall",
    en: "Mamu Tea Shop (?)", ta: "மாமு டீ கடை (?)", subEn: "Tea master", subTa: "டீ மாஸ்டர்",
    maps: "https://maps.app.goo.gl/D7SRKBevTPrjkGgA9",
    npcEn: "Mamu", npcTa: "மாமு", quoteEn: "Tea after the delivery? Don't hit my tea cart!", quoteTa: "டெலிவரி முடிச்சுட்டு டீ குடி! என் டீ வண்டி மேல சைக்கிள் ஏத்திடாதே!" },
  { id: "ranga", x: -8, z: 8, w: 7, d: 5, h: 3, color: "#c6a0d4", roof: "house", face: 0,
    en: "Ranga Kalyana Mandapam (?)", ta: "ரங்கா கல்யாண மண்டபம் (?)", subEn: "Marriage hall", subTa: "கல்யாண மண்டபம்",
    maps: "https://maps.app.goo.gl/zsCfp4s22eczjNncA" },
  { id: "busstop", x: 16.5, z: 5.5, w: 4.5, d: 3, h: 2.5, color: "#41779b", roof: "shelter",
    en: "Kosapet Bus Stop (?)", ta: "கோசப்பேட்டை பஸ் ஸ்டாப் (?)", subEn: "TNSTC", subTa: "TNSTC",
    maps: "https://maps.app.goo.gl/hVXshzfzcAReLQyB8",
    npcEn: "Selvi", npcTa: "செல்வி", quoteEn: "The bus stop is busy today. Ring the bell before you pass.", quoteTa: "பஸ் ஸ்டாப்பில் கூட்டம் அதிகம். போகும்போது பெல் அடிங்க." },
  { id: "fourknots", x: 24, z: -5.5, w: 6, d: 5, h: 3.5, color: "#c6a0d4", roof: "flat",
    en: "4Knots Photography (?)", ta: "4Knots போட்டோகிராபி (?)", subEn: "Studio", subTa: "ஸ்டுடியோ",
    maps: "https://maps.app.goo.gl/LLxvMWbSAhkPNyVy5",
    npcEn: "Meena", npcTa: "மீனா", quoteEn: "My bicycle is perfect! Nandri, TN23!", quoteTa: "என் சைக்கிள் சூப்பரா இருக்கு! நன்றி, TN23!" },
  { id: "salon", x: -38, z: 4, w: 5, d: 4, h: 3, color: "#ead29d", roof: "flat",
    en: "Raja Hair Salon (?)", ta: "ராஜா சலூன் (?)", subEn: "Cutting", subTa: "கட்டிங்" },
  { id: "grocery", x: -11, z: 6, w: 6, d: 5, h: 3, color: "#e8d29a", roof: "stall",
    en: "Anbu Grocery (?)", ta: "அன்பு மளிகை (?)", subEn: "Rice · Oil · Snacks", subTa: "அரிசி · எண்ணெய் · தின்பண்டம்",
    npcEn: "Palani", npcTa: "பழனி", quoteEn: "Fresh rice just arrived! Free cycle delivery nearby!", quoteTa: "புது அரிசி வந்திருக்கு! பக்கத்தில் சைக்கிள் டெலிவரி இலவசம்!" },
  { id: "tea2", x: 16.5, z: 5.5, w: 4, d: 3, h: 2.5, color: "#8a5a3a", roof: "stall",
    en: "Anbu Tea Stall (?)", ta: "அன்பு டீ ஸ்டால் (?)", subEn: "Coffee · Tea", subTa: "காபி · டீ",
    npcEn: "Anbu", npcTa: "அன்பு", quoteEn: "Strong filter coffee, two minutes! Don't block the road!", quoteTa: "ஸ்ட்ராங் பில்டர் காபி, இரண்டு நிமிஷம்! ரோட்டை மறைக்காதே!" },
  { id: "medicals", x: 43, z: 8, w: 5, d: 4, h: 3, color: "#dfe8dd", roof: "flat", face: Math.PI,
    en: "Kannan Medicals (?)", ta: "கண்ணன் மெடிக்கல்ஸ் (?)", subEn: "Medicines", subTa: "மருந்துகள்" },
  { id: "tailor", x: -15, z: 13, w: 5, d: 4, h: 3, color: "#d9b8d4", roof: "flat",
    en: "Lakshmi Tailors (?)", ta: "லட்சுமி டெய்லர்ஸ் (?)", subEn: "Stitching", subTa: "தையல்",
    npcEn: "Lakshmi", npcTa: "லட்சுமி", quoteEn: "Blouse ready tomorrow! Park the cycle properly!", quoteTa: "பிளவுஸ் நாளைக்கு ரெடி! சைக்கிளை ஒழுங்கா நிறுத்து!" },
  { id: "school", x: 9.5, z: -25, w: 4, d: 8, h: 4, color: "#ead29d", roof: "flat",
    en: "EV Ramasamy Girls School (?)", ta: "ஈ.வே.ரா பெண்கள் பள்ளி (?)", subEn: "Higher Secondary", subTa: "மேல்நிலைப்பள்ளி",
    maps: "https://maps.app.goo.gl/WhcWG6Xbv8mXCQ8E7",
    npcEn: "Arun", npcTa: "அருண்", quoteEn: "My chain keeps slipping. Can I bring it to TN23 tomorrow?", quoteTa: "என் செயின் அடிக்கடி கழட்டுது. நாளைக்கு TN23 கடைக்கு கொண்டு வரலாமா?" },
  { id: "meenakshi", x: -41.5, z: -8, w: 6, d: 5, h: 3.5, color: "#c6a0d4", roof: "house",
    en: "Meenakshi Mandapam (?)", ta: "மீனாட்சி மண்டபம் (?)", subEn: "Marriage hall", subTa: "கல்யாண மண்டபம்",
    maps: "https://maps.app.goo.gl/GtSWXL9kAiXX6aSV6" },
  { id: "market", x: 45.5, z: -7, w: 9, d: 4, h: 3, color: "#e7aa56", roof: "stall",
    en: "Kuttai Medu Market (?)", ta: "குட்டை மேடு மார்க்கெட் (?)", subEn: "Flowers · Vegetables", subTa: "பூ · காய்கறி",
    maps: "https://maps.app.goo.gl/eNeHV1nxRHMJ771v6",
    npcEn: "Latha", npcTa: "லதா", quoteEn: "Fresh flowers, fresh vegetables! Park the cycle properly!", quoteTa: "புது பூவும் காய்கறியும் இருக்கு! சைக்கிளை ஒழுங்கா நிறுத்து!" },
  { id: "subramani", x: 10, z: -41, w: 7, d: 7, h: 4, color: "#f2d497", roof: "gopuram",
    en: "Subramani Swamy Kovil (?)", ta: "சுப்ரமணி சுவாமி கோவில் (?)", subEn: "Temple", subTa: "கோவில்",
    maps: "https://maps.app.goo.gl/H9rMhoSSY8xEHJ979" },
  { id: "sundar", x: 44, z: -14, w: 8, d: 8, h: 4.5, color: "#f2d497", roof: "gopuram",
    en: "Sundareswarar Kovil (?)", ta: "சுந்தரேஸ்வரர் கோவில் (?)", subEn: "Temple", subTa: "கோவில்",
    maps: "https://maps.app.goo.gl/4rbDzBVbUqk2UHSk6" },
  { id: "college", x: -44, z: -20, w: 6, d: 8, h: 4, color: "#d7e3ef", roof: "flat",
    en: "Voorhees College", ta: "வூரீஸ் கல்லூரி", subEn: "College", subTa: "கல்லூரி",
    npcEn: "Students", npcTa: "மாணவர்கள்", quoteEn: "Morning assembly at 9! Don't cycle on the playground!", quoteTa: "காலை 9 மணிக்கு அசெம்பிளி! மைதானத்தில் சைக்கிள் ஓட்டாதே!" },
];

export const COPY = {
  en: {
    sub: "Kosapet Cycle Stories", mission: "TODAY'S DELIVERY", repair: "Repair bicycle",
    pickup: "Collect item", drop: "Deliver now", done: "Delivered!", allDone: "All deliveries complete!",
    next: "Next job", free: "Free roam — return to TN23", keys: "WASD / arrows · E to interact",
    close: "Close", lang: "தமிழ்", horn: "🔔 Horn", interact: "Interact (E)",
    onRoad: "On road — fast!", offRoad: "Off road — slow", maps: "Open in Maps ↗",
    total: "earned", job: "JOB",
  },
  ta: {
    sub: "கோசப்பேட்டை சைக்கிள் கதைகள்", mission: "இன்றைய டெலிவரி", repair: "சைக்கிளை சரி செய்",
    pickup: "பொருளை வாங்கு", drop: "டெலிவரி செய்", done: "டெலிவரி முடிந்தது!", allDone: "அனைத்து டெலிவரியும் முடிந்தது!",
    next: "அடுத்த வேலை", free: "சுதந்திரமாக சுற்றுங்கள் — TN23 திரும்புங்கள்", keys: "WASD / அம்பு · E பேசு",
    close: "மூடு", lang: "English", horn: "🔔 ஹாரன்", interact: "பேசு (E)",
    onRoad: "ரோட்டில் — வேகம்!", offRoad: "மண்ணில் — மெதுவு", maps: "Maps-ல் பார் ↗",
    total: "சம்பாத்தியம்", job: "வேலை",
  },
} as const;

export function landmarkById(id: string): Landmark {
  const l = LANDMARKS.find((x) => x.id === id);
  if (!l) throw new Error(`unknown landmark ${id}`);
  return l;
}

// ---- endless shop customers: repair at TN23, then deliver to their place ----
export interface Issue { id: string; en: string; ta: string; stepsEn: string[]; stepsTa: string[] }

export const ISSUES: Issue[] = [
  { id: "puncture", en: "Puncture", ta: "பஞ்சர்",
    stepsEn: ["Remove the tyre", "Apply the patch", "Pump the air"],
    stepsTa: ["டயரை கழட்டு", "ஒட்டு போடு", "காத்து அடி"] },
  { id: "chain", en: "Chain slip", ta: "செயின்",
    stepsEn: ["Open the chain cover", "Refit the chain", "Oil it and test"],
    stepsTa: ["செயின் கவரை எடு", "செயினை மாட்டு", "ஆயில் விட்டு டெஸ்ட் பண்ணு"] },
  { id: "brake", en: "Brake loose", ta: "பிரேக்",
    stepsEn: ["Check the brake wire", "Tighten the brake", "Test the brake"],
    stepsTa: ["பிரேக் வயரை பார்", "பிரேக்கை டைட் பண்ணு", "பிரேக்கை டெஸ்ட் பண்ணு"] },
];

export const CUSTOMER_NAMES: { en: string; ta: string }[] = [
  { en: "Meena", ta: "மீனா" }, { en: "Karthik", ta: "கார்த்திக்" },
  { en: "Priya", ta: "பிரியா" }, { en: "Murugan", ta: "முருகன்" },
  { en: "Lakshmi", ta: "லட்சுமி" }, { en: "Suresh", ta: "சுரேஷ்" },
  { en: "Arun", ta: "அருண்" }, { en: "Selvi", ta: "செல்வி" },
  { en: "Latha", ta: "லதா" },
];

// landmarks customers can live at / receive deliveries at
export const DEST_IDS = [
  "busstop", "market", "sundar", "subramani", "school",
  "meenakshi", "ranga", "mamu", "fourknots", "salon", "college",
  "grocery", "tea2", "medicals", "tailor",
];

export interface Customer {
  nameEn: string; nameTa: string; destId: string; issueId: string; reward: number; color: string;
}

const CUSTOMER_COLORS = ["#5e8fc5", "#4c9b77", "#bd6381", "#dd944f", "#7875be"];

// Fixed first customer so server + client render identically (no hydration error).
export const FIRST_CUSTOMER: Customer = {
  nameEn: "Meena", nameTa: "மீனா", destId: "fourknots",
  issueId: "puncture", reward: 150, color: "#5e8fc5",
};

export function randomCustomer(prevDestId?: string): Customer {
  const ni = Math.floor(Math.random() * CUSTOMER_NAMES.length);
  let destId = DEST_IDS[Math.floor(Math.random() * DEST_IDS.length)];
  if (destId === prevDestId) destId = DEST_IDS[(DEST_IDS.indexOf(destId) + 3) % DEST_IDS.length];
  const issueId = ISSUES[Math.floor(Math.random() * ISSUES.length)].id;
  const dest = landmarkById(destId);
  const shop = landmarkById("tn23");
  const distU = Math.hypot(dest.x - shop.x, dest.z - shop.z);
  const reward = Math.min(250, Math.max(80, Math.round((50 + distU * 2.2) / 10) * 10));
  return {
    nameEn: CUSTOMER_NAMES[ni].en, nameTa: CUSTOMER_NAMES[ni].ta,
    destId, issueId, reward, color: CUSTOMER_COLORS[ni % CUSTOMER_COLORS.length],
  };
}

// Paved driveways linking each door to its street (rideable under road rules).
export interface Apron { x: number; z: number; w: number; d: number }

export const APRONS: Apron[] = [
  { x: -14, z: 4, w: 4, d: 4 },      // TN23 shop -> Masilamani St
  { x: 21, z: 3.5, w: 3.5, d: 3 },   // Mamu tea -> Masilamani St
  { x: -8, z: 4, w: 4, d: 4 },       // Ranga mandapam -> Masilamani St
  { x: 16.5, z: 2.5, w: 4, d: 2 },   // Bus stop -> Masilamani St
  { x: 24, z: -1, w: 4, d: 4 },      // 4Knots -> Masilamani St
  { x: -33, z: 4, w: 5, d: 3 },      // Salon -> Avalkara St
  { x: -37, z: -8, w: 5, d: 4 },     // Meenakshi -> Avalkara St
  { x: -11, z: 3, w: 4, d: 4 },      // Grocery -> Masilamani St
  { x: 16.5, z: 3, w: 3.5, d: 3 },   // Tea stall 2 -> Masilamani St
  { x: 37, z: 8, w: 5, d: 3 },       // Medicals -> Sundareswarar Koil St
  { x: -15, z: 7, w: 4, d: 9 },      // Tailor -> Masilamani St
  { x: 9.5, z: -18, w: 4, d: 6 },    // School -> Palani Achari St
  { x: 36, z: -7, w: 6, d: 4 },      // Market -> Sundareswarar Koil St
  { x: 10, z: -36, w: 4, d: 5 },     // Subramani kovil -> Vinayaga Mudali St
  { x: 37, z: -14, w: 5, d: 4 },     // Sundareswarar kovil -> Sundareswarar Koil St
  { x: -49, z: -20, w: 4, d: 4 },    // College -> Anna Salai
];

// Wandering rider bases (Messenger-style presence).
export interface BotBase { en: string; ta: string; color: string; cx: number; cz: number; r: number; speed: number; phase: number }

export const BOT_BASES: BotBase[] = [
  { en: "Nila", ta: "நிலா", color: "#5e8fc5", cx: -16, cz: -6, r: 5, speed: 0.35, phase: 0 },
  { en: "Ravi", ta: "ரவி", color: "#4c9b77", cx: 10, cz: 12, r: 5, speed: 0.28, phase: 2.1 },
  { en: "Divya", ta: "திவ்யா", color: "#bd6381", cx: 14, cz: 38, r: 5, speed: 0.42, phase: 4.2 },
];

// Little Vellore notes shown under the mission card.
export const FACTS: { en: string; ta: string }[] = [
  { en: "🏰 Vellore Fort was built in the 16th century by Vijayanagara kings.", ta: "🏰 வேலூர் கோட்டை 16-ம் நூற்றாண்டில் விஜயநகர மன்னர்களால் கட்டப்பட்டது." },
  { en: "✨ Sripuram Golden Temple is covered with real gold leaf.", ta: "✨ ஸ்ரீபுரம் தங்கக் கோவில் உண்மையான தங்கத் தகடுகளால் மூடப்பட்டது." },
  { en: "🏥 CMC Vellore has healed people from across Asia since 1900.", ta: "🏥 வேலூர் சிஎம்சி 1900 முதல் மக்களுக்கு சிகிச்சை அளிக்கிறது." },
  { en: "🌊 Jalagamparai Falls roars near Yelagiri, an hour away.", ta: "🌊 ஜலகம்பாறை அருவி ஏலகிரி அருகே ஓரு மணி பயணத்தில் உள்ளது." },
  { en: "🦚 Amirthi Zoo and Palamathi hills guard Vellore's green side.", ta: "🦚 அமிர்தி பூங்காவும் பாலமதி மலையும் வேலூரின் பசுமையை காக்கின்றன." },
];
