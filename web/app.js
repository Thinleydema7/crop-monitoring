import { createReportMap } from "./maps.js";
let inboxMap = null, detailMap = null;
const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem("cropcare_officer_token"),
  reports = [],
  selected = null,
  photoUrl = null,
  variant = "image",
  dirty = false;
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const date = (v) => new Date(v).toLocaleString(undefined, { timeZone: "Asia/Thimphu" });
async function api(url, options = {}) {
  const response = await fetch("/api" + url, {
    ...options,
    headers: { Authorization: "Bearer " + token, ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) logout();
    throw new Error(data.message ?? "Request failed");
  }
  return data;
}
function logout() {
  inboxMap?.remove(); inboxMap=null; detailMap?.remove(); detailMap=null;
  token = null;
  sessionStorage.removeItem("cropcare_officer_token");
  reports = [];
  selected = null;
  dirty = false;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  $("desk").hidden = true;
  $("login").hidden = false;
}
async function enter() {
  const { user } = await api("/auth/me");
  if (user.role !== "officer") {
    logout();
    throw new Error("Use an officer account for this dashboard.");
  }
  $("officer-name").textContent = user.name;
  $("login").hidden = true;
  $("desk").hidden = false;
  document.querySelector(".page-heading").hidden=false;
  $("detail").hidden=true; document.querySelector(".inbox").hidden=false; $("stats").hidden=false;
  await refresh();
}
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-button").disabled = true;
  $("login-error").textContent = "";
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: $("email").value,
        password: $("password").value,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    token = data.token;
    sessionStorage.setItem("cropcare_officer_token", token);
    $("password").value = "";
    await enter();
  } catch (error) {
    $("login-error").textContent = error.message;
  } finally {
    $("login-button").disabled = false;
  }
});
$("logout").onclick = () => {
  if (!dirty || confirm("Discard the unsaved review and sign out?")) logout();
};
$("refresh").onclick = () => {
  if (!dirty || confirm("Discard the unsaved review and refresh?")) {
    dirty = false;
    void refresh();
  }
};
for (const id of ["search", "status", "crop"])
  $(id).addEventListener("input", renderList);
