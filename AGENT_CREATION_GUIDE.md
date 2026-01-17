# 🎯 Step-by-Step Agent Creation Guide

## Complete Setup for All 6 Agents

Follow this guide to create each agent on OnDemand platform. **Create them in order** and note each Agent ID.

### 📍 Where to Paste Agent IDs After Creation

After creating each agent, you'll need to paste the agent ID into your code:

**File**: `src/services/OnDemandAgentService.ts`

**Location**: Lines 59-283 - Look for the `AGENT_CONFIGS` constant

**What to replace**: Change `'agent-XXXXXXXXXX'` to your actual agent ID

**Example**:
```typescript
'workout-form-coach': {
  agentId: 'agent-1712327325', // ← Replace with YOUR agent ID
  // ... rest of config
}
```

**Agent IDs to Collect**:
- [ ] Agent 1 (Workout Form Coach): `agent-__________`
- [ ] Agent 2 (Physiotherapist Assistant): `agent-__________`
- [ ] Agent 3 (Injury Prevention Expert): `agent-__________`
- [ ] Agent 4 (Exercise Modification Specialist): `agent-__________`
- [ ] Agent 5 (Progress Analyzer): `agent-__________`
- [ ] Agent 6 (Motivation Coach): `agent-__________`

---

## 🏋️ AGENT 1: Workout Form Coach

### Basic Settings
```
Name: Workout Form Coach

Fulfillment Model: 
└─ Select: Ondemand-Grok-4.1-Fast

Response Mode:
└─ Select: Stream

Debug Mode:
└─ On
```

### Fulfillment Prompt Settings
```
Temperature: 0.7
Max Tokens: 150
Top P: 1
Frequency penalty: 0
Presence penalty: 0
Stop sequences: (leave empty)
```

### Tools to Enable
```
☑ Vision
☑ Images
☐ Document
☐ Video
☐ Audio
☐ Media Knowledge
☐ Youtube
```

### System Prompt (Fulfillment Instructions)
Copy and paste this **exactly**:

```
You are a Workout Form Coach specializing in real-time posture correction.

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
- If pose data is unclear, ask for better camera angle
```

### After Creation
1. Click "Save" or "Create Agent"
2. **IMPORTANT**: After saving, OnDemand will show you code
3. Look for a line like: `const AGENT_IDS = ["agent-1712327325"];`
4. Copy the **agent ID** (format: `agent-XXXXXXXXXX`)
5. Save it here: `Agent 1 ID: ________________`
["agent-1713958591"]
---

## 🩺 AGENT 2: Physiotherapist Assistant

### Basic Settings
```
Name: Physiotherapist Assistant

Fulfillment Model: 
└─ Select: Ondemand-Grok-4.1-Fast

Response Mode:
└─ Select: Stream

Debug Mode:
└─ On
```

### Fulfillment Prompt Settings
```
Temperature: 0.6
Max Tokens: 200
Top P: 1
Frequency penalty: 0
Presence penalty: 0
Stop sequences: (leave empty)
```

### Tools to Enable
```
☐ Vision
☐ Images
☑ Document
☐ Video
☐ Audio
☐ Media Knowledge
☐ Youtube
```

### System Prompt (Fulfillment Instructions)
Copy and paste this **exactly**:

```
You are a Physiotherapist Assistant helping patients understand their prescribed programs.

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
- Keep responses educational, not prescriptive
```

### After Creation
1. Click "Save" or "Create Agent"
2. OnDemand shows generated code with agent ID
3. Copy the **agent ID** (format: `agent-XXXXXXXXXX`)
4. Save it here: `Agent 2 ID: ________________`
["agent-1713954536"]

---

## 🛡️ AGENT 3: Injury Prevention Expert

### Basic Settings
```
Name: Injury Prevention Expert

Fulfillment Model: 
└─ Select: Ondemand-Grok-4.1-Fast

Response Mode:
└─ Select: Stream

Debug Mode:
└─ On
```

### Fulfillment Prompt Settings
```
Temperature: 0.5
Max Tokens: 200
Top P: 1
Frequency penalty: 0
Presence penalty: 0
Stop sequences: (leave empty)
```

### Tools to Enable
```
☐ Vision
☐ Images
☑ Document
☐ Video
☐ Audio
☐ Media Knowledge
☐ Youtube
```

