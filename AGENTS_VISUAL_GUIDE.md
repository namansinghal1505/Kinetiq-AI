# 🎯 Visual Setup Guide - OnDemand Multi-Agent System

## 📋 Checklist (Complete in 15 minutes)

### ✅ Phase 1: OnDemand Platform Setup (10 min)

```
┌─────────────────────────────────────────────────────────┐
│  Go to: https://app.on-demand.io/                      │
│                                                         │
│  1. Login / Create Account                             │
│  2. Navigate to "Agents" or "Tools"                    │
│  3. Create 6 agents with these names:                  │
│     • Workout Form Coach                               │
│     • Physiotherapist Assistant                        │
│     • Injury Prevention Expert                         │
│     • Exercise Modification Specialist                 │
│     • Progress Analyzer                                │
│     • Motivation Coach                                 │
│                                                         │
│  4. For each agent, set:                               │
│     Fulfillment Model: Ondemand-Grok-4.1-Fast          │
│     Temperature: 0.7 (0.5 for experts, 0.8 for coach) │
│     Max Tokens: 150-300 (see SETUP guide)             │
│     System Prompt: Copy from OnDemandAgentService.ts  │
│                                                         │
│  5. Copy each agent's Tool ID (looks like:             │
│     tool-1713067141)                                   │
└─────────────────────────────────────────────────────────┘
```

### ✅ Phase 2: Update Your Code (3 min)

```typescript
// 1. Open: src/services/OnDemandAgentService.ts
// 2. Find this section (around line 35):

const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  'workout-form-coach': {
    toolId: 'tool-1713067141', // ← REPLACE WITH YOUR TOOL ID
    // ...
  },
  'physiotherapist-assistant': {
    toolId: 'tool-1713968891', // ← REPLACE WITH YOUR TOOL ID
    // ...
  },
  // ... update all 6
};

// 3. Save file
```

### ✅ Phase 3: Test (2 min)

```bash
# Terminal
npx expo start --dev-client

# In App:
# 1. Check console for: "✅ OnDemand 6-Agent System initialized"
# 2. Navigate to: Profile Tab or Home → AI Assistants
# 3. Select an agent
# 4. Send test message: "Hello, can you help me?"
# 5. Should get response in 2-3 seconds
```

## 🖼️ OnDemand Platform Screen Reference

Based on your screenshots:

### Screen 1: Agent Settings (Left Panel)
```
┌────────────────────────────────────┐
│ Name: [Type Agent Name]            │
│                                    │
│ Fulfillment Model:                 │
│ ▼ Ondemand-Grok-4.1-Fast          │
│                                    │
│ Endpoint Context Length:           │
│ 2,000,000 tokens                   │
│                                    │
│ Response Mode:                     │
│ ○ Sync  ● Stream                  │
│                                    │
│ Debug Mode: □                      │
└────────────────────────────────────┘
```

### Screen 2: Available Tools (Bottom)
```
┌──────────────────────────────────────────────────┐
│ Tools Available:                                  │
│ ☑ Vision        ☑ Media Knowledge                │
│ ☑ Video         ☑ Youtube                        │
│ ☑ Audio         ☑ Images                         │
│ ☑ Document                                       │
└──────────────────────────────────────────────────┘
```

**Enable for these agents:**
- Progress Analyzer → ☑ Document, Images
- Form Coach → ☑ Vision, Images  
- Modification Specialist → ☑ Video, Images

### Screen 3: Fulfillment Prompt Settings (Right Panel)
```
┌────────────────────────────────────┐
│ Temperature: [========·] 0.7       │
│                                    │
│ Stop sequences: [Tab]              │
│                                    │
│ Max Tokens: 0                      │
│ (0 = unlimited, use 150-300)       │
│                                    │
│ Top P: [========·] 1               │
│                                    │
│ Frequency penalty: 0               │
│                                    │
│ Presence penalty: 0                │
└────────────────────────────────────┘
```

## 🚀 Quick Navigation in Your App

