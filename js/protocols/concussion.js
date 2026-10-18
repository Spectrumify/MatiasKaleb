// Guidance text for the suspected concussion check.
//
// Adapted from the Concussion Recognition Tool 6 (CRT6, Concussion in Sport
// Group 2023) and the CDC HEADS UP materials for coaches. The wording has not
// been reviewed by a qualified healthcare professional yet. Get that review
// before the app is used with real players.

// Change this for countries outside the US and Canada.
const EMERGENCY_NUMBER = "911";

const CONCUSSION_PROTOCOL = {
  id: "concussion",
  name: "Suspected concussion",
  reviewStatus: "This guidance has not yet been reviewed by a qualified healthcare professional.",
  sources: [
    "Concussion Recognition Tool 6 (CRT6). Concussion in Sport Group, 2023. Echemendia RJ, et al. Br J Sports Med 2023;57:619.",
    "HEADS UP concussion materials for coaches. US Centers for Disease Control and Prevention.",
  ],

  // Any one of these means the player needs an ambulance.
  redFlags: [
    { id: "neck-pain", label: "Neck pain or tenderness" },
    { id: "double-vision", label: "Double vision" },
    { id: "limb-weakness", label: "Weakness, tingling or burning in arms or legs" },
    { id: "severe-headache", label: "Severe or increasing headache" },
    { id: "seizure", label: "Seizure or convulsion" },
    { id: "lost-consciousness", label: "Loss of consciousness" },
    { id: "deteriorating", label: "Getting less alert or less responsive" },
    { id: "vomiting", label: "Vomiting" },
    { id: "agitated", label: "Increasingly restless, agitated or combative" },
  ],

  emergencySteps: [
    `Call ${EMERGENCY_NUMBER} now unless a licensed healthcare professional is on site and taking charge.`,
    "Follow basic first aid: check for danger, response, airway, breathing and circulation.",
    "Do not move the player unless you are trained to, except to keep their airway clear.",
    "Do not remove a helmet or other equipment unless you are trained to do it safely.",
    "Stay with the player until help arrives.",
  ],

  observableSigns: [
    { id: "motionless", label: "Lying motionless on the playing surface" },
    { id: "slow-to-get-up", label: "Slow to get up after a direct or indirect hit to the head" },
    { id: "disoriented", label: "Disoriented or confused, or unable to answer questions properly" },
    { id: "vacant", label: "Blank or vacant look" },
    { id: "balance", label: "Balance or walking problems, stumbling, or slow, labored movements" },
    { id: "facial-injury", label: "Facial injury after a hit to the head" },
  ],

  symptoms: [
    { id: "headache", label: "Headache" },
    { id: "pressure", label: "Pressure in the head" },
    { id: "balance-problems", label: "Balance problems" },
    { id: "nausea", label: "Nausea or vomiting" },
    { id: "drowsiness", label: "Drowsiness" },
    { id: "dizziness", label: "Dizziness" },
    { id: "blurred-vision", label: "Blurred vision" },
    { id: "light", label: "Sensitive to light" },
    { id: "noise", label: "Sensitive to noise" },
    { id: "fatigue", label: "Fatigue or low energy" },
    { id: "not-right", label: 'Says they "don\'t feel right"' },
    { id: "emotional", label: "More emotional" },
    { id: "irritable", label: "More irritable" },
    { id: "sadness", label: "Sadness" },
    { id: "anxious", label: "Nervous or anxious" },
    { id: "concentrating", label: "Difficulty concentrating" },
    { id: "remembering", label: "Difficulty remembering" },
    { id: "slowed", label: "Feeling slowed down" },
    { id: "fog", label: 'Feeling like they are "in a fog"' },
  ],

  memoryNote:
    "Ask the player these questions. Reword them to suit your sport, and mark any that don't apply as Not asked. " +
    "A wrong answer to any of them may suggest a concussion. They are designed for players older than 12.",
  memoryQuestions: [
    { id: "venue", text: "Where are we playing today?" },
    { id: "period", text: "Which half or period is it now?" },
    { id: "last-score", text: "Who scored last in this game?" },
    { id: "last-opponent", text: "Which team did you play in your last game?" },
    { id: "last-result", text: "Did your team win your last game?" },
  ],

  results: {
    emergency: {
      short: "Red flag recorded",
      headline: `Call ${EMERGENCY_NUMBER} now`,
      summary: "A red flag was recorded. The player needs urgent medical assessment.",
    },
    suspected: {
      short: "Concussion suspected",
      headline: "Concussion suspected: remove from play",
      summary:
        "Signs of a possible concussion were recorded. The player must not return to play today " +
        "and needs to be assessed by a healthcare professional, even if they start to feel better.",
    },
    none: {
      short: "No indicators recorded",
      headline: "No indicators recorded",
      summary:
        "This does not rule out a concussion. Signs and symptoms can take hours to appear. " +
        "If you have any doubt, keep the player out of play.",
    },
  },

  nextSteps: {
    suspected: [
      "Keep them out of play and training for the rest of today, even if they say they feel fine.",
      "Do not leave them alone, at least for the first 1 to 2 hours.",
      "Do not send them home by themselves. A responsible adult needs to be with them.",
      "Get them assessed by a doctor or other healthcare professional, even if their symptoms go away.",
      "Tell their parent or guardian what happened and which danger signs to watch for.",
      "No alcohol or recreational drugs, and no prescription drugs unless a healthcare professional approves them.",
      "No driving until a healthcare professional says it is safe.",
      "They can return to sport only after a healthcare professional clears them. Ask for written return-to-play instructions.",
    ],
    none: [
      "If you have any doubt, keep them out of play for the rest of today.",
      "Check on them again during and after the session. Signs and symptoms can take hours to appear.",
      "Tell their parent or guardian about the hit and which danger signs to watch for.",
      "If any sign or symptom appears, treat it as a suspected concussion: remove them from play and get them assessed by a healthcare professional.",
    ],
  },

  actions: [
    { id: "emergencyCalled", label: "Emergency services called" },
    { id: "removedFromPlay", label: "Removed from play" },
    { id: "supervised", label: "A responsible adult is staying with them" },
    { id: "guardianInformed", label: "Parent or guardian informed" },
    { id: "medicalArranged", label: "Medical assessment arranged" },
  ],

  dangerSigns: [
    "Headache that gets worse or does not go away",
    "Repeated vomiting or nausea",
    "Seizure or convulsion",
    "Very drowsy or cannot be woken up",
    "One pupil larger than the other",
    "Slurred speech, weakness, numbness or poor coordination",
    "Increasing confusion, restlessness or agitation",
    "Unusual behavior",
    "Loss of consciousness",
  ],
  dangerSignsAction: `If any of these appear, call ${EMERGENCY_NUMBER} or go to an emergency department straight away.`,

  returnToPlay: {
    suspected: "Not cleared. The player must not return to play or training until a healthcare professional clears them.",
    none: "No signs or symptoms were recorded, but that does not rule out a concussion. Watch the player and remove them from play if anything appears.",
  },

  limitations: [
    "This result only reflects what was ticked during the check.",
    "No video was analyzed. The rules behind this check are experimental and have not been clinically validated.",
    "It cannot diagnose a concussion or rule one out. Only a healthcare professional can diagnose a concussion.",
  ],
};
