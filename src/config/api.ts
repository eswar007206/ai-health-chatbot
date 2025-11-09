// API configuration
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  return envUrl || 'http://localhost:8000';
};

export const API_BASE_URL = getApiUrl();

// API endpoints
export const ENDPOINTS = {
  CHAT: `${API_BASE_URL}/api/chat`,
  ANALYZE_SYMPTOMS: `${API_BASE_URL}/api/analyze-symptoms`,
  MEDICINE_INFO: `${API_BASE_URL}/api/medicine-info`,
  MEDICINE_SEARCH: `${API_BASE_URL}/api/medicine-search`,
};