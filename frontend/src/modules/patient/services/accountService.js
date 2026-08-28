// Account ownership — deactivation and deletion.

import api from '../../../services/apiClient';

// What deletion would remove. Shown before the user commits.
async function summary() {
  return api.get('/auth/account/summary');
}

// Reversible: signing in again restores the account.
async function deactivate(password) {
  return api.post('/auth/account/deactivate', { password });
}

// Permanent. `confirm` must be the literal string 'DELETE'.
async function remove(password, confirm) {
  return api.post('/auth/account/delete', { password, confirm });
}

export default { summary, deactivate, remove };
