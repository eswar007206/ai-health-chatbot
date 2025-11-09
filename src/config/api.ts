// API configuration
// Force localhost for development to avoid network IP issues
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  // If env URL is set and it's not localhost, use localhost instead for development
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    console.warn(`VITE_API_URL is set to ${envUrl}, but using localhost:8000 for development`);
    return 'http://localhost:8000';
  }
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