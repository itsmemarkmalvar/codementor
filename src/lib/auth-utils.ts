// Authentication utilities

// Get token from localStorage if available
export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Save token to localStorage
export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

// Remove token from localStorage
export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// Add token to request headers
export const authHeader = (): Record<string, string> => {
  const token = getToken();
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
};

// For debugging auth issues - adds a test token
export const setTestToken = (): void => {
  const testToken = 'debugging_test_token_12345';
  console.log('Setting test token:', testToken);
  setToken(testToken);
};

export default {
  getToken,
  setToken,
  removeToken,
  isAuthenticated,
  authHeader,
}; 