import React from 'react';
import { Dimensions } from 'react-native';
import Svg, { Circle, Line, Polyline, G } from 'react-native-svg';
import { Pose, PostureAnalysis } from '../services/PoseDetectionService';

interface SkeletonOverlayProps {
    pose: Pose | null;
    analysis: PostureAnalysis | null;
    width: number;
    height: number;
}

export const SkeletonOverlay: React.FC<SkeletonOverlayProps> = ({
    pose,
    analysis,
    width,
    height,
}) => {
    if (!pose || !pose.keypoints) return null;

    const keypoints = pose.keypoints;
    const color = analysis?.color === 'green' ? '#56E8A0' : analysis?.color === 'yellow' ? '#E8C956' : '#E8569D';

    // Helper to get keypoint by name
    const getKp = (name: string) => keypoints.find((kp) => kp.name === name);

    // Define connections based on MediaPipe Full setup (including face)
    const connections = [
        // Torso
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],

        // Arms
        ['left_shoulder', 'left_elbow'],
        ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_elbow'],
        ['right_elbow', 'right_wrist'],

        // Hands (fingers)
        ['left_wrist', 'left_thumb'],
        ['left_wrist', 'left_pinky'],
        ['left_wrist', 'left_index'],
        ['right_wrist', 'right_thumb'],
        ['right_wrist', 'right_pinky'],
        ['right_wrist', 'right_index'],

        // Legs
        ['left_hip', 'left_knee'],
        ['left_knee', 'left_ankle'],
        ['right_hip', 'right_knee'],
        ['right_knee', 'right_ankle'],

        // Feet
        ['left_ankle', 'left_heel'],
        ['left_ankle', 'left_foot_index'],
        ['left_heel', 'left_foot_index'],
        ['right_ankle', 'right_heel'],
        ['right_ankle', 'right_foot_index'],
        ['right_heel', 'right_foot_index'],

        // Face (simplified)
        ['mouth_left', 'mouth_right'],
        ['nose', 'left_eye_inner'],
        ['nose', 'right_eye_inner'],
        ['left_eye_inner', 'left_eye'],
        ['left_eye', 'left_eye_outer'],
        ['left_eye_outer', 'left_ear'],
        ['right_eye_inner', 'right_eye'],
        ['right_eye', 'right_eye_outer'],
        ['right_eye_outer', 'right_ear'],
    ];

    return (
        <Svg width={width} height={height} style={{ position: 'absolute' }}>
            <G>
                {connections.map(([start, end], index) => {
                    const p1 = getKp(start);
                    const p2 = getKp(end);

                    if (!p1 || !p2 || (p1.score || 0) < 0.3 || (p2.score || 0) < 0.3) return null;

                    // Mirror X for front camera: 1 - x
                    const x1 = (1 - p1.x) * width;
                    const y1 = p1.y * height;
                    const x2 = (1 - p2.x) * width;
                    const y2 = p2.y * height;

                    return (
                        <Line
                            key={`conn-${index}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={color}
                            strokeWidth="3"
                            opacity="0.8"
                        />
                    );
                })}

                {keypoints.map((kp, index) => {
                    if ((kp.score || 0) < 0.3) return null;
                    // Different sizes for different keypoints
                    const isFace = ['nose', 'eye', 'ear', 'mouth'].some(part => kp.name?.includes(part));
                    const radius = isFace ? 3 : 5;

                    // Mirror X for front camera
                    const cx = (1 - kp.x) * width;
                    const cy = kp.y * height;

                    return (
                        <Circle
                            key={`kp-${index}`}
                            cx={cx}
                            cy={cy}
                            r={radius}
                            fill={color}
                            stroke="white"
                            strokeWidth="1"
                        />
                    );
                })}
            </G>
        </Svg>
    );
};
