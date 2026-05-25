/**
 * Eco Certification Verification Routes
 * Handles product eco certification verification
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const { verifyCertificate } = require("../utils/ecoVerifier");
const { calculateEcoScore } = require("../../agentic_ai/tools/verification/ecoScore");

// Path to JSON storage
const DATA_DIR = path.join(__dirname, "../data");
const CERTS_FILE = path.join(DATA_DIR, "eco_certifications.json");
const USER_VERIFY_FILE = path.join(DATA_DIR, "user_verification.json");

// Ensure data directory and file exist
function ensureCertsFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CERTS_FILE)) {
    fs.writeFileSync(CERTS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(USER_VERIFY_FILE)) {
    fs.writeFileSync(USER_VERIFY_FILE, JSON.stringify([], null, 2));
  }
}

// Read certifications from file
function readCertifications() {
  ensureCertsFile();
  try {
    const raw = fs.readFileSync(CERTS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading certifications file:", err.message);
    return [];
  }
}

// Write certifications to file
function writeCertifications(certs) {
  ensureCertsFile();
  try {
    fs.writeFileSync(CERTS_FILE, JSON.stringify(certs, null, 2));
    return true;
  } catch (err) {
    console.error("Error writing certifications file:", err.message);
    return false;
  }
}

function readUserVerification() {
  ensureCertsFile();
  try {
    const raw = fs.readFileSync(USER_VERIFY_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading user verification file:", err.message);
    return [];
  }
}

function getTrustLevelFromUser(userId) {
  if (!userId) return "Basic";
  const users = readUserVerification();
  const user = users.find((u) => String(u.user_id) === String(userId));
  if (!user) return "Basic";
  if (user.trust_score > 80) return "Eco Advocate";
  if (user.trust_score > 50) return "Trusted";
  return "Basic";
}

function resolveEcoStatus(certStatus, ecoScore) {
  if (certStatus === "verified") return "certified";
  if (ecoScore >= 75) return "eco_verified";
  if (ecoScore >= 50) return "partially_eco";
  return "not_verified";
}

function buildProductPayload(input) {
  const source = input || {};
  return {
    product_id: String(source.product_id || source._id || source.id || ""),
    name: String(source.name || ""),
    materials: source.materials || "",
    packaging: source.packaging || "",
    transport: source.transport || "",
    description: String(source.description || ""),
    certificate_name: String(source.certificate_name || ""),
    certificate_id: String(source.certificate_id || ""),
    issuing_authority: String(source.issuing_authority || ""),
    proof_url: String(source.proof_url || "")
  };
}

/**
 * POST /submit
 * Submit a product for eco certification verification
 */
router.post("/submit", (req, res) => {
  try {
    const product = buildProductPayload(req.body);
    const userId = req.body && req.body.user_id ? String(req.body.user_id) : "";

    // Product ID is the only strict requirement.
    if (!product.product_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: product_id"
      });
    }

    const verification = verifyCertificate(product);
    const scoreResult = calculateEcoScore(product);
    const ecoStatus = resolveEcoStatus(verification.status, scoreResult.eco_score);
    const trustLevel = getTrustLevelFromUser(userId);

    let confidence = verification.confidence || 40;
    if (verification.status !== "verified") {
      confidence = Math.round((confidence + scoreResult.eco_score) / 2);
    }

    // Persist record in same certifications log for simple local storage.
    const cert = {
      id: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...product,
      user_id: userId,
      submitted_at: new Date().toISOString(),
      status: verification.status,
      confidence,
      eco_status: ecoStatus,
      eco_score: scoreResult.eco_score,
      category: scoreResult.category,
      trust_level: trustLevel
    };

    // Save to file
    const allCerts = readCertifications();
    allCerts.push(cert);
    writeCertifications(allCerts);

    // Response
    return res.json({
      success: true,
      product_id: cert.product_id,
      eco_status: cert.eco_status,
      confidence: cert.confidence,
      eco_score: cert.eco_score,
      category: cert.category,
      trust_level: cert.trust_level,
      message: `Eco status ${cert.eco_status}. Confidence: ${cert.confidence}%`,
      certification_id: cert.id
    });
  } catch (error) {
    console.error("Error in eco verification submit:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

/**
 * GET /status/:product_id
 * Check verification status for a product
 */
router.get("/status/:product_id", (req, res) => {
  try {
    const { product_id } = req.params;
    const userId = req.query && req.query.user_id ? String(req.query.user_id) : "";

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    const allCerts = readCertifications();
    const productCerts = allCerts.filter(cert => cert.product_id === product_id);

    const latest = productCerts.length > 0 ? productCerts[productCerts.length - 1] : null;

    const ecoStatus = latest ? latest.eco_status : "not_verified";
    const confidence = latest ? Number(latest.confidence || 40) : 40;
    const ecoScore = latest ? Number(latest.eco_score || 35) : 35;
    const category = latest ? String(latest.category || "Poor") : "Poor";
    const trustLevel = latest ? String(latest.trust_level || getTrustLevelFromUser(userId || latest.user_id)) : getTrustLevelFromUser(userId);

    return res.json({
      success: true,
      product_id: product_id,
      eco_status: ecoStatus,
      confidence,
      eco_score: ecoScore,
      category,
      trust_level: trustLevel,
      overall_status: ecoStatus,
      avg_confidence: confidence,
      total_certifications: productCerts.length,
      certifications: productCerts
    });
  } catch (error) {
    console.error("Error in eco verification status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

/**
 * GET /certifications
 * List all certifications (admin/debug)
 */
router.get("/certifications", (req, res) => {
  try {
    const allCerts = readCertifications();
    return res.json({
      success: true,
      total: allCerts.length,
      certifications: allCerts
    });
  } catch (error) {
    console.error("Error listing certifications:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

module.exports = router;
