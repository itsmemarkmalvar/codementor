// Authentication utilities

// Get token from localStorage if available
export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    // Try both token keys for backward compatibility
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    return token;
  }
  return null;
};

// Save token to localStorage
export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    console.log(`Setting auth token: ${token.substring(0, 10)}...`);
    // Store with the correct key that matches the backend
    localStorage.setItem('auth_token', token);
    // Also store with the old key for backward compatibility
    localStorage.setItem('token', token);
  }
};

// Remove token from localStorage
export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    console.log('Removing auth token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = getToken();
  const hasToken = !!token;
  console.log(`Auth check: ${hasToken ? 'Authenticated' : 'Not authenticated'}`);
  return hasToken;
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
  // Create a longer, more realistic test token
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  console.log('Setting test token for debugging auth issues:', testToken.substring(0, 15) + '...');
  setToken(testToken);
  
  // Add test function to window to check token
  if (typeof window !== 'undefined') {
    (window as any).checkAuthToken = () => {
      const token = getToken();
      console.log('Current token:', token ? `${token.substring(0, 15)}...` : 'No token');
      return token;
    };
  }
};

// Comprehensive debug tool for auth flow issues
export const debugAuthFlow = async (): Promise<Record<string, any>> => {
  const debugInfo: Record<string, any> = {};

  try {
    // Check token storage
    const token = getToken();
    debugInfo.hasToken = !!token;
    debugInfo.tokenFirstChars = token ? token.substring(0, 10) + '...' : 'none';
    
    // Check localStorage directly
    if (typeof window !== 'undefined') {
      debugInfo.localStorage = {
        token: localStorage.getItem('token') ? 'exists' : 'missing'
      };
    }
    
    // Test creating authentication header
    const headers = authHeader();
    debugInfo.authHeader = Object.keys(headers).length > 0 ? 'created' : 'empty';
    
    // Make a simple test request to check token transmission
    try {
      const testResponse = await fetch('/api/user', {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      debugInfo.testRequest = {
        status: testResponse.status,
        ok: testResponse.ok,
        statusText: testResponse.statusText,
        headers: {
          contentType: testResponse.headers.get('Content-Type')
        }
      };
    } catch (requestError: any) {
      debugInfo.testRequest = {
        error: requestError.message
      };
    }
    
    console.log('Auth flow debug info:', debugInfo);
    return debugInfo;
  } catch (error: any) {
    console.error('Error during auth flow debugging:', error);
    return {
      error: error.message,
      stack: error.stack
    };
  }
};

// Add debug tool to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).debugAuthFlow = debugAuthFlow;
}

export default {
  getToken,
  setToken,
  removeToken,
  isAuthenticated,
  authHeader,
  setTestToken,
  debugAuthFlow
}; 