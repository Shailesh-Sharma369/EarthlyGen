const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: String,
        price: Number,
        quantity: Number,
        total: Number,
      },
    ],

    subtotal: Number,
    shipping: Number,
    grandTotal: Number,

    // 💚 Eco-credits applied as discount
    creditsApplied: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PLACED",
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },

    shippingAddress: {
      fullName: String,
      address: String,
      city: String,
      pincode: String,
    },

    shippingLocation: {
      latitude: Number,
      longitude: Number,
      formattedAddress: String,
      timestamp: { type: Date, default: Date.now },
    },

    trackingHistory: [
      {
        status: String,
        location: {
          latitude: Number,
          longitude: Number,
        },
        timestamp: { type: Date, default: Date.now },
        description: String,
      },
    ],
  },
  { timestamps: true },
);

// Check if the model is already defined, otherwise define it
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

module.exports = Order;
