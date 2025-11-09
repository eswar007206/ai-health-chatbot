// API configuration
const getApiUrl = () => {
  return 'https://backend-eswars-projects-2dbd246c.vercel.app';
};

export const API_BASE_URL = getApiUrl();

// API endpoints
export const ENDPOINTS = {
  CHAT: `${API_BASE_URL}/api/chat`,
  ANALYZE_SYMPTOMS: `${API_BASE_URL}/api/analyze-symptoms`,
  MEDICINE_INFO: `${API_BASE_URL}/api/medicine-info`,
  MEDICINE_SEARCH: `${API_BASE_URL}/api/medicine-search`,
};