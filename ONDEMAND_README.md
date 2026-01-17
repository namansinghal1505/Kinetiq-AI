# OnDemand Multi-Agent System - README

## Overview

This directory contains a complete 6-agent AI system integrated with the **OnDemand platform** for your KinetiqAI fitness app. Each agent is specialized for different aspects of fitness coaching and support.

## 🤖 The 6 Agents

| Icon | Agent | Purpose | When to Use |
|------|-------|---------|-------------|
| 🏋️ | **Workout Form Coach** | Real-time posture & form corrections | During live workouts |
| 🩺 | **Physiotherapist Assistant** | Explain prescribed programs | Understanding physio assignments |
| 🛡️ | **Injury Prevention Expert** | Risk analysis & prevention | User reports discomfort |
| ⚙️ | **Exercise Modification Specialist** | Exercise variations | Can't do standard exercise |
| 📊 | **Progress Analyzer** | Performance insights & trends | Post-workout analysis |
| 💪 | **Motivation Coach** | Encouragement & streak support | Building consistency |

## 🚀 Quick Start

### 1. Setup (One Time - 15 minutes)

Follow `AGENTS_VISUAL_GUIDE.md` to:
1. Create 6 agents on https://app.on-demand.io/
2. Copy Tool IDs
3. Update `OnDemandAgentService.ts`
4. Test in app

### 2. Use in Your Code

```typescript
// Option 1: Simple Helper Functions
import { getFormFeedback, getMotivationMessage } from '../services/AgentHelpers';

const feedback = await getFormFeedback({
  exercise: 'squat',
  poseScore: 0.85,
  detectedIssues: ['knees-forward']
});
```

```typescript
// Option 2: React Hook
import { useOnDemandAgent } from '../hooks/useOnDemandAgent';

const { sendMessage, response, isLoading } = useOnDemandAgent('workout-form-coach');
await sendMessage('Is my form correct?');
```

```typescript
// Option 3: Full Chat Interface
navigation.navigate('AgentChat');
```

## 📁 File Structure

```
src/
├── services/
│   ├── OnDemandAgentService.ts    # Core agent service (6 agents)
│   ├── AgentHelpers.ts            # Easy integration functions
│   └── index.ts                   # Exports
├── hooks/
│   └── useOnDemandAgent.ts        # React hook for agents
├── components/
│   └── AgentSelector.tsx          # Visual agent picker UI
├── screens/
│   └── AgentChatScreen.tsx        # Full chat interface
└── examples/
    └── SessionSummaryAgentExample.tsx  # Integration example

docs/
├── AGENTS_SUMMARY.md              # Quick overview
├── AGENTS_VISUAL_GUIDE.md         # Step-by-step setup
├── AGENTS_QUICK_REFERENCE.md      # Code snippets
├── AGENTS_INTEGRATION_COMPLETE.md # Full documentation
└── ONDEMAND_AGENTS_SETUP.md       # Platform setup guide
```

## 🎯 Integration Points

### Already Integrated
- ✅ `App.tsx` - Initializes agents on startup
- ✅ `AppNavigator.tsx` - Added AgentChat route
- ✅ Export from services & screens indexes

### Ready to Add (Pick What You Need)

#### LiveWorkoutScreen - Real-time Feedback
```typescript
import { getFormFeedback } from '../services/AgentHelpers';

// After pose detection
if (poseScore < 0.8) {
  const feedback = await getFormFeedback({
    exercise, poseScore, detectedIssues, repCount
  });
  showFeedbackOverlay(feedback);
}
```

#### SessionSummaryScreen - Post-Workout Insights
```typescript
import { SessionSummaryAgentInsights } from '../examples/SessionSummaryAgentExample';

// Add to render
<SessionSummaryAgentInsights
  session={session}
  recentScores={scores}
  streakDays={streak}
  totalWorkouts={total}
/>
```

#### MyProgramScreen - Exercise Help
```typescript
import { explainPhysioProgram } from '../services/AgentHelpers';

const handleExplain = async (exercise) => {
  const explanation = await explainPhysioProgram({
    exerciseName: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps
  });
  Alert.alert('Why This Exercise?', explanation);
};
```

#### HomeScreen - AI Assistant Button
```typescript
<TouchableOpacity onPress={() => navigation.navigate('AgentChat')}>
  <Text>💬 Ask AI Assistant</Text>
</TouchableOpacity>
```

## 🔧 Configuration

### Agent Settings (in OnDemandAgentService.ts)

```typescript
const AGENT_CONFIGS = {
  'workout-form-coach': {
    toolId: 'tool-XXXXXXXXXX',        // From OnDemand
    endpoint: 'Ondemand-Grok-4.1-Fast',
    maxTokens: 150,                    // Short responses
    temperature: 0.7,                  // Balanced creativity
  },
  // ... 5 more agents
};
```

