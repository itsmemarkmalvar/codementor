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
  topic_id?: number;
  session_id?: number;
}) => {
  try {
    // Ensure conversationHistory is an array and convert to the format expected by the API
    const requestParams = {
      question: params.question,
      conversation_history: Array.isArray(params.conversationHistory) ? params.conversationHistory : [],
      preferences: params.preferences,
      topic_id: params.topic_id,
      session_id: params.session_id
    };
    
    console.log('Calling getTutorResponse API with params:', JSON.stringify(requestParams, null, 2));
    const response = await api.post('/tutor/chat', requestParams);
    console.log('getTutorResponse API response:', response.data);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Error in getTutorResponse API call:', error);
    throw error;
  }
};

export const executeJavaCode = async (params: {
  code: string;
  input?: string;
  session_id?: number;
  topic_id?: number;
}) => {
  try {
    console.log('Calling executeJavaCode API with params:', { 
      code: params.code?.substring(0, 100) + '...', // Log just first 100 chars of code
      input: params.input,
      session_id: params.session_id,
      topic_id: params.topic_id
    });
    const response = await api.post('/tutor/execute-code', params);
    console.log('executeJavaCode API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Error in executeJavaCode API call:', error);
    throw error;
  }
};

export const updateProgress = async (params: {
  topic_id: number;
  progress_percentage: number;
  status?: 'not_started' | 'in_progress' | 'completed';
  time_spent_minutes?: number;
  exercises_completed?: number;
  exercises_total?: number;
  completed_subtopics?: string[];
  progress_data?: string;
}) => {
  try {
    // Create a clean object with default values for all parameters
    const cleanParams = {
      topic_id: Number(params.topic_id),
      progress_percentage: Math.round(Number(params.progress_percentage)), // Ensure it's an integer
      status: params.status || 'in_progress',
      time_spent_minutes: Number(params.time_spent_minutes || 0),
      exercises_completed: Number(params.exercises_completed || 0),
      exercises_total: Number(params.exercises_total || 0),
      // Use empty array for completed_subtopics if not provided
      completed_subtopics: '[]', // Always send as a string representation of an array
      progress_data: params.progress_data || null
    };
    
    // Replace the completed_subtopics with JSON string if array is provided
    if (params.completed_subtopics && Array.isArray(params.completed_subtopics)) {
      cleanParams.completed_subtopics = JSON.stringify(params.completed_subtopics);
    }
    
    // Ensure progress_data is a string
    if (cleanParams.progress_data && typeof cleanParams.progress_data !== 'string') {
      cleanParams.progress_data = JSON.stringify(cleanParams.progress_data);
    }
    
    console.log('Sending updateProgress with params:', cleanParams);
    
    // Send request with FormData
    const response = await api.post('/tutor/update-progress', cleanParams);
    console.log('updateProgress API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error('Error in updateProgress API call:', error);
    // Log additional details for 422 errors
    if (error.response && error.response.status === 422) {
      console.error('Validation errors:', error.response.data);
    }
    throw error;
  }
};

// Learning topics API calls
export const getTopics = async () => {
  try {
    const response = await api.get('/topics');
    console.log('getTopics API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Error in getTopics API call:', error);
    throw error;
  }
};

export const getTopicHierarchy = async () => {
  try {
    const response = await api.get('/topics/hierarchy');
    console.log('getTopicHierarchy API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Error in getTopicHierarchy API call:', error);
    throw error;
  }
};

// User Progress API calls
export const getUserProgress = async () => {
  try {
    const response = await api.get('/progress');
    console.log('getUserProgress API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Error in getUserProgress API call:', error);
    return []; // Return empty array instead of throwing to prevent UI errors
  }
};

export const getTopicProgress = async (topicId: number) => {
  try {
    const response = await api.get(`/progress/${topicId}`);
    console.log('getTopicProgress API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error(`Error in getTopicProgress API call for topic ${topicId}:`, error);
    // Return default progress structure instead of throwing
    return {
      topic_id: topicId,
      progress_percentage: 0,
      status: 'not_started',
      time_spent_minutes: 0,
      exercises_completed: 0,
      exercises_total: 0,
      completed_subtopics: [],
      current_streak_days: 0,
      progress_data: {
        interaction: 0,
        code_execution: 0,
        time_spent: 0,
        knowledge_check: 0
      }
    };
  }
}; 