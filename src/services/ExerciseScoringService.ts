/**
 * Exercise Scoring Service
 * 
 * Tracks exercise movements, counts reps, and scores form quality
 * Works with pose keypoints from PoseNet/MoveNet to analyze movements
 */

import { Keypoint, Pose, PostureAnalysis } from './PoseDetectionService';

export interface MovementPhase {
  phase: 'starting' | 'down' | 'bottom' | 'up' | 'top';
  progress: number; // 0-1 progress through the phase
}

export interface RepScore {
  repNumber: number;
  score: number;
  feedback: string[];
  timestamp: number;
  phaseScores: {
    down: number;
    bottom: number;
    up: number;
  };
}

export interface ExerciseSession {
  exercise: string;
  reps: number;
  averageScore: number;
  repScores: RepScore[];
  totalTime: number;
  currentPhase: MovementPhase;
}

interface KeypointMap {
  [key: string]: number;
}

// MoveNet keypoint indices
const KEYPOINT_INDICES: KeypointMap = {
  'nose': 0,
  'left_eye': 1,
  'right_eye': 2,
  'left_ear': 3,
  'right_ear': 4,
  'left_shoulder': 5,
  'right_shoulder': 6,
  'left_elbow': 7,
  'right_elbow': 8,
  'left_wrist': 9,
  'right_wrist': 10,
  'left_hip': 11,
  'right_hip': 12,
  'left_knee': 13,
  'right_knee': 14,
  'left_ankle': 15,
  'right_ankle': 16,
};

export class ExerciseScoringService {
  private currentExercise: string = '';
  private repCount: number = 0;
  private repScores: RepScore[] = [];
  private currentPhase: MovementPhase = { phase: 'starting', progress: 0 };
  private previousPhase: string = 'starting';
  private sessionStartTime: number = 0;
  
  // Movement tracking state
  private movementHistory: number[] = [];
  private phaseStartScore: number = 100;
  private currentRepFeedback: string[] = [];
  
  // Thresholds for movement detection (normalized 0-1 coordinates)
  private movementThresholds = {
    squat: { downThreshold: 0.05, upThreshold: -0.03 },
    pushup: { downThreshold: 0.04, upThreshold: -0.03 },
    plank: { holdTime: 1000 }, // milliseconds
    lunge: { downThreshold: 0.05, upThreshold: -0.03 },
    curl: { downThreshold: 0.03, upThreshold: -0.02 },
    press: { upThreshold: -0.04, downThreshold: 0.03 },
    raise: { upThreshold: -0.03, downThreshold: 0.03 }, // for front/lateral raises
  };

  /**
   * Start a new exercise session
   */
  startSession(exercise: string): void {
    this.currentExercise = exercise.toLowerCase();
    this.repCount = 0;
    this.repScores = [];
    this.currentPhase = { phase: 'starting', progress: 0 };
    this.previousPhase = 'starting';
    this.sessionStartTime = Date.now();
    this.movementHistory = [];
    this.phaseStartScore = 100;
    this.currentRepFeedback = [];
    
    console.log(`[ExerciseScoring] Started session for: ${exercise}`);
  }

  /**
   * Process a pose frame and update scoring
   */
  processPose(pose: Pose): {
    repCount: number;
    currentScore: number;
    phase: MovementPhase;
    feedback: string[];
    repCompleted: boolean;
  } {
    if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
      return {
        repCount: this.repCount,
        currentScore: 0,
        phase: this.currentPhase,
        feedback: ['Position yourself in front of the camera'],
        repCompleted: false,
      };
    }

    // Analyze the current pose
    const analysis = this.analyzePoseForExercise(pose);
    
    // Track movement and detect phase changes
    const movementResult = this.trackMovement(pose, analysis);
    
    // Update phase
    this.currentPhase = movementResult.phase;
    
    // Check for rep completion
    let repCompleted = false;
    if (movementResult.repCompleted) {
      repCompleted = true;
      this.repCount++;
      
      // Calculate final rep score
      const repScore = this.calculateRepScore();
      this.repScores.push(repScore);
      
      // Reset for next rep
      this.phaseStartScore = 100;
      this.currentRepFeedback = [];
    }

