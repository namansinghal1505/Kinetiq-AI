/**
 * React hook for using OnDemand agents
 * Makes it easy to interact with specialized AI agents from any screen
 */

import { useState, useCallback } from 'react';
import { getOnDemandAgent, AgentType } from '../services/OnDemandAgentService';

interface UseAgentResult {
  sendMessage: (message: string, context?: Record<string, any>) => Promise<void>;
  response: string | null;
  isLoading: boolean;
  error: string | null;
  clearResponse: () => void;
  history: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
  clearHistory: () => void;
}

/**
 * Hook to interact with a specific OnDemand agent
 * @param agentType - The type of agent to use
 * @returns Agent interaction functions and state
 * 
 * @example
 * const { sendMessage, response, isLoading } = useOnDemandAgent('workout-form-coach');
 * 
 * // Send a message with context
 * await sendMessage('Is my squat form correct?', {
 *   exercise: 'squat',
 *   poseScore: 0.85,
 *   detectedIssues: ['knees-forward']
 * });
 */
export const useOnDemandAgent = (agentType: AgentType): UseAgentResult => {
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (message: string, context?: Record<string, any>) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const agent = getOnDemandAgent();
        const result = await agent.sendMessage(agentType, message, context);
        
        if (result.success) {
          setResponse(result.answer);
        } else {
          setError(result.error || 'Failed to get response');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error(`Agent ${agentType} error:`, err);
      } finally {
        setIsLoading(false);
      }
    },
    [agentType]
  );

  const clearResponse = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  const history = useCallback(() => {
    try {
      const agent = getOnDemandAgent();
      return agent.getHistory(agentType);
    } catch {
      return [];
    }
  }, [agentType])();

  const clearHistory = useCallback(() => {
    try {
      const agent = getOnDemandAgent();
      agent.clearHistory(agentType);
      setResponse(null);
      setError(null);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, [agentType]);

  return {
    sendMessage,
    response,
    isLoading,
    error,
    clearResponse,
    history,
    clearHistory,
  };
};

/**
 * Hook to get available agents list
 */
export const useAvailableAgents = () => {
  try {
    const agent = getOnDemandAgent();
    return agent.getAvailableAgents();
  } catch {
    return [];
  }
};