### System Prompt (Fulfillment Instructions)
Copy and paste this **exactly**:

```
You are an Injury Prevention Expert focused on movement quality and risk reduction.

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
- Keep advice conservative and safety-focused
```

### After Creation
1. Click "Saveagent ID** from generated code
3. Save it here: `Agent 3
3. Save it here: `Agent 3 Tool ID: ________________`
["agent-1713954536"]

---

## ⚙️ AGENT 4: Exercise Modification Specialist

### Basic Settings
```
Name: Exercise Modification Specialist

Fulfillment Model: 
└─ Select: Ondemand-Grok-4.1-Fast

Response Mode:
└─ Select: Stream

Debug Mode:
└─ On
```

### Fulfillment Prompt Settings
```
Temperature: 0.7
Max Tokens: 250
Top P: 1
Frequency penalty: 0
Presence penalty: 0
Stop sequences: (leave empty)
```

### Tools to Enable
```
☐ Vision
☑ Images
☐ Document
☑ Video
☐ Audio
☐ Media Knowledge
☐ Youtube
```

### System Prompt (Fulfillment Instructions)
Copy and paste this **exactly**:

```
You are an Exercise Modification Specialist helping adapt exercises for individual needs.

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
- Encourage gradual progression
```

### After Creation
1. Click "Save" or "Create Agent"
2. Copy the **agent ID** from generated code
3. Save it here: `Agent 4 ID: ________________`
const FILE_AGENTS = ["agent-1713958591","agent-1713967141"];

---

## 📊 AGENT 5: Progress Analyzer

### Basic Settings
```
Name: Progress Analyzer

Fulfillment Model: 
└─ Select: Ondemand-Grok-4.1-Fast

Response Mode:
└─ Select: Stream

Debug Mode:
└─ On
```

### Fulfillment Prompt Settings
```
Temperature: 0.6
Max Tokens: 300
Top P: 1
Frequency penalty: 0
Presence penalty: 0
Stop sequences: (leave empty)
```

### Tools to Enable
```
☐ Vision
☑ Images
☑ Document
☐ Video
☐ Audio
☐ Media Knowledge
☐ Youtube
```

### System Prompt (Fulfillment Instructions)
Copy and paste this **exactly**:

```
You are a Progress Analyzer providing insights on workout performance and trends.

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
- Focus on long-term trends, not single sessions
```

### After Creation
1. Click "Save" or "Create Agent"
2. Copy the **agent ID** from generated code
3. Save it here: `Agent 5 ID: ________________`
["agent-1712327325","agent-1713962163"];

---

## 💪 AGENT 6: Motivation Coach

### Basic Settings
```
Name: Motivation Coach

Fulfillment Model: 
└─ Select: Ondemand-Grok-4.1-Fast

Response Mode:
└─ Select: Stream

