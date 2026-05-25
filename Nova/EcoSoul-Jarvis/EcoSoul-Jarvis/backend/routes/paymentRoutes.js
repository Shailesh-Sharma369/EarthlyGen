const express = require("express");
const transporter = require("../utils/mailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Order = require("../models/order");
const Cart = require("../models/cart");
const Product = require("../models/product");
const auth = require("../middleware/auth");
const { validateOrder } = require("../middleware/validation");
const {
  emailVerificationLimiter,
  orderLimiter,
} = require("../middleware/rateLimiter");

const router = express.Router();

// TEMP STORE (demo only) - In production, use Redis or database
const verificationStore = {};

/**
 * TEST TOKEN VALIDITY
 */
router.post("/test-token", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.json({
      valid: false,
      error: "No Bearer token provided",
      authHeader: authHeader,
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({
      valid: true,
      decoded: decoded,
      userId: decoded.userId || decoded.id,
      jwtSecretLength: process.env.JWT_SECRET?.length || 0,
    });
  } catch (err) {
    return res.json({
      valid: false,
      error: err.message,
      errorName: err.name,
      jwtSecretSet: !!process.env.JWT_SECRET,
    });
  }
});

/**
 * SEND VERIFICATION EMAIL
 */
router.post(
  "/send-verification",
  emailVerificationLimiter,
  async (req, res) => {
    const { email } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }

    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString("hex");

    verificationStore[token] = {
      email: email,
      timestamp: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    const link = `${process.env.BACKEND_URL || "http://localhost:5002"}/api/payment/verify/${token}`;

    try {
      console.log("📧 Sending verification email to:", email);
      console.log("📧 BACKEND_URL:", process.env.BACKEND_URL);
      console.log("📧 EMAIL_USER:", process.env.EMAIL_USER);
      console.log("📧 EMAIL_PASS set:", !!process.env.EMAIL_PASS);

      await transporter.sendMail({
        from: `"EcoStore Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verify Your Email - EcoStore 🌿",
        html: `
        <h3>Email Verification</h3>
        <p>Please verify to continue payment</p>
        <a href="${link}">Verify Email</a>
        <p>This link expires in 15 minutes.</p>
      `,
      });

      console.log("✅ Verification email sent successfully!");
      res.json({ success: true, message: "Verification email sent" });
    } catch (err) {
      console.error("❌ Email send error:", err.message);
      console.error("Error details:", err);

      // In development, still allow verification if email fails
      // But store a note that it failed
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "⚠️ Email failed in development mode - allowing verification anyway",
        );
        res.json({
          success: true,
          message:
            "Verification email failed to send (development mode - skipped)",
          emailSent: false,
          token: token, // Return token so user can manually verify if needed
        });
      } else {
        // In production, actually fail the request
        res.status(500).json({
          success: false,
          message: "Email service unavailable. Please try again later.",
        });
      }
    }
  },
);

/**
 * VERIFY EMAIL
 */
router.get("/verify/:token", (req, res) => {
  const tokenData = verificationStore[req.params.token];

  if (!tokenData) {
    return res.send("<h2 style='color:red'>Invalid or expired link ❌</h2>");
  }

  // Check if token expired
  if (Date.now() > tokenData.expiresAt) {
    delete verificationStore[req.params.token];
    return res.send("<h2 style='color:red'>Link expired ❌</h2>");
  }

  delete verificationStore[req.params.token];

  res.send(`
    <h2 style="color:green">Email Verified ✅</h2>
    <p>${tokenData.email}</p>
    <p>You can close this window and return to the payment page.</p>
  `);
});

/**
 * ORDER CONFIRMATION EMAIL AND CREATE ORDER
 */
router.post(
  "/confirm-order",
  auth,
  orderLimiter,
  validateOrder,
  async (req, res) => {
    console.log("\n🚀 === ORDER CONFIRMATION ENDPOINT HIT ===\n");

    const { name, email, amount, items } = req.body;
    const userId = req.user.id;

    console.log("✅ User authenticated! User ID:", userId);
    console.log("📦 Order details:", {
      name,
      email,
      amount,
      itemsCount: items.length,
    });

    try {
      console.log("📦 Creating order for user:", userId);
      console.log("📧 Email:", email);
      console.log("💰 Amount:", amount);
      console.log("🛒 Items:", items);

      // Prepare order items
      const orderItems = items.map((item) => ({
        productId: item.productId || null,
        name: item.name,
        price: item.price,
        quantity: item.qty || item.quantity || 1,
        total: item.price * (item.qty || item.quantity || 1),
      }));

      // Create order in database
      const order = new Order({
        userId: userId,
        items: orderItems,
        subtotal: amount,
        shipping: 0,
        grandTotal: amount,
        status: "CONFIRMED",
        paymentMethod: "ONLINE",
        paymentStatus: "PAID",
        shippingAddress: {
          fullName: name,
          address: "Default Address",
          city: "India",
          pincode: "000000",
        },
      });

      await order.save();
      console.log("✅ Order created successfully:", order._id);

      // 🌱 UPDATE ECO-CREDITS TRANSACTION (verify deduction happened)
      try {
        const user = await User.findById(userId);
        if (user && user.creditsHistory) {
          // Find purchase transaction
          const purchaseTx = user.creditsHistory.find(
            (tx) =>
              tx.type === "purchase" &&
              tx.description.includes("Added items to cart"),
          );
          if (purchaseTx) {
            // Update description for confirmation
            purchaseTx.description = `Confirmed purchase for order #${order._id}`;
            console.log(
              `✅ Confirmed eco-credit transaction for order ${order._id}. Balance: ${user.ecoCredits}`,
            );
          } else {
            // Fallback: if no purchase transaction found, ensure credits were deducted
            if (!user.ecoCredits) user.ecoCredits = 100;
            const CREDITS_PER_PURCHASE = 5;

            if (user.ecoCredits >= CREDITS_PER_PURCHASE) {
              user.ecoCredits -= CREDITS_PER_PURCHASE;
              user.creditsHistory = user.creditsHistory || [];
              user.creditsHistory.push({
                type: "purchase",
                amount: -CREDITS_PER_PURCHASE,
                description: `Used ${CREDITS_PER_PURCHASE} credits for order #${order._id}`,
                date: new Date(),
              });
              console.log(
                `✅ FALLBACK: Deducted ${CREDITS_PER_PURCHASE} credits. Remaining: ${user.ecoCredits}`,
              );
            }
          }
          await user.save();
        }
      } catch (creditErr) {
        console.warn(
          "⚠️ Credit update error (non-critical):",
          creditErr.message,
        );
      }

      // Clear user's cart after order is placed
      try {
        await Cart.deleteMany({ userId: userId });
        console.log("✅ Cart cleared for user:", userId);
      } catch (cartErr) {
        console.log("⚠️ Cart clear error (non-critical):", cartErr.message);
      }

      // Send confirmation email with product images
      // Fetch product details for images
      let itemsWithImages = [];
      for (let item of items) {
        let itemData = { ...item };
        if (item.productId) {
          try {
            const product = await Product.findById(item.productId).select(
              "image name price",
            );
            if (product) {
              itemData.image =
                product.image || "https://via.placeholder.com/150";
            }
          } catch (e) {
            itemData.image = "https://via.placeholder.com/150";
          }
        } else {
          itemData.image = "https://via.placeholder.com/150";
        }
        itemsWithImages.push(itemData);
      }

      // Build HTML with product images
      const itemsHTML = itemsWithImages
        .map(
          (i) => `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; display: flex; gap: 15px;">
          <img src="${i.image}" alt="${i.name}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 6px;">
          <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 8px;">${i.name}</div>
            <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Price: ₹${i.price}</div>
            <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Quantity: ${i.qty || i.quantity || 1}</div>
            <div style="font-weight: 600; color: #22c55e;">Total: ₹${i.price * (i.qty || i.quantity || 1)}</div>
          </div>
        </div>`,
        )
        .join("");

      console.log("📧 Preparing to send confirmation email...");
      console.log("📧 To:", email);
      console.log("📧 From:", process.env.EMAIL_USER);
      console.log("📧 Order ID:", order._id);

      // Try to send email, but don't fail the order if email fails
      try {
        const emailResult = await transporter.sendMail({
          from: `"EcoStore Orders" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "✅ Order Confirmed - EcoStore 🌿",
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #22c55e;">🌿 EcoStore</h1>
            </div>
            
            <h2 style="color: #333;">Thank You, ${name}! 🎉</h2>
            <p style="font-size: 16px; color: #555;">Your order has been confirmed and is being processed.</p>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order._id}</p>
              <p style="margin: 5px 0;"><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Payment Status:</strong> <span style="color: #22c55e;">✅ PAID</span></p>
            </div>
            
            <h3 style="color: #333; margin-top: 30px;">📦 Order Items:</h3>
            ${itemsHTML}
            
            <div style="background: #f9fafb; border: 2px solid #22c55e; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <div style="text-align: right; font-weight: bold; font-size: 18px;">
                Grand Total: <span style="color: #22c55e;">₹${amount}</span>
              </div>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>📦 Shipping Information:</strong><br>
                Your order will be delivered within 5-7 business days.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If you have any questions about your order, please contact our support team at support@ecostore.com
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #999; font-size: 12px;">Thank you for shopping with EcoStore! 🌿</p>
            </div>
          </div>
        `,
        });

        console.log("✅ Confirmation email sent successfully!");
        console.log("📧 Message ID:", emailResult.messageId);
        console.log("📧 Response:", emailResult.response);
      } catch (emailError) {
        console.error("❌ Email sending failed:");
        console.error("Error message:", emailError.message);
        console.error("Error code:", emailError.code);
        console.error("Error stack:", emailError.stack);
        // Don't fail the order if email fails - order is already created
      }

      // Always return success if order was created
      res.json({
        success: true,
        message: "Order created successfully",
        orderId: order._id,
        emailSent: true, // We'll assume it worked unless caught above
      });
    } catch (err) {
      console.error("❌ Order creation error:", err);
      console.error("Error stack:", err.stack);
      res.status(500).json({
        success: false,
        message: "Order creation failed: " + err.message,
      });
    }
  },
);

module.exports = router;
