// Incident records, kept in this browser's localStorage. Nothing leaves the
// device unless the coach copies or shares a report.

// Format used by <input type="datetime-local">: local time, no time zone.
function toLocalDateTime(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function newIncident(injuryType) {
  const now = new Date();
  return {
    id: now.getTime().toString(36) + Math.random().toString(36).slice(2, 8),
    injuryType,
    status: "draft",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    finalizedAt: null,
    occurredAt: toLocalDateTime(now),
    player: { name: "", age: "", team: "" },
    context: { sport: "", setting: "", location: "", description: "" },
    recordedBy: "",
    redFlags: [],
    signs: [],
    symptoms: [],
    memory: {},
    checked: {},
    actions: {},
    findings: null,
    followUp: "",
    lastStep: "danger",
  };
}

const Records = {
  key: "injury-response.incidents.v1",

  all() {
    try {
      const list = JSON.parse(localStorage.getItem(this.key));
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  get(id) {
    return this.all().find((incident) => incident.id === id) || null;
  },

  // save, remove and create throw if the browser refuses to store data,
  // so the app can tell the coach instead of pretending it worked.
  save(incident) {
    incident.updatedAt = new Date().toISOString();
    const list = this.all();
    const index = list.findIndex((item) => item.id === incident.id);
    if (index === -1) list.push(incident);
    else list[index] = incident;
    localStorage.setItem(this.key, JSON.stringify(list));
  },

  remove(id) {
    localStorage.setItem(this.key, JSON.stringify(this.all().filter((item) => item.id !== id)));
  },

  create(injuryType) {
    const incident = newIncident(injuryType);
    this.save(incident);
    return incident;
  },
};
