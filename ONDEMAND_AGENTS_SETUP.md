# OnDemand Multi-Agent Setup Guide

## Overview
Your KinetiqAI app now has **6 specialized AI agents** powered by OnDemand platform:

1. 🏋️ **Workout Form Coach** - Real-time posture correction
2. 🩺 **Physiotherapist Assistant** - Program guidance
3. 🛡️ **Injury Prevention Expert** - Risk analysis
4. ⚙️ **Exercise Modification Specialist** - Exercise variations
5. 📊 **Progress Analyzer** - Performance insights
6. 💪 **Motivation Coach** - Encouragement & streaks

## Quick Start

### 1. Create Agents on OnDemand Platform

Go to **https://app.on-demand.io/** and create 6 agents with these settings:

#### Agent 1: Workout Form Coach
- **Name**: Workout Form Coach
- **Fulfillment Model**: Ondemand-Grok-4.1-Fast
- **Temperature**: 0.7
- **Max Tokens**: 150
- **System Prompt**: (Copy from `src/services/OnDemandAgentService.ts`)
- **Tools**: None (direct chat)

#### Agent 2: Physiotherapist Assistant  
- **Name**: Physiotherapist Assistant
- **Fulfillment Model**: Ondemand-Grok-4.1-Fast
- **Temperature**: 0.6
- **Max Tokens**: 200
- **System Prompt**: (Copy from `src/services/OnDemandAgentService.ts`)
- **Tools**: None

#### Agent 3: Injury Prevention Expert
- **Name**: Injury Prevention Expert
- **Fulfillment Model**: Ondemand-Grok-4.1-Fast
- **Temperature**: 0.5
- **Max Tokens**: 200
- **System Prompt**: (Copy from `src/services/OnDemandAgentService.ts`)
- **Tools**: None

#### Agent 4: Exercise Modification Specialist
- **Name**: Exercise Modification Specialist
- **Fulfillment Model**: Ondemand-Grok-4.1-Fast
- **Temperature**: 0.7
- **Max Tokens**: 250
- **System Prompt**: (Copy from `src/services/OnDemandAgentService.ts`)
- **Tools**: None

#### Agent 5: Progress Analyzer
- **Name**: Progress Analyzer
- **Fulfillment Model**: Ondemand-Grok-4.1-Fast
- **Temperature**: 0.6
- **Max Tokens**: 300
- **System Prompt**: (Copy from `src/services/OnDemandAgentService.ts`)
- **Tools**: Document, Images (for workout screenshots)

#### Agent 6: Motivation Coach
- **Name**: Motivation Coach
- **Fulfillment Model**: Ondemand-Grok-4.1-Fast
- **Temperature**: 0.8
- **Max Tokens**: 150
- **System Prompt**: (Copy from `src/services/OnDemandAgentService.ts`)
- **Tools**: None

### 2. Get Tool IDs

After creating each agent in OnDemand:
1. Click on the agent
2. Copy the **Tool ID** (format: `tool-1713067141`)
3. Update `src/services/OnDemandAgentService.ts`:

```typescript
const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  'workout-form-coach': {
    toolId: 'tool-XXXXXXXXXX', // Replace with your ID
    // ...
  },
  // ... update all 6 agents
};
```

### 3. Test Agents

Run the app and navigate to **Agent Chat** screen:
```bash
npx expo start --dev-client
```

Test each agent with sample questions:
- **Form Coach**: "Is my squat depth correct?"
- **Physio Assistant**: "Why did my physio assign wall sits?"
- **Injury Prevention**: "I feel strain in my knees during lunges"
- **Modification**: "How can I make push-ups easier?"
- **Progress**: "Analyze my last 10 workout sessions"
- **Motivation**: "I missed 3 days, feeling discouraged"

## Integration Points

### 1. LiveWorkoutScreen - Real-time Form Feedback
Agents automatically provide feedback during workouts:
```typescript
// Workout Form Coach gives instant corrections
"Your knees are moving past your toes. Shift weight back."
```

### 2. SessionSummaryScreen - Post-Workout Insights
Multiple agents analyze your session:
- **Progress Analyzer**: Performance trends
- **Motivation Coach**: Encouragement
- **Injury Prevention**: Risk warnings

