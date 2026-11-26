/**
 * Shared API base URL for frontend requests.
 * Strips any trailing slash so `${API_BASE}/...` never produces double slashes.
 */
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

