// Screens, navigation and form handling. Guidance text lives in js/protocols,
// the result rules in assessment.js, storage in records.js and report text in
// reports.js.

const PROTOCOLS = { concussion: CONCUSSION_PROTOCOL };

const STEPS = [
  { id: "danger", title: "Red flags" },
  { id: "signs", title: "Visible signs" },
  { id: "symptoms", title: "Symptoms" },
  { id: "memory", title: "Memory questions" },
  { id: "walk", title: "Tandem walk" },
  { id: "result", title: "Result and next steps" },
  { id: "details", title: "Incident details" },
];

const view = document.getElementById("view");
const notice = document.getElementById("notice");
let current = null;
let cameraStream = null;

function esc(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (c) => entities[c]);
}

function list(items) {
  return `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
}

function setNotice(message) {
  notice.textContent = message;
  notice.hidden = !message;
}

function persist() {
  try {
    Records.save(current);
    setNotice("");
  } catch {
    setNotice("Couldn't save on this device. The browser may be blocking storage or be out of space.");
  }
}

// Routes: #/ (home), #/incidents, #/about, #/i/<id> (record), #/i/<id>/share, #/i/<id>/<step>
function route() {
  stopCamera();
  const [, section, id, page] = location.hash.split("/");
  current = section === "i" && id ? Records.get(id) : null;

  if (section === "incidents") return show(incidentsView());
  if (section === "about") return show(aboutView());
  if (section !== "i") return show(homeView());
  if (!current) return show(notFoundView());

  const protocol = PROTOCOLS[current.injuryType];
  if (!page) return show(recordView(current, protocol));
  if (page === "share") return show(shareView(current));

  const step = STEPS.find((s) => s.id === page);
  if (!step) return show(notFoundView());
  if (current.status !== "draft") return location.replace(`#/i/${current.id}`);

  current.lastStep = step.id;
  persist();
  show(stepView(step, current, protocol));
}

function show(html) {
  view.innerHTML = html;
  window.scrollTo(0, 0);
  const heading = view.querySelector("h1");
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
}

// Home, incident list and about

function homeView() {
  const count = Records.all().length;
  return `
    <h1>Suspected concussion</h1>
    <p>Use this when a player has taken a bump, blow or jolt to the head or body and you are worried about a concussion.
      The check starts with the signs that need an ambulance.</p>
    <div class="menu">
      <button class="btn btn-primary btn-block btn-large" data-action="start">Start check</button>
      <a class="btn btn-block btn-large" href="#/incidents">Incidents on this device${count > 0 ? ` (${count})` : ""}</a>
      <a class="btn btn-block btn-large" href="#/about">About this prototype</a>
    </div>`;
}

function incidentsView() {
  const incidents = Records.all().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rows = incidents.map((incident) => {
    const protocol = PROTOCOLS[incident.injuryType];
    const result = incident.findings || assessIncident(incident, protocol);
    return `
      <li>
        <a href="#/i/${esc(incident.id)}">
          <span class="incident-name">${esc(incident.player.name || "Unnamed player")}</span>
          <span class="muted">${esc(formatTime(incident.occurredAt))}. ${incident.status === "draft" ? "Draft" : "Finalized"}.</span>
          <span class="level level-${result.level}">${esc(protocol.results[result.level].short)}</span>
        </a>
      </li>`;
  });

  return `
    <p><a href="#/">Home</a></p>
    <h1>Incidents on this device</h1>
    ${rows.length > 0
      ? `<ul class="incidents">${rows.join("")}</ul>`
      : `<p class="muted">No incidents recorded yet. Starting a check creates one.</p>
         <button class="btn btn-primary" data-action="start">Start check</button>`}`;
}

