const mongoose = require("mongoose");

const cartActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    action: { type: String, enum: ["ADD", "UPDATE", "REMOVE"], required: true },
    quantity: { type: Number },
  },
  { timestamps: true }
);

const CartActivity =
  mongoose.models.CartActivity ||
  mongoose.model("CartActivity", cartActivitySchema);

module.exports = CartActivity;
