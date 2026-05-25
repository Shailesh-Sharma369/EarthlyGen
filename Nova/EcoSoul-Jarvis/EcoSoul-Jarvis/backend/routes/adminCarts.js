const express = require("express");
const User = require("../models/user");
const Order = require("../models/order");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const router = express.Router();

// GET ADMIN CARTS - View all user carts
router.get("/carts", auth, admin, async (req, res) => {
  try {
    const users = await User.find()
      .select("email cart addresses createdAt updatedAt")
      .populate("cart.productId", "name price image")
      .exec();

    const carts = users
      .filter((u) => u.cart && u.cart.length > 0)
      .map((u) => ({
        _id: u._id,
        userId: { _id: u._id, email: u.email },
        items: u.cart,
        updatedAt: u.updatedAt || u.createdAt || new Date(),
      }));

    res.json({ success: true, carts });
  } catch (error) {
    console.error("Get carts error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET SINGLE USER CART DETAILS
router.get("/carts/:userId", auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("email cart")
      .populate("cart.productId", "name price image");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      userEmail: user.email,
      items: user.cart || [],
    });
  } catch (error) {
    console.error("Get cart details error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ENHANCED SALES STATS
router.get("/sales", auth, admin, async (req, res) => {
  try {
    const orders = await Order.find();
    const users = await User.find();
    const usersWithCarts = await User.countDocuments({
      cart: { $exists: true, $ne: [] },
    });

    const totalRevenue = orders.reduce(
      (sum, o) => sum + (o.grandTotal || 0),
      0,
    );
    const totalOrders = orders.length;
    const totalUsers = users.length;
    const activeCarts = usersWithCarts;

    // Revenue by status
    const revenueByStatus = {};
    orders.forEach((order) => {
      const status = order.status || "pending";
      revenueByStatus[status] =
        (revenueByStatus[status] || 0) + (order.grandTotal || 0);
    });

    res.json({
      success: true,
      totalRevenue,
      totalOrders,
      totalUsers,
      activeCarts,
      revenueByStatus,
    });
  } catch (error) {
    console.error("Sales stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
