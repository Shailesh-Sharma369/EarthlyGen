const express = require("express");
const Cart = require("../models/cart");
const Product = require("../models/product");
const User = require("../models/user");
const CartActivity = require("../models/CartActivity");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * ADD TO CART (ATOMIC - No Race Conditions)
 */
const mongoose = require("mongoose");

router.post("/add", auth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const qty = Number(quantity) || 1;

    console.log("🛒 ADD TO CART REQUEST:", {
      productId,
      qty,
      userId: req.user.id,
    });

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.error("❌ Invalid productId format:", productId);
      return res.status(400).json({
        success: false,
        message: "Invalid productId format",
      });
    }

    const userId = req.user.id;
    console.log("🔍 Looking for product with ID:", productId);
    const product = await Product.findById(productId);
    console.log("📦 Product found:", product ? product.name : "NOT FOUND");

    if (!product) {
      console.error("❌ Product not found in database. Product ID:", productId);
      return res.status(404).json({
        success: false,
        message: "Product not found in database",
      });
    }

    // ✅ ATOMIC UPDATE: Use findOneAndUpdate to prevent race conditions
    let cart = await Cart.findOneAndUpdate(
      { userId },
      {
        // If item exists, increment quantity; otherwise this will be handled by the create
        $inc: { "items.$[elem].quantity": qty },
      },
      {
        arrayFilters: [
          {
            "elem.productId": mongoose.Types.ObjectId.isValid(productId)
              ? productId
              : null,
          },
        ],
        new: false, // Get old document to check if item existed
      },
    );

    // If cart doesn't exist or item wasn't found, create/update cart with new item
    if (
      !cart ||
      !cart.items.find((item) => item.productId.toString() === productId)
    ) {
      cart = await Cart.findOneAndUpdate(
        { userId },
        {
          $push: { items: { productId, quantity: qty } },
        },
        {
          upsert: true, // Create if doesn't exist
          new: true, // Return updated document
          setDefaultsOnInsert: true,
        },
      );
    } else {
      // Item was updated, fetch fresh cart
      cart = await Cart.findOne({ userId });
    }

    // Populate product details
    cart = await Cart.findOne({ userId }).populate("items.productId");
    const user = await User.findById(userId);

    console.log("✅ Product added to cart successfully");

    // 🌱 DEDUCT ECO-CREDITS IMMEDIATELY when item added to cart
    if (user) {
      if (!user.ecoCredits) user.ecoCredits = 100;

      // Only deduct if this is the FIRST item in cart (new order)
      if (cart.items.length === 1) {
        const CREDITS_PER_PURCHASE = 5;

        if (user.ecoCredits >= CREDITS_PER_PURCHASE) {
          user.ecoCredits -= CREDITS_PER_PURCHASE;
          user.creditsHistory = user.creditsHistory || [];
          user.creditsHistory.push({
            type: "purchase",
            amount: -CREDITS_PER_PURCHASE,
            description: `Added items to cart - awaiting payment`,
            date: new Date(),
          });
          await user.save();
          console.log(
            `✅ INSTANT: Deducted 5 credits for cart. Remaining: ${user.ecoCredits}`,
          );
        }
      }
    }

    // Emit real-time event to admin dashboard
    if (req.app.io) {
      req.app.io.emit("cart-updated", {
        type: "ITEM_ADDED",
        userId,
        userName: user.name,
        userEmail: user.email,
        productName: product.name,
        quantity: qty,
        ecoCreditsRemaining: user.ecoCredits,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: "Product added to cart",
      items: cart.items,
      ecoCredits: user.ecoCredits, // 🔥 Return updated credits
    });
  } catch (err) {
    console.error("❌ ADD CART ERROR:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Add to cart failed: " + err.message,
    });
  }
});

/**
 * GET CART (with ECO-CREDITS DISCOUNT)
 */
