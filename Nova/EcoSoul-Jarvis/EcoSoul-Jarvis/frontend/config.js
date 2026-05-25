/**
 * Global Configuration
 * Dynamically gets API URL based on environment
 */

// Auto-detect API URL
const getAPIURL = () => {
  // If running on localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5002/api';
  }
  
  // Production or other environments
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  
  // Assumes backend runs on same domain, different port or path
  // Modify this based on your deployment
  return `${protocol}//${hostname}:5002/api`;
};

// Global API configuration
const API_CONFIG = {
  API_URL: getAPIURL(),
  BACKEND_URL: getAPIURL().replace('/api', ''),
  
  // Helper function to make requests
  async request(endpoint, options = {}) {
    const url = `${this.API_URL}${endpoint}`;
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error.message);
      throw error;
    }
  },
};

// Make globally available
if (typeof window !== 'undefined') {
  window.API_CONFIG = API_CONFIG;
}
