import { useEffect, useRef, type RefObject } from "react";
import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";

interface FacialLandmarkOverlayProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

type LandmarkConnection = { start: number; end: number };

const MEDIAPIPE_WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const FACE_LANDMARKER_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const DETECTION_INTERVAL_MS = 110;

function drawConnections(
  context: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  connections: LandmarkConnection[],
  width: number,
  height: number,
) {
  context.beginPath();
  for (const connection of connections) {
    const start = landmarks[connection.start];
    const end = landmarks[connection.end];
    if (!start || !end) continue;

    context.moveTo((1 - start.x) * width, start.y * height);
    context.lineTo((1 - end.x) * width, end.y * height);
  }
  context.strokeStyle = "rgba(103, 232, 249, 0.68)";
  context.lineWidth = Math.max(1, width / 720);
  context.shadowColor = "rgba(34, 211, 238, 0.8)";
  context.shadowBlur = 5;
  context.stroke();
  context.shadowBlur = 0;
}

function drawLandmarkPoints(
  context: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
) {
  context.fillStyle = "rgba(224, 247, 250, 0.92)";
  context.shadowColor = "rgba(34, 211, 238, 0.95)";
  context.shadowBlur = 4;

  for (let index = 0; index < landmarks.length; index += 6) {
    const landmark = landmarks[index];
    context.beginPath();
    context.arc(
      (1 - landmark.x) * width,
      landmark.y * height,
      Math.max(1.15, width / 620),
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.shadowBlur = 0;
}

export default function FacialLandmarkOverlay({ containerRef }: FacialLandmarkOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let animationFrame = 0;
    let landmarker: FaceLandmarker | null = null;
    let lastDetectionAt = 0;
    let lastVideoTime = -1;

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    };

    const waitForVideo = async () => {
      while (!cancelled) {
        const video = containerRef.current?.querySelector<HTMLVideoElement>(".amplify-liveness-video");
        if (video) return video;
        await new Promise((resolve) => window.setTimeout(resolve, 120));
      }
      return null;
    };

    const configureCanvas = (video: HTMLVideoElement) => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas || !video.videoWidth || !video.videoHeight) return false;

      const containerBounds = container.getBoundingClientRect();
      const videoBounds = video.getBoundingClientRect();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.style.left = `${videoBounds.left - containerBounds.left}px`;
      canvas.style.top = `${videoBounds.top - containerBounds.top}px`;
      canvas.style.width = `${videoBounds.width}px`;
      canvas.style.height = `${videoBounds.height}px`;
      return true;
    };

    const startTracking = async () => {
      const video = await waitForVideo();
      if (!video || cancelled) return;

      try {
        const { FaceLandmarker: FaceLandmarkerApi, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT);
        const options = {
          baseOptions: {
            modelAssetPath: FACE_LANDMARKER_MODEL,
            delegate: "GPU" as const,
          },
          runningMode: "VIDEO" as const,
          numFaces: 1,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        };

        try {
          landmarker = await FaceLandmarkerApi.createFromOptions(vision, options);
        } catch {
          landmarker = await FaceLandmarkerApi.createFromOptions(vision, {
            ...options,
            baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL },
          });
        }

        const renderFrame = (now: number) => {
          if (cancelled || !landmarker) return;
          animationFrame = window.requestAnimationFrame(renderFrame);

          const container = containerRef.current;
          const canvas = canvasRef.current;
          const context = canvas?.getContext("2d");
          if (!container || !canvas || !context || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

          // AWS intentionally controls the recording challenge. The mesh is only
          // shown during alignment so it cannot cover the liveness color sequence.
          if (container.querySelector(".amplify-liveness-recording-icon-container")) {
            clearCanvas();
            return;
          }

          if (now - lastDetectionAt < DETECTION_INTERVAL_MS || video.currentTime === lastVideoTime) return;
          lastDetectionAt = now;
          lastVideoTime = video.currentTime;
          if (!configureCanvas(video)) return;

          const result = landmarker.detectForVideo(video, now);
          context.clearRect(0, 0, canvas.width, canvas.height);
          const landmarks = result.faceLandmarks[0];
          if (!landmarks) return;

          drawConnections(
            context,
            landmarks,
            FaceLandmarkerApi.FACE_LANDMARKS_CONTOURS,
            canvas.width,
            canvas.height,
          );
          drawLandmarkPoints(context, landmarks, canvas.width, canvas.height);
        };

        animationFrame = window.requestAnimationFrame(renderFrame);
      } catch {
        // The biometric check remains fully functional if the optional local
        // landmark visualization cannot load on a device or restricted network.
        clearCanvas();
      }
    };

    void startTracking();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      landmarker?.close();
      clearCanvas();
    };
  }, [containerRef]);

  return <canvas ref={canvasRef} className="facial-landmark-overlay pointer-events-none absolute z-[15]" aria-hidden="true" />;
}
