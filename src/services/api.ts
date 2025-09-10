import axios, { InternalAxiosRequestConfig } from 'axios';
import { getToken } from '@/lib/auth-utils';

// Export the resolved API base URL so pages/components can rely on a single
// source of truth with a safe default fallback during development.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Export the shared axios instance to ensure every call uses the same base URL
// and interceptors (auth headers, logging, etc.).
export const api = axios.create({
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
    
    // Improved debugging for authentication issues
    const endpoint = config.url || 'unknown';
    console.log(`API Request to: ${endpoint}`);
    console.log(`Authentication: ${token ? `Token present (${token.substring(0, 10)}...)` : 'NO TOKEN'}`);
    
    if (token && config.headers) {
      // Directly set the Authorization header with proper format
      config.headers.Authorization = `Bearer ${token}`;
      
      // Make sure we always include Content-Type and Accept headers
      config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
      config.headers['Accept'] = config.headers['Accept'] || 'application/json';
      
      console.log('Request headers set:', {
        Authorization: `Bearer ${token.substring(0, 10)}...`,
        'Content-Type': config.headers['Content-Type'],
        'Accept': config.headers['Accept']
      });
    } else if (!token) {
      // Clear auth header if no token exists (to prevent stale headers)
      if (config.headers.Authorization) {
        delete config.headers.Authorization;
        console.warn('Removed stale Authorization header');
      }
      console.warn('No auth token available for request to:', endpoint);
    }
    
    // Ensure CORS credentials are included
    config.withCredentials = true;
    
    return config;
  },
  (error: any) => {
    console.error('API interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    // Log successful response
    console.log(`API Response from ${response.config.url}: Status ${response.status}`);
    return response;
  },
  (error) => {
    // Enhanced error handling
    if (error.response) {
      const { status, config } = error.response;
      console.error(`API Error ${status} for ${config.url}:`, error.response.data);
      
      // Handle authentication errors
      if (status === 401 || status === 403) {
        console.error('Authentication error detected');
        // You could dispatch an action to clear auth state or redirect to login
        // For now, we'll just log it
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
    } else {
      // Something else caused the error
      console.error('API request error:', error.message);
    }
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

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/user');
    return response.data;
  } catch (error: any) {
    console.error('Error getting current user:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  const response = await api.post('/logout');
  return response.data;
};



// AI Tutor related API calls
export const getTutorResponse = async (params: {
  question: string;
  conversationHistory: Array<{role: string; content: string}>;
  preferences: any;
  topic?: string;
  topic_id?: number;
  session_id?: string;
  lesson_context?: string;
  model?: 'together' | 'gemini'; // Add model selection parameter
}) => {
  try {
    // Ensure conversationHistory is an array and convert to the format expected by the API
    const requestParams: any = {
      question: params.question || '',
      conversation_history: Array.isArray(params.conversationHistory) ? params.conversationHistory : [],
      preferences: params.preferences || {}
    };
    
    // Make sure question is a non-empty string
    if (!requestParams.question || typeof requestParams.question !== 'string') {
      requestParams.question = 'Hello';
    }
    
    // Ensure conversation_history items have both role and content as strings
    requestParams.conversation_history = requestParams.conversation_history.map((item: any) => ({
      role: (typeof item.role === 'string' && (item.role === 'user' || item.role === 'assistant')) 
        ? item.role 
        : item.role === 'ai' || item.role === 'bot' 
          ? 'assistant'
          : 'user',
      content: typeof item.content === 'string' ? item.content : String(item.content || '')
    }));
    
    // Only add optional parameters if they exist and are valid
    if (params.topic_id !== undefined && params.topic_id !== null) {
      requestParams.topic_id = Number(params.topic_id);
    }
    if (params.session_id !== undefined && params.session_id !== null) {
      requestParams.session_id = params.session_id;
    }
    if (params.lesson_context && typeof params.lesson_context === 'string') {
      requestParams.lesson_context = params.lesson_context;
    }
    
    // Add model selection if provided
    if (params.model && (params.model === 'together' || params.model === 'gemini')) {
      requestParams.model = params.model;
    }
    
    console.log('Calling getTutorResponse API with params:', { 
      question: requestParams.question,
      conversation_history_length: requestParams.conversation_history?.length || 0,
      topic_id: requestParams.topic_id,
      session_id: requestParams.session_id,
      model: requestParams.model || 'together' // Log which model is being used
    });
    
    // Set a timeout to prevent hanging requests
    const response = await api.post('/tutor/chat', requestParams, {
      timeout: 60000 // 60 second timeout (increased for AI service reliability)
    });
    
    console.log('getTutorResponse API response status:', response.status);
    
    if (!response.data) {
      throw new Error('Empty response from API');
    }
    
    // More comprehensive detection of error/fallback responses
    const isError = response.data.status === 'error';
    const isFallback = 
      response.data.status === 'partial' || 
      (response.data.data && (
        response.data.data.is_fallback === true || 
        response.data.data.fallback === true ||
        (response.data.data.response && (
          response.data.data.response.includes('temporarily unavailable') ||
          response.data.data.response.includes('having trouble') ||
          response.data.data.response.includes('connectivity issues')
        ))
      ));
    
    if (isError) {
      throw new Error(response.data?.message || 'Error response from API');
    }
    
    // Persist last chat message id for attribution (if provided by backend)
    try {
      const messageId = response.data?.data?.message_id || response.data?.data?.id;
      if (typeof window !== 'undefined' && messageId) {
        sessionStorage.setItem('last_chat_message_id', String(messageId));
      }
    } catch {}

    // Add the error and fallback flags to the response data
    return {
      ...response.data.data,
      error: false,
      is_fallback: isFallback,
      fallback: isFallback
    };
  } catch (error: any) {
    console.error('Error in getTutorResponse API call:', error);
    
    // Create a more user-friendly error message
    let errorMessage = 'Failed to get AI tutor response. Please try again.';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API error response:', error.response.data);
      
      if (error.response.status === 500) {
        errorMessage = 'Server error: The AI service is currently unavailable. Please try again later.';
      } else if (error.response.status === 503) {
        errorMessage = 'The AI service is temporarily unavailable. Please try again in a few minutes.';
      } else if (error.response.status === 504) {
        errorMessage = 'The request timed out. The AI service might be overloaded. Please try again in a few minutes.';
      } else if (error.response.status === 206) {
        // 206 Partial Content is used for fallback responses in our API
        errorMessage = error.response.data?.data?.response || 
                      'The AI service is temporarily unavailable. Please try again in a few minutes.';
        
        // Return the actual fallback message from the API if available
        if (error.response.data?.data) {
          return {
            ...error.response.data.data,
            error: false,
            fallback: true,
            is_fallback: true
          };
        }
      } else if (error.response.data && error.response.data.message) {
        errorMessage = `Error: ${error.response.data.message}`;
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      
      // Check if this is a timeout error
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The AI service might be taking too long to respond. Please try again with a simpler query.';
      } else {
        errorMessage = 'Network error: No response from server. Please check your connection.';
      }
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = `Error: ${error.message}`;
    }
    
    // Return a fallback response instead of throwing, allowing the UI to continue functioning
    return {
      response: errorMessage,
      error: true,
      fallback: true,
      is_fallback: true
    };
  }
};

export const getSplitScreenTutorResponse = async (params: {
  question: string;
  conversation_history?: Array<{role: string; content: string}>;
  conversationHistory?: Array<{role: string; content: string}>;
  topic_id?: number;
  session_id?: string;
  preferences?: any;
  lesson_context?: string;
}) => {
  try {
    const requestParams: any = {
      question: params.question,
      conversation_history: params.conversation_history || params.conversationHistory || [],
      preferences: params.preferences || {}
    };
    
    if (params.topic_id !== undefined && params.topic_id !== null) {
      requestParams.topic_id = Number(params.topic_id);
    }
    if (params.session_id !== undefined && params.session_id !== null) {
      requestParams.session_id = params.session_id;
    }
    if (params.lesson_context && typeof params.lesson_context === 'string') {
      requestParams.lesson_context = params.lesson_context;
    }
    
    console.log('Calling getSplitScreenTutorResponse API with params:', { 
      question: requestParams.question,
      conversation_history_length: requestParams.conversation_history?.length || 0,
      topic_id: requestParams.topic_id,
      session_id: requestParams.session_id,
      full_params: requestParams
    });
    
    // Set a timeout to prevent hanging requests
    const response = await api.post('/tutor/split-screen-chat', requestParams, {
      timeout: 120000 // 120 second timeout for split-screen (increased for AI service reliability)
    });
    
    console.log('getSplitScreenTutorResponse API response status:', response.status);
    console.log('getSplitScreenTutorResponse API response data:', response.data);
    
    if (!response.data) {
      throw new Error('Empty response from API');
    }
    
    // Check for error response
    if (response.data.status === 'error') {
      throw new Error(response.data?.message || 'Error response from API');
    }
    
    // Persist last chat message ids for attribution (if provided by backend)
    try {
      const geminiMessageId = response.data?.data?.responses?.gemini?.message_id;
      const togetherMessageId = response.data?.data?.responses?.together?.message_id;
      
      if (typeof window !== 'undefined') {
        if (geminiMessageId) {
          sessionStorage.setItem('last_gemini_message_id', String(geminiMessageId));
        }
        if (togetherMessageId) {
          sessionStorage.setItem('last_together_message_id', String(togetherMessageId));
        }
      }
    } catch {}

    return response.data.data;
  } catch (error: any) {
    console.error('Error in getSplitScreenTutorResponse API call:', error);
    
    // Create a more user-friendly error message
    let errorMessage = 'Failed to get AI tutor responses. Please try again.';
    
    if (error.response) {
      console.error('API error response:', error.response.data);
      
      if (error.response.status === 500) {
        errorMessage = 'Server error: The AI service is currently unavailable. Please try again later.';
      } else if (error.response.status === 503) {
        errorMessage = 'The AI service is temporarily unavailable. Please try again in a few minutes.';
      } else if (error.response.status === 504) {
        errorMessage = 'The request timed out. The AI service might be overloaded. Please try again in a few minutes.';
      } else if (error.response.data && error.response.data.message) {
        errorMessage = `Error: ${error.response.data.message}`;
      } else if (error.response.data && error.response.data.errors) {
        // Handle validation errors
        const validationErrors = Object.values(error.response.data.errors).flat();
        errorMessage = `Validation Error: ${validationErrors.join(', ')}`;
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The AI service might be taking too long to respond. Please try again with a simpler query.';
      } else {
        errorMessage = 'Network error: No response from server. Please check your connection.';
      }
    } else {
      errorMessage = `Error: ${error.message}`;
    }
    
    // Return a fallback response with errors for both models
    return {
      responses: {
        gemini: {
          response: null,
          message_id: null,
          response_time_ms: null,
          error: errorMessage
        },
        together: {
          response: null,
          message_id: null,
          response_time_ms: null,
          error: errorMessage
        }
      },
      session_id: null,
      topic: null,
      error: true,
      fallback: true
    };
  }
};

export const executeJavaCode = async (params: {
  code: string;
  input?: string;
  session_id?: string;
  topic_id?: number;
  conversation_history?: Array<{role: string; content: string}>;
  chat_message_id?: number;
}) => {
  try {
    console.log('Calling executeJavaCode API with params:', { 
      code: params.code?.substring(0, 100) + '...', // Log just first 100 chars of code
      input: params.input,
      session_id: params.session_id,
      topic_id: params.topic_id,
      conversation_history_length: params.conversation_history?.length
    });
    const response = await api.post('/tutor/execute-code', params);
    console.log('executeJavaCode API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error('Error in executeJavaCode API call:', error);
    
    let errorMessage = 'Failed to execute code. Please try again.';
    
    if (error.response) {
      console.error('API error response:', error.response.data);
      
      if (error.response.status === 500) {
        errorMessage = 'Server error: The code execution service is currently unavailable.';
      } else if (error.response.status === 503) {
        errorMessage = 'The code execution service is temporarily unavailable.';
      } else if (error.response.data && error.response.data.message) {
        errorMessage = `Error: ${error.response.data.message}`;
      } else if (error.response.data && error.response.data.errors) {
        // Handle validation errors
        const validationErrors = Object.values(error.response.data.errors).flat();
        errorMessage = `Validation Error: ${validationErrors.join(', ')}`;
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      errorMessage = 'Network error: No response from server. Please check your connection.';
    } else {
      errorMessage = `Error: ${error.message}`;
    }
    
    // Return a fallback response instead of throwing
    return {
      execution: {
        stdout: '',
        stderr: errorMessage,
        success: false,
        executionTime: 0
      },
      feedback: 'There was an error executing your code.',
      error: true,
      fallback: true
    };
  }
};

export const executeJavaProject = async (params: {
  files: Array<{path: string; content: string}>;
  main_class: string;
  input?: string;
  session_id?: string;
  topic_id?: number;
  conversation_history?: Array<{role: string; content: string}>;
  chat_message_id?: number;
}) => {
  try {
    console.log('Calling executeJavaProject API with params:', { 
      files: params.files.map(f => f.path),
      main_class: params.main_class,
      input: params.input,
      session_id: params.session_id,
      topic_id: params.topic_id,
      conversation_history_length: params.conversation_history?.length
    });
    const response = await api.post('/tutor/execute-project', params);
    console.log('executeJavaProject API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error('Error in executeJavaProject API call:', error);
    
    let errorMessage = 'Failed to execute project. Please try again.';
    
    if (error.response) {
      console.error('API error response:', error.response.data);
      
      if (error.response.status === 500) {
        errorMessage = 'Server error: The project execution service is currently unavailable.';
      } else if (error.response.status === 503) {
        errorMessage = 'The project execution service is temporarily unavailable.';
      } else if (error.response.data && error.response.data.message) {
        errorMessage = `Error: ${error.response.data.message}`;
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      errorMessage = 'Network error: No response from server. Please check your connection.';
    } else {
      errorMessage = `Error: ${error.message}`;
    }
    
    // Return a fallback response instead of throwing
    return {
      execution: {
        stdout: '',
        stderr: errorMessage,
        success: false,
        executionTime: 0
      },
      feedback: 'There was an error executing your project.',
      error: true,
      fallback: true
    };
  }
};

export const updateProgress = async (params: {
  topic_id: number;
  // server computes weighted progress; we send only signals
  status?: 'not_started' | 'in_progress' | 'completed';
  time_spent_minutes?: number;
  exercises_completed?: number;
  exercises_total?: number;
  completed_subtopics?: string[];
  progress_data?: Record<string, number>;
}) => {
  try {
    const cleanParams: any = {
      topic_id: Number(params.topic_id),
      status: params.status || 'in_progress',
      time_spent_minutes: Number(params.time_spent_minutes || 0),
      exercises_completed: Number(params.exercises_completed || 0),
      exercises_total: Number(params.exercises_total || 0),
      completed_subtopics: '[]',
    };

    if (params.completed_subtopics && Array.isArray(params.completed_subtopics)) {
      cleanParams.completed_subtopics = JSON.stringify(params.completed_subtopics);
    }

    if (params.progress_data) {
      cleanParams.progress_data = JSON.stringify(params.progress_data);
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

// Consolidated progress summary for dashboard
export const getProgressSummary = async () => {
  try {
    const response = await api.get('/progress/summary');
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    return response.data.data;
  } catch (error) {
    console.error('Error in getProgressSummary API call:', error);
    return null; // Return null so callers can gracefully fallback
  }
};

// =============
// Analytics API
// =============
export const getModelComparison = async (params?: { window?: string; k_runs?: number; lookahead_min?: number; topic_id?: number; difficulty?: string; nmin?: number }) => {
  const query = new URLSearchParams();
  if (params?.window) query.set('window', params.window);
  if (typeof params?.k_runs === 'number') query.set('k_runs', String(params.k_runs));
  if (typeof params?.lookahead_min === 'number') query.set('lookahead_min', String(params.lookahead_min));
  if (typeof params?.topic_id === 'number') query.set('topic_id', String(params.topic_id));
  if (typeof params?.difficulty === 'string' && params.difficulty) query.set('difficulty', params.difficulty);
  if (typeof params?.nmin === 'number') query.set('nmin', String(params.nmin));
  const qs = query.toString();
  const url = `/analytics/models/compare${qs ? `?${qs}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

export const getSplitScreenAnalytics = async (params?: { window?: string }) => {
  const query = new URLSearchParams();
  if (params?.window) query.set('window', params.window);
  const qs = query.toString();
  const url = `/analytics/split-screen${qs ? `?${qs}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

// Health API
export const getPistonHealth = async () => {
  const response = await api.get('/health/piston');
  return response.data as { ok: boolean; status?: number; latency_ms?: number; error?: string };
};

// Judge0 Health
export const getJudge0Health = async () => {
  const response = await api.get('/health/judge0');
  return response.data as { ok: boolean; status?: number; latency_ms?: number; error?: string };
};

// =============
// Session Management API
// =============
export const startSplitScreenSession = async (data: {
  topic_id?: number;
  lesson_id?: number;
  session_type: string;
  ai_models: string[];
}) => {
  const response = await api.post('/sessions/start', data);
  return response.data;
};

export const getActiveSession = async (params?: { lesson_id?: number }) => {
  const response = await api.get('/sessions/active', { params });
  return response.data;
};

export const endSession = async (sessionId: number) => {
  const response = await api.post(`/sessions/${sessionId}/end`);
  return response.data;
};

export const recordUserChoice = async (sessionId: number, data: {
  choice: 'gemini' | 'together' | 'both' | 'neither';
  reason?: string;
  activity_type?: 'quiz' | 'practice' | 'code_execution';
}) => {
  const response = await api.post(`/sessions/${sessionId}/choice`, data);
  return response.data;
};

export const requestClarification = async (sessionId: number, data: {
  request: string;
}) => {
  const response = await api.post(`/sessions/${sessionId}/clarification`, data);
  return response.data;
};

export const incrementEngagement = async (sessionId: number, data?: {
  points?: number;
}) => {
  const response = await api.post(`/sessions/${sessionId}/engagement`, data || {});
  return response.data;
};

export const getThresholdStatus = async (sessionId: number) => {
  const response = await api.get(`/sessions/${sessionId}/threshold-status`);
  return response.data;
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

// Lesson Plan related API calls
export const getLessonPlans = async (topicId?: number) => {
  try {
    console.log("getLessonPlans called with topicId:", topicId);
    
    // If no topicId is provided, we want all lesson plans
    if (!topicId) {
      try {
        console.log("Attempting to fetch all lesson plans via /all-lesson-plans endpoint");
        // First try the debug endpoint
        const response = await api.get('/all-lesson-plans?include_unpublished=true');
        console.log('getLessonPlans (all) API response:', response);
        
        if (response.data && response.data.status !== 'error') {
          console.log("Successful response with data:", response.data.data);
          return response.data.data;
        } else {
          console.warn("API returned an error or unexpected format:", response.data);
        }
      } catch (err) {
        console.error('Error using debug endpoint, falling back to per-topic fetch:', err);
        // If the debug endpoint fails, fall back to getting all topics and all their lesson plans
        const topicsResponse = await api.get('/topics');
        if (!topicsResponse.data || topicsResponse.data.status === 'error') {
          throw new Error('Failed to fetch topics');
        }
        
        const topics = topicsResponse.data.data;
        let allPlans: Array<any> = [];
        
        // For each topic, get its lesson plans
        for (const topic of topics) {
          try {
            console.log(`Fetching lesson plans for topic ${topic.id} (${topic.title})`);
            const plansResponse = await api.get(`/topics/${topic.id}/lesson-plans`);
            if (plansResponse.data && plansResponse.data.status === 'success') {
              console.log(`Found ${plansResponse.data.data.length} lesson plans for topic ${topic.id}`);
              allPlans = [...allPlans, ...plansResponse.data.data];
            }
          } catch (topicError) {
            console.error(`Error fetching plans for topic ${topic.id}:`, topicError);
            // Continue with next topic even if this one fails
          }
        }
        
        console.log("Returning all plans from multiple topics:", allPlans);
        return allPlans;
      }
    }
    
    // If topicId is provided, use the topic-specific endpoint
    console.log(`Fetching lesson plans for specific topic ${topicId}`);
    const response = await api.get(`/topics/${topicId}/lesson-plans?include_unpublished=true`);
    console.log(`getLessonPlans for topic ${topicId} API response:`, response);
    
    if (!response.data || response.data.status === 'error') {
      console.warn("Topic-specific lesson plans API returned an error:", response.data);
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    console.log(`Found ${response.data.data.length} lesson plans for topic ${topicId}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error in getLessonPlans API call:`, error);
    return []; // Return empty array instead of throwing to avoid breaking UI
  }
};

export const getLessonPlanDetails = async (lessonPlanId: number) => {
  try {
    const response = await api.get(`/lesson-plans/${lessonPlanId}?include_unpublished=true`);
    console.log('getLessonPlanDetails API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error(`Error in getLessonPlanDetails API call for plan ${lessonPlanId}:`, error);
    return null;
  }
};

// Lesson/Topic aggregate progress (server-calculated per formulas)
export const getLessonPlanProgress = async (lessonPlanId: number) => {
  try {
    const response = await api.get(`/lesson-plans/${lessonPlanId}/progress`);
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    return response.data.data;
  } catch (error) {
    console.error('Error in getLessonPlanProgress:', error);
    throw error;
  }
};

export const getTopicAggregateProgress = async (topicId: number) => {
  try {
    const response = await api.get(`/topics/${topicId}/progress`);
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    return response.data.data;
  } catch (error) {
    console.error('Error in getTopicAggregateProgress:', error);
    throw error;
  }
};

export const getLessonModules = async (lessonPlanId: number) => {
  try {
    const response = await api.get(`/lesson-plans/${lessonPlanId}/modules?include_unpublished=true`);
    console.log('getLessonModules API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error(`Error in getLessonModules API call for plan ${lessonPlanId}:`, error);
    return [];
  }
};

export const getModuleDetails = async (moduleId: number) => {
  try {
    const response = await api.get(`/modules/${moduleId}`);
    console.log('getModuleDetails API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error(`Error in getModuleDetails API call for module ${moduleId}:`, error);
    return null;
  }
};

export const getLessonExercises = async (moduleId: number) => {
  try {
    const response = await api.get(`/lesson-modules/${moduleId}/exercises`);
    console.log('getLessonExercises API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error(`Error in getLessonExercises API call for module ${moduleId}:`, error);
    return [];
  }
};

export const getRelatedPracticeForModule = async (moduleId: number) => {
  try {
    const response = await api.get(`/lesson-modules/${moduleId}/related-practice`);
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    return response.data.data as Array<{ id:number; title:string; difficulty_level:string; points:number; success_rate:number; topic_tags:string[] }>;
  } catch (error) {
    console.error(`Error in getRelatedPracticeForModule API call for module ${moduleId}:`, error);
    return [];
  }
};

export const getExerciseDetails = async (exerciseId: number) => {
  try {
    const response = await api.get(`/exercises/${exerciseId}`);
    console.log('getExerciseDetails API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error(`Error in getExerciseDetails API call for exercise ${exerciseId}:`, error);
    return null;
  }
};

export const updateModuleProgress = async (moduleId: number, params: {
  status: 'not_started' | 'in_progress' | 'completed';
  time_spent_minutes?: number;
}) => {
  try {
    const response = await api.post(`/lesson-modules/${moduleId}/progress`, params);
    console.log('updateModuleProgress API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Error in updateModuleProgress API call:', error);
    throw error;
  }
};

// Fetch per-lesson (lesson plan) progress including overall_percentage and module breakdown
// duplicate removed: getLessonPlanProgress is defined earlier

export const submitExerciseAttempt = async (exerciseId: number, params: {
  code?: string;
  answer?: string;
  is_correct?: boolean;
  points_earned?: number;
  time_spent_seconds?: number;
}) => {
  try {
    const response = await api.post(`/lesson-exercises/${exerciseId}/attempts`, params);
    console.log('submitExerciseAttempt API response status:', response.status);
    
    if (!response.data || response.data.status === 'error') {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Error in submitExerciseAttempt API call:', error);
    throw error;
  }
};

/**
 * Get AI tutor analysis of quiz results
 */
export const analyzeQuizResults = async (data: {
  topic_id?: number;
  quiz_id?: number;
  module_id?: number;
}) => {
  try {
    const response = await axios.post(`${API_URL}/tutor/analyze-quiz-results`, data);
    return response.data;
  } catch (error) {
    console.error('Error analyzing quiz results:', error);
    throw error;
  }
};

// Heartbeat: accrue time and recompute progress on the server
export const heartbeat = async (params: { topic_id: number; minutes_increment?: number }) => {
  try {
    const response = await api.post('/tutor/heartbeat', {
      topic_id: Number(params.topic_id),
      minutes_increment: Number(params.minutes_increment || 1),
    });
    return response.data?.data;
  } catch (error) {
    console.error('Error sending heartbeat:', error);
    throw error;
  }
};

// =====================
// Quiz API (protected)
// =====================
export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question_text: string;
  type: string;
  options?: any;
  code_snippet?: string | null;
  points?: number;
}

export interface LessonQuiz {
  id: number;
  module_id: number;
  title: string;
  description?: string;
  passing_score_percent?: number;
  order_index?: number;
}

export const getQuiz = async (quizId: number): Promise<{ quiz: LessonQuiz & { questions: QuizQuestion[] } }> => {
  const response = await api.get(`/quizzes/${quizId}`);
  return response.data;
};

export const getModuleQuizzes = async (moduleId: number): Promise<{ quizzes: LessonQuiz[] }> => {
  const response = await api.get(`/modules/${moduleId}/quizzes`);
  return response.data;
};

// Get quizzes for a specific lesson
export const getLessonQuizzes = async (lessonId: number): Promise<LessonQuiz[]> => {
  try {
    // First get the lesson plan to find its modules
    const lessonResponse = await api.get(`/lesson-plans/${lessonId}`);
    if (!lessonResponse.data || lessonResponse.data.status === 'error') {
      throw new Error('Failed to fetch lesson plan');
    }
    
    const lesson = lessonResponse.data.data;
    const modules = lesson.modules || [];
    
    // Get quizzes from all modules in this lesson
    let allQuizzes: LessonQuiz[] = [];
    for (const module of modules) {
      try {
        const quizzesResponse = await getModuleQuizzes(module.id);
        if (quizzesResponse.quizzes) {
          allQuizzes = [...allQuizzes, ...quizzesResponse.quizzes];
        }
      } catch (error) {
        console.warn(`Failed to fetch quizzes for module ${module.id}:`, error);
      }
    }
    
    return allQuizzes;
  } catch (error) {
    console.error('Error fetching lesson quizzes:', error);
    return [];
  }
};

// Get practice problems for a specific lesson
export const getLessonPracticeProblems = async (lessonId: number): Promise<any[]> => {
  try {
    // First get the lesson plan to find its modules
    const lessonResponse = await api.get(`/lesson-plans/${lessonId}`);
    if (!lessonResponse.data || lessonResponse.data.status === 'error') {
      throw new Error('Failed to fetch lesson plan');
    }
    
    const lesson = lessonResponse.data.data;
    const modules = lesson.modules || [];
    
    // Get practice problems from all modules in this lesson
    let allProblems: any[] = [];
    for (const module of modules) {
      try {
        const problemsResponse = await api.get(`/lesson-modules/${module.id}/related-practice`);
        if (problemsResponse.data && problemsResponse.data.status === 'success') {
          allProblems = [...allProblems, ...problemsResponse.data.data];
        }
      } catch (error) {
        console.warn(`Failed to fetch practice problems for module ${module.id}:`, error);
      }
    }
    
    return allProblems;
  } catch (error) {
    console.error('Error fetching lesson practice problems:', error);
    return [];
  }
};

// Get topic ID for a lesson
export const getLessonTopicId = async (lessonId: number): Promise<number | null> => {
  try {
    const lessonResponse = await api.get(`/lesson-plans/${lessonId}`);
    if (!lessonResponse.data || lessonResponse.data.status === 'error') {
      throw new Error('Failed to fetch lesson plan');
    }
    
    const lesson = lessonResponse.data.data;
    return lesson.topic_id || null;
  } catch (error) {
    console.error('Error fetching lesson topic ID:', error);
    return null;
  }
};

export const startQuizAttempt = async (quizId: number): Promise<{ attempt: any; message?: string }> => {
  // Attach last chat message id if available
  let payload: any = {};
  try {
    const lastChatId = typeof window !== 'undefined' ? Number(sessionStorage.getItem('last_chat_message_id')) : undefined;
    if (lastChatId) payload.chat_message_id = lastChatId;
  } catch {}
  const response = await api.post(`/quizzes/${quizId}/attempt`, payload);
  return response.data;
};

export const submitQuizAttempt = async (
  attemptId: number,
  data: { responses: Record<number, any>; time_spent_seconds?: number }
): Promise<{ attempt: any; score: number; percentage: number; passed: boolean }> => {
  const response = await api.post(`/quiz-attempts/${attemptId}/submit`, data);
  return response.data;
};

export const getQuizAttempt = async (attemptId: number): Promise<{ attempt: any }> => {
  const response = await api.get(`/quiz-attempts/${attemptId}`);
  return response.data;
};

export const getUserQuizzes = async (): Promise<{ attempts: any[] }> => {
  const response = await api.get(`/users/quizzes`);
  return response.data;
};

// Project Management API calls
export interface ProjectFile {
  id?: string | number;
  name: string;
  path: string;
  content?: string;
  is_directory: boolean;
  language?: string;
  parent_path?: string;
}

export interface Project {
  id?: string | number;
  name: string;
  description?: string;
  main_file_id?: string;
  files: ProjectFile[];
  metadata?: any;
}

/**
 * Get all projects
 */
export const getProjects = async () => {
  try {
    console.log('Fetching projects with files...');
    
    // Check if token exists
    const token = getToken();
    if (!token) {
      console.error('No authentication token found!');
      throw new Error('Authentication required. Please log in.');
    }

    // Force adding token to headers manually
    const response = await api.get('/projects', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      params: {
        include_files: true  // Request to include file counts in the response
      }
    });
    
    console.log('getProjects API response status:', response.status);
    console.log('Projects response data:', response.data);
    
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    // Ensure each project has a files array
    const projectsWithFiles = response.data.data.map((project: any) => ({
      ...project,
      files: Array.isArray(project.files) ? project.files : []
    }));
    
    console.log('Projects with files:', projectsWithFiles);
    return projectsWithFiles;
  } catch (error) {
    console.error('Error in getProjects API call:', error);
    throw error;
  }
};

/**
 * Get a specific project by ID
 */
export const getProject = async (projectId: string | number) => {
  try {
    console.log(`Attempting to get project with ID: ${projectId}`);
    
    // Check if token exists
    const token = getToken();
    if (!token) {
      console.error('No authentication token found!');
      throw new Error('Authentication required. Please log in.');
    }

    // Force adding token to headers manually
    const response = await api.get(`/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    
    console.log('getProject API response status:', response.status);
    console.log('getProject API response data:', response.data);
    
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    // Ensure the project has a files array and file_count
    const project = response.data.data;
    if (!project.files) {
      project.files = [];
    }
    
    // Add file_count property
    project.file_count = project.files.length;
    
    console.log(`Project loaded with ${project.file_count} files`);
    return project;
  } catch (error: any) {
    console.error(`Error in getProject API call for project ${projectId}:`, error);
    console.error('Request details:', {
      url: `/projects/${projectId}`,
      error: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response'
    });
    throw error;
  }
};

/**
 * Create a new project
 */
export const createProject = async (project: Project) => {
  try {
    console.log('Attempting to create new project:', project.name);
    console.log('Project data being sent:', JSON.stringify(project, null, 2));
    console.log('Files count:', project.files.length);
    
    // Check if token exists
    const token = getToken();
    if (!token) {
      console.error('No authentication token found!');
      throw new Error('Authentication required. Please log in.');
    }

    // Force adding token to headers manually and ensure correct Content-Type
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    console.log('Sending request with headers:', {
      Authorization: headers.Authorization.substring(0, 20) + '...',
      'Content-Type': headers['Content-Type'],
      'Accept': headers.Accept
    });
    
    const response = await axios.post(`${API_URL}/projects`, project, {
      headers: headers,
      withCredentials: true  // Ensure cookies are sent with the request
    });
    
    console.log('createProject API response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error('Error in createProject API call:', error);
    console.error('Request details:', {
      url: '/projects',
      projectData: project,
      error: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response'
    });
    throw error;
  }
};

/**
 * Update an existing project
 */
export const updateProject = async (projectId: string | number, project: Partial<Project>) => {
  try {
    console.log(`Attempting to update project with ID: ${projectId}`, project);
    
    // Check if token exists
    const token = getToken();
    if (!token) {
      console.error('No authentication token found!');
      throw new Error('Authentication required. Please log in.');
    }

    // Force adding token to headers manually
    const response = await api.put(`/projects/${projectId}`, project, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    
    console.log('updateProject API response status:', response.status);
    
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error(`Error in updateProject API call for project ${projectId}:`, error);
    console.error('Request details:', {
      url: `/projects/${projectId}`,
      projectData: project,
      error: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response'
    });
    throw error;
  }
};

/**
 * Delete a project
 */
export const deleteProject = async (projectId: string | number) => {
  try {
    const response = await api.delete(`/projects/${projectId}`);
    console.log('deleteProject API response status:', response.status);
    
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error in deleteProject API call for project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Add a file to a project
 */
export const addProjectFile = async (projectId: string | number, file: ProjectFile) => {
  try {
    const response = await api.post(`/projects/${projectId}/files`, file);
    console.log('addProjectFile API response status:', response.status);
    
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error(`Error in addProjectFile API call for project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Update a file in a project
 */
export const updateProjectFile = async (projectId: string | number, fileId: string | number, file: Partial<ProjectFile>) => {
  try {
    const response = await api.put(`/projects/${projectId}/files/${fileId}`, file);
    console.log('updateProjectFile API response status:', response.status);
    
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error(`Error in updateProjectFile API call for file ${fileId} in project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Delete a file from a project
 */
export const deleteProjectFile = async (projectId: string | number, fileId: string | number) => {
  try {
    const response = await api.delete(`/projects/${projectId}/files/${fileId}`);
    console.log('deleteProjectFile API response status:', response.status);
    
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error in deleteProjectFile API call for file ${fileId} in project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Export a project as a ZIP file
 */
export const exportProject = async (projectId: string | number) => {
  try {
    // Use a direct URL for downloading the file
    window.location.href = `${API_URL}/projects/${projectId}/export`;
    return true;
  } catch (error) {
    console.error(`Error in exportProject API call for project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Import a project from a ZIP file
 */
export const importProject = async (name: string, description: string, zipFile: File) => {
  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description || '');
    formData.append('zip_file', zipFile);
    
    const response = await api.post('/projects/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('importProject API response status:', response.status);
    
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Error in importProject API call:', error);
    throw error;
  }
};

/**
 * Test update for a project (bypasses auth)
 * ONLY FOR TESTING - REMOVE IN PRODUCTION
 */
export const testUpdateProject = async (projectId: string | number, project: Partial<Project>) => {
  try {
    console.log(`Attempting to update project with test route. ID: ${projectId}`, project);
    
    const response = await api.put(`/test-projects/${projectId}`, project);
    
    console.log('testUpdateProject API response status:', response.status);
    
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error(`Error in testUpdateProject API call for project ${projectId}:`, error);
    console.error('Request details:', {
      url: `/test-projects/${projectId}`,
      projectData: project,
      error: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response'
    });
    throw error;
  }
};

/**
 * Debug function to test creating a project with minimal data
 */
export const createTestProject = async () => {
  try {
    // Create a minimal test project with just a main file
    const testProject = {
      name: 'Test Project ' + new Date().toISOString(),
      description: 'Test project created via debug function',
      main_file_id: 'main_file',
      files: [
        {
          name: 'Root',
          path: '/',
          content: null,
          is_directory: true,
          language: null,
          parent_path: null
        },
        {
          name: 'src',
          path: '/src',
          content: null,
          is_directory: true,
          language: null,
          parent_path: '/'
        },
        {
          name: 'Main.java',
          path: '/src/Main.java',
          content: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, Java!");\n  }\n}',
          is_directory: false,
          language: 'java',
          parent_path: '/src'
        }
      ]
    };

    console.log('Sending test project with direct API call:', testProject);

    // Use the non-authenticated test route
    const response = await axios.post(`${API_URL}/test-projects`, testProject, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    
    console.log('Test project creation response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Error creating test project:', error);
    throw error;
  }
};

/**
 * Test authentication status
 */
export const testAuthentication = async (): Promise<Record<string, any>> => {
  try {
    console.log('Testing authentication with backend...');
    
    // Get the current token
    const token = getToken();
    console.log(`Current token: ${token ? token.substring(0, 15) + '...' : 'None'}`);
    
    // Create request with manual auth header to test
    const config = {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true
    };
    
    console.log('Making test request with headers:', config.headers);
    
    const response = await axios.get(`${API_URL}/test-auth`, config);
    
    console.log('Authentication test response:', response.data);
    
    return {
      success: true,
      data: response.data,
      token_status: token ? 'present' : 'missing',
      auth_status: response.data.is_authenticated ? 'authenticated' : 'not authenticated'
    };
  } catch (error: any) {
    console.error('Authentication test failed:', error);
    return {
      success: false,
      error: error.message,
      response: error.response?.data || null,
      token_status: getToken() ? 'present' : 'missing'
    };
  }
};

// Add to window for console debugging
if (typeof window !== 'undefined') {
  (window as any).testAuth = testAuthentication;
} 

// =============
// Ratings API
// =============
export const rateMessage = async (messageId: number, rating: number) => {
  const response = await api.post(`/messages/${messageId}/rate`, { rating });
  return response.data;
};

// =============
// Analytics API
// =============
export const getAIPreferenceAnalytics = async (params: {
  window?: string;
  topic_id?: number;
  difficulty?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params.window) queryParams.append('window', params.window);
  if (params.topic_id) queryParams.append('topic_id', params.topic_id.toString());
  if (params.difficulty) queryParams.append('difficulty', params.difficulty);
  
  const response = await api.get(`/analytics/ai-preferences?${queryParams.toString()}`);
  return response.data;
};

// =============
// AI Preference Logs API
// =============
export const createAIPreferenceLog = async (data: {
  practice_attempt_id?: number;
  session_id?: number;
  chosen_ai: string;
  choice_reason?: string;
  interaction_type: string;
  topic_id?: number;
  difficulty_level?: string;
  performance_score?: number;
  success_rate?: number;
  time_spent_seconds?: number;
  attempt_count?: number;
  context_data?: any;
}) => {
  const response = await api.post('/ai-preference-logs', data);
  return response.data;
};

export const getUserAIPreferences = async (params: {
  window?: string;
  interaction_type?: string;
  topic_id?: number;
}) => {
  const queryParams = new URLSearchParams();
  if (params.window) queryParams.append('window', params.window);
  if (params.interaction_type) queryParams.append('interaction_type', params.interaction_type);
  if (params.topic_id) queryParams.append('topic_id', params.topic_id.toString());
  
  const response = await api.get(`/ai-preference-logs?${queryParams.toString()}`);
  return response.data;
};

// =============
// Preserved Session API
// =============

export const getActivePreservedSession = async (userId: string) => {
  try {
    const response = await api.get(`/preserved-sessions/active/${userId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error getting active preserved session:', error);
    throw error;
  }
};

export const getActivePreservedSessionByLesson = async (userId: string, lessonId: number) => {
  try {
    const response = await api.get(`/preserved-sessions/active/${userId}/lesson/${lessonId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error getting active preserved session by lesson:', error);
    throw error;
  }
};

export const reactivatePreservedSession = async (sessionId: string) => {
  try {
    const response = await api.post(`/preserved-sessions/reactivate/${sessionId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error reactivating preserved session:', error);
    throw error;
  }
};

export const deactivatePreservedSession = async (sessionId: string) => {
  try {
    const response = await api.post(`/preserved-sessions/deactivate/${sessionId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error deactivating preserved session:', error);
    throw error;
  }
};

export const deletePreservedSession = async (sessionId: string) => {
  try {
    const response = await api.delete(`/preserved-sessions/${sessionId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error deleting preserved session:', error);
    throw error;
  }
};

export const getUserSessionHistory = async (userId: string) => {
  try {
    const response = await api.get(`/preserved-sessions/user/${userId}/history`);
    return response.data;
  } catch (error: any) {
    console.error('Error getting user session history:', error);
    throw error;
  }
};

export const updateConversationHistory = async (sessionId: string, conversationHistory: any[]) => {
  try {
    const response = await api.put(`/preserved-sessions/${sessionId}/conversation`, {
      conversation_history: conversationHistory
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating conversation history:', error);
    throw error;
  }
};

export const updateSessionMetadata = async (sessionId: string, metadata: {
  engagement_data?: any;
  topic_data?: any;
  lesson_data?: any;
  user_preferences?: any;
}) => {
  try {
    console.log('updateSessionMetadata API call:', { sessionId, metadata });
    const response = await api.put(`/preserved-sessions/${sessionId}/metadata`, metadata);
    console.log('updateSessionMetadata API response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating session metadata:', error);
    throw error;
  }
};