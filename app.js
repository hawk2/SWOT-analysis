const { notes, recommendations, outcomeErrors = [] } = window.SWOT_DATA;
const rawThemes = window.SWOT_DATA.themes || [];

const $ = (selector) => document.querySelector(selector);
const pageName = document.body.dataset.page || "notes";

const pageUrls = {
  notes: "index.html",
  themes: "themes.html",
  feedback: "feedback.html",
  top5: "top5.html"
};

const noteById = Object.fromEntries(notes.map(note => [note.id, note]));
const recById = Object.fromEntries(recommendations.map(rec => [rec.id, rec]));

function deriveThemes(themeDefs, noteRows) {
  const byName = new Map(themeDefs.map((theme, index) => [
    theme.name,
    { name: theme.name, notes: [], frequency: 0, order: index }
  ]));

  noteRows.forEach(note => {
    note.themes.forEach(name => {
      if (!byName.has(name)) {
        byName.set(name, { name, notes: [], frequency: 0, order: byName.size });
      }
      byName.get(name).notes.push(note.id);
    });
  });

  return [...byName.values()]
    .map(theme => ({
      name: theme.name,
      notes: unique(theme.notes),
      frequency: unique(theme.notes).length,
      order: theme.order
    }))
    .filter(theme => theme.frequency > 0)
    .sort((a, b) => a.order - b.order);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function unique(values) {
  return [...new Set(values)];
}

const themes = deriveThemes(rawThemes, notes);

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function pageHref(page, fragment = "") {
  return `${pageUrls[page]}${fragment ? `#${fragment}` : ""}`;
}

function noteHref(id) {
  return pageHref("notes", `note-${id}`);
}

function themeHref(name) {
  return pageHref("themes", `theme-${slugify(name)}`);
}

function recHref(id) {
  return pageHref("feedback", `rec-${id}`);
}

function relatedThemesForNotes(noteIds) {
  return themes.filter(theme => theme.notes.some(id => noteIds.includes(id)));
}

function relatedRecIdsForTheme(theme) {
  return unique(
    recommendations
      .filter(rec => rec.evidence.some(id => theme.notes.includes(id)))
      .map(rec => rec.id)
  );
}

function linkedNotePills(ids) {
  return ids.map(id => {
    const note = noteById[id];
    const title = note ? `${id} (${note.quadrant})` : id;
    return `<a class="pill" href="${noteHref(id)}">${escapeHtml(title)}</a>`;
  }).join("");
}

function linkedThemePills(names) {
  if (!names.length) return `<span class="empty-text">No assigned recurring theme</span>`;
  return names.map(name => `<a class="pill" href="${themeHref(name)}">${escapeHtml(name)}</a>`).join("");
}

function linkedRecPills(ids) {
  if (!ids.length) return `<span class="empty-text">No direct feedback item</span>`;
  return ids.map(id => `<a class="pill" href="${recHref(id)}">${escapeHtml(id)}: ${escapeHtml(recById[id]?.title || "Recommendation")}</a>`).join("");
}

function renderStats() {
  const overview = $("#overview");
  if (!overview) return;

  const stats = [
    { label: "Post-it Notes", count: notes.length, page: "notes" },
    { label: "Recurring Themes", count: themes.length, page: "themes" },
    { label: "Feedback Items", count: recommendations.length, page: "feedback" },
    { label: "SWOT Top 5", count: 4, page: "top5" }
  ];

  overview.innerHTML = stats.map(item => `
    <a class="stat-card" href="${pageHref(item.page)}" ${item.page === pageName ? 'aria-current="page"' : ""}>
      <strong>${item.count}</strong>
      <span>${escapeHtml(item.label)}</span>
    </a>
  `).join("");
}

function populateFilters() {
  const themeFilter = $("#themeFilter");
  if (themeFilter) {
    themes.forEach(theme => {
      const option = document.createElement("option");
      option.value = theme.name;
      option.textContent = theme.name;
      themeFilter.appendChild(option);
    });
  }

  const recFilter = $("#recFilter");
  if (recFilter) {
    recommendations.forEach(rec => {
      const option = document.createElement("option");
      option.value = rec.id;
      option.textContent = `${rec.id}: ${rec.title}`;
      recFilter.appendChild(option);
    });
  }
}

function applyInitialFilters() {
  if (!$("#notesGrid")) return;

  const params = new URLSearchParams(location.search);
  const initialValues = {
    searchInput: params.get("q"),
    quadrantFilter: params.get("quadrant"),
    themeFilter: params.get("theme"),
    recFilter: params.get("rec")
  };

  Object.entries(initialValues).forEach(([id, value]) => {
    const input = $(`#${id}`);
    if (input && value && [...input.options || []].some(option => option.value === value)) {
      input.value = value;
    } else if (input && input.type === "search" && value) {
      input.value = value;
    }
  });
}

function renderLinkGroup(label, html) {
  return `
    <div class="link-group">
      <div class="link-label">${escapeHtml(label)}</div>
      <div class="pills">${html}</div>
    </div>
  `;
}

function renderOutcomeErrors() {
  const grid = $("#outcomeErrorsGrid");
  if (!grid) return;

  grid.innerHTML = outcomeErrors.map(error => `
    <article class="outcome-card" id="outcome-${error.id}">
      <a class="note-id" href="#outcome-${error.id}">${escapeHtml(error.id)}</a>
      <div class="note-text">${escapeHtml(error.text)}</div>
    </article>
  `).join("");
}

function renderNotes() {
  const notesGrid = $("#notesGrid");
  if (!notesGrid) return;

  const query = $("#searchInput").value.trim().toLowerCase();
  const quadrant = $("#quadrantFilter").value;
  const theme = $("#themeFilter").value;
  const rec = $("#recFilter").value;

  const filtered = notes.filter(note => {
    const searchable = [
      note.id,
      note.quadrant,
      note.text,
      ...note.themes,
      ...note.recommendations,
      ...note.recommendations.map(id => recById[id]?.title || "")
    ].join(" ").toLowerCase();

    return (!query || searchable.includes(query)) &&
      (quadrant === "all" || note.quadrant === quadrant) &&
      (theme === "all" || note.themes.includes(theme)) &&
      (rec === "all" || note.recommendations.includes(rec));
  });

  $("#resultCount").textContent = `${filtered.length} of ${notes.length} notes shown`;

  notesGrid.innerHTML = filtered.map(note => `
    <article class="note-card ${note.quadrant}" id="note-${note.id}" data-id="${note.id}">
      <a class="note-id" href="${noteHref(note.id)}">${escapeHtml(note.id)}</a>
      <div class="note-text">${escapeHtml(note.text)}</div>
      ${renderLinkGroup("Quadrant", `<a class="pill" href="${pageHref("notes")}?quadrant=${encodeURIComponent(note.quadrant)}">${escapeHtml(note.quadrant)}</a>`)}
      ${renderLinkGroup("Recurring themes", linkedThemePills(note.themes))}
      ${renderLinkGroup("Actionable feedback", linkedRecPills(note.recommendations))}
    </article>
  `).join("");
}

function renderThemes() {
  const themesGrid = $("#themesGrid");
  if (!themesGrid) return;

  themesGrid.innerHTML = themes.map(theme => {
    const relatedRecIds = relatedRecIdsForTheme(theme);

    return `
      <article class="theme-card" id="theme-${slugify(theme.name)}">
        <div class="theme-title">
          <h3><a href="${themeHref(theme.name)}">${escapeHtml(theme.name)}</a></h3>
          <span class="badge">${theme.frequency} notes</span>
        </div>
        ${renderLinkGroup("Supporting notes", linkedNotePills(theme.notes))}
        ${renderLinkGroup("Related feedback", linkedRecPills(relatedRecIds))}
      </article>
    `;
  }).join("");
}

function renderRecommendations() {
  const recsList = $("#recsList");
  if (!recsList) return;

  recsList.innerHTML = recommendations.map(rec => {
    const relatedThemes = relatedThemesForNotes(rec.evidence).map(theme => theme.name);

    return `
      <article class="rec-card" id="rec-${rec.id}">
        <div class="rec-meta">
          <a class="rec-id" href="${recHref(rec.id)}">${escapeHtml(rec.id)}</a>
          <span class="priority">${escapeHtml(rec.priority)} Priority</span>
          ${renderLinkGroup("Evidence notes", linkedNotePills(rec.evidence))}
        </div>
        <div class="rec-body">
          <h3>${escapeHtml(rec.title)}</h3>
          <dl>
            <dt>Problem</dt><dd>${escapeHtml(rec.problem)}</dd>
            <dt>Evidence</dt><dd>${rec.evidence.map(id => `<a href="${noteHref(id)}">${escapeHtml(id)}</a>`).join(", ")}</dd>
            <dt>Related themes</dt><dd>${linkedThemePills(relatedThemes)}</dd>
            <dt>Action</dt><dd>${escapeHtml(rec.action)}</dd>
            <dt>Expected impact</dt><dd>${escapeHtml(rec.impact)}</dd>
          </dl>
        </div>
      </article>
    `;
  }).join("");
}

function topThemesForQuadrant(quadrant) {
  const grouped = new Map();

  notes
    .filter(note => note.quadrant === quadrant)
    .forEach(note => {
      note.themes.forEach(themeName => {
        if (!grouped.has(themeName)) grouped.set(themeName, []);
        grouped.get(themeName).push(note.id);
      });
    });

  return [...grouped.entries()]
    .map(([name, ids]) => ({ name, notes: unique(ids), frequency: unique(ids).length }))
    .sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function renderTopFive() {
  const topFiveGrid = $("#topFiveGrid");
  if (!topFiveGrid) return;

  const quadrants = ["Strengths", "Weaknesses", "Opportunities", "Threats"];
  topFiveGrid.innerHTML = quadrants.map(quadrant => {
    const items = topThemesForQuadrant(quadrant);

    return `
      <article class="top-card" id="top-${slugify(quadrant)}">
        <h3>${escapeHtml(quadrant)}</h3>
        <ol>
          ${items.map(item => `
            <li class="top-item">
              <div class="top-item-head">
                <a class="plan-title" href="${themeHref(item.name)}">${escapeHtml(item.name)}</a>
                <span class="badge">${item.frequency} notes</span>
              </div>
              ${renderLinkGroup("Post-it evidence", linkedNotePills(item.notes))}
            </li>
          `).join("")}
        </ol>
      </article>
    `;
  }).join("");
}

function clearHighlight() {
  document.querySelectorAll(".highlight").forEach(node => node.classList.remove("highlight"));
}

function highlightFromHash() {
  clearHighlight();
  if (!location.hash) return;

  const targetId = decodeURIComponent(location.hash.slice(1));
  const target = document.getElementById(targetId);
  if (target) {
    target.classList.add("highlight");
    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "center" });
    }
    setTimeout(() => target.classList.remove("highlight"), 2200);
  }
}