function aboutView() {
  return `
    <p><a href="#/">Home</a></p>
    <h1>About this prototype</h1>
    <p>This is a hackathon prototype, not a medical device. It cannot diagnose a concussion or rule one out,
      and it does not replace emergency services or a healthcare professional.</p>
    <p>The result comes from simple rules applied to what you record. The tandem walk uses the camera to track
      the player's body on this phone. Video is never recorded, saved or uploaded; only the measurements are kept.
      The walk check is experimental and its limits are first guesses.</p>
    <p>Records are stored only in this browser. Clearing your browser data deletes them.</p>
    <p>Guidance adapted from:</p>
    ${list(CONCUSSION_PROTOCOL.sources)}
    <p>${esc(CONCUSSION_PROTOCOL.reviewStatus)}</p>`;
}

function notFoundView() {
  return `
    <h1>Record not found</h1>
    <p>This incident isn't stored in this browser. It may have been deleted, or recorded on another device.</p>
    <a class="btn" href="#/incidents">Back to incidents</a>`;
}

// Check steps

function stepView(step, incident, protocol) {
  const index = STEPS.indexOf(step);
  const back = index === 0 ? "#/" : `#/i/${incident.id}/${STEPS[index - 1].id}`;
  const isLast = index === STEPS.length - 1;
  const body = {
    danger: dangerStep,
    signs: signsStep,
    symptoms: symptomsStep,
    memory: memoryStep,
    walk: walkStep,
    result: resultStep,
    details: detailsStep,
  }[step.id](incident, protocol);

  return `
    <p class="step-count">Step ${index + 1} of ${STEPS.length}</p>
    <h1>${step.title}</h1>
    ${body}
    <div class="step-nav">
      <a class="btn" href="${back}">Back</a>
      <button class="btn btn-primary" data-action="next" data-step="${step.id}">${isLast ? "Save and review" : "Next"}</button>
    </div>`;
}

function checklist(listName, items, selected, extraClass = "") {
  return `
    <ul class="checklist ${extraClass}">
      ${items.map((item) => `
        <li><label>
          <input type="checkbox" data-list="${listName}" value="${item.id}"${selected.includes(item.id) ? " checked" : ""}>
          <span>${esc(item.label)}</span>
        </label></li>`).join("")}
    </ul>`;
}

function dangerStep(incident, protocol) {
  return `
    <p>Check for these before you move the player. Tick any that you see or that the player reports.
      If any are ticked, Next takes you straight to the result.</p>
    ${checklist("redFlags", protocol.redFlags, incident.redFlags, "checklist-danger")}`;
}

function signsStep(incident, protocol) {
  return `
    <p>Tick anything you saw when the injury happened or can see now.</p>
    ${checklist("signs", protocol.observableSigns, incident.signs)}`;
}

function symptomsStep(incident, protocol) {
  return `
    <p>Ask the player how they feel. Tick everything they report.</p>
    ${checklist("symptoms", protocol.symptoms, incident.symptoms)}`;
}

function memoryStep(incident, protocol) {
  const question = (q) => {
    const answer = incident.memory[q.id] || "not-asked";
    const option = (value, label) => `
      <label class="choice">
        <input type="radio" name="q-${q.id}" data-memory="${q.id}" value="${value}"${answer === value ? " checked" : ""}>
        <span>${label}</span>
      </label>`;
    return `
      <li><fieldset>
        <legend>${esc(q.text)}</legend>
        <div class="choices">${option("correct", "Correct")}${option("incorrect", "Incorrect")}${option("not-asked", "Not asked")}</div>
      </fieldset></li>`;
  };

  return `
    <p>${esc(protocol.memoryNote)}</p>
    <ol class="questions">${protocol.memoryQuestions.map(question).join("")}</ol>`;
}

