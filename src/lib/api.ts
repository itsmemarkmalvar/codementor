// API utilities for making requests to the backend
import { authHeader } from './auth-utils';

const API_BASE_URL = 'http://localhost:8000/api';

// Generic fetch function with error handling
async function fetchApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Default headers with auth header if available
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...authHeader(),
    ...(options.headers || {}),
  };

  // Configure the request with proper CORS settings
  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
    mode: 'cors',
  };

  try {
    console.log(`Fetching from ${url} with options:`, config);
    const response = await fetch(url, config);
    
    // For non-JSON responses or empty responses
    if (!response.headers.get('content-type')?.includes('application/json')) {
      if (response.ok) {
        return { success: true };
      }
      throw new Error('Non-JSON response received');
    }
    
    // Parse the JSON response
    const data = await response.json();
    
    // Handle API errors
    if (!response.ok) {
      console.error('API error response:', data);
      throw new Error(data.message || 'An error occurred');
    }
    
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Authentication API calls
export const auth = {
  // Register a new user
  register: async (userData: { name: string; email: string; password: string; password_confirmation: string }) => {
    return fetchApi('/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  // Login a user
  login: async (credentials: { email: string; password: string }) => {
    return fetchApi('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  
  // Logout the current user
  logout: async () => {
    return fetchApi('/logout', {
      method: 'POST',
    });
  },
  
  // Get the current user's data
  getUser: async () => {
    return fetchApi('/user', {
      method: 'GET',
    });
  },
  
  // Request password reset
  forgotPassword: async (email: string) => {
    return fetchApi('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  
  // Reset password
  resetPassword: async (data: { email: string; token: string; password: string; password_confirmation: string }) => {
    return fetchApi('/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Export other API modules as needed
export default {
  auth,
}; 