/**
 * Example: Integrate AI Agents into SessionSummaryScreen
 * 
 * This shows how to add agent features to existing screens
 * WITHOUT modifying core workout logic
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getMotivationMessage, analyzeProgress, areAgentsAvailable } from '../services/AgentHelpers';

interface SessionSummaryAgentIntegrationProps {
  session: {
    averageScore: number;
    totalReps: number;
    duration: number;
    exercise: string;
  };
  recentScores: number[];
  streakDays: number;
  totalWorkouts: number;
}

/**
 * Component to add to SessionSummaryScreen
 * Shows AI insights without touching existing summary logic
 */
export const SessionSummaryAgentInsights: React.FC<SessionSummaryAgentIntegrationProps> = ({
  session,
  recentScores,
  streakDays,
  totalWorkouts,
}) => {
  const [motivation, setMotivation] = useState<string>('');
  const [progressInsight, setProgressInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Check if agents are available
  if (!areAgentsAvailable()) {
    return null; // Hide if agents not initialized
  }

  const loadInsights = async () => {
    setLoading(true);
    try {
      // Get motivation message
      const motivationMsg = await getMotivationMessage({
        streakDays,
        totalWorkouts,
        lastWorkoutQuality: session.averageScore > 85 ? 'excellent' : session.averageScore > 70 ? 'good' : 'needs-improvement',
      });
      setMotivation(motivationMsg);

      // Get progress analysis
      const progressMsg = await analyzeProgress({
        recentScores,
        exerciseType: session.exercise,
        timeframe: 'last 7 days',
      });
      setProgressInsight(progressMsg);
    } catch (error) {
      console.error('Failed to load agent insights:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🤖 AI Coach Insights</Text>

      {/* Motivation Message */}
      {motivation && (
        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>💪 Motivation</Text>
          <Text style={styles.insightText}>{motivation}</Text>
        </View>
      )}

      {/* Progress Analysis */}
      {progressInsight && (
        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>📊 Progress Analysis</Text>
          <Text style={styles.insightText}>{progressInsight}</Text>
        </View>
      )}

      {/* Load Button */}
      {!motivation && !progressInsight && !loading && (
        <TouchableOpacity style={styles.loadButton} onPress={loadInsights}>
          <Text style={styles.loadButtonText}>Get AI Insights</Text>
        </TouchableOpacity>
      )}

      {loading && <Text style={styles.loadingText}>Analyzing...</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  insightCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  loadButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});

/**
 * USAGE IN SessionSummaryScreen.tsx:
 * 
 * 1. Import the component:
 *    import { SessionSummaryAgentInsights } from '../examples/SessionSummaryAgentExample';
 * 
 * 2. Add it to your render (after existing summary, before buttons):
 *    <SessionSummaryAgentInsights
 *      session={session}
 *      recentScores={recentSessionScores}
 *      streakDays={currentStreak}
 *      totalWorkouts={totalWorkoutCount}
 *    />
 * 
 * That's it! No changes to core logic needed.
 */