```
App Structure:
├── HomeScreen
│   └── [New Button] "AI Assistants" → AgentChat
│
├── Profile Tab
│   └── [Navigate] "AgentChat"
│
├── SessionSummaryScreen
│   └── [Add Component] SessionSummaryAgentInsights
│
└── LiveWorkoutScreen
    └── [Call Function] getFormFeedback()
```

## 💡 Usage Examples

### Example 1: Chat Interface
```
User Opens App → Sees Home
  ↓
Taps "AI Assistants" button
  ↓
Sees 6 agents with icons
  ↓
Selects "🏋️ Workout Form Coach"
  ↓
Types: "How deep should I squat?"
  ↓
Gets instant response with form tips
```

### Example 2: During Workout
```
User Doing Squats → LiveWorkoutScreen
  ↓
Pose detection finds issue: "knees-forward"
  ↓
getFormFeedback() called automatically
  ↓
Overlay shows: "Shift weight back, knees behind toes"
  ↓
User adjusts form
```

### Example 3: Post-Workout
```
User Finishes Workout → SessionSummaryScreen
  ↓
Taps "Get AI Insights"
  ↓
Progress Analyzer: "Great improvement! +5% from last week"
Motivation Coach: "5-day streak! Keep crushing it! 🔥"
  ↓
User feels motivated
```

## 🔧 Troubleshooting Decision Tree

```
App not showing agents?
  ├─ Check: Console for "✅ OnDemand 6-Agent System initialized"
  │   ├─ YES → Agent service initialized ✓
  │   └─ NO → Check API key in App.tsx
  │
Agent not responding?
  ├─ Check: Tool IDs updated in OnDemandAgentService.ts?
  │   ├─ YES → Check OnDemand dashboard
  │   └─ NO → Update Tool IDs
  │
Wrong responses?
  ├─ Check: Correct agent selected?
  │   ├─ YES → Check system prompt
  │   └─ NO → Select correct agent
  │
Slow responses?
  ├─ Check: Response Mode in OnDemand
  │   ├─ Sync → Faster, blocking
  │   └─ Stream → Progressive, non-blocking
```

## 📱 Mobile App Flow

```
┌─────────────────────────────────────────────────┐
│  [Home Screen]                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Start    │  │ History  │  │ Profile  │     │
│  │ Workout  │  │          │  │          │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                 │
│  [NEW] ┌────────────────────────────────┐      │
│        │  💬 Ask AI Assistant          │      │
│        └────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  [Agent Chat Screen]                            │
│                                                 │
│  Choose Your AI Assistant                       │
│                                                 │
│  🏋️ Workout Form Coach                          │
│  Real-time corrections, Form tips               │
│                                                 │
│  🩺 Physiotherapist Assistant                   │
│  Program guidance, Exercise explanation         │
│                                                 │
│  🛡️ Injury Prevention Expert                    │
│  Risk analysis, Prevention tips                 │
│                                                 │
│  ⚙️ Exercise Modification Specialist            │
│  Variations, Difficulty adjustments             │
│                                                 │
│  📊 Progress Analyzer                           │
│  Performance insights, Trends                   │
│                                                 │
│  💪 Motivation Coach                            │
│  Encouragement, Streak support                  │
└─────────────────────────────────────────────────┘
```

## ✨ Success Criteria

You'll know it's working when:

- ✅ Console shows: "✅ OnDemand 6-Agent System initialized"
- ✅ AgentChat screen loads without errors
- ✅ Can select all 6 agents
- ✅ Agents respond within 2-5 seconds
- ✅ Responses are relevant to agent type
- ✅ Can switch between agents smoothly

## 📞 Need Help?

1. Check `AGENTS_QUICK_REFERENCE.md` for code examples
2. Check `ONDEMAND_AGENTS_SETUP.md` for detailed setup
3. Check `AGENTS_INTEGRATION_COMPLETE.md` for full docs
4. Check OnDemand docs: https://docs.on-demand.io/

---

**You're ready!** Create the agents on OnDemand and start using AI-powered coaching! 🚀
