// Plain-text incident reports. Each recipient gets only what they need:
// families get next steps and danger signs, medical staff get observations
// and a timeline, team staff get status and return-to-play information.

const REPORT_RECIPIENTS = [
  { id: "guardian", label: "Parent or guardian" },
  { id: "medical", label: "Paramedic, doctor or hospital" },
  { id: "staff", label: "Team staff" },
];

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatClock(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function labelsFor(items, ids) {
  return items.filter((item) => (ids || []).includes(item.id)).map((item) => item.label);
}

function memoryAnswerLabel(answer) {
  return { correct: "Correct", incorrect: "Incorrect" }[answer] || "Not asked";
}

function describeWalk(walk) {
  if (!walk) return ["Not done"];
  const findings = walkFindings(walk);
  return [
    ...(findings.length > 0 ? findings : ["No stumble, large sway or fall picked up"]),
    `Player tracked ${walk.trackedPercent}% of the time over ${walk.durationSec} seconds`,
    `Largest sideways lean: ${walk.maxLeanDeg} degrees`,
    ...(walk.reliable ? [] : ["Tracking was unreliable, so these results may be wrong"]),
  ];
}

function buildTimeline(incident, protocol) {
  const events = [
    { at: incident.occurredAt, text: "Injury occurred" },
    { at: incident.createdAt, text: "Check started" },
    ...protocol.actions
      .filter((action) => incident.actions[action.id])
      .map((action) => ({ at: incident.actions[action.id], text: action.label })),
  ];
  if (incident.finalizedAt) events.push({ at: incident.finalizedAt, text: "Record finalized" });
  return events.filter((event) => event.at).sort((a, b) => new Date(a.at) - new Date(b.at));
}

function buildReport(incident, protocol, recipient) {
  const result = incident.findings || assessIncident(incident, protocol);
  const text = protocol.results[result.level];
  const { player, context } = incident;
  const lines = [];

  const section = (title, items) => {
    lines.push("", title);
    items.forEach((item) => lines.push(`- ${item}`));
  };
  const observed = (step, items, ids) => {
    const labels = labelsFor(items, ids);
    if (labels.length > 0) return labels;
    return [incident.checked[step] ? "None recorded" : "Not checked"];
  };
  const actionsDone = protocol.actions
    .filter((action) => incident.actions[action.id])
    .map((action) => `${action.label} (${formatClock(incident.actions[action.id])})`);

  if (incident.status === "draft") lines.push("DRAFT: this record has not been finalized yet.", "");
  lines.push(`Incident report: ${protocol.name}`);
  lines.push(`Player: ${player.name || "Not recorded"}${player.age ? `, age ${player.age}` : ""}`);
  if (player.team) lines.push(`Team: ${player.team}`);
  lines.push(`When: ${formatTime(incident.occurredAt) || "Not recorded"}`);
  const setting = [context.sport, context.setting.toLowerCase(), context.location].filter(Boolean).join(", ");
  if (setting) lines.push(`Context: ${setting}`);
  if (incident.recordedBy) lines.push(`Recorded by: ${incident.recordedBy}`);
  lines.push("", `Result of the experimental check: ${text.headline}`, text.summary);

  if (recipient === "guardian") {
    if (context.description) section("What happened", [context.description]);
    section("What was done", actionsDone.length > 0 ? actionsDone : ["Nothing recorded yet"]);
    section("What to do next", nextStepsFor(result.level, protocol));
    section(`Danger signs. ${protocol.dangerSignsAction}`, protocol.dangerSigns);
  }

  if (recipient === "medical") {
    section("How it happened", [context.description || "Not recorded"]);
    section("Red flags", observed("danger", protocol.redFlags, incident.redFlags));
    section("Visible signs", observed("signs", protocol.observableSigns, incident.signs));
    section("Symptoms reported", observed("symptoms", protocol.symptoms, incident.symptoms));
    section(
      "Memory questions",
      protocol.memoryQuestions.map((q) => `${q.text} (${memoryAnswerLabel(incident.memory[q.id])})`)
    );
    section("Tandem walk (camera, experimental)", describeWalk(incident.walk));
    section("Timeline", buildTimeline(incident, protocol).map((event) => `${formatTime(event.at)}: ${event.text}`));
    section("Limitations of this check", result.limitations);
    if (incident.followUp) section("Follow-up notes", [incident.followUp]);
  }

  if (recipient === "staff") {
    section("Record status", [incident.status === "draft" ? "Draft" : "Finalized"]);
    section("Actions taken", actionsDone.length > 0 ? actionsDone : ["Nothing recorded yet"]);
    section("Return to play", [result.level === "none" ? protocol.returnToPlay.none : protocol.returnToPlay.suspected]);
    if (incident.followUp) section("Follow-up notes", [incident.followUp]);
  }

  lines.push("", "Created with a prototype app. This is not a medical diagnosis.");
  return lines.join("\n");
}
