// Order model — a patient's medicine order.

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
  name: String,
  price: Number,
  quantity: { type: Number, default: 1 },
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['placed', 'preparing', 'ready', 'delivered', 'cancelled'],
      default: 'placed',
      index: true,
    },
    deliveryType: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
    address: { type: String, default: '' },
    placedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
