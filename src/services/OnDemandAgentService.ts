/**
 * OnDemand Multi-Agent Service
 * 
 * Integrates 6 specialized AI agents from OnDemand platform:
 * 1. Workout Form Coach - Real-time posture correction
 * 2. Physiotherapist Assistant - Program guidance
 * 3. Injury Prevention Expert - Risk analysis
 * 4. Exercise Modification Specialist - Adapt exercises
 * 5. Progress Analyzer - Performance insights
 * 6. Motivation Coach - Encouragement & streaks
 */

export type AgentType = 
  | 'workout-form-coach'
  | 'physiotherapist-assistant'
  | 'injury-prevention-expert'
  | 'exercise-modification-specialist'
  | 'progress-analyzer'
  | 'motivation-coach';

interface AgentConfig {
  id: string;
  name: string;
  agentId: string; // OnDemand agent ID (e.g., agent-1712327325)
  endpointId: string; // OnDemand endpoint
  reasoningMode: string;
  fulfillmentPrompt: string; // System prompt sent as fulfillmentPrompt
  capabilities: string[];
  modelConfigs: {
    maxTokens: number;
    temperature: number;
    topP: number;
    presencePenalty: number;
    frequencyPenalty: number;
    stopSequences: string[];
  };
}

interface AgentMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  agentType: AgentType;
}

interface AgentResponse {
  success: boolean;
  answer: string;
  agentType: AgentType;
  messageId?: string;
  error?: string;
}

/**
 * Configuration for each specialized agent
 * 
 * INSTRUCTIONS:
 * 1. Create each agent on OnDemand platform using AGENT_CREATION_GUIDE.md
 * 2. After creating each agent, OnDemand shows generated code with agent ID
 * 3. Look for: const AGENT_IDS = ["agent-1712327325"];
 * 4. Copy the agent ID and paste it in the corresponding config below
 * 5. All settings (temperature, maxTokens, etc.) are already configured
 */
