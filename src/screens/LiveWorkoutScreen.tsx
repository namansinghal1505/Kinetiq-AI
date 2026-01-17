import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image as RNImage
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { poseDetectionService, Pose, PostureAnalysis, DetectionResponse } from '../services/PoseDetectionService';
import { storageService } from '../services/StorageService';
import { colors, spacing, fontSize } from '../theme';
import { SkeletonOverlay } from '../components/SkeletonOverlay';
import { voiceManager } from '../services/VoiceFeedbackManager';

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

  const [permission, requestPermission] = useCameraPermissions();
  const [isActive, setIsActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentPose, setCurrentPose] = useState<Pose | null>(null);
  const [postureAnalysis, setPostureAnalysis] = useState<PostureAnalysis | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [isDetectorReady, setIsDetectorReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });

  // Throttling for backend calls
  const isProcessingRef = useRef(false);
  const lastProcessTimeRef = useRef(0);
  const MIN_FRAME_TIME = 100; // 10 FPS for smoother feedback (was 200ms)

  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const poseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      startTimer();
      startPoseDetection();
    } else {
      stopTimer();
      stopPoseDetection();
    }
  }, [isActive]);

  const initializeDetector = async (): Promise<boolean> => {
    if (isDetectorReady) return true;
    setIsInitializing(true);
    try {
      await poseDetectionService.initialize();
      const ready = poseDetectionService.isReady();
      setIsDetectorReady(ready);
      setIsInitializing(false);
      return ready;
    } catch (error) {
      console.error('Initialization failed:', error);
      setIsInitializing(false);
      Alert.alert(
        'Connection Error',
        'Could not connect to pose detection server. Check if backend is running.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

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

  const startPoseDetection = () => {
    if (!isDetectorReady) {
      Alert.alert('Error', 'Server not connected.');
      setIsActive(false);
      return;
    }

    // Faster interval check for smoother target FPS
    poseIntervalRef.current = setInterval(async () => {
      const now = Date.now();
      if (isProcessingRef.current || (now - lastProcessTimeRef.current < MIN_FRAME_TIME)) {
        return;
      }
      await detectPose();
    }, 50);
  };

  const stopPoseDetection = () => {
    if (poseIntervalRef.current) {
      clearInterval(poseIntervalRef.current);
      poseIntervalRef.current = null;
    }
  };

  const detectPose = async () => {
    if (!cameraRef.current || !isActive) return;

    try {
      isProcessingRef.current = true;
      lastProcessTimeRef.current = Date.now();

      // Take a snapshot
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3, // Reduced quality for faster transfer
        base64: true,
        skipProcessing: true,
        imageType: 'jpg',
        shutterSound: false,
      });

      if (!photo || !photo.base64) {
        isProcessingRef.current = false;
        return;
      }

      // Send to backend
      const result: DetectionResponse | null = await poseDetectionService.detectAndAnalyze(photo.base64, exercise);

      if (result && result.success && result.poses.length > 0) {
        const pose = result.poses[0];
        setCurrentPose(pose); // Backend returns normalized (0-1) coordinates
        setPostureAnalysis(result.analysis);

        // Voice Feedback
        if (isActive) {
          voiceManager.handleAnalysis(result.analysis);
        }

        if (isActive && result.analysis.color !== 'white') {
          setScores(prev => [...prev, result.analysis.score]);
        }
      } else if (result && !result.success) {
        // Keep showing last valid pose or clear? 
        // If no pose detected, maybe clear
        // setCurrentPose(null);
        if (result.analysis) {
          setPostureAnalysis(result.analysis); // Show "No pose detected" feedback
        }
      }

    } catch (error) {
      console.error('Pose detection loop error:', error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleStartStop = async () => {
    if (isActive) {
      finishWorkout();
    } else {
      if (!isDetectorReady) {
        const initialized = await initializeDetector();
        if (!initialized) return;
      }
      setIsActive(true);
      setTimeElapsed(0);
      setScores([]);
    }
  };

  const finishWorkout = async () => {
    setIsActive(false);
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    const sessionData = {
      id: Date.now().toString(),
      exerciseName: exercise,
      date: new Date().toISOString(),
      duration: timeElapsed,
      averageScore: Math.round(averageScore),
      mistakes: postureAnalysis?.mistakes || [],
      feedback: [...(postureAnalysis?.feedback || [])],
      timestamp: Date.now(),
    };

    await storageService.saveSession(sessionData);
    navigation.navigate('SessionSummary', { session: sessionData });
  };

  const cleanup = () => {
    stopTimer();
    stopPoseDetection();
    voiceManager.cancel();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color={colors.gray400} />
        <Text style={styles.errorText}>Camera permission required</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestPermission}>
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.exerciseTitle}>{exercise}</Text>
        <View style={{ width: 40 }} />
      </View>



      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setCameraLayout({ width, height });
          }}
        >
          {/* Skeleton Overlay */}
          {cameraLayout.width > 0 && (
            <SkeletonOverlay
              pose={currentPose}
              analysis={postureAnalysis}
              width={cameraLayout.width}
              height={cameraLayout.height}
            />
          )}
        </CameraView>

        {/* Score Indicator */}
        {postureAnalysis && (
          <View
            style={[
              styles.scoreIndicator,
              {
                backgroundColor:
                  postureAnalysis.color === 'green'
                    ? '#56E8A050'
                    : postureAnalysis.color === 'yellow'
                      ? '#E8C95650'
                      : '#E8569D50',
              },
            ]}
          >
            <Text style={styles.scoreText}>{Math.round(postureAnalysis.score)}</Text>
            <Text style={styles.scoreLabel}>Score</Text>
          </View>
        )}

        {/* Visibility Warning Overlay */}
        {postureAnalysis && postureAnalysis.color === 'white' && (
          <View style={styles.visibilityWarningOverlay}>
            <Ionicons name="scan-outline" size={64} color={colors.white} />
            <Text style={styles.visibilityWarningText}>Step Back</Text>
            <Text style={styles.visibilityWarningSubtext}>Make sure your full body is visible</Text>
          </View>
        )}

        {/* Feedback Box - Only show if visible */}
        {postureAnalysis && isActive && postureAnalysis.color !== 'white' && (
          <View style={styles.feedbackBox}>
            {postureAnalysis.isCorrect ? (
              <View style={styles.feedbackRow}>
                <Ionicons name="checkmark-circle" size={24} color="#56E8A0" />
                <Text style={styles.feedbackTextGood}>Perfect Form!</Text>
              </View>
            ) : (
              <View>
                {postureAnalysis.mistakes.slice(0, 2).map((mistake, index) => (
                  <View key={index} style={styles.feedbackRow}>
                    <Ionicons name="alert-circle" size={20} color="#E8C956" />
                    <Text style={styles.feedbackTextWarning}>{mistake}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Feedback messages */}
            {postureAnalysis.feedback.length > 0 && !postureAnalysis.isCorrect && (
              <View style={{ marginTop: 4 }}>
                <Text style={[styles.feedbackTextWarning, { fontStyle: 'italic', opacity: 0.8 }]}>
                  {postureAnalysis.feedback[0]}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={32} color={colors.primary} />
          <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.actionButton,
            isActive && styles.stopButton,
            isInitializing && styles.initializingButton
          ]}
          onPress={handleStartStop}
          disabled={isInitializing}
        >
          {isInitializing ? (
            <ActivityIndicator size={32} color={colors.white} />
          ) : (
            <Ionicons
              name={isActive ? 'stop' : 'play'}
              size={32}
              color={colors.white}
            />
          )}
        </TouchableOpacity>

        {isActive && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              Avg: {scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
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
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.cardBg,
    margin: spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  scoreIndicator: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 80,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
  },
  scoreLabel: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.9,
  },
  feedbackBox: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: spacing.md,
    borderRadius: 15,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: 4,
  },
  feedbackTextGood: {
    fontSize: fontSize.md,
    color: '#56E8A0',
    fontWeight: '600',
    flex: 1,
  },
  feedbackTextWarning: {
    fontSize: fontSize.sm,
    color: '#E8C956',
    flex: 1,
  },
  controls: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  stopButton: {
    backgroundColor: '#E8569D',
  },
  initializingButton: {
    backgroundColor: '#7556E8',
    opacity: 0.8,
  },
  statsContainer: {
    padding: spacing.md,
    backgroundColor: colors.cardBg,
    borderRadius: 15,
  },
  statsText: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
    color: colors.gray400,
    fontWeight: '600',
  },
  errorText: {
    marginTop: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.gray400,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 25,
  },
  retryButtonText: {
    fontSize: fontSize.md,
    color: colors.white,
    fontWeight: '600',
  },
  visibilityWarningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  visibilityWarningText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  visibilityWarningSubtext: {
    fontSize: fontSize.md,
    color: colors.gray200,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});