Debug Mode:
└─ On
```

### Fulfillment Prompt Settings
```
Temperature: 0.8
Max Tokens: 150
Top P: 1
Frequency penalty: 0
Presence penalty: 0
Stop sequences: (leave empty)
```

### Tools to Enable
```
☐ Vision
☐ Images
☐ Document
☐ Video
☐ Audio
☐ Media Knowledge
☐ Youtube
```

### System Prompt (Fulfillment Instructions)
Copy and paste this **exactly**:

```
You are a Motivation Coach helping users stay consistent and enthusiastic about their fitness journey.

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
- Keep messages brief and uplifting (3-4 sentences max)
```

### After Creation
1. Click "Save" or "Create Agent"
2. Copy the **agent ID** from generated code  
3. Save it here: `Agent 6 ID: ________________`

---

## ✅ After Creating All 6 Agents

### Step 1: Collect All Agent IDs
You should now have 6 agent IDs (from the generated code after creating each agent):
```
Agent 1 (Form Coach): agent-________________
Agent 2 (Physio Assist): agent-________________
Agent 3 (Injury Prevent): agent-________________
Agent 4 (Modification): agent-________________
Agent 5 (Progress): agent-________________
Agent 6 (Motivation): agent-________________
```

**Where to find Agent IDs:**
After creating each agent, OnDemand shows you code like:
```javascript
const AGENT_IDS = ["agent-1712327325"];  // ← This is your agent ID
```

### Step 2: Update Your Code

Open: `src/services/OnDemandAgentService.ts`

Find line ~52 and update:

```typescript
const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  'workout-form-coach': {
    id: 'workout-form-coach',
    name: 'Workout Form Coach',
    agentId: 'agent-YOUR_ID_HERE', // ← Paste Agent 1 ID
    endpointId: 'predefined-xai-grok4.1-fast',
    // ... rest stays same
  },

  'physiotherapist-assistant': {
    id: 'physiotherapist-assistant',
    name: 'Physiotherapist Assistant',
    agentId: 'agent-YOUR_ID_HERE', // ← Paste Agent 2 ID
    endpointId: 'predefined-xai-grok4.1-fast',
    // ... rest stays same
  },

  'injury-prevention-expert': {
    id: 'injury-prevention-expert',
    name: 'Injury Prevention Expert',
    agentId: 'agent-YOUR_ID_HERE', // ← Paste Agent 3 ID
    endpointId: 'predefined-xai-grok4.1-fast',
    // ... rest stays same
  },

  'exercise-modification-specialist': {
    id: 'exercise-modification-specialist',
    name: 'Exercise Modification Specialist',
    agentId: 'agent-YOUR_ID_HERE', // ← Paste Agent 4 ID
    endpointId: 'predefined-xai-grok4.1-fast',
    // ... rest stays same
  },

  'progress-analyzer': {
    id: 'progress-analyzer',
    name: 'Progress Analyzer',
    agentId: 'agent-YOUR_ID_HERE', // ← Paste Agent 5 ID
    endpointId: 'predefined-xai-grok4.1-fast',
    // ... rest stays same
  },

  'motivation-coach': {
    id: 'motivation-coach',
    name: 'Motivation Coach',
    agentId: 'agent-YOUR_ID_HERE', // ← Paste Agent 6 ID
    endpointId: 'predefined-xai-grok4.1-fast',
    // ... rest stays same
  },
};
```

### Step 3: Save and Test

```bash
# Terminal
npx expo start --dev-client

# Check console for:
# "✅ OnDemand 6-Agent System initialized"

# Navigate to AgentChat screen and test each agent
```

---

## 📋 Quick Reference Table

| Agent | Temp | Tokens | Tools | Purpose |
|-------|------|--------|-------|---------|
| 🏋️ Form Coach | 0.7 | 150 | Vision, Images | Real-time corrections |
| 🩺 Physio Assistant | 0.6 | 200 | Document | Program guidance |
| 🛡️ Injury Prevention | 0.5 | 200 | Document | Risk analysis |
| ⚙️ Modification | 0.7 | 250 | Images, Video | Exercise variations |
| 📊 Progress Analyzer | 0.6 | 300 | Images, Document | Performance insights |
| 💪 Motivation Coach | 0.8 | 150 | None | Encouragement |

---

## 🔍 Why These Settings?

### Temperature Explained
- **0.5** (Injury Prevention) - More factual, consistent, safety-focused
- **0.6** (Physio, Progress) - Balanced between facts and personality
- **0.7** (Form, Modification) - Creative but accurate suggestions
- **0.8** (Motivation) - Most creative, varied encouragement

### Max Tokens Explained
- **150** - Quick responses (Form Coach, Motivation)
- **200** - Medium explanations (Physio, Injury Prevention)
- **250** - Detailed variations (Modification)
- **300** - Comprehensive analysis (Progress)

### Tools Purpose
- **Vision** - Analyze pose/form from camera frames
- **Images** - Show exercise demos, compare form
- **Document** - Read workout plans, program PDFs
- **Video** - Demonstrate alternative exercises

---

## ✅ Success Checklist

- [ ] Created all 6 agents on OnDemand
- [ ] Copied all 6 Tool IDs
- [ ] Updated OnDemandAgentService.ts
- [ ] Saved the file
- [ ] Restarted app
- [ ] Saw "✅ OnDemand 6-Agent System initialized" in console
- [ ] Tested AgentChat screen
- [ ] Each agent responds correctly
- [ ] Can switch between agents

**You're done!** 🎉 All 6 AI agents are now integrated into your KinetiqAI app!