const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  'workout-form-coach': {
    id: 'workout-form-coach',
    name: 'Workout Form Coach',
    agentId: '696ac6eac7d6dfdf7e337e46', // 🏋️ AGENT 1: Workout Form Coach
    endpointId: 'predefined-xai-grok4.1-fast',
    reasoningMode: 'grok-4-fast',
    fulfillmentPrompt: `You are a Workout Form Coach specializing in real-time posture correction.

ROLE:
- Analyze exercise form and posture from pose detection data
- Provide immediate, actionable corrections (2-3 sentences max)
- Focus on safety and proper biomechanics
- Use simple language for instant understanding

STRICT RULES:
- ONLY discuss form, posture, and movement mechanics
- NO medical advice or injury diagnosis
- Keep responses under 50 words
- Be direct and encouraging
- If pose data is unclear, ask for better camera angle`,
    capabilities: [
      'Real-time posture analysis',
      'Form correction feedback',
      'Biomechanics guidance',
      'Exercise cues'
    ],
    modelConfigs: {
      maxTokens: 800,
      temperature: 0.7,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      stopSequences: [],
    },
  },

  'physiotherapist-assistant': {
    id: 'physiotherapist-assistant',
    name: 'Physiotherapist Assistant',
    agentId: '696acabcc7d6dfdf7e337e4e', // 🩺 AGENT 2: Paste your agent ID here
    endpointId: 'predefined-xai-grok4.1-fast',
    reasoningMode: 'grok-4-fast',
    fulfillmentPrompt: `You are a Physiotherapist Assistant helping patients understand their prescribed programs.

ROLE:
- Explain exercise programs assigned by physiotherapists
- Clarify exercise instructions and goals
- Answer questions about recovery timelines
- Provide context for prescribed movements

STRICT RULES:
- NEVER modify or contradict physiotherapist's program
- NEVER diagnose or suggest alternative treatments
- Encourage following prescribed plan
- Suggest consulting physiotherapist for program changes
- Keep responses educational, not prescriptive`,
    capabilities: [
      'Program explanation',
      'Exercise clarification',
      'Recovery education',
      'Compliance support'
    ],
    modelConfigs: {
      maxTokens: 200,
      temperature: 0.6,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      stopSequences: [],
    },
  },

  'injury-prevention-expert': {
    id: 'injury-prevention-expert',
    name: 'Injury Prevention Expert',
    agentId: '696acba8c7d6dfdf7e337e53', // 🛡️ AGENT 3: Paste your agent ID here
    endpointId: 'predefined-xai-grok4.1-fast',
    reasoningMode: 'grok-4-fast',
    fulfillmentPrompt: `You are an Injury Prevention Expert focused on movement quality and risk reduction.

ROLE:
- Identify movement patterns that may increase injury risk
- Suggest modifications to reduce strain
- Educate on proper warm-up and cool-down
- Recognize when to recommend rest or professional consultation

STRICT RULES:
- Focus on PREVENTION, not treatment of existing injuries
- NO diagnosis of current injuries or pain
- Recommend seeing healthcare provider for pain/injuries
- Emphasize gradual progression and listening to body
- Keep advice conservative and safety-focused`,
    capabilities: [
      'Movement pattern analysis',
      'Risk identification',
      'Preventive strategies',
      'Warm-up/cool-down guidance'
    ],
    modelConfigs: {
      maxTokens: 200,
      temperature: 0.5,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      stopSequences: [],
    },
  },

  'exercise-modification-specialist': {
    id: 'exercise-modification-specialist',
    name: 'Exercise Modification Specialist',
    agentId: '696acc98b2795e4f7116f7b3', // 🔧 AGENT 4: Paste your agent ID here
    endpointId: 'predefined-xai-grok4.1-fast',
    reasoningMode: 'grok-4-fast',
    fulfillmentPrompt: `You are an Exercise Modification Specialist helping adapt exercises for individual needs.

ROLE:
- Suggest exercise variations for different fitness levels
- Adapt exercises for equipment limitations
- Modify movements for mobility restrictions
- Progress or regress exercises appropriately

STRICT RULES:
- Modifications should maintain exercise intent
- Always provide easier AND harder variations
- Consider safety as primary concern
- NO modifications for medical conditions without professional input
- Encourage gradual progression`,
    capabilities: [
      'Exercise variations',
      'Difficulty adjustments',
      'Equipment substitutions',
      'Accessibility modifications'
    ],
    modelConfigs: {
      maxTokens: 250,
      temperature: 0.7,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      stopSequences: [],
    },
  },

  'progress-analyzer': {
    id: 'progress-analyzer',
    name: 'Progress Analyzer',
    agentId: '696acd74c7d6dfdf7e337e59', // 📊 AGENT 5: Paste your agent ID here
    endpointId: 'predefined-xai-grok4.1-fast',
    reasoningMode: 'grok-4-fast',
    fulfillmentPrompt: `You are a Progress Analyzer providing insights on workout performance and trends.

ROLE:
- Analyze workout history and performance metrics
- Identify patterns, improvements, and plateaus
- Suggest focus areas based on data
- Celebrate achievements and milestones

STRICT RULES:
- Base insights on provided data only
- Acknowledge limitations of data
- Keep analysis objective and encouraging
- Suggest consulting professionals for persistent issues
- Focus on long-term trends, not single sessions`,
    capabilities: [
      'Performance trend analysis',
      'Goal tracking insights',
      'Pattern recognition',
      'Achievement highlighting'
    ],
    modelConfigs: {
      maxTokens: 300,
      temperature: 0.6,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      stopSequences: [],
    },
  },

  'motivation-coach': {
    id: 'motivation-coach',
    name: 'Motivation Coach',
    agentId: '696ace03b2795e4f7116f7b4', // 💪 AGENT 6: Paste your agent ID here
    endpointId: 'predefined-xai-grok4.1-fast',
    reasoningMode: 'grok-4-fast',
    fulfillmentPrompt: `You are a Motivation Coach helping users stay consistent and enthusiastic about their fitness journey.

ROLE:
- Provide encouragement and positive reinforcement
- Help overcome mental barriers and setbacks
- Celebrate streaks, achievements, and effort
- Offer perspective during challenging times

STRICT RULES:
- Be genuinely encouraging, never condescending
- Acknowledge challenges while maintaining positivity
- Focus on effort and consistency, not just results
- Respect that some days are harder than others
- Keep messages brief and uplifting (3-4 sentences max)`,
    capabilities: [
      'Encouragement & support',
      'Streak celebration',
      'Mental barriers coaching',
      'Consistency building'
    ],
    modelConfigs: {
      maxTokens: 150,
      temperature: 0.8,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      stopSequences: [],
    },
  },
};

class OnDemandAgentService {
  private apiKey: string;
  private baseUrl: string = 'https://api.on-demand.io/chat/v1';
  private sessions: Map<AgentType, string> = new Map();
  private conversationHistory: Map<AgentType, AgentMessage[]> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get list of available agents
   */
  getAvailableAgents(): Array<{ type: AgentType; name: string; capabilities: string[] }> {
    return Object.entries(AGENT_CONFIGS).map(([type, config]) => ({
      type: type as AgentType,
      name: config.name,
      capabilities: config.capabilities,
    }));
  }

