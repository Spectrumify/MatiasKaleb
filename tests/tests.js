// Checks for the assessment rules, reports and storage. Open tests/index.html to run them.

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, message: err.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const protocol = CONCUSSION_PROTOCOL;
const ALL_CHECKED = { danger: true, signs: true, symptoms: true, memory: true, walk: true };

function incidentWith(changes) {
  return Object.assign(newIncident("concussion"), { checked: { ...ALL_CHECKED } }, changes);
}

// Assessment rules

test("nothing recorded gives 'none', never a clear result", () => {
  const result = assessIncident(incidentWith({}), protocol);
  assert(result.level === "none", `expected none, got ${result.level}`);
  assert(result.indicators.length === 0, "expected no indicators");
});

test("no result text claims the player does not have a concussion", () => {
  const banned = [/no concussion/i, /not concussed/i, /safe to (play|return)/i, /all clear/i, /ruled out/i];
  Object.values(protocol.results).forEach((text) => {
    banned.forEach((pattern) => {
      assert(!pattern.test(text.headline + " " + text.summary), `"${text.headline}" matches ${pattern}`);
    });
  });
});

test("any red flag on its own means emergency", () => {
  protocol.redFlags.forEach((flag) => {
    const result = assessIncident(incidentWith({ redFlags: [flag.id] }), protocol);
    assert(result.level === "emergency", `${flag.id} gave ${result.level}`);
  });
});

test("a red flag stays an emergency when other things are also ticked", () => {
  const result = assessIncident(
    incidentWith({ redFlags: ["vomiting"], symptoms: ["headache"], memory: { venue: "correct" } }),
    protocol
  );
  assert(result.level === "emergency", `got ${result.level}`);
});

test("any visible sign means concussion suspected", () => {
  protocol.observableSigns.forEach((sign) => {
    const result = assessIncident(incidentWith({ signs: [sign.id] }), protocol);
    assert(result.level === "suspected", `${sign.id} gave ${result.level}`);
  });
});

test("any symptom means concussion suspected", () => {
  protocol.symptoms.forEach((symptom) => {
    const result = assessIncident(incidentWith({ symptoms: [symptom.id] }), protocol);
    assert(result.level === "suspected", `${symptom.id} gave ${result.level}`);
  });
});

test("one incorrect memory answer means concussion suspected", () => {
  const result = assessIncident(incidentWith({ memory: { venue: "correct", period: "incorrect" } }), protocol);
  assert(result.level === "suspected", `got ${result.level}`);
  assert(result.indicators.some((i) => i.label.includes("Which half")), "missed question should be listed");
  assert(!result.indicators.some((i) => i.label.includes("Where are we playing")), "correct answer should not be listed");
});

test("correct and not-asked memory answers are not indicators", () => {
  const result = assessIncident(incidentWith({ memory: { venue: "correct", period: "not-asked" } }), protocol);
  assert(result.level === "none", `got ${result.level}`);
});

test("unknown ids in stored data are ignored", () => {
  const result = assessIncident(incidentWith({ symptoms: ["not-a-symptom"], redFlags: ["nope"] }), protocol);
  assert(result.level === "none", `got ${result.level}`);
});

test("every ticked item is listed as an indicator", () => {
  const result = assessIncident(incidentWith({ signs: ["vacant"], symptoms: ["headache", "dizziness"] }), protocol);
  const labels = result.indicators.map((i) => i.label);
  ["Blank or vacant look", "Headache", "Dizziness"].forEach((label) => {
    assert(labels.includes(label), `missing ${label}`);
  });
});

test("sections that were skipped are reported as a limitation", () => {
  const result = assessIncident(incidentWith({ checked: { danger: true } }), protocol);
  const note = result.limitations.find((l) => l.startsWith("Not completed"));
  assert(note && note.includes("Symptoms") && note.includes("Memory questions"), `got ${note}`);
  assert(result.incomplete.length === 4, `expected 4 incomplete sections, got ${result.incomplete.length}`);
});

test("asking no memory questions is reported as a limitation", () => {
  const result = assessIncident(incidentWith({}), protocol);
  assert(result.limitations.includes("No memory questions were asked."), "missing limitation");
});

test("every result includes the fixed limitations", () => {
  const result = assessIncident(incidentWith({ symptoms: ["headache"] }), protocol);
  protocol.limitations.forEach((l) => assert(result.limitations.includes(l), `missing: ${l}`));
});

// Tandem walk analysis, using made-up skeletons of a player seen from the front.

function bodyFrame(t, { lean = 0, spread = 0.2, shoulders = 0.7, hipToAnkle = 1.8, visibility = 0.9 } = {}) {
  const torso = 0.2;
  const hip = { x: 0.5, y: 0.4 };
  const angle = (lean * Math.PI) / 180;
  const shoulder = { x: hip.x + torso * Math.sin(angle), y: hip.y - torso * Math.cos(angle) };
  const ankleY = hip.y + hipToAnkle * torso;
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility }));
  const set = (i, x, y) => (landmarks[i] = { x, y, visibility });
  set(11, shoulder.x - (shoulders * torso) / 2, shoulder.y);
  set(12, shoulder.x + (shoulders * torso) / 2, shoulder.y);
  set(23, hip.x - 0.03, hip.y);
  set(24, hip.x + 0.03, hip.y);
  set(27, hip.x - (spread * torso) / 2, ankleY);
  set(28, hip.x + (spread * torso) / 2, ankleY);
  return { t, landmarks };
}

