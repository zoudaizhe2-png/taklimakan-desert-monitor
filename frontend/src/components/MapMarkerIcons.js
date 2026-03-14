import L from "leaflet";

const CATEGORY_CONFIG = {
  vegetation: {
    color: "#1a9850",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8 2 4 6 4 10c0 3 2 5 4 6v4h8v-4c2-1 4-3 4-6 0-4-4-8-8-8z" fill="#1a9850"/><path d="M12 4c-1 2-1 4 0 6s1 4 0 6" stroke="white" stroke-width="1.5"/><path d="M9 8c1 0 3 1 3 3" stroke="white" stroke-width="1.2"/><path d="M15 8c-1 0-3 1-3 3" stroke="white" stroke-width="1.2"/></svg>`,
  },
  desert: {
    color: "#e8a838",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 18c2-3 4-5 7-5s4 2 6 2 3-1 5-3v6H2v-0z" fill="#e8a838"/><path d="M4 16c1.5-2 3-3 5-3s3 1.5 4.5 1.5S16 13 18 12" stroke="#d4922a" stroke-width="1.2"/><circle cx="18" cy="6" r="3" fill="#f0c040"/></svg>`,
  },
  city: {
    color: "#4a90d9",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="8" width="6" height="12" rx="1" fill="#4a90d9"/><rect x="11" y="4" width="6" height="16" rx="1" fill="#3a7bc8"/><rect x="5" y="10" width="2" height="2" fill="white" rx="0.3"/><rect x="5" y="14" width="2" height="2" fill="white" rx="0.3"/><rect x="13" y="6" width="2" height="2" fill="white" rx="0.3"/><rect x="13" y="10" width="2" height="2" fill="white" rx="0.3"/><rect x="13" y="14" width="2" height="2" fill="white" rx="0.3"/><rect x="19" y="12" width="3" height="8" rx="1" fill="#5aa0e9"/></svg>`,
  },
  project: {
    color: "#e07b39",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z" fill="#e07b39"/><rect x="8" y="14" width="8" height="6" rx="1" fill="#c86a2e"/><rect x="10" y="16" width="4" height="4" fill="#e07b39"/></svg>`,
  },
  water: {
    color: "#2da0c3",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C12 2 6 10 6 14a6 6 0 0012 0c0-4-6-12-6-12z" fill="#2da0c3"/><path d="M10 15a2.5 2.5 0 004 1" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
};

export function createCategoryIcon(category) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.city;
  return L.divIcon({
    className: "custom-marker",
    html: `<div class="marker-icon" style="background:${config.color}">${config.svg}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export function getCategoryColor(category) {
  return CATEGORY_CONFIG[category]?.color || "#888";
}