function walkStep(incident, protocol) {
  const test = protocol.walkTest;
  return `
    <p>${esc(test.intro)}</p>
    <p class="warning">${esc(test.safety)}</p>
    <h2>Set up</h2>
    ${list(test.setup)}
    <h2>The walk</h2>
    <ol>${test.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
    <div class="walk">
      <div class="walk-view" data-walk-view hidden>
        <video data-walk-video muted playsinline></video>
        <canvas data-walk-canvas></canvas>
      </div>
      <p class="walk-status" data-walk-status role="status"></p>
      <div class="button-row">
        <button class="btn btn-primary" data-action="walk-camera">${incident.walk ? "Redo the walk" : "Turn on camera"}</button>
        <button class="btn btn-primary" data-action="walk-start" hidden>Start walk</button>
        <button class="btn btn-primary" data-action="walk-stop" hidden>Stop</button>
      </div>
    </div>
    <div data-walk-result>${incident.walk ? walkResult(incident.walk) : ""}</div>
    <p class="hint">You can skip this step. Video is never recorded, saved or uploaded.</p>`;
}

function walkResult(walk) {
  const findings = walkFindings(walk);
  return `
    <h2>Walk result</h2>
    ${findings.length > 0
      ? `<p>The camera picked up:</p>${list(findings)}<p>This counts toward a suspected concussion.</p>`
      : "<p>The camera did not pick up a stumble, large sway or fall. This does not rule out a concussion.</p>"}
    ${walk.reliable ? "" : `<p class="error">The camera could not track the player well. Try again with their whole body in view and better light.</p>`}
    <p class="hint">Walk time ${walk.durationSec} seconds. Player tracked ${walk.trackedPercent}% of the time.
      Largest sideways lean ${walk.maxLeanDeg} degrees.</p>`;
}

function resultBanner(result, protocol) {
  const text = protocol.results[result.level];
  return `
    <div class="result result-${result.level}">
      <p class="result-note">Experimental check, not clinically validated</p>
      <h2>${esc(text.headline)}</h2>
      <p>${esc(text.summary)}</p>
      ${result.incomplete.length > 0 ? `<p class="result-incomplete">Not completed: ${esc(result.incomplete.join(", "))}.</p>` : ""}
    </div>`;
}

function whyThisResult(result) {
  const indicators = result.indicators.length > 0
    ? list(result.indicators.map((item) => `${item.section}: ${item.label}`))
    : "<p>Nothing was ticked during the check.</p>";
  return `${indicators}<h3>Limitations</h3>${list(result.limitations)}`;
}

function resultStep(incident, protocol) {
  const result = assessIncident(incident, protocol);
  const actionRow = (action) => {
    const doneAt = incident.actions[action.id];
    return `
      <li><label>
        <input type="checkbox" data-done="${action.id}"${doneAt ? " checked" : ""}>
        <span>${esc(action.label)}</span>
        <span class="time" data-time-for="${action.id}">${doneAt ? esc(formatClock(doneAt)) : ""}</span>
      </label></li>`;
  };

  const emergency = `
    <section class="emergency">
      <a class="btn btn-call btn-block" href="tel:${EMERGENCY_NUMBER}">Call ${EMERGENCY_NUMBER}</a>
      ${list(protocol.emergencySteps)}
      ${result.incomplete.length > 0
        ? "<p>Once help is on the way, you can record the rest of the check from the incident record.</p>"
        : ""}
    </section>`;

  return `
    ${resultBanner(result, protocol)}
    ${result.level === "emergency" ? emergency : ""}

    <h2>What to do now</h2>
    <ol class="steps">${nextStepsFor(result.level, protocol).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>

    <h2>Record what has been done</h2>
    <p class="hint">Ticking an item records the time.</p>
    <ul class="checklist">${protocol.actions.map(actionRow).join("")}</ul>

    <h2>Danger signs to watch for</h2>
    <p>${esc(protocol.dangerSignsAction)}</p>
    ${list(protocol.dangerSigns)}

    <h2>Why this result</h2>
    ${whyThisResult(result)}`;
}

function field(path, label, value, type = "text", extra = "") {
  const id = `f-${path.replace(".", "-")}`;
  return `
    <div class="field">
      <label for="${id}">${label}</label>
      <input id="${id}" type="${type}" data-field="${path}" value="${esc(value)}" ${extra}>
    </div>`;
}