// About 30 frames a second. shape(t) changes the body at time t.
function walkFrames(ms, shape = () => ({})) {
  const frames = [];
  for (let t = 0; t <= ms; t += 33) frames.push(bodyFrame(t, shape(t)));
  return frames;
}

const during = (from, to, change) => (t) => (t >= from && t <= to ? change : {});

test("a steady walk raises no flags", () => {
  const walk = analyzeWalk(walkFrames(4000), 1);
  assert(walk.reliable, "expected a reliable result");
  assert(walk.stumbles === 0 && walk.swayEpisodes === 0 && walk.falls === 0, JSON.stringify(walk));
  assert(walkFindings(walk).length === 0, "expected no findings");
});

test("a foot stepping off the line for 300 ms counts as a stumble", () => {
  const walk = analyzeWalk(walkFrames(4000, during(1000, 1300, { spread: 0.9 })), 1);
  assert(walk.stumbles === 1, `got ${walk.stumbles}`);
});

test("a two-frame tracking jitter is not a stumble", () => {
  const walk = analyzeWalk(walkFrames(4000, during(1000, 1066, { spread: 0.9 })), 1);
  assert(walk.stumbles === 0, `got ${walk.stumbles}`);
});

test("leaning 25 degrees sideways for half a second counts as sway, not a fall", () => {
  const walk = analyzeWalk(walkFrames(4000, during(1000, 1500, { lean: 25 })), 1);
  assert(walk.swayEpisodes === 1, `sway ${walk.swayEpisodes}`);
  assert(walk.falls === 0, `falls ${walk.falls}`);
  assert(walk.maxLeanDeg === 25, `max lean ${walk.maxLeanDeg}`);
});

test("the trunk going past 50 degrees counts as a fall", () => {
  const walk = analyzeWalk(walkFrames(4000, during(1000, 1500, { lean: 70 })), 1);
  assert(walk.falls === 1, `got ${walk.falls}`);
});

test("hips dropping toward the ground counts as a fall", () => {
  const walk = analyzeWalk(walkFrames(4000, during(2000, 2600, { hipToAnkle: 0.5 })), 1);
  assert(walk.falls === 1, `got ${walk.falls}`);
});

test("feet spreading while turning around is not a stumble", () => {
  const shape = (t) => ({
    ...(t >= 1400 && t <= 2000 ? { shoulders: 0.1 } : {}),
    ...(t >= 1300 && t <= 2100 ? { spread: 1.0 } : {}),
  });
  const walk = analyzeWalk(walkFrames(4000, shape), 1);
  assert(walk.stumbles === 0, `got ${walk.stumbles}`);
});

test("a walk where the player is mostly out of view is marked unreliable", () => {
  const frames = walkFrames(4000).map((f, i) => (i % 3 === 0 ? f : { t: f.t, landmarks: null }));
  const walk = analyzeWalk(frames, 1);
  assert(!walk.reliable, `tracked ${walk.trackedPercent}%`);
});

test("body points the tracker is unsure about are not used", () => {
  assert(!isPlayerInView(bodyFrame(0, { visibility: 0.3 }).landmarks, 1), "low visibility frame was used");
  assert(isPlayerInView(bodyFrame(0).landmarks, 1), "clear frame was not used");
});

test("a flagged walk makes the result 'concussion suspected'", () => {
  const walk = analyzeWalk(walkFrames(4000, during(1000, 1300, { spread: 0.9 })), 1);
  const result = assessIncident(incidentWith({ walk }), protocol);
  assert(result.level === "suspected", `got ${result.level}`);
  assert(result.indicators.some((i) => i.section === "Tandem walk (camera)"), "walk not listed as a reason");
});

test("a clean walk never lowers the result", () => {
  const walk = analyzeWalk(walkFrames(4000), 1);
  const suspected = assessIncident(incidentWith({ walk, symptoms: ["headache"] }), protocol);
  assert(suspected.level === "suspected", `got ${suspected.level}`);
  const emergency = assessIncident(incidentWith({ walk, redFlags: ["seizure"] }), protocol);
  assert(emergency.level === "emergency", `got ${emergency.level}`);
});

test("an unreliable or skipped walk is reported as a limitation", () => {
  const frames = walkFrames(4000).map((f, i) => (i % 3 === 0 ? f : { t: f.t, landmarks: null }));
  const unreliable = assessIncident(incidentWith({ walk: analyzeWalk(frames, 1) }), protocol);
  assert(unreliable.limitations.some((l) => l.includes("could not track")), "missing tracking limitation");
  const skipped = assessIncident(incidentWith({}), protocol);
  assert(skipped.limitations.includes("The tandem walk was not done."), "missing skipped limitation");
});

