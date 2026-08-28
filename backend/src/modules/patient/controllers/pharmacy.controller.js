// Pharmacy controller — medicines list + orders.

const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

// ── GET medicines (with optional search + category) ───────────────────────
// GET /api/patient/medicines?search=...&category=...
async function getMedicines(req, res, next) {
  try {
    const { search, category } = req.query;
    const q = {};
    if (search) q.name = { $regex: search, $options: 'i' };
    if (category && category !== 'All') q.category = category;
    const medicines = await Medicine.find(q).sort({ name: 1 });
    // distinct categories for filter chips
    const categories = await Medicine.distinct('category');
    return res.json({ success: true, medicines, categories: ['All', ...categories] });
  } catch (err) {
    next(err);
  }
}

// ── PLACE an order ────────────────────────────────────────────────────────
// POST /api/patient/orders  body: { items:[{medicineId, quantity}], deliveryType, address }
async function placeOrder(req, res, next) {
  try {
    const { items, deliveryType, address } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return fail(res, 400, 'Your cart is empty.', 'EMPTY_CART');
    }

    // Build order items from real medicine prices (don't trust client price).
    const orderItems = [];
    let total = 0;
    for (const it of items) {
      const med = await Medicine.findById(it.medicineId);
      if (!med) continue;
      const qty = Math.max(1, Number(it.quantity) || 1);
      orderItems.push({ medicine: med._id, name: med.name, price: med.price, quantity: qty });
      total += med.price * qty;
    }
    if (orderItems.length === 0) return fail(res, 400, 'No valid medicines in the order.', 'NO_ITEMS');

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalAmount: total,
      deliveryType: deliveryType || 'pickup',
      address: address || '',
      status: 'placed',
    });

    logger.db('INSERT', 'Order', `${req.user.email} order Rs.${total} (${orderItems.length} items)`);
    return res.status(201).json({ success: true, message: 'Order placed successfully.', order });
  } catch (err) {
    next(err);
  }
}

// ── MY orders ─────────────────────────────────────────────────────────────
async function myOrders(req, res, next) {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return fail(res, 404, 'Order not found', 'NOT_FOUND');
    return res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

async function cancelOrder(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return fail(res, 404, 'Order not found', 'NOT_FOUND');
    if (!['placed', 'preparing'].includes(order.status)) {
      return fail(res, 400, 'This order can no longer be cancelled.', 'BAD_STATE');
    }
    order.status = 'cancelled';
    await order.save();
    return res.json({ success: true, message: 'Order cancelled.', order });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMedicines, placeOrder, myOrders, getOrder, cancelOrder };
