// ✅ API configuration

// Function to get API base URL safely
const getApiUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;

  if (!url) {
    console.error(
      "❌ Missing VITE_API_URL! Please set it in Render environment variables."
    );
    throw new Error("VITE_API_URL not found in environment variables");
  }

  console.log("✅ Using API URL:", url);
  return url;
};

// Base URL for API
export const API_BASE_URL = getApiUrl();

// API endpoints
export const ENDPOINTS = {
  CHAT: `${API_BASE_URL}/api/chat`,
  ANALYZE_SYMPTOMS: `${API_BASE_URL}/api/analyze-symptoms`,
  MEDICINE_INFO: `${API_BASE_URL}/api/medicine-info`,
  MEDICINE_SEARCH: `${API_BASE_URL}/api/medicine-search`,
};
