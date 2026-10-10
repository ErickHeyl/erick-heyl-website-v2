/**
 * Client island for /dj/requests (vanilla TS, no framework).
 * Everything user-provided is rendered with textContent, never innerHTML.
 */
import type { SongRequest } from "../lib/songRequestTypes";
import type { SongResult } from "../lib/songSearch";

type Sort = "top" | "new";

const root = document.getElementById("song-requests")!;
const isAdmin = root.dataset.admin === "true";
const isOpen = root.dataset.open === "true";
const adminToken = isAdmin ? new URLSearchParams(location.search).get("admin") ?? "" : "";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

const POLL_MS = 12_000;
const VOTED_KEY = "songRequests:voted";

let requests: SongRequest[] = [];
let sort: Sort = "top";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function loadVoted(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
const voted = loadVoted();
function markVoted(id: string) {
  voted.add(id);
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify([...voted]));
  } catch {
    /* private mode etc. */
  }
}

function relativeTime(iso: string): string {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const SVG_NS = "http://www.w3.org/2000/svg";
function icon(path: string, cls: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", cls);
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(SVG_NS, "path");
  p.setAttribute("d", path);
  p.setAttribute("fill", "currentColor");
  svg.appendChild(p);
  return svg;
}
const ICON_UP = "M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z";
const ICON_NOTE = "M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z";

let toastTimer: number | undefined;
function toast(message: string) {
  const t = $("sr-toast");
  if (!t) return;
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove("show"), 3200);
}

async function api<T>(url: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T }> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (init.body) headers["content-type"] = "application/json";
  if (adminToken) headers["x-admin-token"] = adminToken;
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  return { ok: res.ok, status: res.status, data };
}

// ---------------------------------------------------------------------------
// List rendering
// ---------------------------------------------------------------------------