function detailsStep(incident) {
  const settings = ["Game", "Practice", "Other"];
  return `
    <p>Fill this in once the player is safe. You can come back to it later from the incident list.</p>
    <div class="field">
      <label for="f-player-name">Player name</label>
      <input id="f-player-name" type="text" data-field="player.name" value="${esc(incident.player.name)}"
        autocomplete="off" aria-describedby="f-player-name-hint">
      <p class="hint" id="f-player-name-hint">Needed before you can finalize the record.</p>
    </div>
    ${field("player.age", "Age", incident.player.age, "number", 'inputmode="numeric" min="1" max="99"')}
    ${field("player.team", "Team", incident.player.team)}
    ${field("context.sport", "Sport", incident.context.sport)}
    <fieldset class="field">
      <legend>Setting</legend>
      <div class="choices">
        ${settings.map((s) => `
          <label class="choice">
            <input type="radio" name="setting" data-field="context.setting" value="${s}"${incident.context.setting === s ? " checked" : ""}>
            <span>${s}</span>
          </label>`).join("")}
      </div>
    </fieldset>
    <div class="field">
      <label for="f-occurredAt">When did it happen?</label>
      <input id="f-occurredAt" type="datetime-local" data-field="occurredAt" value="${esc(incident.occurredAt)}"
        aria-describedby="f-occurredAt-hint">
      <p class="hint" id="f-occurredAt-hint">Set to when the check started. Change it if the injury happened earlier.</p>
    </div>
    ${field("context.location", "Where", incident.context.location)}
    <div class="field">
      <label for="f-description">How did it happen?</label>
      <textarea id="f-description" data-field="context.description" rows="4"
        aria-describedby="f-description-hint">${esc(incident.context.description)}</textarea>
      <p class="hint" id="f-description-hint">For example: head-to-head collision while going for a header.</p>
    </div>
    ${field("recordedBy", "Your name", incident.recordedBy, "text", 'autocomplete="name"')}`;
}

// Record

function recordView(incident, protocol) {
  const result = incident.findings || assessIncident(incident, protocol);
  const draft = incident.status === "draft";
  const base = `#/i/${incident.id}`;
  const { player, context } = incident;

  const heading = (title, step) => `
    <div class="section-head">
      <h2>${title}</h2>
      ${draft ? `<a href="${base}/${step}">Edit<span class="visually-hidden"> ${title.toLowerCase()}</span></a>` : ""}
    </div>`;
  const observed = (step, items, ids) => {
    const labels = labelsFor(items, ids);
    if (labels.length > 0) return list(labels);
    return `<p class="muted">${incident.checked[step] ? "None recorded." : "Not checked."}</p>`;
  };
  const details = [
    ["Player", player.name],
    ["Age", player.age],
    ["Team", player.team],
    ["Sport", context.sport],
    ["Setting", context.setting],
    ["When", formatTime(incident.occurredAt)],
    ["Where", context.location],
    ["How it happened", context.description],
    ["Recorded by", incident.recordedBy],
  ];

  return `
    <p><a href="#/incidents">All incidents</a></p>
    <h1>${esc(player.name || "Unnamed player")}</h1>
    <p class="muted">${draft ? "Draft. Check the details, then finalize the record at the bottom of this page." : `Finalized ${esc(formatTime(incident.finalizedAt))}.`}</p>
    ${resultBanner(result, protocol)}
    <div class="button-row">
      <a class="btn btn-primary" href="${base}/share">Share a report</a>
      ${draft ? `<a class="btn" href="${base}/${incident.lastStep || "danger"}">Continue check</a>` : ""}
    </div>

    ${heading("Incident details", "details")}
    <dl class="details">
      ${details.map(([label, value]) => `<dt>${label}</dt><dd>${value ? esc(value) : '<span class="muted">Not recorded</span>'}</dd>`).join("")}
    </dl>

    ${heading("Red flags", "danger")}
    ${observed("danger", protocol.redFlags, incident.redFlags)}
    ${heading("Visible signs", "signs")}
    ${observed("signs", protocol.observableSigns, incident.signs)}
    ${heading("Symptoms", "symptoms")}
    ${observed("symptoms", protocol.symptoms, incident.symptoms)}
    ${heading("Memory questions", "memory")}
    <ul>
      ${protocol.memoryQuestions.map((q) => `<li>${esc(q.text)} <strong>${memoryAnswerLabel(incident.memory[q.id])}</strong></li>`).join("")}
    </ul>
    ${heading("Tandem walk (camera, experimental)", "walk")}
    ${incident.walk ? list(describeWalk(incident.walk)) : `<p class="muted">${incident.checked.walk ? "Not done." : "Not checked."}</p>`}

    ${heading("Actions and timeline", "result")}
    <ol class="timeline">
      ${buildTimeline(incident, protocol).map((e) => `<li><span class="time">${esc(formatTime(e.at))}</span> ${esc(e.text)}</li>`).join("")}
    </ol>

    <h2>Why this result</h2>
    ${whyThisResult(result)}

    <h2>Follow-up</h2>
    <div class="field">
      <label for="f-followUp">Follow-up notes</label>
      <textarea id="f-followUp" data-field="followUp" rows="4" aria-describedby="f-followUp-hint">${esc(incident.followUp)}</textarea>
      <p class="hint" id="f-followUp-hint">For example: seen by a doctor, return-to-play plan, who has been told. Saved as you type.</p>
    </div>

    ${draft ? `
      <h2>Finalize</h2>
      <p>Once finalized, the incident details are locked. You can still add follow-up notes.</p>
      <p class="error" data-finalize-error role="alert" hidden></p>
      <button class="btn btn-primary" data-action="finalize">Finalize record</button>` : ""}

    <p class="delete-row"><button class="link-danger" data-action="delete">Delete this record</button></p>`;
}

