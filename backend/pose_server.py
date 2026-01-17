"""
KinetiqAI Pose Detection Server
Real-time pose detection using MediaPipe for both web and mobile clients.
"""

import base64
import io
import time
import os
import urllib.request
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from PIL import Image, ImageOps
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

app = FastAPI(title="KinetiqAI Pose Server", version="1.0.0")

def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decode base64 image to numpy array with auto-rotation."""
    # Remove data URL prefix if present
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    # Decode base64
    image_bytes = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_bytes))
    
    # Handle EXIF rotation if present
    image = ImageOps.exif_transpose(image)
    
    # Auto-rotate if landscape (assuming portrait usage for workout)
    if image.width > image.height:
        # Rotate 270 degrees (90 degrees Clockwise) to make it upright
        # This fixes the "horizontal skeleton" issue on mobile
        image = image.transpose(Image.ROTATE_270)
    
    # Convert to RGB if necessary
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Convert to numpy array
    return np.array(image)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Download pose landmarker model if not present (using Full model for better accuracy)
MODEL_PATH = "pose_landmarker_full.task"
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task"

if not os.path.exists(MODEL_PATH):
    print("Downloading pose landmarker model...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Model downloaded!")

# Initialize MediaPipe Pose Landmarker (new Tasks API)
base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    output_segmentation_masks=False,
    min_pose_detection_confidence=0.5,
    min_pose_presence_confidence=0.5,
    min_tracking_confidence=0.5,
    num_poses=1
)
pose_detector = vision.PoseLandmarker.create_from_options(options)

# Keypoint names matching the app's expected format
KEYPOINT_NAMES = [
    'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
    'right_eye_inner', 'right_eye', 'right_eye_outer',
    'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
    'left_index', 'right_index', 'left_thumb', 'right_thumb',
    'left_hip', 'right_hip', 'left_knee', 'right_knee',
    'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
    'left_foot_index', 'right_foot_index'
]

# Map MediaPipe landmarks to simplified keypoint names (Full model with ALL 33 keypoints)
SIMPLIFIED_KEYPOINTS = {
    0: 'nose',
    1: 'left_eye_inner',
    2: 'left_eye',
    3: 'left_eye_outer',
    4: 'right_eye_inner',
    5: 'right_eye',
    6: 'right_eye_outer',
    7: 'left_ear',
    8: 'right_ear',
    9: 'mouth_left',
    10: 'mouth_right',
    11: 'left_shoulder',
    12: 'right_shoulder',
    13: 'left_elbow',
    14: 'right_elbow',
    15: 'left_wrist',
    16: 'right_wrist',
    17: 'left_pinky',
    18: 'right_pinky',
    19: 'left_index',
    20: 'right_index',
    21: 'left_thumb',
    22: 'right_thumb',
    23: 'left_hip',
    24: 'right_hip',
    25: 'left_knee',
    26: 'right_knee',
    27: 'left_ankle',
    28: 'right_ankle',
    29: 'left_heel',
    30: 'right_heel',
    31: 'left_foot_index',
    32: 'right_foot_index'
}


class Keypoint(BaseModel):
    x: float
    y: float
    score: float
    name: str
    z: Optional[float] = None  # 3D depth coordinate


class WorldKeypoint(BaseModel):
    """3D world coordinates for accurate angle calculations"""
    x: float  # in meters
    y: float
    z: float
    visibility: float
    name: str


class Pose(BaseModel):
    keypoints: List[Keypoint]
    score: float
    worldLandmarks: Optional[List[WorldKeypoint]] = None  # 3D coordinates


class PostureAnalysis(BaseModel):
    score: int
    isCorrect: bool
    feedback: List[str]
    mistakes: List[str]
    color: str
    poseClassification: Optional[str] = None


class DetectionRequest(BaseModel):
    image: str  # Base64 encoded image
    exercise: str = "general"


class DetectionResponse(BaseModel):
    success: bool
    poses: List[Pose]
    analysis: PostureAnalysis
    processingTime: float





def detect_pose(image: np.ndarray) -> Optional[Pose]:
    """Detect pose using MediaPipe Tasks API with 3D world landmarks."""
    # Ensure image is RGB
    if len(image.shape) == 3 and image.shape[2] == 3:
        # Check if BGR (from OpenCV) or RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    else:
        image_rgb = image
    
    # Create MediaPipe Image
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
    
    # Process the image
    results = pose_detector.detect(mp_image)
    
    if not results.pose_landmarks or len(results.pose_landmarks) == 0:
        return None
    
    # Get first pose landmarks (screen coordinates)
    landmarks = results.pose_landmarks[0]
    
    # Get world landmarks (3D coordinates in meters) - more accurate for angles
    world_landmarks = results.pose_world_landmarks[0] if results.pose_world_landmarks else None
    
    # Extract keypoints with 2D and 3D coordinates
    keypoints = []
    world_keypoints = []
    
    for idx, name in SIMPLIFIED_KEYPOINTS.items():
        if idx < len(landmarks):
            landmark = landmarks[idx]
            keypoints.append(Keypoint(
                x=landmark.x,  # Normalized 0-1
                y=landmark.y,  # Normalized 0-1
                z=landmark.z if hasattr(landmark, 'z') else None,  # Depth
                score=landmark.visibility if hasattr(landmark, 'visibility') else 0.9,
                name=name
            ))
            
            # Add world landmarks for 3D angle calculations
            if world_landmarks and idx < len(world_landmarks):
                world_lm = world_landmarks[idx]
                world_keypoints.append(WorldKeypoint(
                    x=world_lm.x,  # meters
                    y=world_lm.y,
                    z=world_lm.z,
                    visibility=world_lm.visibility if hasattr(world_lm, 'visibility') else 0.9,
                    name=name
                ))
    
    # Calculate overall pose score
    avg_score = sum(kp.score for kp in keypoints) / len(keypoints) if keypoints else 0
    
    return Pose(
        keypoints=keypoints, 
        score=avg_score,
        worldLandmarks=world_keypoints if world_keypoints else None
    )


def calculate_angle(p1: Keypoint, p2: Keypoint, p3: Keypoint) -> float:
    """Calculate angle between three points (2D)."""
    v1 = np.array([p1.x - p2.x, p1.y - p2.y])
    v2 = np.array([p3.x - p2.x, p3.y - p2.y])
    
    cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
    angle = np.arccos(np.clip(cos_angle, -1, 1))
    return np.degrees(angle)


def calculate_3d_angle(p1: WorldKeypoint, p2: WorldKeypoint, p3: WorldKeypoint) -> float:
    """Calculate 3D angle between three points (more accurate for medical use)."""
    v1 = np.array([p1.x - p2.x, p1.y - p2.y, p1.z - p2.z])
    v2 = np.array([p3.x - p2.x, p3.y - p2.y, p3.z - p2.z])
    
    cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
    angle = np.arccos(np.clip(cos_angle, -1, 1))
    return np.degrees(angle)


def get_keypoint(keypoints: List[Keypoint], name: str) -> Optional[Keypoint]:
    """Get keypoint by name."""
    for kp in keypoints:
        if kp.name == name:
            return kp
    return None


def get_world_keypoint(world_landmarks: List[WorldKeypoint], name: str) -> Optional[WorldKeypoint]:
    """Get world landmark by name."""
    for wl in world_landmarks:
        if wl.name == name:
            return wl
    return None


def get_scoring_coords(
    keypoints: List[Keypoint],
    visibility_threshold: float = 0.6,
) -> Optional[dict]:
    """Return face-centered, scale-normalized 2D coords for scoring.

    Input keypoints are MediaPipe image-normalized (0..1).
    Output coords are centered at the face anchor and divided by shoulder width
    (hip width fallback). Units become "shoulder widths".

    This mirrors the app-side rule: scoring MUST use normalized coords, not screen coords.
    """

    def vis(kp: Optional[Keypoint]) -> bool:
        return kp is not None and (kp.score or 0.0) >= visibility_threshold

    nose = get_keypoint(keypoints, 'nose')
    left_eye = get_keypoint(keypoints, 'left_eye')
    right_eye = get_keypoint(keypoints, 'right_eye')

    # Preferred anchor: face center
    center = None
    if vis(nose) and vis(left_eye) and vis(right_eye):
        center = {
            'x': (nose.x + left_eye.x + right_eye.x) / 3.0,
            'y': (nose.y + left_eye.y + right_eye.y) / 3.0,
        }
    else:
        # Fallbacks: shoulders, then hips
        ls = get_keypoint(keypoints, 'left_shoulder')
        rs = get_keypoint(keypoints, 'right_shoulder')
        if vis(ls) and vis(rs):
            center = {'x': (ls.x + rs.x) / 2.0, 'y': (ls.y + rs.y) / 2.0}
        else:
            lh = get_keypoint(keypoints, 'left_hip')
            rh = get_keypoint(keypoints, 'right_hip')
            if vis(lh) and vis(rh):
                center = {'x': (lh.x + rh.x) / 2.0, 'y': (lh.y + rh.y) / 2.0}

    if center is None:
        return None

    # Scale factor: shoulder width preferred, hip width fallback
    ls = get_keypoint(keypoints, 'left_shoulder')
    rs = get_keypoint(keypoints, 'right_shoulder')
    lh = get_keypoint(keypoints, 'left_hip')
    rh = get_keypoint(keypoints, 'right_hip')

    scale = None
    if vis(ls) and vis(rs):
        scale = np.linalg.norm(np.array([ls.x - rs.x, ls.y - rs.y]))
    elif vis(lh) and vis(rh):
        scale = np.linalg.norm(np.array([lh.x - rh.x, lh.y - rh.y]))

    if scale is None or scale < 1e-3:
        scale = 1.0

    coords = {}
    for kp in keypoints:
        coords[kp.name] = {
            'x': (kp.x - center['x']) / scale,
            'y': (kp.y - center['y']) / scale,
            'v': kp.score or 0.0,
        }

    coords['_meta'] = {'center': center, 'scale': float(scale)}
    return coords


def analyze_squat(keypoints: List[Keypoint], world_landmarks: Optional[List[WorldKeypoint]] = None) -> PostureAnalysis:
    """Analyze squat form with enhanced bilateral criteria using 3D angles."""
    score = 100
    mistakes = []
    feedback = []
    
    # Get 2D keypoints for display positions
    left_hip = get_keypoint(keypoints, 'left_hip')
    left_knee = get_keypoint(keypoints, 'left_knee')
    left_ankle = get_keypoint(keypoints, 'left_ankle')
    left_shoulder = get_keypoint(keypoints, 'left_shoulder')
    right_hip = get_keypoint(keypoints, 'right_hip')
    right_knee = get_keypoint(keypoints, 'right_knee')
    right_ankle = get_keypoint(keypoints, 'right_ankle')
    right_shoulder = get_keypoint(keypoints, 'right_shoulder')

    scoring = get_scoring_coords(keypoints, visibility_threshold=0.6)
    
    # Use 3D world landmarks for accurate angle calculation
    use_3d = world_landmarks is not None and len(world_landmarks) >= 33
    
    if use_3d:
        left_hip_3d = get_world_keypoint(world_landmarks, 'left_hip')
        left_knee_3d = get_world_keypoint(world_landmarks, 'left_knee')
        left_ankle_3d = get_world_keypoint(world_landmarks, 'left_ankle')
        right_hip_3d = get_world_keypoint(world_landmarks, 'right_hip')
        right_knee_3d = get_world_keypoint(world_landmarks, 'right_knee')
        right_ankle_3d = get_world_keypoint(world_landmarks, 'right_ankle')
        left_shoulder_3d = get_world_keypoint(world_landmarks, 'left_shoulder')
        
        if all([left_hip_3d, left_knee_3d, left_ankle_3d, right_hip_3d, right_knee_3d, right_ankle_3d]):
            # Calculate 3D angles (more accurate)
            left_knee_angle = calculate_3d_angle(left_hip_3d, left_knee_3d, left_ankle_3d)
            right_knee_angle = calculate_3d_angle(right_hip_3d, right_knee_3d, right_ankle_3d)
            knee_angle = (left_knee_angle + right_knee_angle) / 2
            
            if knee_angle > 165:
                feedback.append("Begin lowering into squat position")
            elif knee_angle > 140:
                mistakes.append("🟡 Squat deeper - thighs not parallel yet")
                score -= 10
            elif knee_angle > 120:
                mistakes.append("🟡 Go slightly deeper for full range")
                score -= 5
            elif knee_angle >= 70 and knee_angle <= 120:  # Widened "Perfect" range (was 80-100)
                feedback.append("✅ Perfect squat depth!")
            elif knee_angle >= 60 and knee_angle < 70:
                mistakes.append("🟡 Slightly too deep - risk for knees")
                score -= 5
            else:
                mistakes.append("🔴 Too deep - maintain control")
                score -= 10
            
            # Check knee tracking (3D distance from ankle)
            left_knee_forward = left_knee_3d.z - left_ankle_3d.z  # Positive = knee in front
            if left_knee_forward > 0.08:  # 8cm forward
                mistakes.append("🔴 Knees too far forward - sit back into hips")
                score -= 25
            elif left_knee_forward > 0.04:  # 4cm forward
                mistakes.append("🟡 Watch knee position - keep over ankles")
                score -= 12
            
            # Check torso angle
            if left_shoulder_3d and left_hip_3d:
                torso_lean = abs(left_shoulder_3d.x - left_hip_3d.x)
                if torso_lean > 0.15:
                    mistakes.append("🔴 Excessive forward lean - engage core")
                    score -= 25
                elif torso_lean > 0.10:
                    mistakes.append("🟡 Reduce forward lean - chest up")
                    score -= 15
                elif torso_lean < 0.05:
                    feedback.append("✅ Excellent upright torso!")
    else:
        # Fallback to 2D angles if 3D not available
        if left_hip and left_knee and left_ankle and right_hip and right_knee and right_ankle:
            left_knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
            right_knee_angle = calculate_angle(right_hip, right_knee, right_ankle)
            knee_angle = (left_knee_angle + right_knee_angle) / 2
            
            if knee_angle > 165:
                feedback.append("Begin lowering into squat position")
            elif knee_angle > 140:
                mistakes.append("🟡 Squat deeper - thighs not parallel yet")
                score -= 10
            elif knee_angle > 120:
                mistakes.append("🟡 Go slightly deeper for full range")
                score -= 5
            elif knee_angle >= 70 and knee_angle <= 120:
                feedback.append("✅ Perfect squat depth!")
            else:
                mistakes.append("🟡 Watch depth control")
                score -= 5
            
            # 2D knee tracking check
            if left_knee.x < left_ankle.x - 0.08:
                mistakes.append("🔴 Knees too far forward - sit back into hips")
                score -= 25
            elif left_knee.x < left_ankle.x - 0.03:
                mistakes.append("🟡 Watch knee position - keep over ankles")
                score -= 12
        
        if left_shoulder and left_hip:
            back_lean = abs(left_shoulder.x - left_hip.x)
            if back_lean > 0.18:
                mistakes.append("🔴 Excessive forward lean - engage core")
                score -= 25
            elif back_lean > 0.12:
                mistakes.append("🟡 Reduce forward lean - chest up")
                score -= 15
    
    # Check knee alignment (valgus/varus)
    if scoring and 'left_knee' in scoring and 'right_knee' in scoring and 'left_hip' in scoring and 'right_hip' in scoring:
        knee_width = abs(scoring['left_knee']['x'] - scoring['right_knee']['x'])
        hip_width = abs(scoring['left_hip']['x'] - scoring['right_hip']['x'])
        if hip_width > 1e-3:
            ratio = knee_width / hip_width
            if ratio < 0.65:
                mistakes.append("🔴 Knee valgus - push knees outward")
                score -= 25
            elif ratio < 0.8:
                mistakes.append("🟡 Knees slightly inward - maintain alignment")
                score -= 12
    
    # Check foot stability
    if scoring and 'left_ankle' in scoring and 'right_ankle' in scoring:
        foot_stability = abs(scoring['left_ankle']['y'] - scoring['right_ankle']['y'])
        if foot_stability > 0.18:
            mistakes.append("🟡 Uneven weight distribution - balance on both feet")
            score -= 10
    
    if not mistakes:
        feedback.append("🎯 Perfect squat form!")
    
    color = 'green' if score >= 80 else 'yellow' if score >= 60 else 'red'
    
    return PostureAnalysis(
        score=max(0, score),
        isCorrect=score >= 80,
        feedback=feedback,
        mistakes=mistakes,
        color=color,
        poseClassification="squat"
    )


def analyze_plank(keypoints: List[Keypoint]) -> PostureAnalysis:
    """Analyze plank form with bilateral assessment."""
    score = 100
    mistakes = []
    feedback = []
    
    left_shoulder = get_keypoint(keypoints, 'left_shoulder')
    left_hip = get_keypoint(keypoints, 'left_hip')
    left_ankle = get_keypoint(keypoints, 'left_ankle')
    left_elbow = get_keypoint(keypoints, 'left_elbow')
    right_shoulder = get_keypoint(keypoints, 'right_shoulder')
    right_hip = get_keypoint(keypoints, 'right_hip')
    right_ankle = get_keypoint(keypoints, 'right_ankle')
    
    scoring = get_scoring_coords(keypoints, visibility_threshold=0.6)

    if left_shoulder and left_hip and left_ankle:
        # Check body alignment (should be straight line)
        # Calculate deviation from straight line
        expected_hip_y = (left_shoulder.y + left_ankle.y) / 2
        hip_deviation = abs(left_hip.y - expected_hip_y)
        
        if left_hip.y < expected_hip_y - 0.08:
            mistakes.append("🔴 Hips too high - lower them for straight line")
            score -= 15
        elif left_hip.y > expected_hip_y + 0.08:
            mistakes.append("🔴 Hips sagging - engage core and lift hips")
            score -= 15
        else:
            feedback.append("✅ Great body alignment!")
    
    if left_shoulder and left_elbow:
        # Check arm position
        shoulder_elbow_diff = abs(left_shoulder.x - left_elbow.x)
        if scoring and 'left_shoulder' in scoring and 'left_elbow' in scoring:
            shoulder_elbow_diff = abs(scoring['left_shoulder']['x'] - scoring['left_elbow']['x'])
        if shoulder_elbow_diff > 0.25:
            mistakes.append("🟡 Keep elbows directly under shoulders")
            score -= 15
    
    # Check bilateral symmetry
    if scoring and 'left_shoulder' in scoring and 'right_shoulder' in scoring and 'left_hip' in scoring and 'right_hip' in scoring:
        shoulder_diff = abs(scoring['left_shoulder']['y'] - scoring['right_shoulder']['y'])
        hip_diff = abs(scoring['left_hip']['y'] - scoring['right_hip']['y'])
        if shoulder_diff > 0.12 or hip_diff > 0.14:
            mistakes.append("🟡 Keep body level - one side is higher")
            score -= 12
    
    if not mistakes:
        feedback.append("🎯 Perfect plank form!")
    
    color = 'green' if score >= 80 else 'yellow' if score >= 60 else 'red'
    
    return PostureAnalysis(
        score=max(0, score),
        isCorrect=score >= 80,
        feedback=feedback,
        mistakes=mistakes,
        color=color,
        poseClassification="plank"
    )


def analyze_lunge(keypoints: List[Keypoint]) -> PostureAnalysis:
    """Analyze lunge form with bilateral assessment."""
    scoring = get_scoring_coords(keypoints, visibility_threshold=0.6)
    score = 100
    mistakes = []
    feedback = []
    
    left_hip = get_keypoint(keypoints, 'left_hip')
    left_knee = get_keypoint(keypoints, 'left_knee')
    left_ankle = get_keypoint(keypoints, 'left_ankle')
    right_hip = get_keypoint(keypoints, 'right_hip')
    right_knee = get_keypoint(keypoints, 'right_knee')
    right_ankle = get_keypoint(keypoints, 'right_ankle')
    left_shoulder = get_keypoint(keypoints, 'left_shoulder')
    right_shoulder = get_keypoint(keypoints, 'right_shoulder')
    
    # Determine which leg is forward (more bent)
    if left_hip and left_knee and left_ankle and right_hip and right_knee and right_ankle:
        left_angle = calculate_angle(left_hip, left_knee, left_ankle)
        right_angle = calculate_angle(right_hip, right_knee, right_ankle)
        
        # Use the more bent knee (front leg)
        knee_angle = min(left_angle, right_angle)
        front_knee = left_knee if left_angle < right_angle else right_knee
        front_ankle = left_ankle if left_angle < right_angle else right_ankle
        
        if knee_angle < 80:
            mistakes.append("🔴 Front knee too bent - don't let it go past 90°")
            score -= 20
        elif knee_angle > 110:
            mistakes.append("🟡 Go deeper into the lunge")
            score -= 10
        else:
            feedback.append("✅ Good front knee angle!")
    
    if scoring and 'left_knee' in scoring and 'left_ankle' in scoring:
        # Check knee over ankle (scale-normalized)
        knee_forward = scoring['left_knee']['x'] - scoring['left_ankle']['x']
        if knee_forward > 0.35:
            mistakes.append("🔴 Front knee going past toes - keep it over ankle")
            score -= 20
    
    if left_shoulder and left_hip:
        # Check torso upright
        torso_lean = abs(left_shoulder.x - left_hip.x)
        if torso_lean > 0.1:
            mistakes.append("🟡 Keep torso upright")
            score -= 15
    
    if not mistakes:
        feedback.append("🎯 Perfect lunge form!")
    
    color = 'green' if score >= 80 else 'yellow' if score >= 60 else 'red'
    
    return PostureAnalysis(
        score=max(0, score),
        isCorrect=score >= 80,
        feedback=feedback,
        mistakes=mistakes,
        color=color,
        poseClassification="lunge"
    )


def analyze_pushup(keypoints: List[Keypoint]) -> PostureAnalysis:
    """Analyze push-up form with bilateral assessment."""
    scoring = get_scoring_coords(keypoints, visibility_threshold=0.6)
    score = 100
    mistakes = []
    feedback = []
    
    left_shoulder = get_keypoint(keypoints, 'left_shoulder')
    left_elbow = get_keypoint(keypoints, 'left_elbow')
    left_wrist = get_keypoint(keypoints, 'left_wrist')
    left_hip = get_keypoint(keypoints, 'left_hip')
    left_ankle = get_keypoint(keypoints, 'left_ankle')
    right_shoulder = get_keypoint(keypoints, 'right_shoulder')
    right_elbow = get_keypoint(keypoints, 'right_elbow')
    right_wrist = get_keypoint(keypoints, 'right_wrist')
    right_hip = get_keypoint(keypoints, 'right_hip')
    right_ankle = get_keypoint(keypoints, 'right_ankle')
    
    # Use bilateral averaging
    if left_shoulder and left_elbow and left_wrist and right_shoulder and right_elbow and right_wrist:
        left_angle = calculate_angle(left_shoulder, left_elbow, left_wrist)
        right_angle = calculate_angle(right_shoulder, right_elbow, right_wrist)
        elbow_angle = (left_angle + right_angle) / 2  # Bilateral average
        
        if elbow_angle > 170:
            feedback.append("Arms extended - ready position")
        elif elbow_angle < 70:
            feedback.append("✅ Good depth on push-up!")
        elif elbow_angle > 120:
            mistakes.append("🟡 Go lower - aim for 90° elbow angle")
            score -= 15
    
    if left_shoulder and left_hip and left_ankle:
        # Check body alignment
        expected_hip_y = (left_shoulder.y + left_ankle.y) / 2
        
        if left_hip.y < expected_hip_y - 0.05:
            mistakes.append("🔴 Hips too high - maintain straight body line")
            score -= 20
        elif left_hip.y > expected_hip_y + 0.05:
            mistakes.append("🔴 Hips sagging - engage core!")
            score -= 25
        else:
            feedback.append("✅ Good body alignment!")
    
    if not mistakes:
        feedback.append("🎯 Perfect push-up form!")
    
    color = 'green' if score >= 80 else 'yellow' if score >= 60 else 'red'
    
    return PostureAnalysis(
        score=max(0, score),
        isCorrect=score >= 80,
        feedback=feedback,
        mistakes=mistakes,
        color=color,
        poseClassification="pushup"
    )


def analyze_general(keypoints: List[Keypoint]) -> PostureAnalysis:
    """General posture analysis with dynamic scoring."""
    scoring = get_scoring_coords(keypoints, visibility_threshold=0.6)
    score = 100
    feedback = []
    mistakes = []
    
    left_shoulder = get_keypoint(keypoints, 'left_shoulder')
    right_shoulder = get_keypoint(keypoints, 'right_shoulder')
    left_hip = get_keypoint(keypoints, 'left_hip')
    right_hip = get_keypoint(keypoints, 'right_hip')
    
    # Check 1: Shoulder Levelness
    if scoring and 'left_shoulder' in scoring and 'right_shoulder' in scoring:
        shoulder_diff = abs(scoring['left_shoulder']['y'] - scoring['right_shoulder']['y'])
        if shoulder_diff > 0.12:
            mistakes.append("🟡 Shoulders uneven - straighten up")
            score -= 15
        elif shoulder_diff > 0.06:
            mistakes.append("🟡 Slight shoulder tilt")
            score -= 5
    
    # Check 2: Head Alignment (Nose relative to center of shoulders)
    nose = get_keypoint(keypoints, 'nose')
    if nose and left_shoulder and right_shoulder:
        shoulder_center_x = (left_shoulder.x + right_shoulder.x) / 2
        head_deviation = abs(nose.x - shoulder_center_x)
        
        # Scale deviation by shoulder width for fairness
        shoulder_width = abs(left_shoulder.x - right_shoulder.x)
        if shoulder_width > 0:
            rel_deviation = head_deviation / shoulder_width
            if rel_deviation > 0.3:
                mistakes.append("🟡 Head tilting/leaning")
                score -= 10
            elif rel_deviation > 0.15:
                # Minor deduction for slight tilt
                score -= 3

    # Check 3: Torso Alignment (Shoulders relative to hips verticality)
    if left_shoulder and left_hip and right_shoulder and right_hip:
        # Check if user is leaning left/right
        shoulder_center_x = (left_shoulder.x + right_shoulder.x) / 2
        hip_center_x = (left_hip.x + right_hip.x) / 2
        
        lean_diff = abs(shoulder_center_x - hip_center_x)
        shoulder_width = abs(left_shoulder.x - right_shoulder.x)
        
        if shoulder_width > 0:
            lean_ratio = lean_diff / shoulder_width
            if lean_ratio > 0.4:
                mistakes.append("🔴 Leaning too much sideways")
                score -= 20
            elif lean_ratio > 0.2:
                mistakes.append("🟡 Stand straighter")
                score -= 10

    # Provide positive feedback if no major mistakes
    if score >= 95:
        feedback.append("✨ Perfect posture!")
    elif score >= 85:
        feedback.append("✅ Great alignment")
    elif not mistakes:
        feedback.append("Pose detected")
    
    color = 'green' if score >= 80 else 'yellow' if score >= 60 else 'red'
    
    return PostureAnalysis(
        score=max(0, score),
        isCorrect=score >= 80,
        feedback=feedback,
        mistakes=mistakes,
        color=color,
        poseClassification="general"
    )


def check_body_visibility(keypoints: List[Keypoint], exercise: str) -> bool:
    """Check if critical body parts are visible for the given exercise."""
    needed_keypoints = []
    exercise_lower = exercise.lower()
    
    # Define critical keypoints based on exercise
    if 'squat' in exercise_lower or 'lunge' in exercise_lower:
        # Lower body is critical
        needed_keypoints = ['left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle']
    elif 'plank' in exercise_lower or 'push' in exercise_lower:
        # Full body length critical
        needed_keypoints = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip', 'left_ankle', 'right_ankle']
    else:
        # General - at least torso
        needed_keypoints = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip']
        
    # Check visibility
    visible_count = 0
    for name in needed_keypoints:
        kp = get_keypoint(keypoints, name)
        if kp and kp.score > 0.5:  # Threshold for "visible"
            visible_count += 1
            
    # Require at least 80% of critical keypoints to be visible
    return visible_count >= len(needed_keypoints) * 0.8


def analyze_pose(keypoints: List[Keypoint], exercise: str, world_landmarks: Optional[List[WorldKeypoint]] = None) -> PostureAnalysis:
    """Analyze pose based on exercise type."""
    
    # First, check visibility
    if not check_body_visibility(keypoints, exercise):
        return PostureAnalysis(
            score=0,
            isCorrect=False,
            feedback=["Body not fully visible"],
            mistakes=["Please step back to show your full body"],
            color="white", # Special color for visibility error
            poseClassification=exercise 
        )

    exercise_lower = exercise.lower()
    
    if 'squat' in exercise_lower:
        return analyze_squat(keypoints, world_landmarks)
    elif 'plank' in exercise_lower:
        return analyze_plank(keypoints)
    elif 'lunge' in exercise_lower:
        return analyze_lunge(keypoints)
    elif 'push' in exercise_lower or 'pushup' in exercise_lower:
        return analyze_pushup(keypoints)
    else:
        return analyze_general(keypoints)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "KinetiqAI Pose Server is running"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "model": "mediapipe"}


@app.post("/detect", response_model=DetectionResponse)
async def detect_pose_endpoint(request: DetectionRequest):
    """
    Detect pose from base64 encoded image.
    
    - **image**: Base64 encoded image (JPEG or PNG)
    - **exercise**: Exercise type for specific analysis (squat, plank, lunge, pushup, general)
    """
    start_time = time.time()
    
    try:
        # Decode image
        image = decode_base64_image(request.image)
        
        # Detect pose
        pose = detect_pose(image)
        
        if pose is None:
            # No pose detected
            return DetectionResponse(
                success=False,
                poses=[],
                analysis=PostureAnalysis(
                    score=0,
                    isCorrect=False,
                    feedback=["No pose detected - make sure your full body is visible"],
                    mistakes=["Position yourself so camera can see your body"],
                    color="red",
                    poseClassification=None
                ),
                processingTime=time.time() - start_time
            )
        
        # Analyze pose
        analysis = analyze_pose(pose.keypoints, request.exercise, pose.worldLandmarks)
        
        return DetectionResponse(
            success=True,
            poses=[pose],
            analysis=analysis,
            processingTime=time.time() - start_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@app.post("/batch-detect")
async def batch_detect(images: List[str], exercise: str = "general"):
    """Detect poses in multiple images (for batch processing)."""
    results = []
    for img in images:
        try:
            request = DetectionRequest(image=img, exercise=exercise)
            result = await detect_pose_endpoint(request)
            results.append(result)
        except Exception as e:
            results.append({"error": str(e)})
    return results


if __name__ == "__main__":
    import uvicorn
    print("Starting KinetiqAI Pose Server...")
    print("Server will be available at http://localhost:8001")
    print("API docs at http://localhost:8001/docs")
    uvicorn.run(app, host="0.0.0.0", port=8001)
