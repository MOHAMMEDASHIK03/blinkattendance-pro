import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';
  
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
  ]);
  
  modelsLoaded = true;
}

export function getEyeAspectRatio(landmarks: faceapi.FaceLandmarks68) {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  
  const earLeft = computeEAR(leftEye);
  const earRight = computeEAR(rightEye);
  
  return (earLeft + earRight) / 2;
}

function computeEAR(eye: faceapi.Point[]) {
  const vertical1 = distance(eye[1], eye[5]);
  const vertical2 = distance(eye[2], eye[4]);
  const horizontal = distance(eye[0], eye[3]);
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

function distance(p1: faceapi.Point, p2: faceapi.Point) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export async function detectFaceWithDescriptor(video: HTMLVideoElement) {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  return detection;
}

export function compareFaces(descriptor1: Float32Array, descriptor2: number[]): number {
  const d2 = new Float32Array(descriptor2);
  return faceapi.euclideanDistance(descriptor1, d2);
}

export const BLINK_THRESHOLD = 0.21;
export const MATCH_THRESHOLD = 0.55;
