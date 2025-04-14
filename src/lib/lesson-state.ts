/**
 * Lesson State Management
 * 
 * This module provides utilities for tracking the user's progress through lesson plans
 * and generating appropriate prompts for the AI tutor.
 */

// Define the learning phases that a user can be in for a given lesson
export type LearningPhase = 
  | 'introduction' // Initial explanation of the topic
  | 'content'      // Presenting the main content 
  | 'practice'     // Working through exercises
  | 'review'       // Summarizing key points
  | 'assessment';  // Testing understanding

// Interface for tracking lesson state
export interface LessonState {
  planId: number;
  planTitle: string;
  currentModuleIndex: number;
  currentExerciseIndex: number;
  phase: LearningPhase;
  completedSections: string[];
  totalModules: number;
  totalExercises: number;
}

// Initialize a new lesson state
export function initLessonState(
  planId: number, 
  planTitle: string,
  totalModules: number,
  totalExercises: number
): LessonState {
  return {
    planId,
    planTitle,
    currentModuleIndex: 0,
    currentExerciseIndex: -1, // -1 means no exercise selected yet
    phase: 'introduction',
    completedSections: [],
    totalModules,
    totalExercises
  };
}

// Advance to the next phase within the current module/exercise
export function nextPhase(state: LessonState): LessonState {
  const phaseOrder: LearningPhase[] = ['introduction', 'content', 'practice', 'review', 'assessment'];
  const currentIndex = phaseOrder.indexOf(state.phase);
  
  // If we're at the last phase, move to the next module
  if (currentIndex === phaseOrder.length - 1) {
    return nextModule(state);
  }
  
  // Otherwise, advance to the next phase
  const newState = {...state};
  newState.phase = phaseOrder[currentIndex + 1];
  
  // Skip practice phase if no exercises available
  if (newState.phase === 'practice' && state.currentExerciseIndex === -1) {
    newState.phase = 'review';
  }
  
  return newState;
}

// Move to the next module
export function nextModule(state: LessonState): LessonState {
  if (state.currentModuleIndex >= state.totalModules - 1) {
    // Already at last module, just return the same state
    return state;
  }
  
  const newState = {...state};
  newState.currentModuleIndex += 1;
  newState.currentExerciseIndex = -1; // Reset exercise index
  newState.phase = 'introduction'; // Reset phase to introduction
  
  const completedSection = `module_${state.currentModuleIndex}`;
  if (!newState.completedSections.includes(completedSection)) {
    newState.completedSections.push(completedSection);
  }
  
  return newState;
}

// Move to a specific exercise
export function selectExercise(state: LessonState, exerciseIndex: number): LessonState {
  const newState = {...state};
  newState.currentExerciseIndex = exerciseIndex;
  
  // If we're already in practice phase, keep it, otherwise move to practice
  if (newState.phase !== 'practice') {
    newState.phase = 'practice';
  }
  
  return newState;
}

// Mark the current exercise as completed
export function completeCurrentExercise(state: LessonState): LessonState {
  if (state.currentExerciseIndex === -1) {
    return state; // No exercise selected
  }
  
  const newState = {...state};
  const completedExercise = `module_${state.currentModuleIndex}_exercise_${state.currentExerciseIndex}`;
  
  if (!newState.completedSections.includes(completedExercise)) {
    newState.completedSections.push(completedExercise);
  }
  
  return newState;
}

// Get the progress percentage through the lesson plan
export function getLessonProgress(state: LessonState): number {
  // Calculate proportion of modules completed
  const moduleProgress = state.currentModuleIndex / state.totalModules;
  
  // Calculate phase progress within current module
  const phaseOrder: LearningPhase[] = ['introduction', 'content', 'practice', 'review', 'assessment'];
  const phaseProgress = phaseOrder.indexOf(state.phase) / phaseOrder.length;
  
  // Combine module and phase progress
  const moduleWeight = 1 / state.totalModules;
  const progress = (moduleProgress * (state.totalModules - 1) / state.totalModules) + 
                  (phaseProgress * moduleWeight);
  
  // Convert to percentage and ensure it's between 0-100
  return Math.min(100, Math.max(0, Math.round(progress * 100)));
} 