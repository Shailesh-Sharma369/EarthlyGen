/**
 * Eco Verification Module
 * Rule-based validation system for eco certifications
 * No external APIs — pure local rule engine
 */

// Trusted certification authorities
const TRUSTED_CERTIFICATIONS = [
  "FSC",              // Forest Stewardship Council
  "Energy Star",      // Energy efficiency
  "USDA Organic",     // Organic certification
  "EcoMark",          // Eco-labeling
  "Rainforest Alliance",
  "Fair Trade",
  "Certified B Corp",
  "Carbon Neutral",
  "Cradle to Cradle",
  "EU Ecolabel"
];

/**
 * Verify a certificate against rule-based system
 * @param {Object} cert - Certificate object with name, issuing_authority, etc.
 * @returns {Object} - {status, confidence}
 */
function verifyCertificate(cert) {
  const { certificate_name, issuing_authority } = cert;

  // Normalize input
  const certName = (certificate_name || "").trim().toUpperCase();
  const authority = (issuing_authority || "").trim().toLowerCase();

  let status = "pending";
  let confidence = 50;

  // Certification is optional. Continue with low-confidence non-cert path.
  if (!certName || !authority) {
    return { status: "no_certificate", confidence: 40 };
  }

  // Rule 1: Check if certificate matches trusted list (exact or partial match)
  const isTrusted = TRUSTED_CERTIFICATIONS.some(trusted => 
    certName.includes(trusted.toUpperCase())
  );

  if (isTrusted) {
    status = "verified";
    confidence = 85; // High confidence for recognized certifications
    return { status, confidence };
  }

  // Rule 2: Check issuing authority validity
  const validAuthorityPatterns = [
    "government",
    "official",
    "authority",
    "foundation",
    "alliance",
    "council",
    "certification",
    "certified"
  ];

  const hasValidAuthority = validAuthorityPatterns.some(pattern =>
    authority.includes(pattern)
  );

  if (hasValidAuthority && certName.length > 3) {
    status = "pending";
    confidence = 65; // Medium confidence — valid authority but unrecognized cert
    return { status, confidence };
  }

  // Rule 3: Weak certificate data
  if (certName.length < 3) {
    status = "pending";
    confidence = 30; // Low confidence — incomplete info
    return { status, confidence };
  }

  // Rule 4: Generic eco claims without backing
  const ecoKeywords = ["eco", "green", "sustainable", "organic", "renewable"];
  const hasEcoKeyword = ecoKeywords.some(kw =>
    certName.toLowerCase().includes(kw) ||
    authority.includes(kw)
  );

  if (hasEcoKeyword) {
    status = "pending";
    confidence = 55; // Medium-low confidence — eco-related but needs verification
    return { status, confidence };
  }

  // Default fallback
  return { status: "pending", confidence: 40 };
}

module.exports = { verifyCertificate, TRUSTED_CERTIFICATIONS };
