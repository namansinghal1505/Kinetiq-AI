/**
 * PoseCamera Component
 * 
 * Uses expo-camera and TensorFlow.js/MediaPipe for real-time pose detection
 * Replaces the PoseTracker.com WebView dependency with local processing
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { colors, spacing, fontSize } from '../theme';
import { poseDetectionService, Pose } from '../services/PoseDetectionService';
import { exerciseScoringService } from '../services/ExerciseScoringService';
import { voiceManager } from '../services/VoiceFeedbackManager';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PoseCameraProps {
  exercise: string;
  isActive: boolean;
  onRepsChange?: (reps: number) => void;
  onScoreChange?: (score: number) => void;
  onFeedbackChange?: (feedback: string[]) => void;
  onStatusChange?: (status: string) => void;
  onPoseDetected?: (pose: Pose) => void;
  voiceEnabled?: boolean;
  showSkeleton?: boolean;
  showDebugInfo?: boolean;
}

// MoveNet keypoint connections for drawing skeleton
const SKELETON_CONNECTIONS = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

const KEYPOINT_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];

export const PoseCamera: React.FC<PoseCameraProps> = ({
  exercise,
  isActive,
  onRepsChange,
  onScoreChange,
  onFeedbackChange,
  onStatusChange,
  onPoseDetected,
  voiceEnabled = true,
  showSkeleton = true,
  showDebugInfo = false,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [currentPose, setCurrentPose] = useState<Pose | null>(null);
  const [reps, setReps] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [phase, setPhase] = useState('starting');
  const [fps, setFps] = useState(0);
  const [facing, setFacing] = useState<CameraType>('front');
  
  const cameraRef = useRef<CameraView>(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const processingRef = useRef(false);
  const lastFeedbackTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize pose detection service
  useEffect(() => {
    const initializeDetector = async () => {
      try {
        setStatus('Loading AI model...');
        onStatusChange?.('Loading AI model...');
        
        await poseDetectionService.initialize();
        
        setIsInitialized(true);
        setStatus('Ready - Position yourself in frame');
        onStatusChange?.('Ready - Position yourself in frame');
        
        if (voiceEnabled) {
          voiceManager.speakText('Pose detection ready. Position yourself in the camera frame.', 0);
        }
      } catch (error) {
        console.error('[PoseCamera] Failed to initialize:', error);
        setStatus('Failed to load AI model');
        onStatusChange?.('Failed to load AI model');
      }
    };

    initializeDetector();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Start/stop exercise session
  useEffect(() => {
    if (isActive && isInitialized) {
      exerciseScoringService.startSession(exercise);
      setReps(0);
      setScore(0);
      setFeedback([]);
      setPhase('starting');
      setStatus('Exercise started - Begin your reps!');
      onStatusChange?.('Exercise started - Begin your reps!');
      
      if (voiceEnabled) {
        voiceManager.speakText(`Starting ${exercise}. Begin when ready.`, 0);
      }
      
      // Start frame processing
      startFrameProcessing();
    } else if (!isActive) {
      // Stop processing
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (!isActive) {
        const summary = exerciseScoringService.endSession();
        console.log('[PoseCamera] Session ended:', summary);
      }
    };
  }, [isActive, isInitialized, exercise]);

  // Update voice manager state
  useEffect(() => {
    voiceManager.setEnabled(voiceEnabled);
  }, [voiceEnabled]);

  // Frame processing loop
  const startFrameProcessing = useCallback(() => {
    const processFrame = async () => {
      if (!isActive || !isInitialized || processingRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      processingRef.current = true;

      try {
        // Capture frame from camera
        if (cameraRef.current) {
          const photo = await cameraRef.current.takePictureAsync({
            base64: true,
            quality: 0.5,
            skipProcessing: true,
          });

          if (photo?.base64) {
            // Detect pose
            const poses = await poseDetectionService.detectPose(photo.base64);
            
            if (poses && poses.length > 0) {
              const pose = poses[0];
              setCurrentPose(pose);
              onPoseDetected?.(pose);
              
              // Process through scoring service
              const result = exerciseScoringService.processPose(pose);
              
              // Update state
              if (result.repCount !== reps) {
                setReps(result.repCount);
                onRepsChange?.(result.repCount);
                
                // Voice feedback for rep completion
                if (voiceEnabled && result.repCompleted) {
                  const stats = exerciseScoringService.getCurrentStats();
                  if (stats.lastRepScore && stats.lastRepScore >= 85) {
                    voiceManager.speakText('Great rep!', 0);
                  } else if (stats.lastRepScore && stats.lastRepScore >= 70) {
                    voiceManager.speakText('Good rep.', 0);
                  } else {
                    voiceManager.speakText('Keep working on form.', 1);
                  }
                }
              }
              
              setScore(result.currentScore);
              onScoreChange?.(result.currentScore);
              setPhase(result.phase.phase);
              
              // Throttle feedback updates
              const now = Date.now();
              if (now - lastFeedbackTimeRef.current > 2000 && result.feedback.length > 0) {
                setFeedback(result.feedback);
                onFeedbackChange?.(result.feedback);
                lastFeedbackTimeRef.current = now;
                
                // Voice feedback for form corrections
                if (voiceEnabled && result.currentScore < 70 && result.feedback[0]) {
                  voiceManager.speakText(result.feedback[0], 1);
                }
              }
              
              setStatus(`Phase: ${result.phase.phase} | Score: ${result.currentScore}`);
            } else {
              setStatus('No pose detected - Position yourself in frame');
            }

            // Calculate FPS
            frameCountRef.current++;
            const now = Date.now();
            if (now - lastFrameTimeRef.current >= 1000) {
              setFps(frameCountRef.current);
              frameCountRef.current = 0;
              lastFrameTimeRef.current = now;
            }
          }
        }
      } catch (error) {
        console.error('[PoseCamera] Frame processing error:', error);
      }

      processingRef.current = false;
      
      // Continue processing loop (throttle to ~10 FPS for performance)
      setTimeout(() => {
        if (isActive) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
        }
      }, 100);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isActive, isInitialized, reps, voiceEnabled, onRepsChange, onScoreChange, onFeedbackChange, onPoseDetected]);

  // Render skeleton overlay
  const renderSkeleton = () => {
    if (!currentPose || !showSkeleton) return null;

    const keypoints = currentPose.keypoints;
    if (!keypoints || keypoints.length === 0) return null;

    // Create keypoint map for easy lookup
    const keypointMap: { [key: string]: { x: number; y: number; score?: number } } = {};
    keypoints.forEach((kp, index) => {
      const name = kp.name || KEYPOINT_NAMES[index];
      if (name) {
        keypointMap[name] = kp;
      }
    });

    return (
      <View style={styles.skeletonOverlay} pointerEvents="none">
        {/* Draw connections */}
        {SKELETON_CONNECTIONS.map(([from, to], index) => {
          const fromPoint = keypointMap[from];
          const toPoint = keypointMap[to];
          
          if (!fromPoint || !toPoint) return null;
          if ((fromPoint.score || 0) < 0.3 || (toPoint.score || 0) < 0.3) return null;

          const x1 = fromPoint.x * SCREEN_WIDTH;
          const y1 = fromPoint.y * SCREEN_HEIGHT;
          const x2 = toPoint.x * SCREEN_WIDTH;
          const y2 = toPoint.y * SCREEN_HEIGHT;
          
          const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

          return (
            <View
              key={`line-${index}`}
              style={[
                styles.skeletonLine,
                {
                  width: length,
                  left: x1,
                  top: y1,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                  backgroundColor: score >= 70 ? colors.success : score >= 50 ? colors.warning : colors.error,
                },
              ]}
            />
          );
        })}

        {/* Draw keypoints */}
        {keypoints.map((kp, index) => {
          if ((kp.score || 0) < 0.3) return null;
          
          return (
            <View
              key={`point-${index}`}
              style={[
                styles.skeletonPoint,
                {
                  left: kp.x * SCREEN_WIDTH - 6,
                  top: kp.y * SCREEN_HEIGHT - 6,
                  backgroundColor: score >= 70 ? colors.success : score >= 50 ? colors.warning : colors.error,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  // Request camera permission
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.statusText}>Checking camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>Camera permission required</Text>
        <Text 
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          Grant Permission
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Skeleton overlay */}
        {renderSkeleton()}

        {/* Loading overlay */}
        {!isInitialized && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{status}</Text>
          </View>
        )}

        {/* Stats overlay */}
        <View style={styles.statsOverlay}>
          {/* Rep counter */}
          <View style={styles.repContainer}>
            <Text style={styles.repCount}>{reps}</Text>
            <Text style={styles.repLabel}>REPS</Text>
          </View>

          {/* Score */}
          <View style={[styles.scoreContainer, { borderColor: score >= 70 ? colors.success : score >= 50 ? colors.warning : colors.error }]}>
            <Text style={[styles.scoreText, { color: score >= 70 ? colors.success : score >= 50 ? colors.warning : colors.error }]}>
              {score}
            </Text>
            <Text style={styles.scoreLabel}>SCORE</Text>
          </View>

          {/* Phase indicator */}
          <View style={styles.phaseContainer}>
            <Text style={styles.phaseText}>{phase.toUpperCase()}</Text>
          </View>
        </View>

        {/* Feedback overlay */}
        {feedback.length > 0 && (
          <View style={styles.feedbackOverlay}>
            {feedback.slice(0, 2).map((fb, index) => (
              <Text key={index} style={styles.feedbackText}>{fb}</Text>
            ))}
          </View>
        )}

        {/* Debug info */}
        {showDebugInfo && (
          <View style={styles.debugOverlay}>
            <Text style={styles.debugText}>FPS: {fps}</Text>
            <Text style={styles.debugText}>Exercise: {exercise}</Text>
            <Text style={styles.debugText}>Status: {status}</Text>
            <Text style={styles.debugText}>Keypoints: {currentPose?.keypoints?.length || 0}</Text>
          </View>
        )}

        {/* Status bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusBarText}>{status}</Text>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  statsOverlay: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  repContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 80,
  },
  repCount: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: 'bold',
  },
  repLabel: {
    color: colors.white,
    fontSize: fontSize.sm,
    opacity: 0.8,
  },
  scoreContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 2,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: colors.white,
    fontSize: fontSize.sm,
    opacity: 0.8,
  },
  phaseContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  phaseText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  feedbackOverlay: {
    position: 'absolute',
    bottom: 120,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: spacing.md,
  },
  feedbackText: {
    color: colors.warning,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginVertical: 2,
  },
  statusBar: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: spacing.sm,
  },
  statusBarText: {
    color: colors.white,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  debugOverlay: {
    position: 'absolute',
    top: 100,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: spacing.sm,
  },
  debugText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  skeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  skeletonLine: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
  },
  skeletonPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  statusText: {
    color: colors.gray700,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  permissionButton: {
    color: colors.primary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    padding: spacing.md,
    textDecorationLine: 'underline',
  },
});

export default PoseCamera;