### 3. ChatbotCoachScreen - On-Demand Help
Switch between agents for different needs:
- Quick form questions → Form Coach
- Program doubts → Physio Assistant
- Struggling with exercise → Modification Specialist

### 4. MyProgramScreen - Exercise Modifications
Get instant variations:
```typescript
// User can't do standard exercise
→ Modification Specialist suggests 3 alternatives
```

## Advanced Usage

### Context-Aware Messages
Agents receive workout context automatically:

```typescript
const { sendMessage } = useOnDemandAgent('workout-form-coach');

// Send with context
await sendMessage('Is my form correct?', {
  exercise: 'squat',
  poseScore: 0.85,
  detectedIssues: ['knees-forward', 'back-rounded'],
  repCount: 8,
});
```

### Agent Switching
Users can switch agents mid-conversation:
- Swipe horizontal selector
- History cleared when switching
- Context maintained per agent

### History Management
```typescript
const { history, clearHistory } = useOnDemandAgent('progress-analyzer');

// Get conversation history
console.log(history); // Array of messages

// Clear when done
clearHistory();
```

## OnDemand Platform Features You Can Use

### Tools (2nd screenshot)
- **Vision**: For form analysis from photos
- **Document**: For workout plans, PDFs
- **Images**: For exercise diagrams
- **Video**: For form analysis videos

### Enable Tools for Specific Agents:
1. **Progress Analyzer** → Enable "Document" + "Images"
   - Upload workout screenshots
   - Analyze form photos

2. **Form Coach** → Enable "Vision" + "Images"
   - Real-time pose analysis from camera frames
   - Compare form to reference images

3. **Modification Specialist** → Enable "Video" + "Images"
   - Show alternative exercises
   - Visual demonstrations

## Customization

### Adjust Agent Personality
Edit temperature in `OnDemandAgentService.ts`:
- **Lower (0.3-0.5)**: More factual, consistent
- **Higher (0.7-0.9)**: More creative, varied

### Modify Response Length
```typescript
maxTokens: 150, // Shorter, quicker responses
maxTokens: 500, // Longer, detailed explanations
```

### Add Custom Context
Pass additional data to agents:
```typescript
await sendMessage('Analyze this', {
  userAge: 35,
  fitnessLevel: 'intermediate',
  injuries: ['past knee surgery'],
  goals: ['strength', 'mobility'],
});
```

## Troubleshooting

### "Agent not initialized" error
- Check API key in `App.tsx`
- Ensure agents initialized on app start
- Look for console log: "✅ OnDemand 6-Agent System initialized"

### Agent responses too slow
- Use `response-mode: sync` for instant responses
- Check OnDemand dashboard for rate limits
- Consider upgrading plan for priority queue

### Wrong agent responding
- Verify correct `toolId` for each agent
- Check agent selection in UI
- Clear history when switching agents

### Context not being used
- Verify context object structure
- Check agent system prompt accepts context
- Test with simple context first

## Best Practices

1. **Use the Right Agent**: Match agent to user's need
2. **Provide Context**: Send workout data with questions
3. **Clear History**: When switching topics
4. **Monitor Tokens**: Keep responses concise for mobile
5. **Error Handling**: Always check `success` flag

## Next Steps

### Phase 1: Basic Integration ✅
- [x] Create agent service
- [x] Add agent selector UI
- [x] Implement chat screen
- [x] Initialize in App.tsx

### Phase 2: Advanced Features (Recommended)
- [ ] Integrate Vision tool for photo analysis
- [ ] Add agents to LiveWorkoutScreen overlay
- [ ] Create agent shortcuts in SessionSummary
- [ ] Enable document uploads for Progress Analyzer

### Phase 3: Optimization
- [ ] Cache agent responses
- [ ] Add offline fallbacks
- [ ] Implement rate limiting
- [ ] Add usage analytics

## Resources

- **OnDemand Docs**: https://docs.on-demand.io/
- **OnDemand Dashboard**: https://app.on-demand.io/
- **Your API Keys**: https://app.on-demand.io/settings/api-keys
- **Agent Management**: https://app.on-demand.io/agents

---

**Need Help?** The 6-agent system is ready to use. Just create the agents on OnDemand platform and update the tool IDs!
