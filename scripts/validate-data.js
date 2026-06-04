const fs = require("fs");
const vm = require("vm");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync("data.js", "utf8"), context, { filename: "data.js" });

const data = context.window.SWOT_DATA;
const errors = [];

if (!data || !Array.isArray(data.notes) || !Array.isArray(data.themes) || !Array.isArray(data.recommendations)) {
  errors.push("data.js must define window.SWOT_DATA with notes, themes, and recommendations arrays.");
} else {
  const allNotes = [...(data.outcomeErrors || []), ...data.notes];
  const noteIds = new Set(allNotes.map(note => note.id));
  const themeNames = new Set(data.themes.map(theme => theme.name));
  const recommendationIds = new Set(data.recommendations.map(rec => rec.id));

  validateUnique("note", allNotes.map(note => note.id));
  validateUnique("theme", data.themes.map(theme => theme.name));
  validateUnique("recommendation", data.recommendations.map(rec => rec.id));

  allNotes.forEach(note => {
    required(note.id, "quadrant", note.quadrant);
    required(note.id, "text", note.text);

    (note.themes || []).forEach(theme => {
      if (!themeNames.has(theme)) {
        errors.push(`Note ${note.id} references missing theme "${theme}".`);
      }
    });

    (note.recommendations || []).forEach(recId => {
      if (!recommendationIds.has(recId)) {
        errors.push(`Note ${note.id} references missing recommendation "${recId}".`);
      }
    });
  });

  data.themes.forEach(theme => {
    required(theme.name, "name", theme.name);

    (theme.notes || []).forEach(noteId => {
      if (!noteIds.has(noteId)) {
        errors.push(`Theme "${theme.name}" references missing note "${noteId}".`);
      }
    });
  });

  data.recommendations.forEach(rec => {
    ["title", "priority", "problem", "action", "impact"].forEach(field => required(rec.id, field, rec[field]));

    (rec.evidence || []).forEach(noteId => {
      if (!noteIds.has(noteId)) {
        errors.push(`Recommendation ${rec.id} references missing evidence note "${noteId}".`);
      }
    });
  });

  (data.outcomeErrors || []).forEach(error => required(error.id, "id", error.id));
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("SWOT data validation passed.");

function required(owner, field, value) {
  if (value === undefined || value === null || value === "") {
    errors.push(`${owner} is missing required field "${field}".`);
  }
}

function validateUnique(label, values) {
  const seen = new Set();
  values.forEach(value => {
    if (seen.has(value)) {
      errors.push(`Duplicate ${label} id/name "${value}".`);
    }
    seen.add(value);
  });
}
