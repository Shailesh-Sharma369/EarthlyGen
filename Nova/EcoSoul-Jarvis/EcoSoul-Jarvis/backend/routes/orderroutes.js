const express = require("express");
const Cart = require("../models/cart");
const Order = require("../models/order");
const Product = require("../models/product");
const User = require("../models/user");
const auth = require("../middleware/auth");
const transporter = require("../utils/mailer");
const { geocodeAddress } = require("../utils/geocoding");

const router = express.Router();

/**
 * CHECKOUT
 */
router.post("/checkout", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress } = req.body;

    // Validate shipping address
    if (
      !shippingAddress ||
      !shippingAddress.address ||
      !shippingAddress.city ||
      !shippingAddress.pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Complete shipping address required",
      });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    let items = [];
    let subtotal = 0;

    for (let item of cart.items) {
      const product = item.productId;

      // Stock check again (safety)
      if (item.quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `${product.name} out of stock`,
        });
      }

      const total = product.price * item.quantity;

      items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total,
      });

      subtotal += total;

      // Reduce stock
      product.stock -= item.quantity;
      await product.save();
    }

    const shipping = subtotal >= 100 ? 0 : 20;
    let grandTotal = subtotal + shipping;

    // 💚 AUTO-APPLY 5 ECO-CREDITS DISCOUNT (Fixed Amount - Flat per order)
    let creditsApplied = 0;
    const user = await User.findById(userId);

    // Ensure user has eco-credits field (migrate if needed)
    if (!user.ecoCredits) {
      user.ecoCredits = 100;
    }

    // Always try to apply 5 credits (FLAT - fixed amount per order)
    const FIXED_CREDITS_PER_PURCHASE = 5;

    if (user.ecoCredits >= FIXED_CREDITS_PER_PURCHASE) {
      creditsApplied = FIXED_CREDITS_PER_PURCHASE;
      grandTotal -= creditsApplied;

      // Deduct credits from user
      const deductResult = await user.deductCredits(
        creditsApplied,
        "purchase",
        `Used ${creditsApplied} credits for order`,
        null,
      );

      if (!deductResult.success) {
        console.warn("⚠️ Could not deduct credits:", deductResult.message);
        // Continue anyway - order placement doesn't fail if credit deduction fails
      }
    } else {
      // User has less than 5 credits - still allow checkout but no credit discount
      console.log(
        `ℹ️ User ${userId} has only ${user.ecoCredits} credits (less than 5), no discount applied`,
      );
    }

    // 📍 GEOCODE SHIPPING ADDRESS
    let shippingLocation = null;
    try {
      console.log("🔍 Geocoding address:", shippingAddress);
      shippingLocation = await geocodeAddress(
        shippingAddress.address,
        shippingAddress.city,
        shippingAddress.pincode,
      );
      console.log("✅ Geocoding successful:", shippingLocation);
    } catch (geocodeError) {
      console.error("⚠️ Geocoding failed:", geocodeError.message);
      // Continue anyway - location is not critical for order placement
      shippingLocation = {
        latitude: null,
        longitude: null,
        formattedAddress: `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.pincode}`,
      };
    }

    const order = new Order({
      userId,
      items,
      subtotal,
      shipping,
      grandTotal,
      creditsApplied,
      shippingAddress,
      shippingLocation: {
        latitude: shippingLocation?.latitude,
        longitude: shippingLocation?.longitude,
        formattedAddress: shippingLocation?.formattedAddress,
      },
      trackingHistory: [
        {
          status: "CONFIRMED",
          location: {
            latitude: shippingLocation?.latitude,
            longitude: shippingLocation?.longitude,
          },
          description: "Order confirmed and awaiting pickup",
        },
      ],
      paymentMethod: "COD",
      status: "CONFIRMED",
    });

    await order.save();

    // Clear cart
    cart.items = [];
    await cart.save();

    // 🌿 Award "Eco Purchase" deed automatically on every order
    try {
      const User = require("../models/user");
      const ecoUser = await User.findById(userId);
      if (ecoUser) {
        const itemNames = items.map((i) => i.name).join(", ");
        await ecoUser.awardDeed({
          category: "Eco Purchase",
          description: `Ordered eco-friendly product(s): ${itemNames.substring(0, 120)}`,
          pointsAwarded: 5,
          scoreContribution: 3,
        });
        // Notify user in real-time
        if (global.io) {
          global.io.to(`user-${userId}`).emit("eco-rank-updated", {
            userId,
            ecoScore: ecoUser.ecoScore,
            greenPoints: ecoUser.greenPoints,
            planetRank: ecoUser.planetRank,
          });
        }
        console.log(`🌿 Eco Purchase deed auto-awarded to user ${userId}`);
      }
    } catch (deedErr) {
      // Non-fatal — checkout continues even if deed award fails
      console.error("⚠️ Could not award eco deed:", deedErr.message);
    }

    // Build items HTML with images for email
    let itemsHTML = "";
    if (items && items.length > 0) {
      itemsHTML = items
        .map((item) => {
          let imageHTML = "📦"; // Default emoji

          // Check if product has image data
          if (item.image) {
            if (
              item.image.startsWith("http://") ||
              item.image.startsWith("https://")
            ) {
              imageHTML = `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" onerror="this.textContent='📦'">`;
            } else if (item.image) {
              imageHTML = `<img src="${process.env.BACKEND_URL || "http://localhost:5002"}/uploads/${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" onerror="this.textContent='📦'">`;
            }
          }

          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px; text-align: center; vertical-align: middle;">${imageHTML}</td>
              <td style="padding: 12px; text-align: left;">${item.name}</td>
              <td style="padding: 12px; text-align: center;">₹${item.price.toFixed(2)}</td>
              <td style="padding: 12px; text-align: center;">${item.quantity}</td>
              <td style="padding: 12px; text-align: right;">₹${item.total.toFixed(2)}</td>
            </tr>`;
        })
        .join("");
    } else {
      itemsHTML =
        "<tr><td colspan='5' style='padding: 12px;'>No items</td></tr>";
    }

    // Send order confirmation email
    const userName = user.fullName || user.name || "Customer";
    const userEmail = user.email;

    try {
      await transporter.sendMail({
        from:
          '"EcoStore Orders" <' +
          (process.env.EMAIL_USER || "orders@ecostore.com") +
          ">",
        to: userEmail,
        subject: "✅ Order Confirmed - Order ID: " + order._id,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
            <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px;">🌿 EcoStore</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Thank you for your order!</p>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 30px;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0;">Order Confirmation</h2>
                <p style="color: #4b5563; font-size: 16px; margin: 0 0 30px 0;">Dear ${userName},</p>
                <p style="color: #4b5563; font-size: 16px; margin: 0 0 30px 0;">Your order has been successfully placed. Here are the details:</p>
                
                <!-- Order Info Box -->
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 0 0 30px 0;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Order ID</p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 16px;">${order._id}</p>
                    </div>
                    <div>
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Order Date</p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 16px;">${new Date().toLocaleDateString("en-IN")}</p>
                    </div>
                    <div>
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Status</p>
                      <p style="margin: 0; color: #10b981; font-weight: 600; font-size: 16px;">CONFIRMED ✅</p>
                    </div>
                    <div>
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Payment Method</p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 16px;">COD (Cash on Delivery)</p>
                    </div>
                  </div>
                </div>
                
                <!-- Items Table -->
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Order Items</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 0 0 30px 0;">
                  <thead>
                    <tr style="background: #f3f4f6;">
                      <th style="padding: 12px; text-align: center; color: #374151; font-weight: 600;">Image</th>
                      <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Product</th>
                      <th style="padding: 12px; text-align: center; color: #374151; font-weight: 600;">Price</th>
                      <th style="padding: 12px; text-align: center; color: #374151; font-weight: 600;">Qty</th>
                      <th style="padding: 12px; text-align: right; color: #374151; font-weight: 600;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHTML}
                  </tbody>
                </table>
                
                <!-- Totals -->
                <div style="text-align: right; margin: 0 0 30px 0;">
                  <div style="display: flex; justify-content: flex-end; margin: 0 0 10px 0;">
                    <span style="color: #6b7280; width: 150px; text-align: right;">Subtotal:</span>
                    <span style="color: #1f2937; font-weight: 600; width: 100px; text-align: right;">₹${subtotal.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: flex-end; margin: 0 0 10px 0;">
                    <span style="color: #6b7280; width: 150px; text-align: right;">Shipping:</span>
                    <span style="color: #1f2937; font-weight: 600; width: 100px; text-align: right;">₹${shipping.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: flex-end; border-top: 2px solid #e5e7eb; padding-top: 10px; margin-top: 10px;">
                    <span style="color: #1f2937; font-weight: 600; width: 150px; text-align: right;">Grand Total:</span>
                    <span style="color: #10b981; font-weight: 700; font-size: 18px; width: 100px; text-align: right;">₹${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                <!-- Info Box -->
                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin: 0 0 30px 0;">
                  <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
                    <strong>📦 What's Next?</strong><br>
                    • Our team will verify your order<br>
                    • You'll receive a delivery confirmation email<br>
                    • Expected delivery in 3-5 business days
                  </p>
                </div>
                
                <!-- Support -->
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px 0;">
                  If you have any questions about your order, please don't hesitate to contact our support team at <strong>support@ecostore.com</strong> or reply to this email.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  Thank you for shopping with EcoStore! 🌿<br>
                  <span style="font-style: italic;">Sustainable Products for a Better Tomorrow</span>
                </p>
              </div>
            </div>
          </div>
        `,
      });
      console.log("✅ Order confirmation email sent to:", userEmail);
    } catch (emailErr) {
      console.error("❌ Error sending order confirmation email:", emailErr);
      // Don't fail the request if email fails
    }

    // Emit real-time event to admin dashboard
    if (req.app.io) {
      req.app.io.emit("order-placed", {
        orderId: order._id,
        userId,
        userName: user.name,
        userEmail: user.email,
        totalAmount: grandTotal,
        itemCount: items.length,
        status: "CONFIRMED",
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: "Order placed successfully",
      orderId: order._id,
      orderDetails: {
        subtotal,
        shipping,
        creditsApplied,
        finalTotal: grandTotal,
      },
      userCredits: {
        creditsRemaining: user.ecoCredits,
        creditsHistory: user.creditsHistory.slice(-5),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Get total count
    const total = await Order.countDocuments({ userId: req.user.id });

    // Fetch paginated orders
    const orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Orders fetch error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
});

/**
 * CLEAR ALL ORDER HISTORY FOR USER
 */
router.delete("/clear/history", auth, async (req, res) => {
  console.log("🗑️  CLEAR HISTORY ENDPOINT HIT");
  try {
    const userId = req.user.id;
    console.log(`Clearing orders for user: ${userId}`);

    // Delete all orders for the user
    const result = await Order.deleteMany({ userId });

    console.log(`✅ Deleted ${result.deletedCount} orders for user ${userId}`);

    res.json({
      success: true,
      message: `Successfully cleared ${result.deletedCount} order(s) from history`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error clearing order history:", err);
    res.status(500).json({
      success: false,
      message: "Failed to clear order history: " + err.message,
    });
  }
});

/**
 * GET SINGLE ORDER DETAILS
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "items.productId",
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify user owns this order
    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
});

/**
 * CANCEL ORDER
 */
router.patch("/:id/cancel", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("userId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log(
      `Order found - ID: ${order._id}, Status: ${order.status}, User ID: ${order.userId._id}`,
    );

    // Verify user owns this order
    if (order.userId._id.toString() !== req.user.id) {
      console.log(
        `Unauthorized - Order user: ${order.userId._id}, Auth user: ${req.user.id}`,
      );
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Can only cancel if order is CONFIRMED, PLACED, or PENDING
    if (
      order.status !== "CONFIRMED" &&
      order.status !== "PLACED" &&
      order.status !== "PENDING"
    ) {
      console.log(`Cannot cancel - Current status: ${order.status}`);
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}. Orders can only be cancelled before shipment.`,
      });
    }

    // Restore product stock
    for (let item of order.items) {
      if (item.productId) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }

    // Update order status
    order.status = "CANCELLED";
    await order.save();

    // Send cancellation email
    const userEmail = order.userId.email;
    const userName = order.userId.fullName;
    const orderId = order._id;

    // Build items HTML with images
    let itemsHTML = "";
    if (order.items && order.items.length > 0) {
      itemsHTML = order.items
        .map((item) => {
          const productImage = item?.productId?.image
            ? item.productId.image
            : null;
          const productName = item?.name || "Product";
          const quantity = item?.quantity || 1;
          const price = item?.price || 0;
          const total = item?.total || 0;

          let imageHTML = "";
          if (
            productImage &&
            (productImage.startsWith("http://") ||
              productImage.startsWith("https://"))
          ) {
            imageHTML = `<img src="${productImage}" alt="${productName}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 6px;">`;
          } else if (productImage) {
            // If local URL, construct full URL
            imageHTML = `<img src="${process.env.BACKEND_URL}/uploads/${productImage}" alt="${productName}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 6px;">`;
          } else {
            // Use emoji instead of broken image
            imageHTML = `<div style="width: 100px; height: 100px; background: #f0f0f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 40px;">📦</div>`;
          }

          return `
            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; display: flex; gap: 15px;">
              ${imageHTML}
              <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 8px;">${productName}</div>
                <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Price: ₹${price.toFixed(2)}</div>
                <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Quantity: ${quantity}</div>
                <div style="font-weight: 600; color: #ef4444;">Total: ₹${total.toFixed(2)}</div>
              </div>
            </div>`;
        })
        .join("");
    } else {
      itemsHTML = "<p>No items in this order</p>";
    }

    try {
      await transporter.sendMail({
        from: '"EcoStore Orders" <orders@ecostore.com>',
        to: userEmail,
        subject: "Order Cancelled ❌ - Your Refund Details Inside",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #ef4444;">🌿 EcoStore</h1>
            </div>
            
            <h2 style="color: #333;">Order Cancelled ❌</h2>
            <p style="font-size: 16px; color: #555;">Dear ${userName},</p>
            <p style="font-size: 16px; color: #555;">Your order has been successfully cancelled. Here are the details:</p>
            
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderId}</p>
              <p style="margin: 5px 0;"><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Refund Amount:</strong> <span style="color: #ef4444; font-weight: 600;">₹${order.grandTotal}</span></p>
            </div>
            
            <h3 style="color: #333; margin-top: 30px;">📦 Cancelled Items:</h3>
            ${itemsHTML}
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>💰 Refund Information:</strong><br>
                Your refund of ₹${order.grandTotal} will be processed within 5-7 business days to your original payment method.
              </p>
            </div>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #15803d;">
                <strong>ℹ️ What to Expect:</strong><br>
                • Refund processing: 5-7 business days<br>
                • Credit back to original payment method<br>
                • You will receive a separate refund confirmation email
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If you have any questions about your refund or need to reinstate your order, please contact our support team at support@ecostore.com
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #999; font-size: 12px;">We would love to have you back! Thank you for shopping with EcoStore! 🌿</p>
            </div>
          </div>
        `,
      });
      console.log("Cancellation email sent to:", userEmail);
    } catch (emailErr) {
      console.error("Email sending error:", emailErr);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (err) {
    console.error("Order cancellation error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
    });
  }
});

/**
 * SEND ORDER VERIFICATION EMAIL
 */
router.post("/:id/send-verification-email", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("userId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify user owns this order
    if (order.userId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userEmail = order.userId.email;
    const userName = order.userId.fullName || order.userId.name || "Customer";
    const orderId = order._id;

    // Build items table
    let itemsHTML = "";
    if (order.items && order.items.length > 0) {
      itemsHTML = order.items
        .map((item) => {
          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px; text-align: left;">${item.name}</td>
              <td style="padding: 12px; text-align: center;">₹${item.price.toFixed(2)}</td>
              <td style="padding: 12px; text-align: center;">${item.quantity}</td>
              <td style="padding: 12px; text-align: right;">₹${item.total.toFixed(2)}</td>
            </tr>`;
        })
        .join("");
    }

    try {
      await transporter.sendMail({
        from:
          '"EcoStore Support" <' +
          (process.env.EMAIL_USER || "support@ecostore.com") +
          ">",
        to: userEmail,
        subject: "🔐 Order Verification & Details - Order ID: " + orderId,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
            <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px;">🌿 EcoStore</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Order Verification</p>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 30px;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0;">Order Verification Required</h2>
                <p style="color: #4b5563; font-size: 16px; margin: 0 0 10px 0;">Dear ${userName},</p>
                <p style="color: #4b5563; font-size: 16px; margin: 0 0 30px 0;">
                  Thank you for placing your order with us. For security purposes, we're sending you the complete details of your order for verification.
                </p>
                
                <!-- Security Alert -->
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 0 0 30px 0;">
                  <p style="margin: 0; color: #92400e;">
                    <strong>🔐 Verification Checklist:</strong><br>
                    ✓ Order ID matches your purchase<br>
                    ✓ Items are correct<br>
                    ✓ Total amount is accurate<br>
                    ✓ Delivery address is correct
                  </p>
                </div>
                
                <!-- Order Details -->
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 0 0 30px 0;">
                  <h3 style="color: #1f2937; margin: 0 0 15px 0;">Order Details</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Order ID</p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 16px; font-family: monospace;">${orderId}</p>
                    </div>
                    <div>
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Order Date</p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 16px;">${new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div>
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Status</p>
                      <p style="margin: 0; color: #3b82f6; font-weight: 600; font-size: 16px;">${order.status}</p>
                    </div>
                    <div>
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Payment Method</p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 16px;">${order.paymentMethod}</p>
                    </div>
                  </div>
                </div>
                
                <!-- Items Table -->
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Items Ordered</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 0 0 30px 0;">
                  <thead>
                    <tr style="background: #f3f4f6;">
                      <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Product</th>
                      <th style="padding: 12px; text-align: center; color: #374151; font-weight: 600;">Price</th>
                      <th style="padding: 12px; text-align: center; color: #374151; font-weight: 600;">Qty</th>
                      <th style="padding: 12px; text-align: right; color: #374151; font-weight: 600;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHTML}
                  </tbody>
                </table>
                
                <!-- Pricing -->
                <div style="text-align: right; margin: 0 0 30px 0; background: #f9fafb; padding: 15px; border-radius: 8px;">
                  <div style="display: flex; justify-content: flex-end; margin: 0 0 8px 0;">
                    <span style="color: #6b7280; width: 150px; text-align: right;">Subtotal:</span>
                    <span style="color: #1f2937; font-weight: 600; width: 100px; text-align: right;">₹${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: flex-end; margin: 0 0 8px 0;">
                    <span style="color: #6b7280; width: 150px; text-align: right;">Shipping:</span>
                    <span style="color: #1f2937; font-weight: 600; width: 100px; text-align: right;">₹${order.shipping.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: flex-end; border-top: 2px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
                    <span style="color: #1f2937; font-weight: 600; width: 150px; text-align: right;">Grand Total:</span>
                    <span style="color: #3b82f6; font-weight: 700; font-size: 18px; width: 100px; text-align: right;">₹${order.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                <!-- Action Required -->
                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 0 0 30px 0;">
                  <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
                    <strong>⚠️ Important:</strong><br>
                    • Review all order details carefully<br>
                    • If anything seems incorrect, contact us immediately<br>
                    • Do not share this email with others<br>
                    • Your order will be prepared for delivery shortly
                  </p>
                </div>
                
                <!-- Contact -->
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px 0;">
                  If you did not place this order or have any concerns, please contact our support team immediately at <strong>support@ecostore.com</strong> or reply to this email.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  EcoStore - Sustainable Shopping 🌿<br>
                  <span style="font-style: italic;">Products for a Better Tomorrow</span>
                </p>
              </div>
            </div>
          </div>
        `,
      });

      console.log("✅ Verification email sent to:", userEmail);
      res.json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (emailErr) {
      console.error("❌ Error sending verification email:", emailErr);
      res.status(500).json({
        success: false,
        message: "Failed to send verification email: " + emailErr.message,
      });
    }
  } catch (err) {
    console.error("Verification email error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to process verification email",
    });
  }
});

/**
 * RESEND ORDER CONFIRMATION EMAIL
 */
router.post("/:id/resend-confirmation", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "userId items.productId",
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify user owns this order
    if (order.userId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userName = order.userId.fullName || order.userId.name || "Customer";
    const userEmail = order.userId.email;

    // Build items table
    let itemsHTML = "";
    if (order.items && order.items.length > 0) {
      itemsHTML = order.items
        .map((item) => {
          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px; text-align: left;">${item.name}</td>
              <td style="padding: 12px; text-align: center;">₹${item.price.toFixed(2)}</td>
              <td style="padding: 12px; text-align: center;">${item.quantity}</td>
              <td style="padding: 12px; text-align: right;">₹${item.total.toFixed(2)}</td>
            </tr>`;
        })
        .join("");
    }

    try {
      await transporter.sendMail({
        from:
          '"EcoStore Orders" <' +
          (process.env.EMAIL_USER || "orders@ecostore.com") +
          ">",
        to: userEmail,
        subject: "✅ Order Confirmation - Order ID: " + order._id + " (Resend)",
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
            <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px;">🌿 EcoStore</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Order Confirmation</p>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 30px;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0;">Order Confirmation (Resend)</h2>
                <p style="color: #4b5563; font-size: 16px; margin: 0 0 30px 0;">Dear ${userName},</p>
                
                <!-- Order Info Box -->
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 0 0 30px 0;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Order ID</p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 16px;">${order._id}</p>
                    </div>
                    <div>
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Order Date</p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 16px;">${new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div>
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Status</p>
                      <p style="margin: 0; color: #10b981; font-weight: 600; font-size: 16px;">${order.status} ✅</p>
                    </div>
                    <div>
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Payment Method</p>
                      <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 16px;">${order.paymentMethod}</p>
                    </div>
                  </div>
                </div>
                
                <!-- Items Table -->
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Order Items</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 0 0 30px 0;">
                  <thead>
                    <tr style="background: #f3f4f6;">
                      <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Product</th>
                      <th style="padding: 12px; text-align: center; color: #374151; font-weight: 600;">Price</th>
                      <th style="padding: 12px; text-align: center; color: #374151; font-weight: 600;">Qty</th>
                      <th style="padding: 12px; text-align: right; color: #374151; font-weight: 600;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHTML}
                  </tbody>
                </table>
                
                <!-- Totals -->
                <div style="text-align: right; margin: 0 0 30px 0;">
                  <div style="display: flex; justify-content: flex-end; margin: 0 0 10px 0;">
                    <span style="color: #6b7280; width: 150px; text-align: right;">Subtotal:</span>
                    <span style="color: #1f2937; font-weight: 600; width: 100px; text-align: right;">₹${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: flex-end; margin: 0 0 10px 0;">
                    <span style="color: #6b7280; width: 150px; text-align: right;">Shipping:</span>
                    <span style="color: #1f2937; font-weight: 600; width: 100px; text-align: right;">₹${order.shipping.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: flex-end; border-top: 2px solid #e5e7eb; padding-top: 10px; margin-top: 10px;">
                    <span style="color: #1f2937; font-weight: 600; width: 150px; text-align: right;">Grand Total:</span>
                    <span style="color: #10b981; font-weight: 700; font-size: 18px; width: 100px; text-align: right;">₹${order.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px 0;">
                  If you have any questions about your order, contact us at <strong>support@ecostore.com</strong>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  Thank you for shopping with EcoStore! 🌿
                </p>
              </div>
            </div>
          </div>
        `,
      });

      console.log("✅ Confirmation email resent to:", userEmail);
      res.json({
        success: true,
        message: "Confirmation email resent successfully",
      });
    } catch (emailErr) {
      console.error("❌ Error resending confirmation email:", emailErr);
      res.status(500).json({
        success: false,
        message: "Failed to resend confirmation email: " + emailErr.message,
      });
    }
  } catch (err) {
    console.error("Resend confirmation error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to process resend confirmation",
    });
  }
});

