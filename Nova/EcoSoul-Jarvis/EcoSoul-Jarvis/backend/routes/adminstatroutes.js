const express = require("express");
const Order = require("../models/order");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const router = express.Router();

router.get("/sales", auth, admin, async (req, res) => {
  const orders = await Order.find();

  const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalOrders = orders.length;

  res.json({
    success: true,
    totalRevenue,
    totalOrders,
  });
});

module.exports = router;