// Reports

const sample = incidentWith({
  player: { name: "Sam Rivera", age: "15", team: "U16 Blue" },
  context: { sport: "Soccer", setting: "Game", location: "North field", description: "Head-to-head collision." },
  symptoms: ["headache"],
  memory: { venue: "incorrect" },
  actions: { removedFromPlay: new Date().toISOString() },
});

test("parent report has next steps and danger signs but no memory question detail", () => {
  const report = buildReport(sample, protocol, "guardian");
  assert(report.includes(protocol.dangerSigns[0]), "missing danger signs");
  assert(report.includes(protocol.nextSteps.suspected[0]), "missing next steps");
  assert(report.includes(`call ${EMERGENCY_NUMBER}`), "missing emergency number");
  assert(!report.includes(protocol.memoryQuestions[0].text), "should not include memory questions");
});

test("medical report has observations, timeline and limitations", () => {
  const report = buildReport(sample, protocol, "medical");
  assert(report.includes("Headache"), "missing symptom");
  assert(report.includes("Where are we playing today? (Incorrect)"), "missing memory answer");
  assert(report.includes("Timeline") && report.includes("Removed from play"), "missing timeline");
  assert(report.includes(protocol.limitations[2]), "missing limitations");
  assert(report.includes("Tandem walk (camera, experimental)") && report.includes("Not done"), "missing walk section");
});

test("team staff report leaves out symptoms and gives return-to-play status", () => {
  const report = buildReport(sample, protocol, "staff");
  assert(!report.includes("Headache"), "staff report should not list symptoms");
  assert(report.includes(protocol.returnToPlay.suspected), "missing return-to-play status");
});

test("follow-up notes go to medical and team staff, not the parent report", () => {
  const withNotes = { ...sample, followUp: "Seen by a doctor on Monday." };
  assert(buildReport(withNotes, protocol, "medical").includes(withNotes.followUp), "missing from medical");
  assert(buildReport(withNotes, protocol, "staff").includes(withNotes.followUp), "missing from staff");
  assert(!buildReport(withNotes, protocol, "guardian").includes(withNotes.followUp), "should not be in parent report");
});

test("draft reports are marked as drafts and finalized ones are not", () => {
  assert(buildReport(sample, protocol, "staff").startsWith("DRAFT"), "draft not marked");
  const finalized = { ...sample, status: "finalized", finalizedAt: new Date().toISOString() };
  assert(!buildReport(finalized, protocol, "staff").startsWith("DRAFT"), "finalized marked as draft");
});

test("skipped sections show as 'Not checked' in the medical report", () => {
  const report = buildReport(incidentWith({ checked: {} }), protocol, "medical");
  assert(report.includes("- Not checked"), "expected 'Not checked'");
});

test("timeline is in time order", () => {
  const incident = incidentWith({
    occurredAt: "2026-01-01T10:00",
    createdAt: "2026-01-01T10:05:00.000Z",
    actions: { medicalArranged: "2026-01-01T12:00:00.000Z", removedFromPlay: "2026-01-01T11:00:00.000Z" },
  });
  const times = buildTimeline(incident, protocol).map((e) => new Date(e.at).getTime());
  times.slice(1).forEach((t, i) => assert(t >= times[i], "events out of order"));
});

// Storage. Real records are backed up first and put back afterwards.

test("records can be created, updated, read back and deleted", () => {
  const backup = localStorage.getItem(Records.key);
  try {
    const incident = Records.create("concussion");
    assert(Records.get(incident.id).status === "draft", "not saved");

    incident.player.name = "Test Player";
    Records.save(incident);
    assert(Records.get(incident.id).player.name === "Test Player", "update not saved");
    assert(Records.all().filter((i) => i.id === incident.id).length === 1, "saved twice");

    Records.remove(incident.id);
    assert(Records.get(incident.id) === null, "not deleted");
  } finally {
    if (backup === null) localStorage.removeItem(Records.key);
    else localStorage.setItem(Records.key, backup);
  }
});

test("corrupted stored data does not crash the app", () => {
  const backup = localStorage.getItem(Records.key);
  try {
    localStorage.setItem(Records.key, "{not json");
    assert(Array.isArray(Records.all()) && Records.all().length === 0, "expected an empty list");
  } finally {
    if (backup === null) localStorage.removeItem(Records.key);
    else localStorage.setItem(Records.key, backup);
  }
});

// Output

const failed = results.filter((r) => !r.ok);
document.getElementById("summary").textContent = `${results.length - failed.length} of ${results.length} passed.`;
document.getElementById("summary").className = failed.length ? "fail" : "pass";
document.getElementById("results").innerHTML = results
  .map((r) => `<li class="${r.ok ? "pass" : "fail"}">${r.ok ? "Pass" : "Fail"}: ${r.name}${r.ok ? "" : ` (${r.message})`}</li>`)
  .join("");