/**
 * UPDATE ORDER STATUS (Admin only)
 */
router.put("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    // Validate status
    const validStatuses = [
      "PLACED",
      "CONFIRMED",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Update order status
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status, updatedAt: new Date() },
      { new: true },
    ).populate("userId", "email fullName");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log(`✅ Order status updated: ${orderId} -> ${status}`);

    // Emit real-time event to user
    if (global.io) {
      global.io.to(`user-${order.userId._id}`).emit("order-status-updated", {
        orderId: order._id,
        status: order.status,
        updatedAt: order.updatedAt,
        message: `Your order has been ${status.toLowerCase()}`,
      });
    }

    // Send email notification
    try {
      const statusMessages = {
        PLACED: "Your order has been placed successfully!",
        CONFIRMED: "Your order has been confirmed and is being prepared.",
        SHIPPED: "Your order has been shipped! Track it now.",
        DELIVERED: "Your order has been delivered. Thank you!",
        CANCELLED: "Your order has been cancelled.",
      };

      await transporter.sendMail({
        from: `"EcoStore Orders" <${process.env.EMAIL_USER}>`,
        to: order.userId.email,
        subject: `📦 Order Status Update: ${status} - Order #${order._id}`,
        html: `
          <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #10b981;">Order Status Update</h2>
            <p>Hello ${order.userId.fullName},</p>
            <p style="font-size: 16px; color: #333;">
              ${statusMessages[status] || `Your order status has been updated to ${status}`}
            </p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Order ID:</strong> ${order._id}</p>
              <p><strong>Current Status:</strong> <span style="color: #10b981; font-weight: bold;">${status}</span></p>
              <p><strong>Updated on:</strong> ${new Date(order.updatedAt).toLocaleString()}</p>
            </div>
            <p>Thank you for shopping with EcoStore! 🌿</p>
          </div>
        `,
      });
      console.log(`✅ Status update email sent to: ${order.userId.email}`);
    } catch (emailErr) {
      console.warn(`⚠️ Failed to send status email: ${emailErr.message}`);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (err) {
    console.error("Order status update error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update order status: " + err.message,
    });
  }
});

/**
 * GET ORDER TRACKING (User can track their order)
 */
router.get("/:id/track", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "items.productId",
      "name image price",
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Security: User can only see their own orders
    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    // Build order timeline
    const timeline = [];
    const statuses = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];
    const statusIcons = {
      PLACED: "📝",
      CONFIRMED: "✅",
      SHIPPED: "📦",
      DELIVERED: "🎉",
    };

    statuses.forEach((s) => {
      timeline.push({
        status: s,
        completed: statuses.indexOf(s) <= statuses.indexOf(order.status),
        icon: statusIcons[s],
      });
    });

    res.json({
      success: true,
      order: {
        _id: order._id,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        grandTotal: order.grandTotal,
        timeline,
      },
    });
  } catch (err) {
    console.error("Order tracking error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order tracking info",
    });
  }
});

module.exports = router;
