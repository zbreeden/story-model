// Reuse across modules to standardize analytics
// Requires GTM to be present on the page.
window.dataLayer = window.dataLayer || [];
export const track = (event, params = {}) => {
  window.dataLayer.push({ event, ts: Date.now(), ...params });
};
