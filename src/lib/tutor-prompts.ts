/**
 * Tutor Prompt Generation
 * 
 * This module generates appropriate prompts for the AI tutor based on the current lesson state.
 */

import { LessonState, LearningPhase } from "./lesson-state";

interface Module {
  id: number;
  title: string;
  description: string;
  content: string;
  examples: string;
  key_points: string | string[];
  teaching_strategy?: string | string[];
}

interface Exercise {
  id: number;
  title: string;
  type: string;
  description: string;
  instructions: string;
  starter_code: string;
  solution: string | string[];
  hints: string[];
}

interface LessonPlan {
  id: number;
  title: string;
  description: string;
  learning_objectives: string;
  prerequisites: string;
}

/**
 * Generate a contextual prompt for the AI tutor based on the current learning phase.
 */
export function generateTutorPrompt(
  state: LessonState,
  lessonPlan: LessonPlan,
  currentModule: Module,
  exercises: Exercise[] = [],
  userQuestion?: string
): string {
  // Core context about what we're learning
  let prompt = `You are teaching the "${lessonPlan.title}" lesson plan to a student.
The current module is "${currentModule.title}".
Learning phase: ${state.phase}.
${lessonPlan.learning_objectives ? `Learning objectives: ${lessonPlan.learning_objectives}` : ''}

`;

  // Add phase-specific prompts
  switch (state.phase) {
    case 'introduction':
      prompt += generateIntroductionPrompt(lessonPlan, currentModule);
      break;
    case 'content':
      prompt += generateContentPrompt(currentModule);
      break;
    case 'practice':
      prompt += generatePracticePrompt(currentModule, exercises, state.currentExerciseIndex);
      break;
    case 'review':
      prompt += generateReviewPrompt(currentModule);
      break;
    case 'assessment':
      prompt += generateAssessmentPrompt(currentModule);
      break;
  }
  
  // Add instruction on how to handle user's specific question
  if (userQuestion) {
    prompt += `\nThe student has asked: "${userQuestion}"\n`;
    prompt += "Address their specific question first, then continue with the learning phase.\n";
  }
  
  // Add progress tracking instruction
  prompt += `\nProgress tracking: The student has completed ${state.completedSections.length} sections out of a total of ${state.totalModules * 5} (estimated).`;
  
  return prompt;
}

/**
 * Generate a prompt for the introduction phase
 */
function generateIntroductionPrompt(lessonPlan: LessonPlan, module: Module): string {
  return `
You are now introducing the module "${module.title}" which is part of the ${lessonPlan.title} lesson plan.

Your task:
1. Introduce the module with enthusiasm and clarity
2. Explain why this module is important and how it builds on previous knowledge
3. Outline what the student will learn in this module
4. Highlight how these skills will be useful in real-world scenarios
5. Ask if the student is ready to proceed with the core content

Keep your introduction concise and engaging. End with a clear question asking if they're ready to continue.
`;
}

/**
 * Generate a prompt for the content phase
 */
function generateContentPrompt(module: Module): string {
  // Format key points if they're in array format
  const keyPoints = Array.isArray(module.key_points) 
    ? module.key_points.map(p => `- ${p}`).join('\n')
    : module.key_points;

  return `
You are now teaching the core content of "${module.title}".

Module content:
${module.content}

Examples to include:
${module.examples}

Key points to emphasize:
${keyPoints}

Your task:
1. Present the content clearly and in a structured manner
2. Use the examples provided to illustrate concepts
3. Explain each key point thoroughly
4. Relate concepts to things the student already knows
5. Check for understanding with simple questions
6. At the end, ask if they're ready for practice or have questions

Split your content delivery into logical parts. Use code examples to illustrate concepts.
`;
}

/**
 * Generate a prompt for the practice phase
 */
function generatePracticePrompt(module: Module, exercises: Exercise[], currentExerciseIndex: number): string {
  if (exercises.length === 0 || currentExerciseIndex === -1) {
    return `
This module doesn't have specific exercises. Create a simple interactive practice activity based on:
"${module.title}"

Your task:
1. Design a small coding challenge related to the module content
2. Present it clearly with sample input/output if applicable
3. Provide starter code for the student
4. Guide the student through the solution if they struggle
5. Give positive feedback when they complete it

Make the practice engaging and achievable to build confidence.
`;
  }
  
  const exercise = exercises[currentExerciseIndex];
  
  return `
You are guiding the student through Exercise: "${exercise.title}" (${exercise.type}).

Exercise instructions:
${exercise.instructions}

Starter code:
\`\`\`java
${exercise.starter_code}
\`\`\`

Available hints:
${exercise.hints.map((h, i) => `${i+1}. ${h}`).join('\n')}

Your task:
1. Guide the student through the exercise without giving away the solution immediately
2. Encourage them to try solving it first
3. Provide hints when they struggle, starting with the most general ones
4. Check their code submissions for correctness and give feedback
5. If they solve it correctly, congratulate them and explain why their solution works
6. If they continue to struggle after multiple hints, provide a simplified version of the solution

Remember to maintain a supportive tone and praise partial progress.
`;
}

/**
 * Generate a prompt for the review phase
 */
function generateReviewPrompt(module: Module): string {
  // Format key points if they're in array format
  const keyPoints = Array.isArray(module.key_points) 
    ? module.key_points.map(p => `- ${p}`).join('\n')
    : module.key_points;

  return `
You are now reviewing the key concepts from "${module.title}".

Key points to review:
${keyPoints}

Your task:
1. Summarize the most important concepts from the module
2. Highlight common misconceptions or mistakes
3. Reinforce the practical applications of what they've learned
4. Connect this module to the broader lesson plan
5. Ask reflective questions about what they've learned
6. Check if they feel ready for an assessment

Keep your review concise but comprehensive. Focus on solidifying understanding, not introducing new concepts.
`;
}

/**
 * Generate a prompt for the assessment phase
 */
function generateAssessmentPrompt(module: Module): string {
  return `
You are now assessing the student's understanding of "${module.title}".

Your task:
1. Create 3-5 targeted questions that test understanding of the key concepts
2. Mix question types (multiple choice, short answer, code completion)
3. Provide immediate feedback after each answer
4. Adjust difficulty based on their performance
5. Summarize their strengths and areas for improvement at the end
6. Recommend what to review if needed before moving to the next module

The assessment should be challenging but fair. Focus on conceptual understanding, not memorization.
`;
}

/**
 * Generate a prompt for error feedback in code exercises
 */
export function generateCodeFeedbackPrompt(
  exercise: Exercise,
  studentCode: string,
  errors: string,
  output: string
): string {
  return `
You are helping a student debug their code for exercise "${exercise.title}".

Exercise instructions:
${exercise.instructions}

Student code:
\`\`\`java
${studentCode}
\`\`\`

Execution result:
\`\`\`
${output}
\`\`\`

Errors:
\`\`\`
${errors}
\`\`\`

Your task:
1. Identify the specific issue in the student's code
2. Explain what caused the error in simple terms
3. Guide them toward a solution without giving the full answer
4. Relate the error to a concept they've learned
5. Encourage them to try again

Be encouraging and supportive. Focus on teaching problem-solving, not just fixing the specific bug.
`;
} 