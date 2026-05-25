const express = require("express");
const router = express.Router();

const Product = require("../models/product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { verifyCertificate } = require("../utils/ecoVerifier");
const { calculateEcoScore } = require("../../agentic_ai/tools/verification/ecoScore");

function resolveEcoStatus(certStatus, ecoScore) {
  if (certStatus === "verified") return "certified";
  if (ecoScore >= 75) return "eco_verified";
  if (ecoScore >= 50) return "partially_eco";
  return "not_verified";
}

/**
 * ADD PRODUCT (ADMIN)
 */
router.post("/add", auth, admin, async (req, res) => {
  try {
    // Rule-based eco verification must run before product is saved.
    const minApprovalScore = Number(process.env.ECO_MIN_APPROVAL_SCORE || 60);
    const verification = verifyCertificate(req.body || {});
    const scoreResult = calculateEcoScore(req.body || {});

    const ecoStatus = resolveEcoStatus(
      verification.status,
      scoreResult.eco_score,
    );

    let ecoConfidence = verification.confidence || 40;
    if (verification.status !== "verified") {
      ecoConfidence = Math.round((ecoConfidence + scoreResult.eco_score) / 2);
    }

    const isApproved =
      verification.status === "verified" ||
      Number(scoreResult.eco_score || 0) >= minApprovalScore;

    if (!isApproved) {
      return res.status(400).json({
        success: false,
        message:
          "Product failed eco verification. Improve sustainability details/certification and try again.",
        verification: {
          approved: false,
          minApprovalScore,
          cert_status: verification.status,
          eco_status: ecoStatus,
          eco_score: scoreResult.eco_score,
          eco_category: scoreResult.category,
          eco_confidence: ecoConfidence,
        },
      });
    }

    const product = new Product({
      ...req.body,
      eco_status: ecoStatus,
      eco_confidence: ecoConfidence,
      eco_score: scoreResult.eco_score,
      eco_category: scoreResult.category,
      eco_verified_at: new Date(),
      isEcoVerified: ecoStatus === "certified" || ecoStatus === "eco_verified",
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully after eco verification",
      verification: {
        approved: true,
        cert_status: verification.status,
        eco_status: ecoStatus,
        eco_score: scoreResult.eco_score,
        eco_category: scoreResult.category,
        eco_confidence: ecoConfidence,
      },
      product,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ACTIVATE ALL PRODUCTS (ADMIN ONLY)
router.put("/activate-all", auth, admin, async (req, res) => {
  try {
    const result = await Product.updateMany({}, { $set: { isActive: true } });

    res.json({
      success: true,
      message: "All products activated",
      modified: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