router.get("/", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id }).populate(
      "items.productId",
    );

    // Get user's eco-credits
    const user = await User.findById(req.user.id).select("ecoCredits");
    const ecoCredits = user?.ecoCredits || 0;

    if (!cart) {
      return res.json({
        success: true,
        items: [],
        ecoCredits: ecoCredits,
        ecoDiscount: 0,
        totalDiscount: 0,
      });
    }

    // Calculate eco-credits discount: FLAT 5 credits per order (not per product)
    const ecoDiscountPerProduct = 5;
    const ecoDiscount = 5; // Flat 5 credits for any order

    // Check if user has enough eco-credits for this discount
    const canApplyDiscount = ecoCredits >= ecoDiscount;

    // If user has enough eco-credits, calculate discount amount
    // Assuming 1 eco-credit = 1 rupee discount
    const discountAmount = canApplyDiscount
      ? ecoDiscount
      : Math.min(ecoCredits, ecoDiscount);

    res.json({
      success: true,
      items: cart.items,
      ecoCredits: ecoCredits,
      ecoDiscountPerProduct: ecoDiscountPerProduct,
      totalProductsInCart: cart.items.length,
      ecoDiscount: ecoDiscount, // Total credits needed for discount (flat 5)
      discountAmount: discountAmount, // Actual discount amount that can be applied
      canApplyDiscount: canApplyDiscount,
      message: canApplyDiscount
        ? `✅ Eco-credits discount applied! 5 credits deducted.`
        : `⚠️ You have ${ecoCredits} eco-credits but need 5 for full discount. Getting partial discount of ${discountAmount} credits.`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
/**
 * UPDATE CART ITEM
 */

// router.put("/:itemId", auth, async (req, res) => {
//   try {
//     const { quantity } = req.body;
//     const userId = req.user.id;

//     const cart = await Cart.findOne({ userId });
//     const item = cart.items.find(
//   i => i._id.toString() === req.params.itemId
// );

//     if (!item) return res.status(404).json({ success: false });

//     item.quantity = quantity;
//     await cart.save();

//     const activity = await CartActivity.create({
//       userId,
//       productId: item.productId,
//       action: "UPDATE",
//       quantity
//     });

//     const io = req.app.get("io");
//     io.emit("cart-activity", {
//       action: "UPDATE",
//       quantity,
//       createdAt: activity.createdAt
//     });

//     res.json({ success: true, items: cart.items });
//   } catch (err) {
//     res.status(500).json({ success: false });
//   }
// });
router.put("/:itemId", auth, async (req, res) => {
  try {
    const qty = Number(req.body.quantity);

    if (qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find((i) => i._id.toString() === req.params.itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    item.quantity = qty;
    await cart.save();

    const populatedCart = await Cart.findOne({ userId: req.user.id }).populate(
      "items.productId",
    );

    res.json({
      success: true,
      items: populatedCart.items,
    });
  } catch (err) {
    console.error("UPDATE CART ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update cart",
    });
  }
});

/**
 * REMOVE CART ITEM
 */

// router.delete("/:itemId", auth, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const cart = await Cart.findOne({ userId });
//     cart.items = cart.items.filter(
//       i => i._id.toString() !== req.params.itemId
//     );
//     if (!item) return res.status(404).json({ success: false });

//     const productId = item.productId;
//     item.deleteOne();
//     await cart.save();

//     const activity = await CartActivity.create({
//       userId,
//       productId,
//       action: "REMOVE"
//     });

//     const io = req.app.get("io");
//     io.emit("cart-activity", {
//       action: "REMOVE",
//       createdAt: activity.createdAt
//     });

//     res.json({ success: true, items: cart.items });
//   } catch (err) {
//     res.status(500).json({ success: false });
//   }
// });

router.delete("/:itemId", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemsBeforeRemoval = cart.items.length;
    cart.items = cart.items.filter(
      (i) => i._id.toString() !== req.params.itemId,
    );

    await cart.save();

    // 🌱 REFUND ECO-CREDITS when cart becomes empty
    if (itemsBeforeRemoval > 0 && cart.items.length === 0) {
      const user = await User.findById(userId);
      if (user) {
        const CREDITS_PER_PURCHASE = 5;
        user.ecoCredits += CREDITS_PER_PURCHASE;
        user.creditsHistory = user.creditsHistory || [];
        user.creditsHistory.push({
          type: "purchase",
          amount: CREDITS_PER_PURCHASE,
          description: `Refunded credits - all items removed from cart`,
          date: new Date(),
        });
        await user.save();
        console.log(
          `✅ REFUNDED: Added back 5 credits. New balance: ${user.ecoCredits}`,
        );
      }
    }

    const populatedCart = await Cart.findOne({ userId: req.user.id }).populate(
      "items.productId",
    );
    const user = await User.findById(userId);
    const updatedUser = await User.findById(userId);

    // Emit real-time event to admin dashboard
    if (req.app.io) {
      req.app.io.emit("cart-updated", {
        type: "ITEM_REMOVED",
        userId,
        userName: user?.name,
        userEmail: user?.email,
        ecoCreditsRemaining: updatedUser?.ecoCredits,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      items: populatedCart.items,
      ecoCredits: updatedUser?.ecoCredits, // 🔥 Return updated credits
    });
  } catch (err) {
    console.error("REMOVE CART ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to remove item",
    });
  }
});

/**
 * CLEAR CART
 */
router.delete("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ userId });

    // 🌱 REFUND ECO-CREDITS when clearing entire cart
    if (cart && cart.items.length > 0) {
      const user = await User.findById(userId);
      if (user) {
        const CREDITS_PER_PURCHASE = 5;
        user.ecoCredits += CREDITS_PER_PURCHASE;
        user.creditsHistory = user.creditsHistory || [];
        user.creditsHistory.push({
          type: "purchase",
          amount: CREDITS_PER_PURCHASE,
          description: `Refunded credits - entire cart cleared`,
          date: new Date(),
        });
        await user.save();
        console.log(
          `✅ REFUNDED: Cleared cart, added back 5 credits. New balance: ${user.ecoCredits}`,
        );
      }
    }

    await Cart.findOneAndUpdate({ userId: req.user.id }, { items: [] });

    const updatedUser = await User.findById(userId);
    res.json({
      success: true,
      items: [],
      ecoCredits: updatedUser?.ecoCredits, // 🔥 Return updated credits
    });
  } catch (err) {
    console.error("CLEAR CART ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to clear cart",
    });
  }
});

module.exports = router;
