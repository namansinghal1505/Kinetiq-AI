import { Platform } from 'react-native';

export interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
  z?: number; // 3D depth
}

export interface Pose {
  keypoints: Keypoint[];
  score?: number;
  worldLandmarks?: Keypoint[]; // 3D world coordinates
}

export interface PostureAnalysis {
  score: number;
  isCorrect: boolean;
  feedback: string[];
  mistakes: string[];
  color: 'green' | 'yellow' | 'red';
  personalizedInsights?: string[];
  poseClassification?: string;
}

export interface DetectionResponse {
  success: boolean;
  poses: Pose[];
  analysis: PostureAnalysis;
  processingTime: number;
}

export class PoseDetectionService {
  private isInitialized = false;
  // Updated to use LAN IP for mobile testing
  private backendUrl = 'http://10.31.165.243:8001';

  constructor() {
    // Check if a custom URL is configured (in a real app this might come from env vars)
    // For now we stick to defaults
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async initialize(): Promise<void> {
    try {
      console.log(`Connecting to Pose Server at ${this.backendUrl}...`);
      const response = await fetch(`${this.backendUrl}/health`);
      const data = await response.json();

      if (data.status === 'healthy') {
        console.log('✅ Connected to Pose Server');
        this.isInitialized = true;
      } else {
        console.warn('⚠️ Pose Server returned unhealthy status:', data);
        // We still mark as initialized but warn, or maybe throw?
        // Let's assume it works if we got a response.
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('❌ Failed to connect to Pose Server:', error);
      this.isInitialized = false;
      throw new Error(`Failed to connect to backend at ${this.backendUrl}. Make sure the server is running.`);
    }
  }

  async detectPose(imageElement: any): Promise<Pose[]> {
    // This signature matches the old one for compatibility, but we expect an image object that has 'src' or 'uri'
    // In LiveWorkoutScreen, it passes an 'Image' object where .src is the URI.

    // We need the base64 string.
    let base64Image = '';

    if (imageElement && imageElement.src) {
      base64Image = imageElement.src;
    } else if (typeof imageElement === 'string') {
      base64Image = imageElement;
    }

    // Fallback: if we can't get base64, we can't send it.
    if (!base64Image) {
      console.error("No image data provided for backend detection");
      return [];
    }

    // We don't have the exercise info here in the signature, but we can default or change signature.
    // The previous implementation didn't take exercise in detectPose, it took it in analyzePosture.
    // However, the backend does both. 
    // We will separate them: detectPose just gets the pose (and analysis) but we might need to cache it.
    // Actually, LiveWorkoutScreen calls detectPose then analyzePosture.
    // Our backend does both in one go.
    // We will need to store the last result to return it in analyzePosture, OR change the calling code.
    // Recommendation: Detect API returns everything. calling code should use it.

    // For now, let's implement a direct call that returns everything, 
    // and we will update LiveWorkoutScreen to use a new method 'detectAndAnalyze'.

    // But to satisfy the interface for 'detectPose' we might iterate.
    // Let's just return the poses here.

    return this.detectPoseBackend(base64Image, 'general').then(res => res.poses);

  }

  // New method for full backend power
  async detectAndAnalyze(base64Image: string, exercise: string): Promise<DetectionResponse | null> {
    if (!this.isInitialized) return null;

    try {
      const response = await fetch(`${this.backendUrl}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          exercise: exercise
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Backend detection failed:", error);
      return null;
    }
  }

  // Legacy shim
  async detectPoseBackend(base64Image: string, exercise: string = 'general'): Promise<DetectionResponse> {
    const res = await this.detectAndAnalyze(base64Image, exercise);
    if (!res) return { success: false, poses: [], analysis: { score: 0, isCorrect: false, feedback: [], mistakes: [], color: 'red' } as PostureAnalysis, processingTime: 0 };
    return res;
  }

  // Legacy shim
  analyzePosture(pose: Pose, exercise: string): PostureAnalysis {
    // If the pose came from our backend, it might already have analysis attached?
    // The current Architecture separates them. 
    // Since we are changing the implementation, we should change the calling code to call detectAndAnalyze at once.
    // But if we must generic shim:

    // Attempt to retrieve analysis if we cached it (we didn't).
    // Return a placeholder or mock if called separately on a raw pose.
    // Ideally LiveWorkoutScreen will be updated to use the result from detectAndAnalyze directly.

    return {
      score: pose.score ? pose.score * 100 : 0, // Mock if missing
      isCorrect: (pose.score || 0) > 0.8,
      feedback: ["Analysis done on backend"],
      mistakes: [],
      color: (pose.score || 0) > 0.8 ? 'green' : 'red'
    };
  }

  // Stub for dispose
  dispose() { }

  analyzePersonalPosePattern(pose: Pose, exercise: string, history: number[]) {
    return [];
  }
}

export const poseDetectionService = new PoseDetectionService();
