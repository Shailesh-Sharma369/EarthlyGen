const express = require("express");
const Order = require("../models/order");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { reverseGeocodeAddress } = require("../utils/geocoding");

const router = express.Router();

/* GET ALL ORDERS */
router.get("/", auth, admin, async (req, res) => {
  const orders = await Order.find().populate("userId", "email");
  res.json({ success: true, orders });
});

/* GET SINGLE ORDER TRACKING */
router.get("/tracking/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .select("_id status shippingAddress shippingLocation trackingHistory createdAt")
      .populate("userId", "email fullName");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* UPDATE ORDER STATUS WITH LOCATION TRACKING */
router.put("/:id", auth, admin, async (req, res) => {
  try {
    const { status, latitude, longitude, description } = req.body;

    // Get current order before update
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Status descriptions
    const statusDescriptions = {
      PLACED: "Order placed successfully",
      CONFIRMED: "Order confirmed by seller",
      SHIPPED: "Package has been shipped and is on the way",
      DELIVERED: "Package has been delivered",
      CANCELLED: "Order has been cancelled",
    };

    // Create tracking entry
    const trackingEntry = {
      status: status,
      location: {
        latitude: latitude || order.shippingLocation?.latitude,
        longitude: longitude || order.shippingLocation?.longitude,
      },
      description: description || statusDescriptions[status] || `Status updated to ${status}`,
      timestamp: new Date(),
    };

    // Update order with new status and tracking history
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: status,
        $push: {
          trackingHistory: trackingEntry,
        },
      },
      { new: true }
    ).populate("userId", "email fullName");

    console.log(`📦 Order ${req.params.id} status updated to ${status}`);

    // Emit real-time event to user
    if (global.io) {
      global.io.emit("order-status-changed", {
        orderId: updatedOrder._id,
        userId: updatedOrder.userId._id,
        status: updatedOrder.status,
        location: trackingEntry.location,
        description: trackingEntry.description,
        trackingHistory: updatedOrder.trackingHistory,
        timestamp: new Date(),
      });

      // Emit to specific user room
      global.io
        .to(`user-${updatedOrder.userId._id}`)
        .emit("my-order-updated", {
          orderId: updatedOrder._id,
          status: updatedOrder.status,
          location: trackingEntry.location,
          description: trackingEntry.description,
        });
    }

    res.json({
      success: true,
      message: "Order updated with tracking",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("❌ Error updating order:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
