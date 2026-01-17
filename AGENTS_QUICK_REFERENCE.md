# 🚀 OnDemand Agents - Quick Reference

## Import & Use

```typescript
// Import helpers
import { 
  getFormFeedback,
  getMotivationMessage,
  analyzeProgress,
  getExerciseModifications,
  areAgentsAvailable 
} from '../services/AgentHelpers';

// Import hooks
import { useOnDemandAgent } from '../hooks/useOnDemandAgent';

// Import components
import { AgentSelector } from '../components/AgentSelector';
```

## Quick Functions

```typescript
// ✅ Check if available
if (areAgentsAvailable()) {
  // Use agents
}

// 🏋️ Form Feedback (during workout)
const feedback = await getFormFeedback({
  exercise: 'squat',
  poseScore: 0.85,
  detectedIssues: ['knees-forward'],
  repCount: 8
});

// 💪 Motivation (after workout)
const motivation = await getMotivationMessage({
  streakDays: 5,
  totalWorkouts: 20,
  lastWorkoutQuality: 'excellent'
});

// 📊 Progress Analysis
const insights = await analyzeProgress({
  recentScores: [85, 88, 92],
  exerciseType: 'squats',
  timeframe: 'last 7 days'
});

// ⚙️ Exercise Modifications
const variations = await getExerciseModifications({
  exercise: 'push-up',
  difficulty: 'easier',
  reason: 'wrist pain'
});
```

## React Hook Usage

```typescript
function MyScreen() {
  const { sendMessage, response, isLoading, error } = 
    useOnDemandAgent('workout-form-coach');

  const askAgent = async () => {
    await sendMessage('Is my squat depth correct?', {
      exercise: 'squat',
      score: 0.85
    });
  };

  return (
    <View>
      <Button onPress={askAgent}>Ask Coach</Button>
      {isLoading && <Text>Loading...</Text>}
      {response && <Text>{response}</Text>}
      {error && <Text>Error: {error}</Text>}
    </View>
  );
}
```

## Agent Types

```typescript
type AgentType = 
  | 'workout-form-coach'           // 🏋️ Real-time corrections
  | 'physiotherapist-assistant'    // 🩺 Program guidance
  | 'injury-prevention-expert'     // 🛡️ Risk analysis
  | 'exercise-modification-specialist' // ⚙️ Variations
  | 'progress-analyzer'            // 📊 Insights
  | 'motivation-coach';            // 💪 Encouragement
```

## Setup Steps

1. **Get API Key**: https://app.on-demand.io/ → Settings → API Keys
2. **Add to App.tsx**: Replace `'YOUR_API_KEY_HERE'`
3. **Create Agents**: Follow `ONDEMAND_AGENTS_SETUP.md`
4. **Update Tool IDs**: In `OnDemandAgentService.ts`
5. **Test**: Run app and check console for "✅ OnDemand 6-Agent System initialized"

## File Locations

- **Service**: `src/services/OnDemandAgentService.ts`
- **Helpers**: `src/services/AgentHelpers.ts`
- **Hook**: `src/hooks/useOnDemandAgent.ts`
- **UI**: `src/components/AgentSelector.tsx`
- **Screen**: `src/screens/AgentChatScreen.tsx`
- **Example**: `src/examples/SessionSummaryAgentExample.tsx`

## Common Patterns

### Pattern 1: Add to Existing Screen (No Core Changes)
```typescript
// Just add this component
<SessionSummaryAgentInsights 
  session={session}
  recentScores={scores}
  streakDays={streak}
  totalWorkouts={total}
/>
```

### Pattern 2: Conditional Agent Features
```typescript
{areAgentsAvailable() && (
  <TouchableOpacity onPress={getAIHelp}>
    <Text>💡 Get AI Help</Text>
  </TouchableOpacity>
)}
```

### Pattern 3: Multiple Agents at Once
```typescript
const insights = await getMultiAgentInsights(
  'Analyze my workout',
  ['progress-analyzer', 'motivation-coach'],
  { scores: [85, 90, 88] }
);
```

## Debugging

```bash
# Check initialization
console.log('Agents initialized:', areAgentsAvailable());

# Check API key
console.log('API Key set:', ONDEMAND_API_KEY !== 'YOUR_API_KEY_HERE');

# Test single agent
const result = await getQuickAgentResponse(
  'workout-form-coach',
  'Hello'
);
console.log(result);
```

## Error Handling

```typescript
try {
  const feedback = await getFormFeedback(...);
  if (feedback) {
    showFeedback(feedback);
  } else {
    // No response, continue without agent
  }
} catch (error) {
  console.error('Agent error:', error);
  // App continues normally
}
```

---

**More Details**: See `ONDEMAND_AGENTS_SETUP.md` and `AGENTS_INTEGRATION_COMPLETE.md`