async function refresh() {
  try {
    $("refresh").disabled = true;
    $("inbox-error").textContent = "";
    const data = await api("/reports");
    reports = data.reports;
    renderStats();
    renderList();
    if (selected) {
      const updated = reports.find((r) => r.id === selected.id);
      if (updated) await show(updated);
    }
  } catch (error) {
    $("inbox-error").textContent = error.message;
  } finally {
    $("refresh").disabled = false;
  }
}
function renderStats() {
  const pending = reports.filter((r) => r.status === "pending").length;
  $("stats").innerHTML = [
    ["Total field reports", reports.length, "Photographs shared by farmers"],
    ["Awaiting your advice", pending, "Reports ready for review"],
    [
      "Advice delivered",
      reports.length - pending,
      "Responses available on the farmer app",
    ],
  ]
    .map(
      ([title, count, note]) =>
        `<div class="stat"><span>${title}</span><strong>${count}</strong><span>${note}</span></div>`,
    )
    .join("");
}
function renderList() {
  const query = $("search").value.toLowerCase();
  const filtered = reports.filter(
    (r) =>
      (!$("status").value || r.status === $("status").value) &&
      (!$("crop").value || r.crop === $("crop").value) &&
      `${r.crop} ${r.id}`.toLowerCase().includes(query),
  );
  $("report-total").textContent = filtered.length + " reports";
  if (!document.querySelector(".inbox").hidden) {
    if (!inboxMap) inboxMap=createReportMap($("reports-map"),$("map-message"));
    const count=inboxMap?.render(filtered,openReport) ?? 0;
    $("map-count").textContent=`${count} of ${filtered.length} matching reports have map coordinates.`;
    $("fit-reports").disabled=!inboxMap || !count;
  }
  $("report-list").innerHTML = filtered.length
    ? filtered
        .map(
          (r) =>
            `<button class="report-row ${selected?.id === r.id ? "active" : ""}" data-id="${escape(r.id)}"><span class="crop-tile">${escape(r.crop.slice(0,2).toUpperCase())}</span><div><strong>${escape(r.crop)}</strong><small>${escape(r.id.slice(0,8))} · ${escape(r.source)}${r.detectionMode === "simulated" ? " · Simulated demo" : ""}</small></div><div><small>Coordinates</small><strong class="row-meta">${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}</strong></div><div><small>Submitted</small><span class="row-meta">${date(r.createdAt)}</span></div><span class="badge ${r.status}">${r.status === "pending" ? "Pending review" : "Advice sent"}</span><span aria-hidden="true">›</span></button>`,
        )
        .join("")
    : '<div class="empty"><h2>No reports here yet</h2><p>Submit a photo from Yoesar, or change your filters.</p></div>';
  document.querySelectorAll("[data-id]").forEach(
    (button) =>
      (button.onclick = () => {
        openReport(reports.find((r) => r.id === button.dataset.id));
      }),
  );
}
$("fit-reports").onclick=()=>inboxMap?.fit();
function openReport(report) {
  if (!report || (dirty && !confirm("Discard the unsaved review?"))) return;
  dirty=false; variant="image"; void show(report);
}
async function loadImage(report) {
  const id = report.id;
  try {
    const response = await fetch(
      `/api/reports/${encodeURIComponent(id)}/${variant}`,
      { headers: { Authorization: "Bearer " + token } },
    );
    if (!response.ok) throw new Error("Unable to load the photograph.");
    const blob = await response.blob();
    if (selected?.id !== id) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(blob);
    $("photo").src = photoUrl;
    $("image-error").textContent = "";
  } catch (error) {
    if (selected?.id === id) $("image-error").textContent = error.message;
  }
}
async function show(report) {
  detailMap?.remove(); detailMap=null;
  selected = report;
  document.querySelector(".page-heading").hidden = true;
  $("detail").hidden = false;
  document.querySelector(".inbox").hidden = true;
  $("stats").hidden = true;
  renderList();
  const l = report.location;
  $("detail").innerHTML =
    `<button id="back-inbox" class="back-link">‹ Back to inbox</button><div class="detail-head"><div><h2>${escape(report.crop)} field report</h2><p>${escape(report.id)}</p></div><span class="badge ${report.status}">${report.status === "pending" ? "Pending review" : "Reviewed"}</span></div><div class="detail-body"><div class="case-images"><img id="photo" class="photo" alt="Farmer crop photograph"><p id="image-error" class="error" role="alert"></p><div class="photo-actions"><button id="annotated" class="secondary">Report image</button><button id="original" class="secondary">Original photograph</button></div>${report.detectionMode === "simulated" ? '<div class="notice">SIMULATED DEMO: boxes are interface examples, not model findings. Diagnose from the original photograph.</div>' : ""}<div class="meta-grid"><div><small>Farmer</small>${escape(report.farmerId)}</div><div><small>Received</small>${date(report.createdAt)}</div><div><small>Location</small>${l.latitude.toFixed(6)}, ${l.longitude.toFixed(6)}<br><a href="https://www.google.com/maps?q=${l.latitude},${l.longitude}" target="_blank" rel="noopener">Open map ↗</a></div><div><small>Location accuracy</small>${l.accuracy === null ? "Unavailable" : Math.round(l.accuracy) + " metres"}<br>${date(l.recordedAt)}</div><div><small>Capture / selection time</small>${date(report.capturedAt)}</div><div><small>Detection</small>${escape(report.detectionMode)} · ${report.detections.length} regions</div></div><section class="detail-location"><h3>Reported crop location</h3><p>Pin: phone coordinates.${l.accuracy === null ? " GPS accuracy unavailable." : ` Shaded area: approximately ${Math.round(l.accuracy)} metres of GPS accuracy.`}</p><div id="detail-map" class="report-map" role="region" aria-label="Interactive map of this reported crop location"></div><p id="detail-map-message" class="map-message" role="status"></p></section></div><div class="review-panel"><h3>Officer advice</h3><p>Write the diagnosis and practical actions for this farmer.</p><form id="review-form"><label>Diagnosis<textarea id="diagnosis" maxlength="2000" required placeholder="Describe your assessment"></textarea></label><label>Recommendation<textarea id="recommendation" maxlength="5000" required placeholder="Explain what the farmer should do next"></textarea></label><button id="save-review">Save and send advice</button><p id="review-message" role="status"></p></form><h3>Review history</h3><div>${
      report.reviews.length
        ? [...report.reviews]
            .reverse()
            .map(
              (v) =>
                `<div class="history-item"><small>${date(v.createdAt)} · ${escape(v.officerId)}</small><strong>Diagnosis</strong>${escape(v.diagnosis)}<strong>Recommendation</strong>${escape(v.recommendation)}</div>`,
            )
            .join("")
        : "<p>No advice has been saved for this report.</p>"
    }</div></div></div>`;
  detailMap=createReportMap($("detail-map"),$("detail-map-message"));
  detailMap?.render([report],null,true);
  $("back-inbox").onclick = () => { if (dirty && !confirm("Discard the unsaved review?")) return; detailMap?.remove(); detailMap=null; dirty=false; selected=null; document.querySelector(".page-heading").hidden=false; $("detail").hidden=true; document.querySelector(".inbox").hidden=false; $("stats").hidden=false; renderList(); };
  for (const id of ["diagnosis", "recommendation"])
    $(id).oninput = () => {
      dirty = true;
    };
  $("annotated").onclick = () => {
    variant = "image";
    void loadImage(report);
  };
  $("original").onclick = () => {
    variant = "original";
    void loadImage(report);
  };
  $("review-form").onsubmit = async (e) => {
    e.preventDefault();
    $("save-review").disabled = true;
    try {
      const data = await api(
        `/reports/${encodeURIComponent(report.id)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            diagnosis: $("diagnosis").value,
            recommendation: $("recommendation").value,
            version: report.version ?? 0,
          }),
        },
      );
      dirty = false;
      reports = reports.map((r) => (r.id === report.id ? data.report : r));
      renderStats();
      await show(data.report);
      $("review-message").textContent =
        "Advice saved. The farmer can retrieve it by refreshing their reports.";
    } catch (error) {
      $("review-message").textContent = error.message;
      $("review-message").className = "error";
    } finally {
      if ($("save-review")) $("save-review").disabled = false;
    }
  };
  await loadImage(report);
}
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
if (token)
  void enter().catch((error) => {
    $("login-error").textContent = error.message;
  });