// Share

function shareView(incident) {
  const protocol = PROTOCOLS[incident.injuryType];
  return `
    <p><a href="#/i/${incident.id}">Back to record</a></p>
    <h1>Share a report</h1>
    <p>Each report includes only what that person needs. Read it before you send it.
      Nothing leaves this device until you copy or share it.</p>
    <fieldset class="field">
      <legend>Who is it for?</legend>
      <div class="choices choices-stack">
        ${REPORT_RECIPIENTS.map((r, i) => `
          <label class="choice">
            <input type="radio" name="recipient" data-recipient value="${r.id}"${i === 0 ? " checked" : ""}>
            <span>${r.label}</span>
          </label>`).join("")}
      </div>
    </fieldset>
    <div class="field">
      <label for="report-text">Report</label>
      <textarea id="report-text" rows="18" readonly>${esc(buildReport(incident, protocol, REPORT_RECIPIENTS[0].id))}</textarea>
    </div>
    <div class="button-row">
      <button class="btn btn-primary" data-action="copy">Copy</button>
      ${navigator.share ? '<button class="btn" data-action="share">Share</button>' : ""}
    </div>
    <p data-share-status role="status"></p>`;
}

function setShareStatus(message) {
  view.querySelector("[data-share-status]").textContent = message;
}

// Actions

function startCheck() {
  try {
    const incident = Records.create("concussion");
    location.hash = `#/i/${incident.id}/danger`;
  } catch {
    setNotice("Couldn't create a record. The browser may be blocking storage. Call emergency services directly if needed.");
  }
}

// A red flag skips the rest of the check, as the CRT6 says: call for help first.
function nextStep(button) {
  const step = button.dataset.step;
  current.checked[step] = true;
  persist();
  if (step === "danger" && current.redFlags.length > 0) {
    location.hash = `#/i/${current.id}/result`;
    return;
  }
  const next = STEPS[STEPS.findIndex((s) => s.id === step) + 1];
  location.hash = next ? `#/i/${current.id}/${next.id}` : `#/i/${current.id}`;
}

