import axios, { InternalAxiosRequestConfig } from 'axios';
import { getToken } from '@/lib/auth-utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Auth related API calls
export const registerUser = async (userData: any) => {
  const response = await api.post('/register', userData);
  return response.data;
};

export const loginUser = async (credentials: any) => {
  const response = await api.post('/login', credentials);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/logout');
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/user');
  return response.data;
};

// AI Tutor related API calls
export const getTutorResponse = async (params: {
  question: string;
  conversationHistory: Array<{role: string; content: string}>;
  preferences: any;
  topic?: string;
}) => {
  try {
    // Ensure conversationHistory is an array
    const requestParams = {
      ...params,
      conversationHistory: Array.isArray(params.conversationHistory) ? params.conversationHistory : []
    };
    
    console.log('Calling getTutorResponse API with params:', JSON.stringify(requestParams, null, 2));
    const response = await api.post('/tutor/response', requestParams);
    console.log('getTutorResponse API response:', response.data);
    
    if (!response.data || response.data.error) {
      throw new Error(response.data?.error || 'Invalid response from API');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error in getTutorResponse API call:', error);
    throw error;
  }
};

export const executeJavaCode = async (params: {
  code: string;
  input?: string;
}) => {
  try {
    console.log('Calling executeJavaCode API with params:', { 
      code: params.code?.substring(0, 100) + '...', // Log just first 100 chars of code
      input: params.input 
    });
    const response = await api.post('/tutor/execute-java', params);
    console.log('executeJavaCode API response status:', response.status);
    
    if (!response.data || response.data.error) {
      throw new Error(response.data?.error || 'Invalid response from API');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error in executeJavaCode API call:', error);
    throw error;
  }
};

export const evaluateCode = async (params: {
  code: string;
  topic?: string;
}) => {
  try {
    console.log('Calling evaluateCode API with params:', { 
      code: params.code?.substring(0, 100) + '...', // Log just first 100 chars of code
      topic: params.topic 
    });
    const response = await api.post('/tutor/evaluate-code', params);
    console.log('evaluateCode API response status:', response.status);
    
    if (!response.data || response.data.error) {
      throw new Error(response.data?.error || 'Invalid response from API');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error in evaluateCode API call:', error);
    throw error;
  }
}; 