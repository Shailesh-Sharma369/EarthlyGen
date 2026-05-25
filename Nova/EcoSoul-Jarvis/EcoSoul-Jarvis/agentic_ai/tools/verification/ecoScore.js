/**
 * Local rule-based eco scoring for products.
 * No external APIs, India-aware, and resilient to partial data.
 */

function toText(value) {
  if (Array.isArray(value)) return value.join(" ").toLowerCase();
  return String(value || "").toLowerCase();
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function hasAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function calculateEcoScore(product) {
  const p = product || {};

  const materials = toText(p.materials);
  const packaging = toText(p.packaging);
  const transport = toText(p.transport);
  const description = toText(p.description);
  const name = toText(p.name);

  const combined = [materials, packaging, transport, description, name].join(" ");

  let ecoScore = 50;
  let dataPoints = 0;

  const recyclableKeywords = [
    "recyclable",
    "recycled",
    "recycle",
    "metal",
    "glass",
    "paper",
    "aluminium",
    "steel",
    "punarupayog",
    "dobara istemal"
  ];

  const biodegradableKeywords = [
    "biodegradable",
    "compostable",
    "organic",
    "natural fiber",
    "natural fibre",
    "bamboo",
    "mitti mein ghulne wala",
    "jaivik"
  ];

  const localKeywords = [
    "local",
    "locally sourced",
    "made in india",
    "indian",
    "same city",
    "same state",
    "nearby",
    "artisan",
    "msme",
    "vocal for local",
    "desi",
    "ghar ka",
    "yahin bana"
  ];

  const handmadeKeywords = [
    "handmade",
    "hand crafted",
    "handcrafted",
    "small batch",
    "small-scale",
    "artisan",
    "local business",
    "kutir",
    "hath se bana",
    "haath se bana",
    "chhota business"
  ];

  const plasticKeywords = [
    "plastic",
    "pvc",
    "polybag",
    "single-use",
    "single use",
    "non recyclable plastic",
    "polythene",
    "plastic ka"
  ];

  const longDistanceKeywords = [
    "imported",
    "international shipping",
    "air freight",
    "long distance",
    "overseas",
    "interstate long haul",
    "door se",
    "bahar se"
  ];

  const plasticFreeSignals = [
    "plastic-free",
    "plastic free",
    "zero plastic",
    "no plastic",
    "plastic nahi"
  ];

  if (materials || description || name) {
    if (hasAny([materials, description, name].join(" "), recyclableKeywords)) {
      ecoScore += 20;
      dataPoints += 1;
    }
    if (hasAny([materials, description, name].join(" "), biodegradableKeywords)) {
      ecoScore += 15;
      dataPoints += 1;
    }
    if (hasAny([materials, description, name].join(" "), handmadeKeywords)) {
      ecoScore += 10;
      dataPoints += 1;
    }
  }

  if (transport || description) {
    if (hasAny([transport, description].join(" "), localKeywords)) {
      ecoScore += 10;
      dataPoints += 1;
    }
    if (hasAny([transport, description].join(" "), longDistanceKeywords)) {
      ecoScore -= 15;
      dataPoints += 1;
    }
  }

  if (combined) {
    if (hasAny(combined, plasticKeywords) && !hasAny(combined, plasticFreeSignals)) {
      ecoScore -= 20;
      dataPoints += 1;
    }

    if (hasAny(combined, plasticFreeSignals)) {
      ecoScore += 8;
      dataPoints += 1;
    }
  }

  if (!packaging) {
    ecoScore -= 10;
  } else {
    dataPoints += 1;
    if (hasAny(packaging, ["minimal", "recyclable", "paper", "compostable", "plastic-free", "plastic free"])) {
      ecoScore += 8;
    }
  }

  // Low-data fallback: do lightweight estimation instead of rejection.
  if (dataPoints <= 1) {
    if (hasAny(combined, ["eco", "green", "organic", "natural", "sustainable", "jaivik"])) {
      ecoScore = Math.max(ecoScore, 45);
    } else {
      ecoScore = Math.max(ecoScore, 35);
    }
  }

  ecoScore = clamp(Math.round(ecoScore), 0, 100);

  let category = "Poor";
  if (ecoScore >= 75) category = "Excellent";
  else if (ecoScore >= 60) category = "Good";
  else if (ecoScore >= 40) category = "Average";

  return {
    eco_score: ecoScore,
    category
  };
}

module.exports = { calculateEcoScore };
