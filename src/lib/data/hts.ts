/**
 * Harmonized Tariff Schedule (HTS) Code System
 *
 * Comprehensive manufacturing HS codes covering all major US export categories.
 * Source: USITC Harmonized Tariff Schedule (public data)
 */

export interface HSCode {
  code: string;
  description: string;
  chapter: number;
  section: string;
  generalDutyRate: string;
  specialPrograms: string[];
  unit: string;
  notes?: string;
}

export interface HSClassification {
  query: string;
  suggestions: HSCodeSuggestion[];
  timestamp: string;
}

export interface HSCodeSuggestion {
  code: string;
  description: string;
  confidence: number;
  generalDutyRate: string;
  chapter: number;
}

/**
 * Comprehensive manufacturing HS codes
 * Covers: metals, castings, 3D printing, defense, automotive, aerospace,
 * machinery, electronics, chemicals, plastics, medical, tooling, and more
 */
export const HS_DATABASE: HSCode[] = [
  // ═══════════════════════════════════════════════════════════
  // Chapter 26 — Ores, Slag, and Ash
  // ═══════════════════════════════════════════════════════════
  { code: "2620.99", description: "Slag, ash and residues containing metals or metal compounds, other", chapter: 26, section: "V", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 28 — Inorganic Chemicals
  // ═══════════════════════════════════════════════════════════
  { code: "2804.29", description: "Rare gases other than argon", chapter: 28, section: "VI", generalDutyRate: "3.7%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "2818.10", description: "Artificial corundum (aluminum oxide), for abrasives", chapter: 28, section: "VI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "2849.20", description: "Silicon carbide", chapter: 28, section: "VI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 29 — Organic Chemicals
  // ═══════════════════════════════════════════════════════════
  { code: "2916.12", description: "Esters of acrylic acid (for resins/coatings)", chapter: 29, section: "VI", generalDutyRate: "3.7%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "2933.61", description: "Melamine (for industrial resins and laminates)", chapter: 29, section: "VI", generalDutyRate: "3.5%", specialPrograms: ["USMCA"], unit: "kg" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 32 — Tanning/Dyeing Extracts, Paints, Inks
  // ═══════════════════════════════════════════════════════════
  { code: "3208.20", description: "Paints and varnishes based on acrylic or vinyl polymers, industrial coatings", chapter: 32, section: "VI", generalDutyRate: "3.6%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "3214.10", description: "Glaziers' putty, grafting putty, resin cements and caulking compounds", chapter: 32, section: "VI", generalDutyRate: "3.7%", specialPrograms: ["USMCA"], unit: "kg" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 38 — Miscellaneous Chemical Products
  // ═══════════════════════════════════════════════════════════
  { code: "3824.99", description: "Chemical products and preparations, NES (includes industrial chemical blends)", chapter: 38, section: "VI", generalDutyRate: "5%", specialPrograms: ["USMCA"], unit: "kg" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 39 — Plastics and Articles Thereof
  // ═══════════════════════════════════════════════════════════
  { code: "3901.10", description: "Polyethylene, specific gravity <0.94, in primary forms", chapter: 39, section: "VII", generalDutyRate: "6.5%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "3907.21", description: "Epoxides, in primary forms (epoxy resin)", chapter: 39, section: "VII", generalDutyRate: "6.1%", specialPrograms: ["USMCA"], unit: "kg", notes: "Epoxy resins for aerospace composites, 3D printing resins, industrial adhesives" },
  { code: "3916.90", description: "Monofilament, rods, sticks and profile shapes of plastics, other", chapter: 39, section: "VII", generalDutyRate: "5.8%", specialPrograms: ["USMCA"], unit: "kg", notes: "Includes 3D printing filament, plastic extrusion profiles, PLA/ABS/PETG filament" },
  { code: "3917.39", description: "Tubes, pipes and hoses of plastics, other, not reinforced", chapter: 39, section: "VII", generalDutyRate: "3.1%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "3920.10", description: "Plates, sheets, film of polymers of ethylene, not reinforced", chapter: 39, section: "VII", generalDutyRate: "4.2%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "3926.90", description: "Other articles of plastics and articles of other materials (headings 3901-3914)", chapter: 39, section: "VII", generalDutyRate: "5.3%", specialPrograms: ["USMCA", "CETA"], unit: "kg", notes: "Includes 3D printed plastic parts, custom plastic components, prototypes" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 40 — Rubber and Articles Thereof
  // ═══════════════════════════════════════════════════════════
  { code: "4016.93", description: "Gaskets, washers and other seals of vulcanized rubber", chapter: 40, section: "VII", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "4016.99", description: "Other articles of vulcanized rubber, NES", chapter: 40, section: "VII", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "kg" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 41 — Raw Hides and Skins (Other Than Furskins) and Leather
  // ═══════════════════════════════════════════════════════════
  { code: "4104.11", description: "Full grains bovine/equine leather, unsplit, in the wet state", chapter: 41, section: "VIII", generalDutyRate: "2.4%", specialPrograms: ["USMCA"], unit: "m2", notes: "Cowhide leather, full grain bovine hides" },
  { code: "4104.19", description: "Bovine/equine leather, other, in the wet state", chapter: 41, section: "VIII", generalDutyRate: "2.4%", specialPrograms: ["USMCA"], unit: "m2" },
  { code: "4107.11", description: "Full grains bovine/equine leather, further prepared, whole hides", chapter: 41, section: "VIII", generalDutyRate: "2.8%", specialPrograms: ["USMCA"], unit: "m2", notes: "Finished leather hides, full grain cowhide leather" },
  { code: "4107.19", description: "Bovine/equine leather, further prepared, other, whole hides", chapter: 41, section: "VIII", generalDutyRate: "2.8%", specialPrograms: ["USMCA"], unit: "m2" },
  { code: "4113.10", description: "Leather of goats or kids, further prepared", chapter: 41, section: "VIII", generalDutyRate: "2.4%", specialPrograms: ["USMCA"], unit: "m2", notes: "Goatskin leather, kid leather" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 42 — Articles of Leather; Saddlery and Harness; Travel Goods
  // ═══════════════════════════════════════════════════════════
  { code: "4201.00", description: "Saddlery and harness for any animal, of any material", chapter: 42, section: "VIII", generalDutyRate: "2.8%", specialPrograms: ["USMCA"], unit: "No" },
  { code: "4202.11", description: "Trunks, suitcases, vanity cases with outer surface of leather", chapter: 42, section: "VIII", generalDutyRate: "8%", specialPrograms: ["USMCA"], unit: "No", notes: "Leather luggage, leather suitcases, travel bags" },
  { code: "4202.21", description: "Handbags with outer surface of leather", chapter: 42, section: "VIII", generalDutyRate: "8%", specialPrograms: ["USMCA"], unit: "No", notes: "Leather handbags, leather purses, leather totes" },
  { code: "4202.31", description: "Wallets, purses, key-cases with outer surface of leather", chapter: 42, section: "VIII", generalDutyRate: "8%", specialPrograms: ["USMCA"], unit: "No", notes: "Leather wallets, leather billfolds, leather card cases" },
  { code: "4202.91", description: "Other containers with outer surface of leather", chapter: 42, section: "VIII", generalDutyRate: "8%", specialPrograms: ["USMCA"], unit: "No", notes: "Leather cases, leather pouches, leather holders" },
  { code: "4203.10", description: "Articles of apparel of leather or composition leather", chapter: 42, section: "VIII", generalDutyRate: "6%", specialPrograms: ["USMCA"], unit: "No", notes: "Leather jackets, leather coats, leather vests, leather clothing" },
  { code: "4203.21", description: "Gloves, mittens and mitts of leather, specially designed for use in sports", chapter: 42, section: "VIII", generalDutyRate: "3%", specialPrograms: ["USMCA"], unit: "doz. prs", notes: "Baseball gloves, batting gloves, golf gloves, sports leather gloves, baseball mitts" },
  { code: "4203.29", description: "Gloves, mittens and mitts of leather, other", chapter: 42, section: "VIII", generalDutyRate: "14%", specialPrograms: ["USMCA"], unit: "doz. prs", notes: "Leather work gloves, leather dress gloves, driving gloves, motorcycle gloves" },
  { code: "4203.30", description: "Belts and bandoliers of leather", chapter: 42, section: "VIII", generalDutyRate: "2.7%", specialPrograms: ["USMCA"], unit: "No", notes: "Leather belts, leather straps" },
  { code: "4203.40", description: "Other clothing accessories of leather", chapter: 42, section: "VIII", generalDutyRate: "3.9%", specialPrograms: ["USMCA"], unit: "No", notes: "Leather accessories, leather wristbands" },
  { code: "4205.00", description: "Other articles of leather or composition leather", chapter: 42, section: "VIII", generalDutyRate: "3.3%", specialPrograms: ["USMCA"], unit: "kg", notes: "Leather goods, leather products, leather crafts, leather articles NES" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 61 — Articles of Apparel, Knitted or Crocheted
  // ═══════════════════════════════════════════════════════════
  { code: "6110.20", description: "Jerseys, pullovers, cardigans of cotton, knitted", chapter: 61, section: "XI", generalDutyRate: "16.5%", specialPrograms: ["USMCA"], unit: "doz", notes: "Cotton sweaters, cotton knitwear, cotton jerseys" },
  { code: "6116.10", description: "Gloves impregnated, coated or covered with plastics or rubber, knitted", chapter: 61, section: "XI", generalDutyRate: "13.2%", specialPrograms: ["USMCA"], unit: "doz. prs", notes: "Work gloves, coated knit gloves, rubber grip gloves" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 62 — Articles of Apparel, Not Knitted
  // ═══════════════════════════════════════════════════════════
  { code: "6211.33", description: "Men's tracksuits, ski suits and swimwear of man-made fibers", chapter: 62, section: "XI", generalDutyRate: "16%", specialPrograms: ["USMCA"], unit: "doz", notes: "Athletic wear, sportswear, sports uniforms, team uniforms" },
  { code: "6216.00", description: "Gloves, mittens and mitts (textile), not knitted", chapter: 62, section: "XI", generalDutyRate: "10.4%", specialPrograms: ["USMCA"], unit: "doz. prs", notes: "Textile gloves, fabric gloves, cloth gloves" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 64 — Footwear
  // ═══════════════════════════════════════════════════════════
  { code: "6403.19", description: "Sports footwear with outer soles of rubber/plastics, upper of leather", chapter: 64, section: "XII", generalDutyRate: "8.5%", specialPrograms: ["USMCA"], unit: "prs", notes: "Leather athletic shoes, cleats, sports shoes, baseball cleats" },
  { code: "6403.51", description: "Footwear with outer soles of leather, covering the ankle", chapter: 64, section: "XII", generalDutyRate: "8.5%", specialPrograms: ["USMCA"], unit: "prs", notes: "Leather boots, work boots, hiking boots" },
  { code: "6403.59", description: "Footwear with outer soles of leather, other", chapter: 64, section: "XII", generalDutyRate: "8.5%", specialPrograms: ["USMCA"], unit: "prs", notes: "Leather shoes, dress shoes, casual leather shoes" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 65 — Headgear
  // ═══════════════════════════════════════════════════════════
  { code: "6506.10", description: "Safety headgear (helmets)", chapter: 65, section: "XII", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No", notes: "Hard hats, safety helmets, construction helmets, sports helmets, batting helmets" },
  { code: "6506.99", description: "Headgear, other", chapter: 65, section: "XII", generalDutyRate: "8.5%", specialPrograms: ["USMCA"], unit: "No", notes: "Hats, caps, baseball caps, sports caps, visors" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 95 — Toys, Games, Sports Equipment
  // ═══════════════════════════════════════════════════════════
  { code: "9506.39", description: "Golf clubs and other golf equipment", chapter: 95, section: "XX", generalDutyRate: "4.9%", specialPrograms: ["USMCA"], unit: "No", notes: "Golf clubs, golf bags, golf equipment" },
  { code: "9506.40", description: "Articles and equipment for table tennis", chapter: 95, section: "XX", generalDutyRate: "5.1%", specialPrograms: ["USMCA"], unit: "No" },
  { code: "9506.51", description: "Lawn-tennis rackets, whether or not strung", chapter: 95, section: "XX", generalDutyRate: "3.9%", specialPrograms: ["USMCA"], unit: "No", notes: "Tennis rackets, badminton rackets" },
  { code: "9506.59", description: "Badminton or similar rackets, other", chapter: 95, section: "XX", generalDutyRate: "5.3%", specialPrograms: ["USMCA"], unit: "No" },
  { code: "9506.61", description: "Lawn-tennis balls", chapter: 95, section: "XX", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No" },
  { code: "9506.62", description: "Inflatable balls", chapter: 95, section: "XX", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No", notes: "Footballs, soccer balls, basketballs, volleyballs" },
  { code: "9506.69", description: "Balls, other (except golf balls and table-tennis balls)", chapter: 95, section: "XX", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No", notes: "Baseballs, softballs, cricket balls" },
  { code: "9506.70", description: "Ice skates and roller skates, including skating boots with skates attached", chapter: 95, section: "XX", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "prs" },
  { code: "9506.91", description: "Articles and equipment for general physical exercise, gymnastics or athletics", chapter: 95, section: "XX", generalDutyRate: "4.6%", specialPrograms: ["USMCA"], unit: "No", notes: "Exercise equipment, gym equipment, fitness gear, weights, treadmills" },
  { code: "9506.99", description: "Articles and equipment for sports and outdoor games, NES; swimming pools and paddling pools", chapter: 95, section: "XX", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No", notes: "Baseball equipment, baseball bats, softball equipment, sports gear, sporting goods, athletic equipment, protective sports gear, batting cages" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 68 — Stone, Plaster, Cement, Ceramic Articles
  // ═══════════════════════════════════════════════════════════
  { code: "6802.93", description: "Worked granite articles (dimensional stone)", chapter: 68, section: "XIII", generalDutyRate: "3.7%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "6815.99", description: "Other articles of stone or mineral substances, NES", chapter: 68, section: "XIII", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg", notes: "Includes ceramic mold materials, refractory articles, investment casting shells" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 69 — Ceramic Products
  // ═══════════════════════════════════════════════════════════
  { code: "6903.20", description: "Refractory ceramic goods, alumina content >50%, for industrial furnaces/kilns", chapter: 69, section: "XIII", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg", notes: "Crucibles, molds, nozzles for metal casting and melting" },
  { code: "6909.19", description: "Ceramic articles for laboratory, chemical or technical use, other", chapter: 69, section: "XIII", generalDutyRate: "4%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "6914.90", description: "Other ceramic articles, NES", chapter: 69, section: "XIII", generalDutyRate: "5.6%", specialPrograms: ["USMCA"], unit: "kg", notes: "Includes ceramic cores for investment casting, ceramic 3D printed components" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 71 — Precious Metals and Jewelry
  // ═══════════════════════════════════════════════════════════
  { code: "7106.91", description: "Silver, unwrought (including gold-plated silver)", chapter: 71, section: "XIV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7108.13", description: "Gold, in semi-manufactured forms", chapter: 71, section: "XIV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7110.11", description: "Platinum, unwrought or in powder form", chapter: 71, section: "XIV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 72 — Iron and Steel
  // ═══════════════════════════════════════════════════════════
  { code: "7201.10", description: "Non-alloy pig iron, containing ≤0.5% phosphorus", chapter: 72, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg", notes: "Raw iron for foundry/casting operations" },
  { code: "7206.10", description: "Iron and non-alloy steel ingots", chapter: 72, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7207.11", description: "Semi-finished products of iron/non-alloy steel, rectangular cross-section, carbon <0.25%", chapter: 72, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg", notes: "Steel billets and blooms for casting feedstock" },
  { code: "7208.51", description: "Flat-rolled products of iron/non-alloy steel, hot-rolled, width ≥600mm, thickness >10mm", chapter: 72, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "kg" },
  { code: "7210.49", description: "Flat-rolled products of iron/non-alloy steel, zinc-plated/coated, other", chapter: 72, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7218.10", description: "Stainless steel in ingots and other primary forms", chapter: 72, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "kg", notes: "Stainless steel feedstock for casting and machining" },
  { code: "7224.10", description: "Alloy steel ingots and other primary forms", chapter: 72, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg", notes: "Specialty alloy steel for defense and aerospace castings" },
  { code: "7228.30", description: "Other bars and rods of alloy steel, hot-rolled, not further worked", chapter: 72, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "kg" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 73 — Articles of Iron or Steel
  // ═══════════════════════════════════════════════════════════
  { code: "7301.10", description: "Sheet piling of iron or steel", chapter: 73, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7304.31", description: "Tubes, pipes and hollow profiles of iron/steel, cold-drawn/rolled, circular cross-section", chapter: 73, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7307.19", description: "Tube or pipe fittings of stainless steel, cast", chapter: 73, section: "XV", generalDutyRate: "5%", specialPrograms: ["USMCA"], unit: "kg", notes: "Cast stainless steel pipe fittings, elbows, tees" },
  { code: "7307.99", description: "Tube or pipe fittings of iron or steel, other", chapter: 73, section: "XV", generalDutyRate: "5%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7318.15", description: "Threaded screws and bolts, of iron or steel", chapter: 73, section: "XV", generalDutyRate: "8.6%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7320.10", description: "Leaf springs and leaves therefor, of iron or steel", chapter: 73, section: "XV", generalDutyRate: "3.2%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7325.10", description: "Articles of non-malleable cast iron, NES", chapter: 73, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "kg", notes: "Cast iron components, housings, brackets, industrial castings" },
  { code: "7325.99", description: "Other cast articles of iron or steel, NES", chapter: 73, section: "XV", generalDutyRate: "2.9%", specialPrograms: ["USMCA", "CETA"], unit: "kg", notes: "Steel castings, sand castings, investment castings, lost-wax castings, precision castings for industrial use" },
  { code: "7326.19", description: "Other forged or stamped articles of iron or steel, not further worked", chapter: 73, section: "XV", generalDutyRate: "2.9%", specialPrograms: ["USMCA"], unit: "kg", notes: "Forged steel parts, die forgings" },
  { code: "7326.90", description: "Other articles of iron or steel, other", chapter: 73, section: "XV", generalDutyRate: "2.9%", specialPrograms: ["USMCA", "CETA"], unit: "kg", notes: "Fabricated metal parts, welded assemblies, metal components NES" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 74 — Copper and Articles Thereof
  // ═══════════════════════════════════════════════════════════
  { code: "7403.11", description: "Refined copper cathodes and sections of cathodes", chapter: 74, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7409.19", description: "Copper plates, sheets, strip, thickness >0.15mm, other", chapter: 74, section: "XV", generalDutyRate: "1%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7411.10", description: "Tubes and pipes of refined copper", chapter: 74, section: "XV", generalDutyRate: "1.5%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7419.99", description: "Other articles of copper, NES", chapter: 74, section: "XV", generalDutyRate: "3%", specialPrograms: ["USMCA"], unit: "kg", notes: "Copper castings, bronze castings, copper alloy components" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 75 — Nickel and Articles Thereof
  // ═══════════════════════════════════════════════════════════
  { code: "7502.10", description: "Nickel, unwrought, not alloyed", chapter: 75, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7505.12", description: "Bars, rods and profiles of nickel alloys", chapter: 75, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg", notes: "Inconel, Hastelloy, nickel superalloy bar stock for castings" },
  { code: "7508.90", description: "Other articles of nickel, NES", chapter: 75, section: "XV", generalDutyRate: "3%", specialPrograms: ["USMCA"], unit: "kg", notes: "Nickel alloy castings, superalloy components, high-temp castings" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 76 — Aluminum and Articles Thereof
  // ═══════════════════════════════════════════════════════════
  { code: "7601.10", description: "Aluminum, not alloyed, unwrought", chapter: 76, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7601.20", description: "Aluminum alloys, unwrought", chapter: 76, section: "XV", generalDutyRate: "2.6%", specialPrograms: ["USMCA"], unit: "kg", notes: "Aluminum alloy ingots for die casting and sand casting" },
  { code: "7604.29", description: "Aluminum alloy profiles (hollow)", chapter: 76, section: "XV", generalDutyRate: "5%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7606.12", description: "Aluminum alloy plates, sheets, strip, thickness >0.2mm, rectangular", chapter: 76, section: "XV", generalDutyRate: "5%", specialPrograms: ["USMCA", "CETA"], unit: "kg" },
  { code: "7610.10", description: "Aluminum doors, windows and their frames", chapter: 76, section: "XV", generalDutyRate: "5.7%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "7616.99", description: "Other articles of aluminum, NES", chapter: 76, section: "XV", generalDutyRate: "5%", specialPrograms: ["USMCA", "CETA"], unit: "kg", notes: "Aluminum die castings, sand castings, aluminum machined parts, extruded components" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 80 — Tin and Articles Thereof
  // ═══════════════════════════════════════════════════════════
  { code: "8007.00", description: "Other articles of tin, NES", chapter: 80, section: "XV", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "kg" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 81 — Other Base Metals; Cermets
  // ═══════════════════════════════════════════════════════════
  { code: "8101.96", description: "Tungsten wire", chapter: 81, section: "XV", generalDutyRate: "3.6%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "8102.96", description: "Molybdenum wire", chapter: 81, section: "XV", generalDutyRate: "4%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "8108.20", description: "Titanium, unwrought; titanium powders", chapter: 81, section: "XV", generalDutyRate: "15%", specialPrograms: ["USMCA"], unit: "kg", notes: "Titanium sponge and powder for additive manufacturing, aerospace castings, 3D printing metal powder" },
  { code: "8108.90", description: "Other articles of titanium, NES", chapter: 81, section: "XV", generalDutyRate: "5.5%", specialPrograms: ["USMCA"], unit: "kg", notes: "Titanium castings, titanium 3D printed parts, aerospace titanium components" },
  { code: "8109.20", description: "Zirconium, unwrought; zirconium powders", chapter: 81, section: "XV", generalDutyRate: "4.2%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "8113.00", description: "Cermets and articles thereof, including waste and scrap", chapter: 81, section: "XV", generalDutyRate: "3.7%", specialPrograms: ["USMCA"], unit: "kg", notes: "Cermet cutting tools, tungsten carbide parts" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 82 — Tools, Cutlery, and Parts
  // ═══════════════════════════════════════════════════════════
  { code: "8207.19", description: "Rock drilling or earth boring tools with working parts of other materials, interchangeable", chapter: 82, section: "XV", generalDutyRate: "5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8207.30", description: "Tools for pressing, stamping or punching, interchangeable", chapter: 82, section: "XV", generalDutyRate: "5%", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Press dies, stamping dies, punching tools" },
  { code: "8207.40", description: "Tools for tapping or threading, interchangeable", chapter: 82, section: "XV", generalDutyRate: "5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8207.50", description: "Tools for drilling, other than for rock drilling, interchangeable", chapter: 82, section: "XV", generalDutyRate: "5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8207.70", description: "Tools for milling, interchangeable", chapter: 82, section: "XV", generalDutyRate: "5%", specialPrograms: ["USMCA", "CETA"], unit: "No." },
  { code: "8209.00", description: "Plates, sticks, tips for tools, unmounted, of sintered metal carbides or cermets", chapter: 82, section: "XV", generalDutyRate: "4.6%", specialPrograms: ["USMCA"], unit: "kg", notes: "Carbide inserts, cutting tool tips, wear-resistant tool components" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 83 — Miscellaneous Articles of Base Metal
  // ═══════════════════════════════════════════════════════════
  { code: "8302.41", description: "Base metal mountings, fittings for buildings (door hardware)", chapter: 83, section: "XV", generalDutyRate: "3.9%", specialPrograms: ["USMCA"], unit: "kg" },
  { code: "8309.90", description: "Stoppers, caps, lids of base metal, other", chapter: 83, section: "XV", generalDutyRate: "3%", specialPrograms: ["USMCA"], unit: "kg" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 84 — Machinery and Mechanical Appliances
  // ═══════════════════════════════════════════════════════════

  // -- Casting and foundry equipment --
  { code: "8454.10", description: "Converters of a kind used in metallurgy or metal foundries", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Metal casting converters, foundry equipment, ladle furnaces" },
  { code: "8454.20", description: "Ingot molds and ladles, of a kind used in metallurgy or metal foundries", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Casting molds, ladles, metal pouring equipment, foundry tooling" },
  { code: "8454.30", description: "Casting machines of a kind used in metallurgy or metal foundries", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Die casting machines, sand casting machines, centrifugal casting equipment, investment casting equipment, continuous casting machines" },
  { code: "8454.90", description: "Parts of converters, ladles, ingot molds and casting machines", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Casting machine spare parts, mold components, foundry tooling parts" },

  // -- 3D printing / Additive manufacturing --
  { code: "8477.59", description: "Other machinery for moulding or forming — including 3D printers for plastics", chapter: 84, section: "XVI", generalDutyRate: "3.1%", specialPrograms: ["USMCA"], unit: "No.", notes: "3D printers, FDM printers, SLA resin printers, additive manufacturing machines for plastics and polymers" },
  { code: "8479.89", description: "Other machines and mechanical appliances, NES", chapter: 84, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Metal 3D printers, DMLS/SLM machines, binder jetting machines, additive manufacturing equipment for metals, powder bed fusion systems, directed energy deposition systems" },
  { code: "8479.90", description: "Parts of machines and mechanical appliances of heading 8479", chapter: 84, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No.", notes: "Parts for 3D printers, additive manufacturing components, print heads, build plates" },

  // -- Molds and tooling --
  { code: "8480.41", description: "Injection or compression type molds for metal or metal carbides", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Die cast molds, metal injection molds, casting dies" },
  { code: "8480.49", description: "Other molds for metal or metal carbides", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Sand casting molds and patterns, permanent molds, investment casting molds, lost-wax molds, shell molds, 3D printed molds for metal casting" },
  { code: "8480.50", description: "Molds for glass", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8480.60", description: "Molds for mineral materials (concrete, ceramic)", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8480.71", description: "Injection or compression type molds for rubber or plastics", chapter: 84, section: "XVI", generalDutyRate: "3.1%", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Plastic injection molds, rubber molds, tooling for plastic parts" },
  { code: "8480.79", description: "Other molds for rubber or plastics", chapter: 84, section: "XVI", generalDutyRate: "3.1%", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Blow molds, rotational molds, thermoforming molds, 3D printed molds for plastics" },

  // -- Engines and turbines --
  { code: "8401.10", description: "Nuclear reactors", chapter: 84, section: "XVI", generalDutyRate: "3.3%", specialPrograms: [], unit: "No." },
  { code: "8407.34", description: "Spark-ignition reciprocating engines, cylinder capacity >1000cc", chapter: 84, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8408.20", description: "Compression-ignition engines (diesel) for vehicles", chapter: 84, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8409.91", description: "Parts for spark-ignition engines (pistons, rings, rods)", chapter: 84, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No.", notes: "Cast engine blocks, cylinder heads, crankshafts, connecting rods" },
  { code: "8409.99", description: "Parts for diesel engines (pistons, rings, rods)", chapter: 84, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8411.81", description: "Gas turbines, other than turbo-jets/turbo-props, power ≤5,000kW", chapter: 84, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA", "CETA"], unit: "No." },
  { code: "8411.99", description: "Parts of gas turbines", chapter: 84, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No.", notes: "Turbine blades, nozzle guide vanes, shrouds — often investment cast superalloy" },

  // -- Pumps, compressors, fans --
  { code: "8413.30", description: "Fuel, lubricating or cooling medium pumps for internal combustion engines", chapter: 84, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8413.70", description: "Other centrifugal pumps", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Industrial centrifugal pumps, cast pump housings" },
  { code: "8413.91", description: "Parts of pumps for liquids", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No.", notes: "Cast pump impellers, housings, volutes" },
  { code: "8414.59", description: "Fans, other (industrial ventilation)", chapter: 84, section: "XVI", generalDutyRate: "2.3%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8414.80", description: "Air compressors and pumps", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },

  // -- Furnaces and heaters --
  { code: "8417.10", description: "Furnaces and ovens for the roasting, melting or heat-treatment of ores or metals", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Foundry furnaces, melting furnaces, heat treatment furnaces, induction furnaces" },
  { code: "8417.80", description: "Other industrial or laboratory furnaces and ovens", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No.", notes: "Sintering furnaces for 3D printed metal parts, debinding ovens" },

  // -- Filtering, purifying --
  { code: "8421.21", description: "Filtering or purifying machinery for water", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "No." },

  // -- Other machinery --
  { code: "8424.89", description: "Other mechanical appliances for projecting/dispersing liquids or powders", chapter: 84, section: "XVI", generalDutyRate: "1.8%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8428.33", description: "Continuous-action elevators and conveyors for goods, belt type", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8429.51", description: "Front-end shovel loaders", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8431.39", description: "Parts of machinery of heading 8428", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },

  // -- Machine tools --
  { code: "8456.11", description: "Machine tools operated by laser for material removal", chapter: 84, section: "XVI", generalDutyRate: "4.4%", specialPrograms: ["USMCA"], unit: "No.", notes: "Laser cutting machines, laser engraving, laser machining centers" },
  { code: "8456.20", description: "Machine tools operated by ultrasonic processes", chapter: 84, section: "XVI", generalDutyRate: "4.4%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8457.10", description: "Machining centers for working metal", chapter: 84, section: "XVI", generalDutyRate: "4.4%", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "CNC machining centers, 5-axis mills, horizontal machining centers" },
  { code: "8458.11", description: "Horizontal lathes, CNC, for removing metal", chapter: 84, section: "XVI", generalDutyRate: "4.4%", specialPrograms: ["USMCA"], unit: "No.", notes: "CNC lathes, turning centers" },
  { code: "8460.11", description: "Flat-surface grinding machines, CNC", chapter: 84, section: "XVI", generalDutyRate: "4.4%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8462.10", description: "Forging or die-stamping machines", chapter: 84, section: "XVI", generalDutyRate: "4.4%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8462.41", description: "Punching or notching machines for working metal, CNC", chapter: 84, section: "XVI", generalDutyRate: "4.4%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8466.93", description: "Parts and accessories for machine tools of headings 8456-8461", chapter: 84, section: "XVI", generalDutyRate: "4.7%", specialPrograms: ["USMCA"], unit: "No." },

  // -- Computers --
  { code: "8471.30", description: "Portable automatic data processing machines (laptops)", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8471.50", description: "Processing units for automatic data processing machines", chapter: 84, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },

  // -- VALVES --
  { code: "8481.10", description: "Pressure-reducing valves", chapter: 84, section: "XVI", generalDutyRate: "2%", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Pressure regulators for industrial gas systems" },
  { code: "8481.20", description: "Valves for oleohydraulic or pneumatic transmissions", chapter: 84, section: "XVI", generalDutyRate: "2%", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Hydraulic/pneumatic directional control valves" },
  { code: "8481.30", description: "Check (nonreturn) valves", chapter: 84, section: "XVI", generalDutyRate: "2%", specialPrograms: ["USMCA", "CETA"], unit: "No." },
  { code: "8481.40", description: "Safety or relief valves", chapter: 84, section: "XVI", generalDutyRate: "2%", specialPrograms: ["USMCA", "CETA"], unit: "No." },
  { code: "8481.80", description: "Other taps, cocks, valves and similar appliances, NES", chapter: 84, section: "XVI", generalDutyRate: "2%", specialPrograms: ["USMCA", "CETA", "KORUS"], unit: "No.", notes: "Ball valves, butterfly valves, gate valves, globe valves for industrial applications" },
  { code: "8481.90", description: "Parts of taps, cocks, valves and similar appliances", chapter: 84, section: "XVI", generalDutyRate: "2%", specialPrograms: ["USMCA", "CETA"], unit: "No." },

  // -- Bearings and gears --
  { code: "8482.10", description: "Ball bearings", chapter: 84, section: "XVI", generalDutyRate: "9%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8482.20", description: "Tapered roller bearings", chapter: 84, section: "XVI", generalDutyRate: "9%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8483.40", description: "Gears and gearing, ball or roller screws, gear boxes and speed changers", chapter: 84, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Cast and machined gears, gearbox housings" },
  { code: "8483.90", description: "Toothed wheels, chain sprockets, clutches, shaft couplings, and parts", chapter: 84, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No." },

  // -- Gaskets, seals --
  { code: "8484.10", description: "Gaskets and similar joints of metal sheeting combined with other material", chapter: 84, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No." },

  // ═══════════════════════════════════════════════════════════
  // Chapter 85 — Electrical Machinery
  // ═══════════════════════════════════════════════════════════
  { code: "8501.31", description: "DC motors and generators, output 750W-75kW", chapter: 85, section: "XVI", generalDutyRate: "2.8%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8501.52", description: "AC motors, multi-phase, output 750W-75kW", chapter: 85, section: "XVI", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8504.40", description: "Static converters (power supplies, inverters)", chapter: 85, section: "XVI", generalDutyRate: "1.5%", specialPrograms: ["USMCA", "CETA"], unit: "No." },
  { code: "8507.60", description: "Lithium-ion accumulators (batteries)", chapter: 85, section: "XVI", generalDutyRate: "3.4%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8515.31", description: "Machines for arc welding of metals, fully or partly automatic", chapter: 85, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No.", notes: "Robotic welding systems, automated welding equipment" },
  { code: "8515.80", description: "Other electric welding or soldering machines", chapter: 85, section: "XVI", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8536.50", description: "Switches for voltage ≤1,000V", chapter: 85, section: "XVI", generalDutyRate: "2.7%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8537.10", description: "Boards, panels, consoles with switching apparatus, voltage ≤1,000V", chapter: 85, section: "XVI", generalDutyRate: "2.7%", specialPrograms: ["USMCA", "CETA"], unit: "No." },
  { code: "8543.70", description: "Other electrical machines and apparatus, NES", chapter: 85, section: "XVI", generalDutyRate: "2.6%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8544.49", description: "Electric conductors, for voltage ≤1,000V, other", chapter: 85, section: "XVI", generalDutyRate: "3.5%", specialPrograms: ["USMCA"], unit: "kg" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 86 — Railway Vehicles
  // ═══════════════════════════════════════════════════════════
  { code: "8607.19", description: "Parts of rail vehicles — axles, wheels, parts thereof, other", chapter: 86, section: "XVII", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No.", notes: "Cast steel rail wheels, axle components" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 87 — Vehicles (Automotive)
  // ═══════════════════════════════════════════════════════════
  { code: "8703.23", description: "Motor vehicles, spark-ignition engine, 1500-3000cc", chapter: 87, section: "XVII", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8708.10", description: "Bumpers and parts thereof for motor vehicles", chapter: 87, section: "XVII", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8708.30", description: "Brakes and servo-brakes and parts thereof", chapter: 87, section: "XVII", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No.", notes: "Cast brake rotors, brake calipers, brake drums" },
  { code: "8708.40", description: "Gear boxes and parts thereof", chapter: 87, section: "XVII", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No.", notes: "Transmission housings, cast gear cases" },
  { code: "8708.50", description: "Drive axles with differential for motor vehicles", chapter: 87, section: "XVII", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8708.80", description: "Suspension systems and parts (springs, shock absorbers)", chapter: 87, section: "XVII", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8708.91", description: "Radiators and parts thereof for motor vehicles", chapter: 87, section: "XVII", generalDutyRate: "2.5%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "8708.99", description: "Other parts and accessories of motor vehicles, NES", chapter: 87, section: "XVII", generalDutyRate: "2.5%", specialPrograms: ["USMCA", "CETA"], unit: "No.", notes: "Cast automotive components, engine mounts, brackets, structural castings" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 88 — Aircraft and Spacecraft
  // ═══════════════════════════════════════════════════════════
  { code: "8802.30", description: "Airplanes, unladen weight >2,000 kg but ≤15,000 kg", chapter: 88, section: "XVII", generalDutyRate: "Free", specialPrograms: [], unit: "No." },
  { code: "8803.30", description: "Other parts of airplanes or helicopters", chapter: 88, section: "XVII", generalDutyRate: "Free", specialPrograms: [], unit: "No.", notes: "Aerospace castings, aircraft structural components, turbine engine parts, landing gear components, aerospace 3D printed parts" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 89 — Ships, Boats, and Marine Structures
  // ═══════════════════════════════════════════════════════════
  { code: "8905.90", description: "Light-vessels, fire-floats, dredgers, floating cranes; other vessels", chapter: 89, section: "XVII", generalDutyRate: "Free", specialPrograms: [], unit: "No." },

  // ═══════════════════════════════════════════════════════════
  // Chapter 90 — Instruments and Apparatus
  // ═══════════════════════════════════════════════════════════
  { code: "9015.80", description: "Surveying, hydrographic, meteorological instruments, NES", chapter: 90, section: "XVIII", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },
  { code: "9026.10", description: "Instruments for measuring/checking flow or level of liquids", chapter: 90, section: "XVIII", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "No." },
  { code: "9026.20", description: "Instruments for measuring/checking pressure", chapter: 90, section: "XVIII", generalDutyRate: "Free", specialPrograms: ["USMCA", "CETA"], unit: "No." },
  { code: "9027.50", description: "Other instruments using optical radiations (UV, visible, IR)", chapter: 90, section: "XVIII", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },
  { code: "9031.49", description: "Other optical measuring or checking instruments", chapter: 90, section: "XVIII", generalDutyRate: "1.7%", specialPrograms: ["USMCA"], unit: "No.", notes: "CMM machines, laser scanners, 3D metrology equipment for quality inspection" },
  { code: "9031.80", description: "Other measuring or checking instruments, NES", chapter: 90, section: "XVIII", generalDutyRate: "1.7%", specialPrograms: ["USMCA"], unit: "No." },
  { code: "9032.89", description: "Other automatic regulating or controlling instruments", chapter: 90, section: "XVIII", generalDutyRate: "1.7%", specialPrograms: ["USMCA", "CETA"], unit: "No." },

  // ═══════════════════════════════════════════════════════════
  // Chapter 93 — Arms and Ammunition (Defense)
  // ═══════════════════════════════════════════════════════════
  { code: "9305.99", description: "Parts and accessories of weapons, other", chapter: 93, section: "XIX", generalDutyRate: "2.6%", specialPrograms: [], unit: "No.", notes: "Defense weapon components, cast and machined military parts — subject to ITAR export controls" },
  { code: "9306.90", description: "Bombs, grenades, torpedoes, mines, missiles and similar munitions of war; parts", chapter: 93, section: "XIX", generalDutyRate: "Free", specialPrograms: [], unit: "No.", notes: "Defense ordnance components, cast military housings — subject to ITAR" },

  // ═══════════════════════════════════════════════════════════
  // Chapter 94 — Furniture
  // ═══════════════════════════════════════════════════════════
  { code: "9403.20", description: "Metal furniture, other (industrial shelving, workbenches)", chapter: 94, section: "XX", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },

  // ═══════════════════════════════════════════════════════════
  // Chapter 96 — Miscellaneous Manufactured Articles
  // ═══════════════════════════════════════════════════════════
  { code: "9606.10", description: "Press-fasteners, snap-fasteners and press-studs", chapter: 96, section: "XX", generalDutyRate: "Free", specialPrograms: ["USMCA"], unit: "No." },
];

// Update search keyword boosts to cover the expanded database
const SEARCH_BOOST_TERMS = [
  "valve", "pump", "motor", "steel", "pipe", "machine", "engine", "turbine",
  "generator", "conveyor", "casting", "foundry", "mold", "die", "forging",
  "3d print", "additive", "titanium", "aluminum", "copper", "nickel",
  "aerospace", "aircraft", "defense", "military", "weapon", "automotive",
  "brake", "gear", "bearing", "weld", "furnace", "tool", "drill", "mill",
  "lathe", "cnc", "laser", "plastic", "resin", "filament", "powder",
  "alloy", "stainless", "cast iron", "investment casting", "sand casting",
  "die casting", "lost wax", "precision", "superalloy", "cermet", "carbide",
  // Leather, textiles, apparel
  "leather", "glove", "baseball", "sports", "sporting", "footwear", "shoe",
  "boot", "apparel", "garment", "textile", "handbag", "wallet", "belt",
  "luggage", "saddle", "hide", "cowhide", "goatskin", "suede",
  // Sporting goods
  "golf", "tennis", "racket", "ball", "bat", "helmet", "equipment",
  "fitness", "exercise", "athletic", "uniform",
];

/**
 * Look up an HS code by exact or prefix match
 */
export function lookupHSCode(code: string): HSCode | undefined {
  const clean = code.replace(/[.\s]/g, "");
  return HS_DATABASE.find((hs) => {
    const dbClean = hs.code.replace(/[.\s]/g, "");
    return dbClean === clean || dbClean.startsWith(clean) || clean.startsWith(dbClean);
  });
}

/**
 * Search HS codes by description keywords
 */
export function searchHSCodes(query: string, limit = 10): HSCodeSuggestion[] {
  const queryLower = query.toLowerCase();
  const queryTokens = queryLower.split(/\s+/).filter((t) => t.length > 2);

  const scored = HS_DATABASE.map((hs) => {
    const descLower = hs.description.toLowerCase();
    const notesLower = (hs.notes ?? "").toLowerCase();
    const combined = `${descLower} ${notesLower}`;

    let score = 0;

    // Exact substring match in description or notes
    if (combined.includes(queryLower)) {
      score += 0.6;
    }

    // Token matching — each matched token contributes
    let matchedTokens = 0;
    for (const token of queryTokens) {
      if (combined.includes(token)) {
        matchedTokens++;
        score += 1 / queryTokens.length;
      }
    }

    // Bonus for matching most tokens
    if (queryTokens.length > 0 && matchedTokens / queryTokens.length > 0.6) {
      score += 0.3;
    }

    // Boost for matching key terms
    for (const term of SEARCH_BOOST_TERMS) {
      if (queryLower.includes(term) && combined.includes(term)) {
        score += 0.25;
      }
    }

    // Bonus for notes match (more specific)
    if (notesLower && queryTokens.some((t) => notesLower.includes(t))) {
      score += 0.15;
    }

    return { hs, score };
  })
    .filter((s) => s.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => ({
    code: s.hs.code,
    description: s.hs.description,
    confidence: Math.min(Math.round(s.score * 100), 98),
    generalDutyRate: s.hs.generalDutyRate,
    chapter: s.hs.chapter,
  }));
}

/**
 * Get FTA eligibility for an HS code and destination country
 */
export function getFTAEligibility(
  hsCode: string,
  destinationCountry: string,
): { eligible: boolean; agreements: string[]; potentialSavings: string } {
  const hs = lookupHSCode(hsCode);
  if (!hs) return { eligible: false, agreements: [], potentialSavings: "Unknown" };

  const country = destinationCountry.toLowerCase();
  const eligiblePrograms: string[] = [];

  const ftaMap: Record<string, string[]> = {
    canada: ["USMCA"],
    mexico: ["USMCA"],
    germany: [],
    france: [],
    netherlands: [],
    "united kingdom": ["US-UK TPA (pending)"],
    australia: ["AUSFTA"],
    "south korea": ["KORUS"],
    japan: ["US-Japan TDA"],
    singapore: ["USSFTA"],
    israel: ["US-Israel FTA"],
    colombia: ["US-Colombia TPA"],
    chile: ["US-Chile FTA"],
    panama: ["US-Panama TPA"],
    peru: ["US-Peru TPA"],
    bahrain: ["US-Bahrain FTA"],
    morocco: ["US-Morocco FTA"],
    oman: ["US-Oman FTA"],
    jordan: ["US-Jordan FTA"],
  };

  const countryFTAs = ftaMap[country] ?? [];
  for (const fta of countryFTAs) {
    if (hs.specialPrograms.some((p) => fta.includes(p) || p.includes(fta.split(" ")[0]))) {
      eligiblePrograms.push(fta);
    }
  }

  const dutyRate = parseFloat(hs.generalDutyRate) || 0;
  const savingsEstimate =
    dutyRate > 0
      ? `Potential duty reduction from ${hs.generalDutyRate} to Free under ${eligiblePrograms.join(", ") || "no applicable FTA"}`
      : "Duty-free regardless of FTA status";

  return {
    eligible: eligiblePrograms.length > 0,
    agreements: eligiblePrograms,
    potentialSavings: savingsEstimate,
  };
}