function finalizeRecord() {
  const error = view.querySelector("[data-finalize-error]");
  if (!current.player.name.trim()) {
    error.innerHTML = `Add the player's name before finalizing. <a href="#/i/${current.id}/details">Go to incident details</a>`;
    error.hidden = false;
    return;
  }
  if (!confirm("Finalize this record? The incident details will be locked. You can still add follow-up notes.")) return;
  current.status = "finalized";
  current.finalizedAt = new Date().toISOString();
  current.findings = assessIncident(current, PROTOCOLS[current.injuryType]);
  persist();
  route();
}

function deleteRecord() {
  if (!confirm("Delete this record permanently? This can't be undone.")) return;
  try {
    Records.remove(current.id);
    location.hash = "#/incidents";
  } catch {
    setNotice("Couldn't delete the record. The browser may be blocking storage.");
  }
}

async function copyReport() {
  const box = document.getElementById("report-text");
  try {
    await navigator.clipboard.writeText(box.value);
    setShareStatus("Copied.");
  } catch {
    box.focus();
    box.select();
    setShareStatus("Your browser blocked copying. The text is selected so you can copy it yourself.");
  }
}

async function shareReport() {
  try {
    await navigator.share({ title: "Injury incident report", text: document.getElementById("report-text").value });
    setShareStatus("Shared.");
  } catch (err) {
    if (err.name !== "AbortError") setShareStatus("Couldn't open the share menu. Use Copy instead.");
  }
}

// Tandem walk recording. Only the tracked body points are kept in memory while
// recording; the video itself is never stored.

const WALK_MAX_MS = 60000;
const walkRun = { active: false, recording: false, frames: [], startedAt: 0, lastVideoTime: -1, timer: null };

function walkElements() {
  const get = (name) => view.querySelector(`[data-${name}]`);
  return {
    viewBox: get("walk-view"),
    video: get("walk-video"),
    canvas: get("walk-canvas"),
    status: get("walk-status"),
    result: get("walk-result"),
    cameraButton: view.querySelector('[data-action="walk-camera"]'),
    startButton: view.querySelector('[data-action="walk-start"]'),
    stopButton: view.querySelector('[data-action="walk-stop"]'),
  };
}

async function walkCamera(button) {
  const el = walkElements();
  if (!navigator.mediaDevices?.getUserMedia) {
    el.status.textContent = "This browser can't open the camera here. You can skip this step.";
    return;
  }
  button.disabled = true;
  try {
    el.status.textContent = "Loading body tracking. The first time, this downloads about 17 MB.";
    let pose;
    try {
      pose = await loadPoseTracker();
    } catch {
      el.status.textContent = "Couldn't load body tracking. It needs an internet connection the first time. You can skip this step.";
      return;
    }
    // The coach may have left this step while it was loading.
    if (!view.contains(el.video)) return;

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (err) {
      el.status.textContent = err.name === "NotAllowedError"
        ? "Camera permission was denied. You can skip this step."
        : "Couldn't start the camera. You can skip this step.";
      return;
    }
    if (!view.contains(el.video)) return stopCamera();

    el.video.srcObject = cameraStream;
    try {
      await el.video.play();
    } catch {
      stopCamera();
      el.status.textContent = "Couldn't start the camera. You can skip this step.";
      return;
    }
    el.viewBox.hidden = false;
    button.hidden = true;
    el.startButton.hidden = false;
    Object.assign(walkRun, { active: true, recording: false, frames: [], lastVideoTime: -1 });
    trackFrame(pose, el);
  } finally {
    button.disabled = false;
  }
}

