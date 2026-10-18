// Body tracking for the tandem walk, using Google's MediaPipe Pose model.
// It runs on the phone: video frames are processed on the device and never
// uploaded or saved. The library and model (about 17 MB) are downloaded the
// first time and then come from the browser's cache.

const MEDIAPIPE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let poseTracker = null;

// Loads once per visit. A failed load is forgotten so the coach can retry.
function loadPoseTracker() {
  if (!poseTracker) {
    poseTracker = (async () => {
      const vision = await import(`${MEDIAPIPE_URL}/vision_bundle.mjs`);
      const files = await vision.FilesetResolver.forVisionTasks(`${MEDIAPIPE_URL}/wasm`);
      const options = (delegate) => ({
        baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      let landmarker;
      try {
        landmarker = await vision.PoseLandmarker.createFromOptions(files, options("GPU"));
      } catch {
        landmarker = await vision.PoseLandmarker.createFromOptions(files, options("CPU"));
      }
      // Face points (0 to 10) are left out of the drawing.
      const connections = vision.PoseLandmarker.POSE_CONNECTIONS.filter((c) => c.start > 10 && c.end > 10);
      return { landmarker, connections };
    })();
    poseTracker.catch(() => {
      poseTracker = null;
    });
  }
  return poseTracker;
}

function drawSkeleton(canvas, landmarks, connections) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks) return;

  const seen = (p) => p && p.visibility > WALK_THRESHOLDS.minVisibility;
  const x = (p) => p.x * canvas.width;
  const y = (p) => p.y * canvas.height;
  const size = Math.max(2, canvas.width / 160);

  ctx.lineWidth = size;
  ctx.strokeStyle = "#ffffff";
  connections.forEach(({ start, end }) => {
    const a = landmarks[start];
    const b = landmarks[end];
    if (!seen(a) || !seen(b)) return;
    ctx.beginPath();
    ctx.moveTo(x(a), y(a));
    ctx.lineTo(x(b), y(b));
    ctx.stroke();
  });

  ctx.fillStyle = "#0a6b3d";
  landmarks.forEach((p, i) => {
    if (i <= 10 || !seen(p)) return;
    ctx.beginPath();
    ctx.arc(x(p), y(p), size * 1.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  });
}