    // Combine feedback
    const feedback = [
      ...analysis.feedback.slice(0, 2),
      ...this.currentRepFeedback.slice(0, 1),
    ];

    return {
      repCount: this.repCount,
      currentScore: analysis.score,
      phase: this.currentPhase,
      feedback,
      repCompleted,
    };
  }

  /**
   * Analyze pose based on current exercise type
   */
  private analyzePoseForExercise(pose: Pose): PostureAnalysis {
    const exercise = this.currentExercise;
    
    if (exercise.includes('squat')) {
      return this.analyzeSquat(pose);
    } else if (exercise.includes('push') || exercise.includes('pushup')) {
      return this.analyzePushUp(pose);
    } else if (exercise.includes('plank')) {
      return this.analyzePlank(pose);
    } else if (exercise.includes('lunge')) {
      return this.analyzeLunge(pose);
    } else if (exercise.includes('curl')) {
      return this.analyzeBicepCurl(pose);
    } else if (exercise.includes('press') || exercise.includes('overhead')) {
      return this.analyzeOverheadPress(pose);
    } else if (exercise.includes('front') && exercise.includes('raise')) {
      return this.analyzeFrontRaise(pose);
    } else if (exercise.includes('lateral') || exercise.includes('side')) {
      return this.analyzeLateralRaise(pose);
    } else if (exercise.includes('raise')) {
      return this.analyzeFrontRaise(pose); // Default raise to front raise
    }
    
    // Default generic analysis
    return this.analyzeGeneric(pose);
  }

  /**
   * Track movement and detect phase changes
   */
  private trackMovement(pose: Pose, analysis: PostureAnalysis): {
    phase: MovementPhase;
    repCompleted: boolean;
  } {
    const exercise = this.currentExercise;
    
    // Get the primary tracking point based on exercise
    const trackingValue = this.getTrackingValue(pose);
    
    // Add to movement history (keep last 10 frames)
    this.movementHistory.push(trackingValue);
    if (this.movementHistory.length > 10) {
      this.movementHistory.shift();
    }
    
    // Calculate movement velocity
    const velocity = this.calculateVelocity();
    
    // Determine phase based on exercise type
    return this.determinePhase(velocity, trackingValue, analysis);
  }

  /**
   * Get the primary tracking value for the current exercise
   */
  private getTrackingValue(pose: Pose): number {
    const exercise = this.currentExercise;
    const kp = pose.keypoints;
    
    if (exercise.includes('squat') || exercise.includes('lunge')) {
      // Track hip height relative to knee
      const hip = this.getKeypoint(kp, 'left_hip') || this.getKeypoint(kp, 'right_hip');
      const knee = this.getKeypoint(kp, 'left_knee') || this.getKeypoint(kp, 'right_knee');
      if (hip && knee) {
        return hip.y - knee.y; // Negative when hip is above knee
      }
    } else if (exercise.includes('push') || exercise.includes('pushup')) {
      // Track shoulder height relative to wrist
      const shoulder = this.getKeypoint(kp, 'left_shoulder') || this.getKeypoint(kp, 'right_shoulder');
      const wrist = this.getKeypoint(kp, 'left_wrist') || this.getKeypoint(kp, 'right_wrist');
      if (shoulder && wrist) {
        return shoulder.y - wrist.y;
      }
    } else if (exercise.includes('curl')) {
      // Track wrist height relative to shoulder
      const wrist = this.getKeypoint(kp, 'left_wrist') || this.getKeypoint(kp, 'right_wrist');
      const shoulder = this.getKeypoint(kp, 'left_shoulder') || this.getKeypoint(kp, 'right_shoulder');
      if (wrist && shoulder) {
        return wrist.y - shoulder.y; // Negative when wrist is above shoulder
      }
    } else if (exercise.includes('press') || exercise.includes('raise')) {
      // Track wrist height relative to head
      const wrist = this.getKeypoint(kp, 'left_wrist') || this.getKeypoint(kp, 'right_wrist');
      const nose = this.getKeypoint(kp, 'nose');
      if (wrist && nose) {
        return wrist.y - nose.y;
      }
    }
    
    // Default: track overall body height
    const hip = this.getKeypoint(kp, 'left_hip');
    return hip ? hip.y : 0.5;
  }

  /**
   * Calculate movement velocity from history
   */
  private calculateVelocity(): number {
    if (this.movementHistory.length < 3) return 0;
    
    const recent = this.movementHistory.slice(-3);
    return (recent[2] - recent[0]) / 2;
  }

  /**
   * Determine the current phase of the exercise
   */
  private determinePhase(velocity: number, trackingValue: number, analysis: PostureAnalysis): {
    phase: MovementPhase;
    repCompleted: boolean;
  } {
    const exercise = this.currentExercise;
    let newPhase = this.currentPhase.phase;
    let repCompleted = false;
    
    // Get thresholds for current exercise
    const thresholds = this.getThresholds(exercise);
    
    // State machine for phase detection
    switch (this.currentPhase.phase) {
      case 'starting':
      case 'top':
        // Waiting for downward movement
        if (velocity > thresholds.downThreshold) {
          newPhase = 'down';
          this.currentRepFeedback = [];
        }
        break;
        
      case 'down':
        // Check if we've reached the bottom
        if (Math.abs(velocity) < 0.01 && this.movementHistory.length >= 3) {
          newPhase = 'bottom';
        }
        // Collect feedback during down phase
        if (analysis.score < 70) {
          this.addFeedback(analysis.mistakes[0] || 'Watch your form');
        }
        break;
        
      case 'bottom':
        // Check for upward movement
        if (velocity < thresholds.upThreshold) {
          newPhase = 'up';
        }
        // Score the bottom position
        if (analysis.score < this.phaseStartScore) {
          this.phaseStartScore = analysis.score;
        }
        break;
        
      case 'up':
        // Check if we've reached the top
        if (Math.abs(velocity) < 0.01 && this.movementHistory.length >= 3) {
          newPhase = 'top';
          repCompleted = true;
        }
        // Collect feedback during up phase
        if (analysis.score < 70) {
          this.addFeedback(analysis.mistakes[0] || 'Control the movement');
        }
        break;
    }
    
    // Calculate progress through current phase
    const progress = this.calculatePhaseProgress(newPhase, trackingValue);
    
    return {
      phase: { phase: newPhase, progress },
      repCompleted,
    };
  }

  /**
   * Get movement thresholds for exercise
   */
  private getThresholds(exercise: string): { downThreshold: number; upThreshold: number } {
    if (exercise.includes('squat')) {
      return this.movementThresholds.squat;
    } else if (exercise.includes('push')) {
      return this.movementThresholds.pushup;
    } else if (exercise.includes('curl')) {
      return this.movementThresholds.curl;
    } else if (exercise.includes('press')) {
      return this.movementThresholds.press;
    } else if (exercise.includes('raise')) {
      return this.movementThresholds.raise;
    }
    // Default thresholds
    return { downThreshold: 0.04, upThreshold: -0.03 };
  }

  /**
   * Calculate progress through current phase (0-1)
   */
  private calculatePhaseProgress(phase: string, trackingValue: number): number {
    // Simplified progress calculation
    if (this.movementHistory.length < 2) return 0;
    
    const min = Math.min(...this.movementHistory);
    const max = Math.max(...this.movementHistory);
    const range = max - min;
    
    if (range === 0) return 0.5;
    
    return (trackingValue - min) / range;
  }

  /**
   * Add feedback without duplicates
   */
  private addFeedback(feedback: string): void {
    if (feedback && !this.currentRepFeedback.includes(feedback)) {
      this.currentRepFeedback.push(feedback);
    }
  }

  /**
   * Calculate final score for completed rep
   */
  private calculateRepScore(): RepScore {
    const avgScore = this.phaseStartScore;
    
    return {
      repNumber: this.repCount + 1,
      score: Math.round(avgScore),
      feedback: [...this.currentRepFeedback],
      timestamp: Date.now(),
      phaseScores: {
        down: avgScore,
        bottom: avgScore,
        up: avgScore,
      },
    };
  }

  /**
   * Get helper for keypoint by name
   */
  private getKeypoint(keypoints: Keypoint[], name: string): Keypoint | undefined {
    const index = KEYPOINT_INDICES[name];
    if (index !== undefined && keypoints[index]) {
      return keypoints[index];
    }
    return keypoints.find(kp => kp.name === name);
  }

  /**
   * Calculate angle between three points
   */
  private calculateAngle(p1?: Keypoint, p2?: Keypoint, p3?: Keypoint): number | null {
    if (!p1 || !p2 || !p3) return null;
    
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - 
                    Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    
    return angle;
  }

  // ============ Exercise-Specific Analysis ============

  private analyzeSquat(pose: Pose): PostureAnalysis {
    const kp = pose.keypoints;
    const mistakes: string[] = [];
    let score = 100;

    const leftHip = this.getKeypoint(kp, 'left_hip');
    const rightHip = this.getKeypoint(kp, 'right_hip');
    const leftKnee = this.getKeypoint(kp, 'left_knee');
    const rightKnee = this.getKeypoint(kp, 'right_knee');
    const leftAnkle = this.getKeypoint(kp, 'left_ankle');
    const rightAnkle = this.getKeypoint(kp, 'right_ankle');
    const leftShoulder = this.getKeypoint(kp, 'left_shoulder');

    if (!leftHip || !leftKnee || !leftAnkle) {
      return {
        score: 50,
        isCorrect: false,
        feedback: ['Position your full body in frame'],
        mistakes: ['Body not fully visible'],
        color: 'yellow',
      };
    }

    // Check squat depth
    const hipKneeDepth = leftHip.y - leftKnee.y;
    if (hipKneeDepth > 0.1) {
      mistakes.push('Go deeper - hips below knees');
      score -= 25;
    } else if (hipKneeDepth > 0.05) {
      mistakes.push('Try to go a bit deeper');
      score -= 15;
    }

    // Check knee alignment
    if (leftKnee && leftAnkle) {
      const kneeForward = leftKnee.x - leftAnkle.x;
      if (kneeForward > 0.15) {
        mistakes.push('Knees too far forward');
        score -= 20;
      }
    }

    // Check for knee cave
    if (leftKnee && rightKnee && leftHip && rightHip) {
      const kneeWidth = Math.abs(leftKnee.x - rightKnee.x);
      const hipWidth = Math.abs(leftHip.x - rightHip.x);
      if (kneeWidth < hipWidth * 0.7) {
        mistakes.push('Push knees out');
        score -= 20;
      }
    }

    // Check chest position
    if (leftShoulder && leftHip) {
      const leanAngle = Math.abs(leftShoulder.x - leftHip.x);
      if (leanAngle > 0.2) {
        mistakes.push('Keep chest up');
        score -= 15;
      }
    }

    const isCorrect = score >= 75;
    const color: 'green' | 'yellow' | 'red' = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';

    return {
      score: Math.max(0, score),
      isCorrect,
      feedback: isCorrect ? ['Great squat form!'] : mistakes.slice(0, 2),
      mistakes,
      color,
    };
  }

  private analyzePushUp(pose: Pose): PostureAnalysis {
    const kp = pose.keypoints;
    const mistakes: string[] = [];
    let score = 100;

    const leftShoulder = this.getKeypoint(kp, 'left_shoulder');
    const leftElbow = this.getKeypoint(kp, 'left_elbow');
    const leftWrist = this.getKeypoint(kp, 'left_wrist');
    const leftHip = this.getKeypoint(kp, 'left_hip');
    const leftAnkle = this.getKeypoint(kp, 'left_ankle');

    if (!leftShoulder || !leftElbow || !leftHip) {
      return {
        score: 50,
        isCorrect: false,
        feedback: ['Show your full body from the side'],
        mistakes: ['Body not fully visible'],
        color: 'yellow',
      };
    }

    // Check body alignment (straight line)
    if (leftAnkle && leftHip && leftShoulder) {
      const hipDrop = leftHip.y - ((leftShoulder.y + leftAnkle.y) / 2);
      if (hipDrop > 0.08) {
        mistakes.push('Hips sagging - engage core');
        score -= 25;
      } else if (hipDrop < -0.08) {
        mistakes.push('Hips too high');
        score -= 15;
      }
    }

    // Check elbow angle
    const elbowAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
    if (elbowAngle) {
      if (elbowAngle > 150) {
        mistakes.push('Go lower - bend elbows more');
        score -= 25;
      } else if (elbowAngle > 120) {
        mistakes.push('Try to go a bit lower');
        score -= 15;
      }
    }

    const isCorrect = score >= 75;
    const color: 'green' | 'yellow' | 'red' = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';

    return {
      score: Math.max(0, score),
      isCorrect,
      feedback: isCorrect ? ['Perfect push-up!'] : mistakes.slice(0, 2),
      mistakes,
      color,
    };
  }

  private analyzePlank(pose: Pose): PostureAnalysis {
    const kp = pose.keypoints;
    const mistakes: string[] = [];
    let score = 100;

    const leftShoulder = this.getKeypoint(kp, 'left_shoulder');
    const leftHip = this.getKeypoint(kp, 'left_hip');
    const leftAnkle = this.getKeypoint(kp, 'left_ankle');
    const nose = this.getKeypoint(kp, 'nose');

    if (!leftShoulder || !leftHip) {
      return {
        score: 50,
        isCorrect: false,
        feedback: ['Position yourself in a plank'],
        mistakes: ['Body not visible'],
        color: 'yellow',
      };
    }

    // Check body alignment
    if (leftAnkle) {
      const hipSag = leftHip.y - ((leftShoulder.y + leftAnkle.y) / 2);
      if (hipSag > 0.06) {
        mistakes.push('Hips sagging - tighten core');
        score -= 25;
      } else if (hipSag < -0.06) {
        mistakes.push('Hips too high');
        score -= 15;
      }
    }

    // Check head position
    if (nose && leftShoulder) {
      const headDrop = nose.y - leftShoulder.y;
      if (headDrop > 0.15) {
        mistakes.push('Keep head neutral');
        score -= 10;
      }
    }

    const isCorrect = score >= 75;
    const color: 'green' | 'yellow' | 'red' = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';

    return {
      score: Math.max(0, score),
      isCorrect,
      feedback: isCorrect ? ['Solid plank!'] : mistakes.slice(0, 2),
      mistakes,
      color,
    };
  }

  private analyzeLunge(pose: Pose): PostureAnalysis {
    const kp = pose.keypoints;
    const mistakes: string[] = [];
    let score = 100;

    const leftKnee = this.getKeypoint(kp, 'left_knee');
    const leftAnkle = this.getKeypoint(kp, 'left_ankle');
    const leftHip = this.getKeypoint(kp, 'left_hip');

    if (!leftKnee || !leftAnkle) {
      return {
        score: 50,
        isCorrect: false,
        feedback: ['Show your legs in frame'],
        mistakes: ['Legs not visible'],
        color: 'yellow',
      };
    }

    // Check front knee over ankle
    const kneeForward = leftKnee.x - leftAnkle.x;
    if (kneeForward > 0.12) {
      mistakes.push('Front knee past toes');
      score -= 25;
    }

    // Check depth
    if (leftHip && leftKnee) {
      const depth = leftHip.y - leftKnee.y;
      if (depth > 0.1) {
        mistakes.push('Go deeper - 90° angle');
        score -= 20;
      }
    }

    const isCorrect = score >= 75;
    const color: 'green' | 'yellow' | 'red' = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';

    return {
      score: Math.max(0, score),
      isCorrect,
      feedback: isCorrect ? ['Great lunge!'] : mistakes.slice(0, 2),
      mistakes,
      color,
    };
  }

  private analyzeBicepCurl(pose: Pose): PostureAnalysis {
    const kp = pose.keypoints;
    const mistakes: string[] = [];
    let score = 100;

    const leftShoulder = this.getKeypoint(kp, 'left_shoulder');
    const leftElbow = this.getKeypoint(kp, 'left_elbow');
    const leftWrist = this.getKeypoint(kp, 'left_wrist');

    if (!leftShoulder || !leftElbow || !leftWrist) {
      return {
        score: 50,
        isCorrect: false,
        feedback: ['Show your arm clearly'],
        mistakes: ['Arm not visible'],
        color: 'yellow',
      };
    }

    // Check elbow stability (shouldn't move forward)
    const elbowDrift = leftElbow.x - leftShoulder.x;
    if (Math.abs(elbowDrift) > 0.1) {
      mistakes.push('Keep elbow pinned');
      score -= 20;
    }

    // Check curl range
    const curlAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
    if (curlAngle && curlAngle > 160) {
      mistakes.push('Full extension at bottom');
    }
    if (curlAngle && curlAngle > 90 && curlAngle < 160) {
      // Mid curl - good
    }
    if (curlAngle && curlAngle < 60) {
      // Top of curl - good squeeze
    }

    const isCorrect = score >= 75;
    const color: 'green' | 'yellow' | 'red' = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';

    return {
      score: Math.max(0, score),
      isCorrect,
      feedback: isCorrect ? ['Good curl!'] : mistakes.slice(0, 2),
      mistakes,
      color,
    };
  }

  private analyzeOverheadPress(pose: Pose): PostureAnalysis {
    const kp = pose.keypoints;
    const mistakes: string[] = [];
    let score = 100;

    const leftShoulder = this.getKeypoint(kp, 'left_shoulder');
    const leftWrist = this.getKeypoint(kp, 'left_wrist');
    const nose = this.getKeypoint(kp, 'nose');

    if (!leftShoulder || !leftWrist) {
      return {
        score: 50,
        isCorrect: false,
        feedback: ['Show your upper body'],
        mistakes: ['Arms not visible'],
        color: 'yellow',
      };
    }

    // Check if arms are overhead
    if (leftWrist.y > leftShoulder.y - 0.15) {
      mistakes.push('Press arms higher');
      score -= 30;
    }

    // Check lockout
    if (nose && leftWrist.y > nose.y) {
      mistakes.push('Full lockout above head');
      score -= 20;
    }

    const isCorrect = score >= 75;
    const color: 'green' | 'yellow' | 'red' = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';

    return {
      score: Math.max(0, score),
      isCorrect,
      feedback: isCorrect ? ['Great press!'] : mistakes.slice(0, 2),
      mistakes,
      color,
    };
  }

  private analyzeLateralRaise(pose: Pose): PostureAnalysis {
    const kp = pose.keypoints;
    const mistakes: string[] = [];
    let score = 100;

    const leftShoulder = this.getKeypoint(kp, 'left_shoulder');
    const rightShoulder = this.getKeypoint(kp, 'right_shoulder');
    const leftWrist = this.getKeypoint(kp, 'left_wrist');
    const rightWrist = this.getKeypoint(kp, 'right_wrist');

    if (!leftShoulder || !leftWrist) {
      return {
        score: 50,
        isCorrect: false,
        feedback: ['Show your arms'],
        mistakes: ['Arms not visible'],
        color: 'yellow',
      };
    }

    // Check arm height
    if (leftWrist.y > leftShoulder.y - 0.05) {
      mistakes.push('Raise to shoulder level');
      score -= 30;
    }

    // Check lateral extension
    const extension = Math.abs(leftWrist.x - leftShoulder.x);
    if (extension < 0.15) {
      mistakes.push('Extend arms to sides');
      score -= 25;
    }

    const isCorrect = score >= 75;
    const color: 'green' | 'yellow' | 'red' = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';

    return {
      score: Math.max(0, score),
      isCorrect,
      feedback: isCorrect ? ['Perfect raise!'] : mistakes.slice(0, 2),
      mistakes,
      color,
    };
  }

  private analyzeFrontRaise(pose: Pose): PostureAnalysis {
    const kp = pose.keypoints;
    const mistakes: string[] = [];
    let score = 100;

    const leftShoulder = this.getKeypoint(kp, 'left_shoulder');
    const rightShoulder = this.getKeypoint(kp, 'right_shoulder');
    const leftElbow = this.getKeypoint(kp, 'left_elbow');
    const rightElbow = this.getKeypoint(kp, 'right_elbow');
    const leftWrist = this.getKeypoint(kp, 'left_wrist');
    const rightWrist = this.getKeypoint(kp, 'right_wrist');
    const leftHip = this.getKeypoint(kp, 'left_hip');

    if (!leftShoulder || !leftWrist) {
      return {
        score: 50,
        isCorrect: false,
        feedback: ['Show your arms in front'],
        mistakes: ['Arms not visible'],
        color: 'yellow',
      };
    }

    // Check arm height - should be at or above shoulder level at top
    const armRaised = leftShoulder.y - leftWrist.y; // Positive when wrist is above shoulder
    if (armRaised < -0.05) {
      // Arms below shoulder - bottom of movement
      mistakes.push('Raise arms to shoulder level');
      score -= 20;
    } else if (armRaised >= 0) {
      // Arms at or above shoulder - good form at top
      score = Math.min(score, 100);
    }

    // Check arms are in front (not to the sides)
    // For front raise, wrists should be roughly inline with shoulders horizontally
    const leftArmForward = Math.abs(leftWrist.x - leftShoulder.x);
    if (leftArmForward > 0.2) {
      mistakes.push('Keep arms in front, not to sides');
      score -= 15;
    }

    // Check for straight arms (slight bend is okay)
    const elbowAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
    if (elbowAngle && elbowAngle < 140) {
      mistakes.push('Keep arms straighter');
      score -= 10;
    }

    // Check for body stability - torso shouldn't lean back
    if (leftHip && leftShoulder) {
      const torsoLean = leftShoulder.x - leftHip.x;
      if (torsoLean > 0.1) {
        mistakes.push('Keep body upright, don\'t lean back');
        score -= 15;
      }
    }

    // Check both arms are moving together (if both visible)
    if (rightShoulder && rightWrist && leftWrist) {
      const leftHeight = leftShoulder.y - leftWrist.y;
      const rightHeight = rightShoulder.y - rightWrist.y;
      if (Math.abs(leftHeight - rightHeight) > 0.1) {
        mistakes.push('Keep both arms at same height');
        score -= 10;
      }
    }

    const isCorrect = score >= 75;
    const color: 'green' | 'yellow' | 'red' = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';

    return {
      score: Math.max(0, score),
      isCorrect,
      feedback: isCorrect ? ['Great front raise!'] : mistakes.slice(0, 2),
      mistakes,
      color,
    };
  }

  private analyzeGeneric(pose: Pose): PostureAnalysis {
    const score = pose.score ? Math.min(pose.score * 110, 90) : 75;
    
    return {
      score: Math.round(score),
      isCorrect: score >= 70,
      feedback: ['Keep going!'],
      mistakes: [],
      color: score >= 75 ? 'green' : 'yellow',
    };
  }

  // ============ Session Summary ============

  /**
   * End session and get summary
   */
  endSession(): ExerciseSession {
    const totalTime = Date.now() - this.sessionStartTime;
    const avgScore = this.repScores.length > 0
      ? this.repScores.reduce((sum, rep) => sum + rep.score, 0) / this.repScores.length
      : 0;

    return {
      exercise: this.currentExercise,
      reps: this.repCount,
      averageScore: Math.round(avgScore),
      repScores: [...this.repScores],
      totalTime,
      currentPhase: this.currentPhase,
    };
  }

  /**
   * Get current session stats
   */
  getCurrentStats(): {
    reps: number;
    averageScore: number;
    lastRepScore: number | null;
  } {
    const avgScore = this.repScores.length > 0
      ? this.repScores.reduce((sum, rep) => sum + rep.score, 0) / this.repScores.length
      : 0;
    
    const lastRep = this.repScores[this.repScores.length - 1];

    return {
      reps: this.repCount,
      averageScore: Math.round(avgScore),
      lastRepScore: lastRep ? lastRep.score : null,
    };
  }
}

// Export singleton instance
export const exerciseScoringService = new ExerciseScoringService();
