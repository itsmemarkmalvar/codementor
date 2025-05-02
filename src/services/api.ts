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
    
    // Debug log for auth issues
    console.log(`API Request to: ${config.url}, Authentication:`, token ? 'Token present' : 'NO TOKEN');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      // Make sure we always include Content-Type and Accept headers
      config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
      config.headers['Accept'] = config.headers['Accept'] || 'application/json';
    }
    return config;
  },
  (error: any) => {
    console.error('API interceptor error:', error);
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
  lesson_context?: string;
}) => {
  try {
    // Ensure conversationHistory is an array and convert to the format expected by the API
    const requestParams: any = {
      question: params.question,
      conversation_history: Array.isArray(params.conversationHistory) ? params.conversationHistory : [],
      preferences: params.preferences
    };
    
    // Only add optional parameters if they exist
    if (params.topic_id !== undefined) requestParams.topic_id = params.topic_id;
    if (params.session_id !== undefined) requestParams.session_id = params.session_id;
    if (params.lesson_context) requestParams.lesson_context = params.lesson_context;
    
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
  conversation_history?: Array<{role: string; content: string}>;
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
  } catch (error) {
    console.error('Error in executeJavaCode API call:', error);
    throw error;
  }
};

export const executeJavaProject = async (params: {
  files: Array<{path: string; content: string}>;
  main_class: string;
  input?: string;
  session_id?: number;
  topic_id?: number;
  conversation_history?: Array<{role: string; content: string}>;
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
  } catch (error) {
    console.error('Error in executeJavaProject API call:', error);
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

// Lesson Plan related API calls
export const getLessonPlans = async (topicId?: number) => {
  try {
    console.log("getLessonPlans called with topicId:", topicId);
    
    // If no topicId is provided, we want all lesson plans
    if (!topicId) {
      try {
        console.log("Attempting to fetch all lesson plans via /all-lesson-plans endpoint");
        // First try the debug endpoint
        const response = await api.get('/all-lesson-plans');
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
    const response = await api.get(`/topics/${topicId}/lesson-plans`);
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
    const response = await api.get(`/lesson-plans/${lessonPlanId}`);
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

export const getLessonModules = async (lessonPlanId: number) => {
  try {
    const response = await api.get(`/lesson-plans/${lessonPlanId}/modules`);
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
    const response = await api.get('/projects');
    console.log('getProjects API response status:', response.status);
    
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
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
    
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.message || 'Invalid response from API');
    }
    
    return response.data.data;
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
    
    // Check if token exists
    const token = getToken();
    if (!token) {
      console.error('No authentication token found!');
      throw new Error('Authentication required. Please log in.');
    }

    // Force adding token to headers manually
    const response = await api.post('/projects', project, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    
    console.log('createProject API response status:', response.status);
    
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