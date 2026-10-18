// Tandem walk analysis. Turns the body points the camera tracked into a short
// list of possible balance problems: stumbles off the line, large sideways
// sway, and falls.
//
// EXPERIMENTAL. The thresholds below are first guesses. They have not been
// tested on real players, concussed or not, and need tuning with real
// recordings before anyone relies on them.
//
// Distances are measured in torso lengths (shoulders to hips), so the numbers
// stay the same as the player walks toward or away from the camera.

const WALK_THRESHOLDS = {
  minVisibility: 0.5, // how sure the tracker must be about a body point to use the frame
  stumbleSpread: 0.6, // ankles this far apart sideways means a foot left the line
  stumbleMinMs: 150,
  swayLeanDeg: 15, // trunk leaning sideways more than this
  swayMinMs: 300,
  fallLeanDeg: 50, // trunk this far from upright
  fallHipToAnkle: 0.8, // hips this close to ankle height
  fallMinMs: 300,
  turnShoulderWidth: 0.4, // shoulders this narrow means the player is side-on, turning around
  turnMarginMs: 500, // the turn itself is not judged, nor this long either side of it
  maxGapMs: 250, // a tracking gap longer than this ends an episode
  minTrackedFrames: 30,
  minTrackedRatio: 0.7, // share of frames the player must be tracked in for a reliable result
};

const BODY_POINTS = { leftShoulder: 11, rightShoulder: 12, leftHip: 23, rightHip: 24, leftAnkle: 27, rightAnkle: 28 };

// Landmarks are in 0..1 of the image width and height. Multiplying x by the
// aspect ratio (width / height) puts both axes in the same units.
function measureFrame(landmarks, aspect) {
  const indexes = Object.values(BODY_POINTS);
  if (!landmarks || indexes.some((i) => !landmarks[i] || landmarks[i].visibility < WALK_THRESHOLDS.minVisibility)) {
    return null;
  }
  const point = (i) => ({ x: landmarks[i].x * aspect, y: landmarks[i].y });
  const middle = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const p = BODY_POINTS;
  const shoulders = middle(point(p.leftShoulder), point(p.rightShoulder));
  const hips = middle(point(p.leftHip), point(p.rightHip));
  const ankles = middle(point(p.leftAnkle), point(p.rightAnkle));
  const torso = Math.hypot(shoulders.x - hips.x, shoulders.y - hips.y);
  if (torso === 0) return null;

  return {
    // 0 when upright, 90 when lying flat. Image y grows downward.
    leanDeg: (Math.atan2(Math.abs(shoulders.x - hips.x), hips.y - shoulders.y) * 180) / Math.PI,
    ankleSpread: Math.abs(point(p.leftAnkle).x - point(p.rightAnkle).x) / torso,
    shoulderWidth: Math.abs(point(p.leftShoulder).x - point(p.rightShoulder).x) / torso,
    hipToAnkle: (ankles.y - hips.y) / torso,
  };
}

function isPlayerInView(landmarks, aspect) {
  return measureFrame(landmarks, aspect) !== null;
}

// Counts stretches where test() holds for at least minMs without a tracking gap.
function countEpisodes(samples, test, minMs) {
  let count = 0;
  let start = null;
  let last = null;
  for (const sample of samples) {
    const gap = last !== null && sample.t - last > WALK_THRESHOLDS.maxGapMs;
    const hit = test(sample);
    if (start !== null && (gap || !hit)) {
      if (last - start >= minMs) count++;
      start = null;
    }
    if (hit && start === null) start = sample.t;
    last = sample.t;
  }
  if (start !== null && last - start >= minMs) count++;
  return count;
}

// frames: [{ t: milliseconds, landmarks: [...] or null }]
function analyzeWalk(frames, aspect) {
  const limits = WALK_THRESHOLDS;
  const tracked = [];
  frames.forEach((frame) => {
    const measures = measureFrame(frame.landmarks, aspect);
    if (measures) tracked.push({ t: frame.t, ...measures });
  });

  const turning = tracked.filter((s) => s.shoulderWidth < limits.turnShoulderWidth).map((s) => s.t);
  const walking = tracked.filter((s) => !turning.some((t) => Math.abs(t - s.t) <= limits.turnMarginMs));

  const durationMs = frames.length > 1 ? frames[frames.length - 1].t - frames[0].t : 0;
  const trackedRatio = frames.length > 0 ? tracked.length / frames.length : 0;

  return {
    durationSec: Math.round(durationMs / 100) / 10,
    trackedPercent: Math.round(trackedRatio * 100),
    reliable: tracked.length >= limits.minTrackedFrames && trackedRatio >= limits.minTrackedRatio,
    stumbles: countEpisodes(walking, (s) => s.ankleSpread > limits.stumbleSpread, limits.stumbleMinMs),
    swayEpisodes: countEpisodes(walking, (s) => s.leanDeg > limits.swayLeanDeg, limits.swayMinMs),
    falls: countEpisodes(
      tracked,
      (s) => s.leanDeg > limits.fallLeanDeg || s.hipToAnkle < limits.fallHipToAnkle,
      limits.fallMinMs
    ),
    maxLeanDeg: Math.round(walking.reduce((max, s) => Math.max(max, s.leanDeg), 0)),
  };
}

// What the camera picked up, in words. An empty list never means the player is fine.
function walkFindings(walk) {
  if (!walk) return [];
  const found = [];
  if (walk.falls > 0) found.push("Possible fall");
  if (walk.stumbles > 0) found.push(`Possible stumble or step off the line (${walk.stumbles})`);
  if (walk.swayEpisodes > 0) found.push(`Large sideways sway (${walk.swayEpisodes})`);
  return found;
}
