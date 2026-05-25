const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Company = require("../models/company");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// ========== COMPANY SIGNUP ==========
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const {
      companyName,
      email,
      phone,
      gstNumber,
      address,
      password,
      businessType,
    } = req.body;

    // Validation
    if (
      !companyName ||
      !email ||
      !phone ||
      !address ||
      !password ||
      !businessType
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({
      email: email.toLowerCase(),
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: "Company with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create company
    const company = await Company.create({
      companyName: companyName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      gstNumber: gstNumber ? gstNumber.trim() : null,
      address: address.trim(),
      password: hashedPassword,
      businessType,
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        companyId: company._id,
        role: "COMPANY",
        email: company.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.status(201).json({
      success: true,
      message: "Company registered successfully",
      token,
      companyId: company._id,
      companyName: company.companyName,
    });
  } catch (error) {
    console.error("Company signup error:", error);
    res.status(500).json({
      success: false,
      message: "Company registration failed",
      error: error.message,
    });
  }
});

// ========== COMPANY SIGNIN ==========
router.post("/signin", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find company (case-insensitive)
    const company = await Company.findOne({
      email: { $regex: `^${email}$`, $options: "i" },
    });

    if (!company) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if company is active
    if (!company.isActive) {
      return res.status(403).json({
        success: false,
        message: "Company account is deactivated. Contact support.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, company.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        companyId: company._id,
        role: "COMPANY",
        email: company.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.json({
      success: true,
      message: "Company signed in successfully",
      token,
      companyId: company._id,
      companyName: company.companyName,
    });
  } catch (error) {
    console.error("Company signin error:", error);
    res.status(500).json({
      success: false,
      message: "Company signin failed",
      error: error.message,
    });
  }
});

// ========== GET COMPANY PROFILE ==========
router.get("/profile", authLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const company = await Company.findById(decoded.companyId).select(
      "-password",
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    res.json({
      success: true,
      company,
    });
  } catch (error) {
    console.error("Get company profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch company profile",
    });
  }
});

module.exports = router;
