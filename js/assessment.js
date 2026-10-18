// Rules that turn what the coach recorded into a result.
//
// This is a small, readable rule set, not an AI model, and it has not been
// clinically validated. It can report a red flag, a suspected concussion, or
// that nothing was recorded. It never reports that a player is fine.
//
// The camera tandem walk can only add reasons for concern, the same way the
// coach ticking "balance or walking problems" would. A clean walk adds nothing.

const CHECK_SECTIONS = {
  danger: "Red flags",
  signs: "Visible signs",
  symptoms: "Symptoms",
  memory: "Memory questions",
  walk: "Tandem walk",
};

function assessIncident(incident, protocol) {
  const pick = (items, ids) => items.filter((item) => (ids || []).includes(item.id));
  const memory = incident.memory || {};
  const checked = incident.checked || {};

  const redFlags = pick(protocol.redFlags, incident.redFlags);
  const asked = protocol.memoryQuestions.filter((q) => memory[q.id] === "correct" || memory[q.id] === "incorrect");
  const missed = asked.filter((q) => memory[q.id] === "incorrect");

  const indicators = [
    ...redFlags.map((item) => ({ section: "Red flag", label: item.label })),
    ...pick(protocol.observableSigns, incident.signs).map((item) => ({ section: "Visible sign", label: item.label })),
    ...pick(protocol.symptoms, incident.symptoms).map((item) => ({ section: "Symptom", label: item.label })),
    ...missed.map((q) => ({ section: "Memory", label: `wrong answer to "${q.text}"` })),
    ...walkFindings(incident.walk).map((label) => ({ section: "Tandem walk (camera)", label })),
  ];

  let level = "none";
  if (redFlags.length > 0) level = "emergency";
  else if (indicators.length > 0) level = "suspected";

  const incomplete = Object.keys(CHECK_SECTIONS).filter((id) => !checked[id]).map((id) => CHECK_SECTIONS[id]);
  const limitations = [...protocol.limitations];
  if (incomplete.length > 0) limitations.push(`Not completed: ${incomplete.join(", ")}.`);
  if (checked.memory && asked.length === 0) limitations.push("No memory questions were asked.");
  if (checked.walk && !incident.walk) limitations.push("The tandem walk was not done.");
  if (incident.walk && !incident.walk.reliable) {
    limitations.push("The camera could not track the player reliably during the tandem walk.");
  }

  return { level, indicators, incomplete, limitations };
}

// A red flag gets the emergency steps first, then everything a suspected concussion needs.
function nextStepsFor(level, protocol) {
  return level === "none" ? protocol.nextSteps.none : protocol.nextSteps.suspected;
}