function sortLocal(items: SongRequest[]): SongRequest[] {
  const rank = (r: SongRequest) => (r.status === "pending" ? 0 : r.status === "played" ? 1 : 2);
  return [...items].sort((a, b) => {
    const s = rank(a) - rank(b);
    if (s) return s;
    if (sort === "top" && b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function renderList() {
  const list = $("sr-list")!;
  const items = sortLocal(requests);
  const active = items.filter((r) => r.status === "pending").length;
  $("sr-count")!.textContent = items.length ? `(${active} queued${items.length > active ? `, ${items.length - active} done` : ""})` : "";
  $("sr-empty")!.hidden = items.length > 0;
  list.replaceChildren(...items.map(renderItem));
}

function renderItem(r: SongRequest): HTMLLIElement {
  const played = r.status === "played";
  const hidden = r.status === "hidden";
  const li = el(
    "li",
    `flex items-start gap-3 rounded-lg border p-3 sm:p-4 bg-[#26262a] ${played || hidden ? "opacity-50 border-[#444]" : "border-[#555]"}`,
  );
  li.dataset.id = r.id;
  li.dataset.status = r.status;

  // Artwork
  if (r.artworkUrl) {
    const img = el("img", "w-14 h-14 rounded object-cover flex-shrink-0 bg-[#353439]");
    img.src = r.artworkUrl;
    img.alt = "";
    img.width = 56;
    img.height = 56;
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    li.appendChild(img);
  } else {
    const ph = el("div", "w-14 h-14 rounded flex-shrink-0 bg-[#353439] flex items-center justify-center text-orange-600");
    ph.appendChild(icon(ICON_NOTE, "w-7 h-7"));
    li.appendChild(ph);
  }

  // Text
  const body = el("div", "min-w-0 flex-1");
  const titleRow = el("p", "font-semibold text-[#F7F7F7] leading-snug break-words");
  titleRow.appendChild(document.createTextNode(r.title));
  if (played) titleRow.appendChild(el("span", "ml-2 align-middle text-[10px] uppercase tracking-wider bg-[#444] text-[#cccccc] rounded px-1.5 py-0.5", "Played"));
  if (hidden) titleRow.appendChild(el("span", "ml-2 align-middle text-[10px] uppercase tracking-wider bg-red-900 text-red-100 rounded px-1.5 py-0.5", "Hidden"));
  body.appendChild(titleRow);
  if (r.artist) body.appendChild(el("p", "text-sm text-[#cccccc] break-words", r.artist));
  body.appendChild(el("p", "text-xs text-[#999] mt-1", `${r.requestedBy || "Anonymous"} · ${relativeTime(r.createdAt)}${r.source === "custom" ? " · custom" : ""}`));
  if (r.note) body.appendChild(el("p", "text-sm text-[#cccccc] italic mt-1 break-words", `“${r.note}”`));

  if (isAdmin) {
    const controls = el("div", "flex flex-wrap gap-2 mt-3");
    const btn = (label: string, action: () => void, cls = "") => {
      const b = el("button", `px-3 py-2 text-xs font-semibold rounded border border-[#555] text-[#F7F7F7] hover:bg-[#353439] ${cls}`, label);
      b.type = "button";
      b.addEventListener("click", action);
      return b;
    };
    controls.append(
      btn(played ? "Unmark played" : "Mark played", () => adminSetStatus(r.id, played ? "pending" : "played")),
      btn(hidden ? "Unhide" : "Hide", () => adminSetStatus(r.id, hidden ? "pending" : "hidden")),
      btn("Delete", () => adminDelete(r.id, li), "text-red-300 border-red-900"),
    );
    body.appendChild(controls);
  }
  li.appendChild(body);

  // Upvote
  const hasVoted = voted.has(r.id);
  const up = el(
    "button",
    `flex-shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] min-h-[3.5rem] rounded-lg border transition ${
      hasVoted ? "border-orange-600 text-orange-500 bg-orange-600/10" : "border-[#555] text-[#F7F7F7] hover:border-orange-600"
    } disabled:cursor-default`,
  );
  up.type = "button";
  up.appendChild(icon(ICON_UP, "w-6 h-6 -mb-1"));
  up.appendChild(el("span", "text-sm font-bold sr-votes", String(r.upvotes)));
  up.setAttribute("aria-label", `${hasVoted ? "You upvoted" : "Upvote"} ${r.title} (${r.upvotes} votes)`);
  up.disabled = hasVoted || played || hidden || !isOpen;
  if (hasVoted) up.setAttribute("aria-pressed", "true");
  up.addEventListener("click", () => upvote(r.id));
  li.appendChild(up);
  return li;
}

function upsert(r: SongRequest) {
  const i = requests.findIndex((x) => x.id === r.id);
  if (i >= 0) requests[i] = r;
  else requests.push(r);
}

async function refresh() {
  try {
    const { ok, data } = await api<{ requests: SongRequest[] }>(`/api/song-requests?sort=${sort}`);
    if (ok && Array.isArray(data.requests)) {
      requests = data.requests;
      renderList();
    }
  } catch {
    /* offline: keep showing what we have */
  }
}

async function upvote(id: string) {
  if (voted.has(id)) return;
  markVoted(id);
  const r = requests.find((x) => x.id === id);
  if (r) {
    r.upvotes += 1; // optimistic
    renderList();
  }
  try {
    const { ok, data } = await api<{ request?: SongRequest; error?: string }>(`/api/song-requests/${encodeURIComponent(id)}/upvote`, { method: "POST" });
    if (ok && data.request) upsert(data.request);
    else {
      if (r) r.upvotes -= 1;
      toast(data.error || "Couldn't upvote, try again.");
    }
  } catch {
    if (r) r.upvotes -= 1;
    toast("Couldn't upvote, check your connection.");
  }
  renderList();
}

async function adminSetStatus(id: string, status: SongRequest["status"]) {
  const { ok, data } = await api<{ request?: SongRequest; error?: string }>(`/api/song-requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (ok && data.request) {
    upsert(data.request);
    renderList();
    toast(status === "played" ? "Marked played" : status === "hidden" ? "Hidden from guests" : "Restored");
  } else toast(data.error || "Admin action failed");
}

async function adminDelete(id: string, li: HTMLElement) {
  // confirm() is fine here: admin-only, on a real browser.
  if (!window.confirm("Delete this request permanently?")) return;
  const { ok, data } = await api<{ error?: string }>(`/api/song-requests/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (ok) {
    requests = requests.filter((r) => r.id !== id);
    li.remove();
    renderList();
    toast("Deleted");
  } else toast(data.error || "Admin action failed");
}

// ---------------------------------------------------------------------------
// Search + form
// ---------------------------------------------------------------------------

function setupForm() {
  const form = $<HTMLFormElement>("sr-form");
  if (!form) return;
  const search = $<HTMLInputElement>("sr-search")!;
  const results = $<HTMLUListElement>("sr-results")!;
  const selectedBox = $("sr-selected")!;
  const customBox = $("sr-custom")!;
  const customTitle = $<HTMLInputElement>("sr-custom-title")!;
  const customArtist = $<HTMLInputElement>("sr-custom-artist")!;
  const nameInput = $<HTMLInputElement>("sr-name")!;
  const noteInput = $<HTMLInputElement>("sr-note")!;
  const noteCount = $("sr-note-count")!;
  const errorBox = $("sr-form-error")!;
  const submit = $<HTMLButtonElement>("sr-submit")!;
  const searchWrap = $("sr-search-wrap")!;

  let selected: SongResult | null = null;
  let mode: "search" | "custom" = "search";
  let options: Array<{ kind: "song"; song: SongResult } | { kind: "custom" }> = [];
  let activeIndex = -1;
  let debounce: number | undefined;
  let seq = 0;

  try {
    nameInput.value = localStorage.getItem("songRequests:name") || "";
  } catch {
    /* ignore */
  }

  const closeResults = () => {
    results.hidden = true;
    search.setAttribute("aria-expanded", "false");
    search.removeAttribute("aria-activedescendant");
    activeIndex = -1;
  };

  const highlight = (i: number) => {
    activeIndex = i;
    const opts = [...results.querySelectorAll<HTMLElement>('[role="option"]')];
    opts.forEach((c, idx) => c.setAttribute("aria-selected", idx === i ? "true" : "false"));
    const active = opts[i];
    if (active) {
      search.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({ block: "nearest" });
    }
  };

  const renderResults = (songs: SongResult[], q: string, loading = false) => {
    options = songs.map((song) => ({ kind: "song" as const, song }));
    options.push({ kind: "custom" });
    const items: HTMLLIElement[] = songs.map((s, i) => {
      const li = el("li", "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#353439] border-b border-[#3a3a3e]");
      li.id = `sr-opt-${i}`;
      li.setAttribute("role", "option");
      if (s.artworkUrl) {
        const img = el("img", "w-12 h-12 rounded object-cover flex-shrink-0 bg-[#353439]");
        img.src = s.artworkUrl;
        img.alt = "";
        img.width = 48;
        img.height = 48;
        img.referrerPolicy = "no-referrer";
        li.appendChild(img);
      } else {
        const ph = el("div", "w-12 h-12 rounded flex-shrink-0 bg-[#353439] flex items-center justify-center text-orange-600");
        ph.appendChild(icon(ICON_NOTE, "w-6 h-6"));
        li.appendChild(ph);
      }
      const txt = el("div", "min-w-0");
      txt.append(el("p", "text-[#F7F7F7] font-semibold truncate", s.title), el("p", "text-sm text-[#cccccc] truncate", s.artist));
      li.appendChild(txt);
      return li;
    });
    if (loading && !songs.length) {
      // Non-selectable status row (no id / role, so it is skipped by keyboard + click handling).
      items.push(el("li", "px-3 py-3 text-sm text-[#999] border-b border-[#3a3a3e]", "Searching…"));
    }
    const custom = el("li", "flex items-center gap-3 px-3 py-3.5 cursor-pointer hover:bg-[#353439] text-orange-500 font-semibold");
    custom.id = `sr-opt-${songs.length}`;
    custom.setAttribute("role", "option");
    custom.appendChild(icon("M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z", "w-6 h-6 flex-shrink-0"));
    custom.appendChild(el("span", "min-w-0 break-words", `Can't find it? Request “${q}” anyway`));
    items.push(custom);
    results.replaceChildren(...items);
    // Click handling by index for selectable rows.
    [...results.children].forEach((child) => {
      const idx = child.id ? Number(child.id.replace("sr-opt-", "")) : -1;
      if (idx < 0) return;
      child.addEventListener("mousedown", (e) => e.preventDefault()); // keep focus
      child.addEventListener("click", () => choose(idx));
    });
    results.hidden = false;
    search.setAttribute("aria-expanded", "true");
    activeIndex = -1;
  };

  const showError = (msg: string) => {
    errorBox.textContent = msg;
    errorBox.hidden = !msg;
  };

  const setMode = (m: "search" | "custom") => {
    mode = m;
    customBox.hidden = m !== "custom";
    searchWrap.hidden = m === "custom" || !!selected;
  };

  const choose = (idx: number) => {
    const opt = options[idx];
    if (!opt) return;
    closeResults();
    showError("");
    if (opt.kind === "song") {
      selected = opt.song;
      ($<HTMLImageElement>("sr-selected-art")!).src = opt.song.artworkUrl || "";
      ($<HTMLImageElement>("sr-selected-art")!).hidden = !opt.song.artworkUrl;
      $("sr-selected-title")!.textContent = opt.song.title;
      $("sr-selected-artist")!.textContent = opt.song.artist;
      selectedBox.hidden = false;
      setMode("search");
    } else {
      selected = null;
      selectedBox.hidden = true;
      const q = search.value.trim();
      // "Title - Artist" / "Title by Artist" convenience split.
      const m = q.match(/^(.+?)\s+(?:-|–|by)\s+(.+)$/i);
      customTitle.value = m ? m[1] : q;
      customArtist.value = m ? m[2] : "";
      setMode("custom");
      customTitle.focus();
    }
  };

  const resetSelection = () => {
    selected = null;
    selectedBox.hidden = true;
    setMode("search");
  };

  const runSearch = async (q: string) => {
    const mySeq = ++seq;
    try {
      const res = await fetch(`/api/songs/search?q=${encodeURIComponent(q)}`);
      const data = res.ok ? await res.json() : { results: [] };
      if (mySeq !== seq || search.value.trim() !== q) return;
      renderResults(Array.isArray(data.results) ? data.results : [], q);
    } catch {
      if (mySeq === seq) renderResults([], q); // free text still works
    }
  };

  search.addEventListener("input", () => {
    showError("");
    const q = search.value.trim();
    clearTimeout(debounce);
    if (q.length < 2) {
      seq++;
      closeResults();
      return;
    }
    if (results.hidden) renderResults([], q, true);
    debounce = window.setTimeout(() => runSearch(q), 300);
  });

  search.addEventListener("keydown", (e) => {
    if (results.hidden) {
      if (e.key === "ArrowDown" && search.value.trim().length >= 2) runSearch(search.value.trim());
      return;
    }
    const count = results.querySelectorAll('[role="option"]').length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlight(Math.min(count - 1, activeIndex + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlight(Math.max(0, activeIndex - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(activeIndex >= 0 ? activeIndex : 0);
    } else if (e.key === "Escape") {
      closeResults();
    }
  });

  search.addEventListener("blur", () => setTimeout(closeResults, 150));
  search.addEventListener("focus", () => {
    if (search.value.trim().length >= 2 && results.children.length) {
      results.hidden = false;
      search.setAttribute("aria-expanded", "true");
    }
  });

  $("sr-clear")!.addEventListener("click", () => {
    resetSelection();
    search.focus();
    search.select();
  });
  $("sr-custom-cancel")!.addEventListener("click", () => {
    setMode("search");
    search.focus();
  });

  noteInput.addEventListener("input", () => {
    noteCount.textContent = `${noteInput.value.length}/${noteInput.maxLength}`;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");
    let payload: Record<string, string>;
    if (selected && mode === "search") {
      payload = {
        source: "search",
        trackId: selected.trackId,
        title: selected.title,
        artist: selected.artist,
        artworkUrl: selected.artworkUrl || "",
        previewUrl: selected.previewUrl || "",
      };
    } else {
      const title = mode === "custom" ? customTitle.value.trim() : search.value.trim();
      const artist = mode === "custom" ? customArtist.value.trim() : "";
      if (!title) {
        showError("Search for a song or type what you'd like to hear.");
        (mode === "custom" ? customTitle : search).focus();
        return;
      }
      payload = { source: "custom", title, artist };
    }
    payload.requestedBy = nameInput.value.trim();
    payload.note = noteInput.value.trim();

    submit.disabled = true;
    $("sr-submit-label")!.textContent = "Sending…";
    try {
      const { ok, data } = await api<{ request?: SongRequest; duplicate?: boolean; message?: string; error?: string; fields?: Record<string, string> }>(
        "/api/song-requests",
        { method: "POST", body: JSON.stringify(payload) },
      );
      if (ok && data.request) {
        markVoted(data.request.id);
        upsert(data.request);
        renderList();
        toast(data.duplicate ? "Already on the list, we upvoted it for you" : "Added! 🎶");
        try {
          localStorage.setItem("songRequests:name", nameInput.value.trim());
        } catch {
          /* ignore */
        }
        // Reset the form (keep the name).
        search.value = "";
        customTitle.value = "";
        customArtist.value = "";
        noteInput.value = "";
        noteCount.textContent = `0/${noteInput.maxLength}`;
        resetSelection();
        closeResults();
        const item = document.querySelector<HTMLElement>(`#sr-list [data-id="${CSS.escape(data.request.id)}"]`);
        item?.classList.add("ring-2", "ring-orange-600");
        setTimeout(() => item?.classList.remove("ring-2", "ring-orange-600"), 2500);
      } else {
        const fieldMsg = data.fields ? Object.values(data.fields)[0] : "";
        showError(fieldMsg || data.error || "Something went wrong, please try again.");
      }
    } catch {
      showError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      submit.disabled = false;
      $("sr-submit-label")!.textContent = "Request song";
    }
  });
}

// ---------------------------------------------------------------------------
// Sort + polling
// ---------------------------------------------------------------------------

function setupSort() {
  document.querySelectorAll<HTMLButtonElement>(".sr-sort").forEach((b) => {
    b.addEventListener("click", () => {
      sort = b.dataset.sort === "new" ? "new" : "top";
      document.querySelectorAll(".sr-sort").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      renderList();
    });
  });
}

function setupPolling() {
  let timer: number | undefined;
  const start = () => {
    clearInterval(timer);
    timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refresh();
      start();
    } else clearInterval(timer);
  });
  start();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

try {
  requests = JSON.parse($("sr-initial")?.textContent || "[]");
} catch {
  requests = [];
}
renderList();
setupForm();
setupSort();
setupPolling();
