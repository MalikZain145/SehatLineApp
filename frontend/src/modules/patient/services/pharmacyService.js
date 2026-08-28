// Pharmacy API service — medicines and orders.

import api from '../../../services/apiClient';

async function getMedicines(search, category) {
  const params = [];
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (category && category !== 'All') params.push(`category=${encodeURIComponent(category)}`);
  const q = params.length ? `?${params.join('&')}` : '';
  return api.get(`/patient/medicines${q}`);
}

async function placeOrder({ items, deliveryType, address }) {
  return api.post('/patient/orders', { items, deliveryType, address });
}

async function myOrders() {
  return api.get('/patient/orders');
}

async function getOrder(id) {
  return api.get(`/patient/orders/${id}`);
}

async function cancelOrder(id) {
  return api.post(`/patient/orders/${id}/cancel`, {});
}

export default { getMedicines, placeOrder, myOrders, getOrder, cancelOrder };
