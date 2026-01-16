import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../theme';
import { voiceManager } from '../services/VoiceFeedbackManager';
import { exerciseScoringService } from '../services/ExerciseScoringService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Map common exercise names to PoseTracker API expected format
// PoseTracker uses snake_case or specific exercise identifiers
const EXERCISE_MAPPING: Record<string, string> = {
  // Standard exercises
  'squat': 'squat',
  'squats': 'squat',
  'push-up': 'pushup',
  'push up': 'pushup',
  'pushup': 'pushup',
  'pushups': 'pushup',
  'plank': 'plank',
  'lunge': 'lunge',
  'lunges': 'lunge',
  'bicep curl': 'bicep_curl',
  'bicep curls': 'bicep_curl',
  'curl': 'bicep_curl',
  'curls': 'bicep_curl',
  // Arm/Shoulder exercises
  'front arm raise': 'front_arm_raise',
  'front arm raises': 'front_arm_raise',
  'front raise': 'front_arm_raise',
  'shoulder raise': 'lateral_raise',
  'shoulder raises': 'lateral_raise',
  'lateral raise': 'lateral_raise',
  'lateral raises': 'lateral_raise',
  'side raise': 'lateral_raise',
  'side raises': 'lateral_raise',
  'overhead press': 'overhead_press',
  'shoulder press': 'overhead_press',
  // Other exercises
  'jumping jack': 'jumping_jacks',
  'jumping jacks': 'jumping_jacks',
  'sit-up': 'situp',
  'sit up': 'situp',
  'situp': 'situp',
  'situps': 'situp',
  'crunch': 'crunch',
  'crunches': 'crunch',
  'burpee': 'burpee',
  'burpees': 'burpee',
  'high knee': 'high_knees',
  'high knees': 'high_knees',
  'mountain climber': 'mountain_climbers',
  'mountain climbers': 'mountain_climbers',
};

// Convert exercise name to PoseTracker format
const formatExerciseForAPI = (exercise: string): string => {
  const normalized = exercise.toLowerCase().trim();
  return EXERCISE_MAPPING[normalized] || normalized.replace(/\s+/g, '_');
};

interface PoseTrackerWebViewProps {
  exercise: string;
  apiKey: string;
  onRepsChange?: (reps: number) => void;
  onStatusChange?: (status: string) => void;
  onDataReceived?: (data: any) => void;
  onScoreChange?: (score: number) => void;
  onFeedbackChange?: (feedback: string[]) => void;
  difficulty?: 'easy' | 'medium' | 'hard';
  voiceEnabled?: boolean;
}

interface PoseTrackerData {
  type?: string;
  current_count?: number;
  ready?: boolean;
  postureDirection?: string;
  score?: number;
  confidence?: number;
  keypoints?: Array<{ x: number; y: number; score?: number; name?: string }>;
  [key: string]: any;
}