function setActiveNav() {
  document.querySelectorAll(".topnav a[data-page]").forEach(link => {
    if (link.dataset.page === pageName) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function bindEvents() {
  ["searchInput", "quadrantFilter", "themeFilter", "recFilter"].forEach(id => {
    const input = $(`#${id}`);
    if (!input) return;

    input.addEventListener("input", renderNotes);
    input.addEventListener("change", renderNotes);
  });

  const clearFilters = $("#clearFilters");
  if (clearFilters) {
    clearFilters.addEventListener("click", () => {
      $("#searchInput").value = "";
      $("#quadrantFilter").value = "all";
      $("#themeFilter").value = "all";
      $("#recFilter").value = "all";
      history.replaceState(null, "", pageUrls.notes);
      renderNotes();
    });
  }

  window.addEventListener("hashchange", highlightFromHash);
  document.addEventListener("click", event => {
    const link = event.target.closest("a[href]");
    if (!link) return;

    const url = new URL(link.href, location.href);
    const samePage = url.pathname === location.pathname;
    if (samePage && url.hash) {
      setTimeout(highlightFromHash, 50);
    }
  });
}

setActiveNav();
renderStats();
populateFilters();
applyInitialFilters();
renderOutcomeErrors();
renderNotes();
renderThemes();
renderRecommendations();
renderTopFive();
bindEvents();
highlightFromHash();
