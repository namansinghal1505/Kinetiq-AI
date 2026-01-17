/**
 * Agent Integration Utilities
 * Helper functions to add AI agent features to existing screens
 * WITHOUT touching core workout/skeleton logic
 */

import { getOnDemandAgent, AgentType } from './OnDemandAgentService';

/**
 * Get form feedback from Workout Form Coach
 * Use in LiveWorkoutScreen to provide instant corrections
 */
export const getFormFeedback = async (params: {
  exercise: string;
  poseScore: number;
  detectedIssues: string[];
  repCount?: number;
}): Promise<string> => {
  try {
    const agent = getOnDemandAgent();
    const context = {
      exercise: params.exercise,
      score: params.poseScore,
      issues: params.detectedIssues.join(', '),
      reps: params.repCount || 0,
    };

    const result = await agent.sendMessage(
      'workout-form-coach',
      'Provide quick form correction based on detected issues',
      context
    );

    return result.success ? result.answer : '';
  } catch (error) {
    console.error('Form feedback error:', error);
    return '';
  }
};

/**
 * Get exercise modifications
 * Use when user struggles with an exercise
 */
export const getExerciseModifications = async (params: {
  exercise: string;
  difficulty: 'easier' | 'harder';
  reason?: string;
}): Promise<string> => {
  try {
    const agent = getOnDemandAgent();
    const message = `Suggest ${params.difficulty} variations of ${params.exercise}${
      params.reason ? ` because: ${params.reason}` : ''
    }`;

    const result = await agent.sendMessage(
      'exercise-modification-specialist',
      message
    );

    return result.success ? result.answer : '';
  } catch (error) {
    console.error('Modification error:', error);
    return '';
  }
};

/**
 * Get motivation message based on streak/progress
 * Use in SessionSummaryScreen or HomeScreen
 */
export const getMotivationMessage = async (params: {
  streakDays: number;
  totalWorkouts: number;
  lastWorkoutQuality?: 'excellent' | 'good' | 'needs-improvement';
  missedDays?: number;
}): Promise<string> => {
  try {
    const agent = getOnDemandAgent();
    const context = {
      streak: params.streakDays,
      workouts: params.totalWorkouts,
      quality: params.lastWorkoutQuality || 'good',
      missed: params.missedDays || 0,
    };

    const result = await agent.sendMessage(
      'motivation-coach',
      'Give encouraging message based on user progress',
      context
    );

    return result.success ? result.answer : '🎉 Great work! Keep it up!';
  } catch (error) {
    console.error('Motivation error:', error);
    return '💪 You\'re doing great! Keep pushing forward!';
  }
};

/**
 * Analyze workout progress
 * Use in SessionSummaryScreen or HistoryScreen
 */
export const analyzeProgress = async (params: {
  recentScores: number[];
  exerciseType: string;
  timeframe: string;
}): Promise<string> => {
  try {
    const agent = getOnDemandAgent();
    const context = {
      scores: params.recentScores,
      exercise: params.exerciseType,
      period: params.timeframe,
      average: params.recentScores.reduce((a, b) => a + b, 0) / params.recentScores.length,
    };

    const result = await agent.sendMessage(
      'progress-analyzer',
      'Analyze progress trends and provide insights',
      context
    );

    return result.success ? result.answer : '';
  } catch (error) {
    console.error('Progress analysis error:', error);
    return '';
  }
};

/**
 * Get injury prevention advice
 * Use when user reports discomfort or shows risky patterns
 */
export const getInjuryPreventionAdvice = async (params: {
  exercise: string;
  issueDescription: string;
  frequency: 'once' | 'occasional' | 'frequent';
}): Promise<string> => {
  try {
    const agent = getOnDemandAgent();
    const context = {
      exercise: params.exercise,
      issue: params.issueDescription,
      frequency: params.frequency,
    };

    const result = await agent.sendMessage(
      'injury-prevention-expert',
      'Provide injury prevention guidance for reported issue',
      context
    );

    return result.success ? result.answer : '';
  } catch (error) {
    console.error('Injury prevention error:', error);
    return '';
  }
};

/**
 * Explain physiotherapist's program
 * Use in MyProgramScreen to clarify exercises
 */
export const explainPhysioProgram = async (params: {
  exerciseName: string;
  sets: number;
  reps: number;
  purpose?: string;
}): Promise<string> => {
  try {
    const agent = getOnDemandAgent();
    const message = `Explain why this exercise is prescribed: ${params.exerciseName} - ${params.sets} sets of ${params.reps} reps${
      params.purpose ? `. Purpose: ${params.purpose}` : ''
    }`;

    const result = await agent.sendMessage('physiotherapist-assistant', message);

    return result.success ? result.answer : '';
  } catch (error) {
    console.error('Physio explanation error:', error);
    return '';
  }
};

/**
 * Quick agent response (for any agent)
 * Generic helper for custom integrations
 */
export const getQuickAgentResponse = async (
  agentType: AgentType,
  question: string,
  context?: Record<string, any>
): Promise<{ success: boolean; answer: string; error?: string }> => {
  try {
    const agent = getOnDemandAgent();
    const result = await agent.sendMessage(agentType, question, context);
    return result;
  } catch (error) {
    return {
      success: false,
      answer: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Batch get responses from multiple agents
 * Useful for comprehensive analysis
 */
export const getMultiAgentInsights = async (
  question: string,
  agentTypes: AgentType[],
  context?: Record<string, any>
): Promise<Array<{ agent: AgentType; answer: string }>> => {
  try {
    const agent = getOnDemandAgent();
    const promises = agentTypes.map((type) =>
      agent.sendMessage(type, question, context).then((result) => ({
        agent: type,
        answer: result.success ? result.answer : '',
      }))
    );

    return await Promise.all(promises);
  } catch (error) {
    console.error('Multi-agent error:', error);
    return [];
  }
};

/**
 * Check if agents are available
 */
export const areAgentsAvailable = (): boolean => {
  try {
    getOnDemandAgent();
    return true;
  } catch {
    return false;
  }
};