### Customization Options

**Response Length**
- `maxTokens: 100` - Ultra brief
- `maxTokens: 150` - Quick tips (recommended for mobile)
- `maxTokens: 300` - Detailed explanations

**Creativity Level**
- `temperature: 0.3` - Factual, consistent
- `temperature: 0.7` - Balanced (recommended)
- `temperature: 0.9` - Creative, varied

**Response Mode** (OnDemand platform)
- `Sync` - Wait for complete response
- `Stream` - Progressive streaming

## 📊 Usage Patterns

### Pattern 1: Conditional Features
```typescript
import { areAgentsAvailable } from '../services/AgentHelpers';

{areAgentsAvailable() && (
  <Button onPress={getAIHelp}>Get AI Help</Button>
)}
```

### Pattern 2: Context-Aware
```typescript
await sendMessage('Analyze my workout', {
  exercise: 'squats',
  sets: 3,
  reps: 12,
  avgScore: 85,
  duration: 600
});
```

### Pattern 3: Multi-Agent Insights
```typescript
import { getMultiAgentInsights } from '../services/AgentHelpers';

const insights = await getMultiAgentInsights(
  'How was my workout?',
  ['progress-analyzer', 'motivation-coach'],
  { session: sessionData }
);
```

## 🧪 Testing

### Manual Testing
```bash
# 1. Start app
npx expo start --dev-client

# 2. Check console
# Should see: "✅ OnDemand 6-Agent System initialized"

# 3. Navigate to AgentChat
# Test each agent with sample questions
```

### Test Questions by Agent

**Form Coach**: "Is my squat depth correct?"  
**Physio Assistant**: "Why did my physio assign wall sits?"  
**Injury Prevention**: "I feel strain in my knees during lunges"  
**Modification**: "How can I make push-ups easier?"  
**Progress**: "Analyze my last 10 workout sessions"  
**Motivation**: "I missed 3 days, feeling discouraged"

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Agent not initialized" | Check API key in App.tsx |
| No responses | Verify Tool IDs in OnDemandAgentService.ts |
| Slow responses | Check OnDemand dashboard for rate limits |
| Wrong agent answers | Verify toolId matches agent on platform |
| TypeScript errors | Run `npx tsc --noEmit` to check |

## 📚 Documentation

- **Quick Start**: `AGENTS_VISUAL_GUIDE.md`
- **Code Reference**: `AGENTS_QUICK_REFERENCE.md`
- **Full Docs**: `AGENTS_INTEGRATION_COMPLETE.md`
- **Setup Guide**: `ONDEMAND_AGENTS_SETUP.md`
- **Summary**: `AGENTS_SUMMARY.md`

## 🎓 Examples

### Example 1: Post-Workout Motivation
```typescript
const motivation = await getMotivationMessage({
  streakDays: 5,
  totalWorkouts: 20,
  lastWorkoutQuality: 'excellent'
});
// "Amazing 5-day streak! You're unstoppable! 🔥"
```

### Example 2: Exercise Variation
```typescript
const variations = await getExerciseModifications({
  exercise: 'push-up',
  difficulty: 'easier',
  reason: 'wrist pain'
});
// "Try wall push-ups or knee push-ups to reduce wrist strain..."
```

### Example 3: Progress Insight
```typescript
const insight = await analyzeProgress({
  recentScores: [75, 78, 82, 85, 88],
  exerciseType: 'squats',
  timeframe: 'last 5 sessions'
});
// "Excellent upward trend! +13 points in 5 sessions..."
```

## ⚡ Performance Tips

1. **Cache Responses**: Store common questions/answers
2. **Batch Requests**: Use `getMultiAgentInsights()` for multiple agents
3. **Lazy Load**: Only initialize agents when needed
4. **Error Handling**: Always provide fallback UI
5. **Loading States**: Show user feedback during API calls

## 🔐 Security

- API key stored in `App.tsx` (development)
- For production, use environment variables:
  ```typescript
  const API_KEY = process.env.EXPO_PUBLIC_ONDEMAND_API_KEY;
  ```
- Never commit API keys to git
- Rotate keys regularly from OnDemand dashboard

## 🚀 Next Steps

1. ✅ Complete OnDemand platform setup
2. ✅ Test each agent in AgentChatScreen
3. ⬜ Add AI button to HomeScreen
4. ⬜ Integrate form feedback in LiveWorkoutScreen
5. ⬜ Add insights card to SessionSummaryScreen
6. ⬜ Enable Vision tool for photo analysis
7. ⬜ Gather user feedback on agent responses

## 📞 Support

- **OnDemand Docs**: https://docs.on-demand.io/
- **OnDemand Dashboard**: https://app.on-demand.io/
- **API Reference**: https://docs.on-demand.io/docs/chat-api

---

**Ready to coach with AI!** 🏋️💪🤖