  /**
   * Initialize a specific agent session
   */
  private async initializeAgent(agentType: AgentType): Promise<string> {
    // Check if session already exists
    const existingSession = this.sessions.get(agentType);
    if (existingSession) {
      return existingSession;
    }

    try {
      const config = AGENT_CONFIGS[agentType];
      
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          agentIds: [config.agentId],
          externalUserId: `user-${agentType}-${Date.now()}`,
          contextMetadata: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const data = await response.json();
      const sessionId = data.data?.id;

      if (!sessionId) {
        throw new Error('No session ID returned');
      }

      this.sessions.set(agentType, sessionId);
      return sessionId;
    } catch (error) {
      console.error(`Failed to initialize ${agentType}:`, error);
      throw error;
    }
  }

  /**
   * Send message to specific agent
   */
  async sendMessage(
    agentType: AgentType,
    userMessage: string,
    context?: Record<string, any>
  ): Promise<AgentResponse> {
    try {
      // Initialize agent session if needed
      const sessionId = await this.initializeAgent(agentType);
      const config = AGENT_CONFIGS[agentType];

      // Prepare message with context if provided
      let enhancedMessage = userMessage;
      if (context) {
        const contextStr = Object.entries(context)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n');
        enhancedMessage = `Context:\n${contextStr}\n\nUser: ${userMessage}`;
      }

      // Send query to OnDemand
      const response = await fetch(
        `${this.baseUrl}/sessions/${sessionId}/query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey,
          },
          body: JSON.stringify({
            endpointId: config.endpointId,
            query: enhancedMessage,
            agentIds: [config.agentId],
            responseMode: 'sync',
            reasoningMode: config.reasoningMode,
            modelConfigs: {
              fulfillmentPrompt: config.fulfillmentPrompt,
              stopSequences: config.modelConfigs.stopSequences,
              temperature: config.modelConfigs.temperature,
              topP: config.modelConfigs.topP,
              maxTokens: config.modelConfigs.maxTokens,
              presencePenalty: config.modelConfigs.presencePenalty,
              frequencyPenalty: config.modelConfigs.frequencyPenalty,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Agent query failed: ${response.status}`);
      }

      const data = await response.json();
      const answer = data.data?.answer || data.answer || 'No response';

      // Store in conversation history
      this.addToHistory(agentType, userMessage, answer);

      return {
        success: true,
        answer,
        agentType,
        messageId: data.data?.messageId,
      };
    } catch (error) {
      console.error(`${agentType} error:`, error);
      return {
        success: false,
        answer: '',
        agentType,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get conversation history for an agent
   */
  getHistory(agentType: AgentType): AgentMessage[] {
    return this.conversationHistory.get(agentType) || [];
  }

  /**
   * Clear conversation history for an agent
   */
  clearHistory(agentType: AgentType): void {
    this.conversationHistory.delete(agentType);
    this.sessions.delete(agentType);
  }

  /**
   * Add message to conversation history
   */
  private addToHistory(agentType: AgentType, userMsg: string, assistantMsg: string): void {
    const history = this.conversationHistory.get(agentType) || [];
    
    history.push({
      id: `${Date.now()}-user`,
      content: userMsg,
      role: 'user',
      timestamp: new Date(),
      agentType,
    });

    history.push({
      id: `${Date.now()}-assistant`,
      content: assistantMsg,
      role: 'assistant',
      timestamp: new Date(),
      agentType,
    });

    this.conversationHistory.set(agentType, history);
  }

  /**
   * Get agent configuration
   */
  getAgentConfig(agentType: AgentType): AgentConfig {
    return AGENT_CONFIGS[agentType];
  }
}

// Singleton instance
let agentServiceInstance: OnDemandAgentService | null = null;

export const initializeOnDemandAgents = (apiKey: string): void => {
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    throw new Error('Valid OnDemand API key required to initialize agents');
  }
  agentServiceInstance = new OnDemandAgentService(apiKey);
  console.log('✅ OnDemand Multi-Agent System initialized');
};

export const getOnDemandAgent = (): OnDemandAgentService => {
  if (!agentServiceInstance) {
    throw new Error('OnDemand agents not initialized. Call initializeOnDemandAgents first.');
  }
  return agentServiceInstance;
};

export default OnDemandAgentService;
