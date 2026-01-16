import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { storageService } from '../services/StorageService';
import { exerciseScoringService } from '../services/ExerciseScoringService';
import { colors, spacing, fontSize } from '../theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PoseCamera } from '../components/PoseCamera';
import StreakCelebration from '../components/StreakCelebration';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RouteParams {
  exercise: string;
  duration: number;
}

export const LiveWorkoutScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { exercise, duration } = route.params as RouteParams;

  const [isActive, setIsActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const [detectionStatus, setDetectionStatus] = useState('Initializing pose detection...');
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [celebrationDays, setCelebrationDays] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [currentScore, setCurrentScore] = useState(0);
  const [formFeedback, setFormFeedback] = useState<string[]>([]);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (isActive) {
      startTimer();
    } else {
      stopTimer();
    }
    return () => stopTimer();
  }, [isActive]);

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Handle rep count changes from PoseTracker
  const handleRepsChange = (reps: number) => {
    setRepCount(reps);
    if (reps > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Handle score updates
  const handleScoreChange = (score: number) => {
    setCurrentScore(score);
  };

  // Handle feedback updates
  const handleFeedbackChange = (feedback: string[]) => {
    setFormFeedback(feedback);
  };

  // Handle status updates
  const handleStatusChange = (status: string) => {
    setDetectionStatus(status);
  };

  // Safe navigation back handler
  const handleSafeGoBack = () => {
    if (isActive) {
      Alert.alert(
        'End Workout?',
        'Are you sure you want to end the workout?',
        [
          { text: 'Cancel', onPress: () => {} },
          { text: 'End', onPress: () => finishWorkout() },
        ]
      );
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  };

  const handleStartStop = () => {
    if (isActive) {
      finishWorkout();
    } else {
      setIsActive(true);
      setTimeElapsed(0);
      setRepCount(0);
    }
  };

  const finishWorkout = async () => {
    setIsActive(false);
    stopTimer();

    // Get scoring session summary
    const scoringSummary = exerciseScoringService.endSession();

    const sessionData = {
      id: Date.now().toString(),
      exerciseName: exercise,
      date: new Date().toISOString(),
      duration: timeElapsed,
      averageScore: scoringSummary.averageScore || currentScore,
      reps: repCount || scoringSummary.reps,
      mistakes: formFeedback,
      feedback: scoringSummary.repScores.length > 0 
        ? scoringSummary.repScores.map(r => `Rep ${r.repNumber}: ${r.score}%`)
        : ['Workout completed using PoseTracker'],
      timestamp: Date.now(),
    };

    await storageService.saveSession(sessionData);

    // Update streak - show celebration on increment (non-blocking)
    try {
      const StreakMgr = (await import('../services/StreakManager')).default;
      const { didIncrement, streak } = await StreakMgr.onWorkoutCompleted();
      if (didIncrement) {
        // show celebration overlay in this screen (non-blocking)
        setShowStreakCelebration(true);
        setCelebrationDays(streak);
        // Auto-dismiss after ~2.5s
        setTimeout(() => {
          setShowStreakCelebration(false);
          navigation.navigate('SessionSummary', { session: sessionData });
        }, 2500);
        return;
      }
    } catch (e) {
      // if streak manager fails, continue to summary
    }

    navigation.navigate('SessionSummary', { session: sessionData });
  };

  const cleanup = () => {
    stopTimer();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSafeGoBack} style={styles.backButton}>
          <Ionicons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.exerciseTitle}>{exercise}</Text>
        <View style={styles.voiceToggle}>
          <Ionicons name="volume-high" size={20} color={colors.white} />
          <Switch
            value={voiceEnabled}
            onValueChange={setVoiceEnabled}
            trackColor={{ false: colors.gray400, true: colors.primary }}
            thumbColor={voiceEnabled ? colors.white : colors.gray200}
          />
        </View>
      </View>

      <View style={styles.webViewContainer}>
        <PoseCamera
          exercise={exercise}
          isActive={isActive}
          onRepsChange={handleRepsChange}
          onStatusChange={handleStatusChange}
          onScoreChange={handleScoreChange}
          onFeedbackChange={handleFeedbackChange}
          voiceEnabled={voiceEnabled}
          showSkeleton={true}
          showDebugInfo={false}
        />
      </View>

      <View style={styles.controls}>
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={32} color={colors.primary} />
          <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, isActive && styles.stopButton]}
          onPress={handleStartStop}
        >
          <Ionicons
            name={isActive ? 'stop' : 'play'}
            size={32}
            color={colors.white}
          />
        </TouchableOpacity>

        {isActive && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Reps</Text>
              <Text style={styles.statValue}>{repCount}</Text>
            </View>
            {currentScore > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Form</Text>
                <Text style={[
                  styles.statValue,
                  currentScore >= 80 ? styles.scoreGood : 
                  currentScore >= 60 ? styles.scoreOkay : styles.scorePoor
                ]}>
                  {Math.round(currentScore)}%
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <StreakCelebration
        visible={showStreakCelebration}
        days={celebrationDays}
        onDismiss={() => setShowStreakCelebration(false)}
        durationMs={2500}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  voiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  webViewContainer: {
    flex: 1,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.cardBg,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  placeholderText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.cardBg,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timerText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stopButton: {
    backgroundColor: '#E8569D',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scoreGood: {
    color: '#22c55e',
  },
  scoreOkay: {
    color: '#eab308',
  },
  scorePoor: {
    color: '#ef4444',
  },
  statsText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