export const PoseTrackerWebView: React.FC<PoseTrackerWebViewProps> = ({
  exercise,
  apiKey,
  onRepsChange,
  onStatusChange,
  onDataReceived,
  onScoreChange,
  onFeedbackChange,
  difficulty = 'medium',
  voiceEnabled = true,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repsCount, setRepsCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [postureMessage, setPostureMessage] = useState<string>('');
  const [detectionStatus, setDetectionStatus] = useState<string>('Initializing...');
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [formFeedback, setFormFeedback] = useState<string[]>([]);
  const [movementPhase, setMovementPhase] = useState<string>('starting');
  const webViewRef = useRef<WebView>(null);
  const lastFeedbackTime = useRef<number>(0);

  // Initialize scoring service when exercise changes
  useEffect(() => {
    exerciseScoringService.startSession(exercise);
    console.log(`[PoseTracker] Started scoring session for: ${exercise}`);
    
    return () => {
      // Clean up scoring session
      const summary = exerciseScoringService.endSession();
      console.log('[PoseTracker] Session summary:', summary);
    };
  }, [exercise]);

  // Update voice manager enabled state
  React.useEffect(() => {
    voiceManager.setEnabled(voiceEnabled);
  }, [voiceEnabled]);

  // Format exercise name for PoseTracker API
  const formattedExercise = formatExerciseForAPI(exercise);
  console.log(`[PoseTracker] Original exercise: "${exercise}" -> API format: "${formattedExercise}"`);

  // Build PoseTracker URL with all required parameters
  // Include callback parameter to receive updates
  const poseTrackerUrl = `https://app.posetracker.com/pose_tracker/tracking?token=${apiKey}&exercise=${formattedExercise}&difficulty=${difficulty}&width=${SCREEN_WIDTH}&height=${SCREEN_HEIGHT}&isMobile=${Platform.OS === 'ios' || Platform.OS === 'android'}&skeleton=true&callback=poseCallback`;
  
  console.log(`[PoseTracker] URL: ${poseTrackerUrl}`);

  // JavaScript bridge for communication between WebView and React Native
  // PoseTracker sends data via specific callback - we need to hook into it
  const jsBridge = `
    (function() {
      var lastRepCount = 0;
      var lastScore = 0;
      
      // Log all incoming data for debugging
      function sendToRN(data) {
        try {
          if (!data) return;
          const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
          console.log('[PoseTracker Bridge] Sending to RN:', jsonStr);
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(jsonStr);
          }
        } catch(e) {
          console.error('[PoseTracker Bridge] Error:', e);
        }
      }
      
      // PoseTracker uses window.poseCallback for exercise updates
      window.poseCallback = function(data) {
        console.log('[PoseTracker Bridge] poseCallback:', JSON.stringify(data));
        sendToRN(data);
      };
      
      // Alternative callback name
      window.webViewCallback = function(data) {
        console.log('[PoseTracker Bridge] webViewCallback:', JSON.stringify(data));
        sendToRN(data);
      };
      
      // Some versions use onPoseUpdate
      window.onPoseUpdate = function(data) {
        console.log('[PoseTracker Bridge] onPoseUpdate:', JSON.stringify(data));
        sendToRN(data);
      };
      
      // Listen for postMessage events
      window.addEventListener('message', function(event) {
        if (event.data) {
          console.log('[PoseTracker Bridge] message event:', typeof event.data);
          sendToRN(event.data);
        }
      });
      
      // Monitor DOM for rep counter changes (PoseTracker often displays count in DOM)
      function checkDOMForUpdates() {
        try {
          // Look for common counter elements
          var counterSelectors = [
            '.counter', '.rep-counter', '.reps', '#counter', '#reps',
            '[data-reps]', '[data-count]', '.count', '#count',
            '.exercise-counter', '.rep-count'
          ];
          
          for (var i = 0; i < counterSelectors.length; i++) {
            var el = document.querySelector(counterSelectors[i]);
            if (el) {
              var text = el.textContent || el.innerText;
              var num = parseInt(text, 10);
              if (!isNaN(num) && num !== lastRepCount && num >= 0) {
                lastRepCount = num;
                console.log('[PoseTracker Bridge] DOM counter found:', num);
                sendToRN({ type: 'counter', current_count: num, source: 'dom' });
              }
            }
          }
          
          // Look for score elements
          var scoreSelectors = ['.score', '#score', '.form-score', '[data-score]'];
          for (var i = 0; i < scoreSelectors.length; i++) {
            var el = document.querySelector(scoreSelectors[i]);
            if (el) {
              var text = el.textContent || el.innerText;
              var num = parseInt(text, 10);
              if (!isNaN(num) && num !== lastScore && num >= 0 && num <= 100) {
                lastScore = num;
                sendToRN({ type: 'score', score: num, source: 'dom' });
              }
            }
          }
        } catch(e) {
          console.error('[PoseTracker Bridge] DOM check error:', e);
        }
      }
      
      // Poll for updates every 300ms
      setInterval(checkDOMForUpdates, 300);
      
      // Also intercept any AJAX/fetch calls that might contain data
      var origFetch = window.fetch;
      if (origFetch) {
        window.fetch = function() {
          return origFetch.apply(this, arguments).then(function(response) {
            var clone = response.clone();
            clone.json().then(function(data) {
              if (data && (data.count !== undefined || data.reps !== undefined || data.keypoints)) {
                console.log('[PoseTracker Bridge] fetch intercepted:', JSON.stringify(data));
                sendToRN(data);
              }
            }).catch(function() {});
            return response;
          });
        };
      }
      
      console.log('[PoseTracker Bridge] Initialized with DOM monitoring');
    })();
    true;
  `;

  // Handle data received from PoseTracker
  const handlePoseTrackerData = useCallback((data: PoseTrackerData) => {
    console.log('[PoseTracker] Received data type:', typeof data, 'keys:', data ? Object.keys(data) : 'null');

    // Handle rep counter updates - check multiple possible field names
    const repCount = data.current_count ?? data.count ?? data.reps ?? data.rep_count;
    if (repCount !== undefined && repCount !== null) {
      console.log(`[PoseTracker] Rep count detected: ${repCount}`);
      setRepsCount(repCount);
      onRepsChange?.(repCount);
    }

    // Also check for type === 'counter' format
    if (data.type === 'counter' && data.current_count !== undefined) {
      console.log(`[PoseTracker] Counter type rep: ${data.current_count}`);
      setRepsCount(data.current_count);
      onRepsChange?.(data.current_count);
    }

    // Handle keypoint data for scoring - check multiple possible field names
    const keypoints = data.keypoints || data.landmarks || data.pose?.keypoints || data.pose?.landmarks;
    if (keypoints && Array.isArray(keypoints) && keypoints.length > 0) {
      console.log(`[PoseTracker] Keypoints detected: ${keypoints.length} points`);
      
      // Create pose object for scoring service
      const pose = {
        keypoints: keypoints,
        score: data.confidence || data.score || 0.8,
      };
      
      // Process pose through scoring service
      const scoringResult = exerciseScoringService.processPose(pose);
      
      // Update state with scoring results
      setCurrentScore(scoringResult.currentScore);
      setMovementPhase(scoringResult.phase.phase);
      onScoreChange?.(scoringResult.currentScore);
      
      // Update feedback (throttled to avoid too frequent updates)
      const now = Date.now();
      if (now - lastFeedbackTime.current > 2000 && scoringResult.feedback.length > 0) {
        setFormFeedback(scoringResult.feedback);
        onFeedbackChange?.(scoringResult.feedback);
        lastFeedbackTime.current = now;
        
        // Voice feedback for form corrections
        if (scoringResult.currentScore < 70 && scoringResult.feedback[0]) {
          voiceManager.speakText(scoringResult.feedback[0], 1);
        }
      }
      
      // Handle rep completion from scoring service
      if (scoringResult.repCompleted) {
        const stats = exerciseScoringService.getCurrentStats();
        console.log(`[PoseTracker] Rep completed! Score: ${stats.lastRepScore}, Avg: ${stats.averageScore}`);
        
        // Speak rep completion feedback
        if (stats.lastRepScore && stats.lastRepScore >= 85) {
          voiceManager.speakText('Great rep!', 0);
        } else if (stats.lastRepScore && stats.lastRepScore >= 70) {
          voiceManager.speakText('Good rep.', 0);
        }
      }
    }

    // Handle angle data from PoseTracker (alternative format)
    if (data.angles || data.joint_angles) {
      console.log('[PoseTracker] Angles detected:', data.angles || data.joint_angles);
      // PoseTracker may send angle data directly for scoring
      const angles = data.angles || data.joint_angles;
      // You can use these angles for form feedback
    }

    // Handle score data directly from PoseTracker
    if (data.form_score !== undefined || data.formScore !== undefined) {
      const formScore = data.form_score ?? data.formScore;
      console.log(`[PoseTracker] Form score from API: ${formScore}`);
      setCurrentScore(formScore);
      onScoreChange?.(formScore);
    }

    // Handle positioning/readiness
    if (data.ready !== undefined) {
      setIsReady(data.ready);
      if (!data.ready && data.postureDirection) {
        const message = `Move ${data.postureDirection}`;
        setPostureMessage(message);
        setDetectionStatus(`Position: ${message}`);
        // Speak positioning instruction
        voiceManager.speakText(message, 1);
      } else if (data.ready) {
        const message = 'Ready to start!';
        setPostureMessage(message);
        setDetectionStatus('Ready - Start exercising!');
        // Speak readiness confirmation
        voiceManager.speakText(message, 0);
      }
    }

    // Handle form score from PoseTracker (fallback if no keypoints)
    if (data.score !== undefined && !data.keypoints) {
      setCurrentScore(data.score);
      onScoreChange?.(data.score);
      console.log(`[PoseTracker] Form score: ${data.score}`);
      // Provide voice feedback based on score
      if (data.score >= 85) {
        voiceManager.speakText('Good form, keep going.', 0);
      } else if (data.score >= 60) {
        voiceManager.speakText('Adjust your form slightly.', 1);
      } else {
        voiceManager.speakText('Check your posture.', 2);
      }
    }

    // Emit general data received callback
    onDataReceived?.(data);
    onStatusChange?.(detectionStatus);
  }, [onRepsChange, onDataReceived, onStatusChange, onScoreChange, onFeedbackChange, detectionStatus]);

  // Handle messages from WebView
  const handleMessage = useCallback((event: any) => {
    try {
      const rawData = event.nativeEvent.data;
      console.log('[PoseTracker] Raw WebView message received:', typeof rawData, rawData?.substring?.(0, 200) || rawData);
      
      let parsedData: PoseTrackerData;

      if (typeof rawData === 'string') {
        // Try parsing as JSON
        try {
          parsedData = JSON.parse(rawData);
        } catch {
          // Maybe it's double-stringified
          try {
            parsedData = JSON.parse(JSON.parse(rawData));
          } catch {
            console.log('[PoseTracker] Could not parse as JSON, checking for structured data');
            // Check if it contains useful data patterns
            if (rawData.includes('count') || rawData.includes('keypoints') || rawData.includes('pose')) {
              console.log('[PoseTracker] String contains pose-related keywords but failed to parse');
            }
            return;
          }
        }
      } else if (typeof rawData === 'object' && rawData !== null) {
        parsedData = rawData;
      } else {
        console.log('[PoseTracker] Unknown data format:', typeof rawData);
        return;
      }

      // Successfully parsed - process the data
      if (parsedData && typeof parsedData === 'object') {
        handlePoseTrackerData(parsedData);
      }
    } catch (error) {
      console.error('[PoseTracker] Error handling WebView message:', error);
      console.log('[PoseTracker] Event data:', event.nativeEvent?.data);
    }
  }, [handlePoseTrackerData]);

  // Handle WebView load start
  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
    setDetectionStatus('Loading PoseTracker...');
    onStatusChange?.('Loading PoseTracker...');
  };

  // Handle WebView load end
  const handleLoadEnd = () => {
    setIsLoading(false);
    setDetectionStatus('Initializing pose detection...');
    onStatusChange?.('Initializing pose detection...');
  };

  // Handle WebView errors
  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[PoseTracker] WebView error:', nativeEvent);
    const errorMsg = nativeEvent.description || 'Failed to load PoseTracker';
    setError(errorMsg);
    setDetectionStatus(`Error: ${errorMsg}`);
    onStatusChange?.(`Error: ${errorMsg}`);
  };

  // Retry loading
  const handleRetry = () => {
    setError(null);
    webViewRef.current?.reload();
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.error} />
        <Text style={styles.errorTitle}>PoseTracker Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorUrl}>URL: {poseTrackerUrl}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{detectionStatus}</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: poseTrackerUrl }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        injectedJavaScript={jsBridge}
        onMessage={handleMessage}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleWebViewError}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36"
      />

      {/* Status Overlay */}
      <View style={styles.statusOverlay}>
        {/* Reps Counter and Score */}
        <View style={styles.statsRow}>
          {repsCount > 0 && (
            <View style={styles.repsBox}>
              <Text style={styles.repsLabel}>REPS</Text>
              <Text style={styles.repsValue}>{repsCount}</Text>
            </View>
          )}
          
          {/* Score Display */}
          {currentScore > 0 && isReady && (
            <View style={[
              styles.scoreBox,
              currentScore >= 80 ? styles.scoreGood : 
              currentScore >= 60 ? styles.scoreOkay : styles.scorePoor
            ]}>
              <Text style={styles.scoreLabel}>FORM</Text>
              <Text style={styles.scoreValue}>{Math.round(currentScore)}%</Text>
            </View>
          )}
        </View>

        {/* Movement Phase Indicator */}
        {isReady && movementPhase !== 'starting' && (
          <View style={styles.phaseBox}>
            <Text style={styles.phaseText}>
              {movementPhase === 'down' ? '⬇️ Going Down' :
               movementPhase === 'bottom' ? '⏸️ Hold' :
               movementPhase === 'up' ? '⬆️ Coming Up' :
               movementPhase === 'top' ? '✓ Top' : ''}
            </Text>
          </View>
        )}

        {/* Form Feedback */}
        {formFeedback.length > 0 && isReady && (
          <View style={styles.feedbackBox}>
            {formFeedback.slice(0, 2).map((feedback, index) => (
              <Text key={index} style={styles.feedbackText}>{feedback}</Text>
            ))}
          </View>
        )}

        {/* Readiness Indicator */}
        {!isReady && (
          <View style={styles.positionBox}>
            <Ionicons name="alert-circle" size={16} color={colors.warning} />
            <Text style={styles.positionText}>{postureMessage}</Text>
          </View>
        )}

        {isReady && repsCount === 0 && (
          <View style={styles.readyBox}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.readyText}>Ready to Start!</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  webView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: spacing.lg,
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  statusOverlay: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  repsBox: {
    backgroundColor: 'rgba(245, 117, 16, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  repsLabel: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  repsValue: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  scoreBox: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  scoreGood: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  scoreOkay: {
    backgroundColor: 'rgba(234, 179, 8, 0.9)',
  },
  scorePoor: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  scoreLabel: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  scoreValue: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  phaseBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  phaseText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  feedbackBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  feedbackText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: 2,
  },
  positionBox: {
    backgroundColor: 'rgba(232, 201, 86, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  positionText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
  readyBox: {
    backgroundColor: 'rgba(86, 232, 160, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  readyText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  errorMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorUrl: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
});