function trackFrame(pose, el) {
  if (!walkRun.active) return;
  const { video, canvas, status } = el;
  if (video.readyState >= 2 && video.currentTime !== walkRun.lastVideoTime) {
    walkRun.lastVideoTime = video.currentTime;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const now = performance.now();
    let landmarks;
    try {
      landmarks = pose.landmarker.detectForVideo(video, now).landmarks[0] || null;
    } catch {
      stopCamera();
      status.textContent = "Body tracking stopped working. You can skip this step.";
      return;
    }
    drawSkeleton(canvas, landmarks, pose.connections);

    if (walkRun.recording) {
      walkRun.frames.push({ t: now, landmarks: landmarks && landmarks.map(({ x, y, visibility }) => ({ x, y, visibility })) });
      const seconds = Math.floor((now - walkRun.startedAt) / 1000);
      status.textContent = `Recording, ${seconds} s. Tap Stop when they have walked back.`;
    } else {
      status.textContent = isPlayerInView(landmarks, video.videoWidth / video.videoHeight)
        ? "Player in view. Tap Start walk when they are ready."
        : "Get the player's whole body in view, feet included.";
    }
  }
  requestAnimationFrame(() => trackFrame(pose, el));
}

function walkStart(button) {
  const el = walkElements();
  Object.assign(walkRun, { recording: true, frames: [], startedAt: performance.now() });
  walkRun.timer = setTimeout(walkStop, WALK_MAX_MS);
  button.hidden = true;
  el.stopButton.hidden = false;
}

function walkStop() {
  if (!walkRun.recording) return;
  const el = walkElements();
  walkRun.recording = false;
  const aspect = el.video.videoWidth / el.video.videoHeight || 1;
  current.walk = { ...analyzeWalk(walkRun.frames, aspect), completedAt: new Date().toISOString() };
  persist();
  stopCamera();

  el.viewBox.hidden = true;
  el.stopButton.hidden = true;
  el.cameraButton.hidden = false;
  el.cameraButton.textContent = "Redo the walk";
  el.status.textContent = "";
  el.result.innerHTML = walkResult(current.walk);
  el.result.scrollIntoView({ block: "nearest" });
}

function stopCamera() {
  clearTimeout(walkRun.timer);
  Object.assign(walkRun, { active: false, recording: false, frames: [] });
  if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
}

function setPath(target, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  keys.reduce((obj, key) => obj[key], target)[last] = value;
}

// Events

const clickHandlers = {
  start: startCheck,
  next: nextStep,
  "walk-camera": walkCamera,
  "walk-start": walkStart,
  "walk-stop": walkStop,
  finalize: finalizeRecord,
  delete: deleteRecord,
  copy: copyReport,
  share: shareReport,
};

view.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (button) clickHandlers[button.dataset.action](button);
});

view.addEventListener("change", (event) => {
  const el = event.target;
  if (!current) return;

  if (el.dataset.recipient !== undefined) {
    document.getElementById("report-text").value = buildReport(current, PROTOCOLS[current.injuryType], el.value);
    setShareStatus("");
    return;
  }
  if (current.status !== "draft") return;

  if (el.dataset.list) {
    const ids = current[el.dataset.list];
    current[el.dataset.list] = el.checked ? [...new Set([...ids, el.value])] : ids.filter((id) => id !== el.value);
  } else if (el.dataset.memory) {
    current.memory[el.dataset.memory] = el.value;
  } else if (el.dataset.done) {
    const doneAt = el.checked ? new Date().toISOString() : null;
    current.actions[el.dataset.done] = doneAt;
    view.querySelector(`[data-time-for="${el.dataset.done}"]`).textContent = doneAt ? formatClock(doneAt) : "";
  } else {
    return;
  }
  persist();
});

view.addEventListener("input", (event) => {
  const el = event.target;
  if (!current || !el.dataset.field) return;
  if (current.status !== "draft" && el.dataset.field !== "followUp") return;
  setPath(current, el.dataset.field, el.value);
  persist();
});

const callLink = document.getElementById("call-link");
callLink.href = `tel:${EMERGENCY_NUMBER}`;
callLink.textContent = `Call ${EMERGENCY_NUMBER}`;

window.addEventListener("hashchange", route);
route();

// Offline support (sw.js). The app still works if this fails, for example
// when index.html is opened as a file.
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
