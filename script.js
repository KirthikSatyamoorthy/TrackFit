const API_BASE_URL = "http://localhost:8080/api";
const AUTH_STORAGE_KEY = "trackfit:auth";
const ORIGINAL_TITLE = document.title;
const CHECKLIST_STORAGE_PREFIX = "trackfit:checklist:";

function getStoredSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeSession(session) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function authorizedFetch(path, options = {}) {
  const session = getStoredSession();
  if (!session || !session.authToken) {
    throw new Error("You need to sign in first.");
  }
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("X-Auth-Token", session.authToken);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  return response.json();
}

function setupFooterYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}

function scrollToSection(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const offset = window.scrollY + rect.top - 72;

  window.scrollTo({
    top: offset,
    behavior: "smooth",
  });
}

function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      scrollToSection(targetId);
    });
  });
}

function setupScrollAnimations() {
  const sections = document.querySelectorAll("section[data-theme]");
  const animated = document.querySelectorAll("[data-animate]");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
      }
    );

    animated.forEach((el) => revealObserver.observe(el));

    const themeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const theme = entry.target.getAttribute("data-theme");
          if (!theme) return;

          document.body.classList.remove("theme-hero", "theme-features", "theme-daily", "theme-history");
          document.body.classList.add(`theme-${theme}`);
        });
      },
      {
        threshold: 0.5,
      }
    );

    sections.forEach((section) => themeObserver.observe(section));
  } else {
    animated.forEach((el) => el.classList.add("is-visible"));
  }
}

function setupAuthModal() {
  const modal = document.getElementById("tf-auth-modal");
  const openButtons = [
    document.getElementById("tf-sign-in-btn"),
    document.getElementById("tf-get-started-btn"),
  ].filter(Boolean);
  const closeElements = modal ? modal.querySelectorAll("[data-close-auth]") : [];
  const form = document.getElementById("tf-auth-form");
  const statusEl = document.getElementById("tf-auth-status");

  if (!modal || !form) return;

  function openModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    statusEl.textContent = "";
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  openButtons.forEach((btn) => btn.addEventListener("click", openModal));
  closeElements.forEach((el) => el.addEventListener("click", closeModal));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusEl.textContent = "Creating your session…";
    const name = document.getElementById("tf-auth-name").value.trim();
    const email = document.getElementById("tf-auth-email").value.trim();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email }),
      });

      if (!response.ok) {
        throw new Error("Unable to start session");
      }

      const data = await response.json();
      const authToken = data.authToken;
      const session = { userId: data.userId, name: data.name, email: data.email, authToken };
      storeSession(session);
      statusEl.textContent = "Signed in. Loading your profile…";
      closeModal();
      applySessionUi(session, { redirectToProfile: true });
      initializeBackendDrivenUi();
    } catch (err) {
      statusEl.textContent = err.message || "Something went wrong. Please try again.";
    }
  });
}

async function loadOverviewStats() {
  try {
    const stats = await authorizedFetch("/stats/overview", { method: "GET" });
    const streakEl = document.getElementById("tf-hero-streak");
    const consistencyEl = document.getElementById("tf-hero-consistency");
    const workoutsEl = document.getElementById("tf-hero-workouts");
    const histConsistencyEl = document.getElementById("tf-history-consistency");
    const histConsistencyDeltaEl = document.getElementById("tf-history-consistency-delta");
    const avgDurationEl = document.getElementById("tf-history-avg-duration");

    const streakValue = `${stats.currentStreakDays || 0} days`;
    const consistencyValue = `${Math.round(stats.routineConsistencyPercent || 0)}%`;
    const workoutsValue = `${stats.totalWorkoutsLogged || 0}`;

    if (streakEl) streakEl.textContent = streakValue;
    if (consistencyEl)
      consistencyEl.textContent = consistencyValue;
    if (workoutsEl)
      workoutsEl.textContent = workoutsValue;
    if (histConsistencyEl)
      histConsistencyEl.textContent = consistencyValue;
    if (histConsistencyDeltaEl)
      histConsistencyDeltaEl.textContent = `vs last 30 days · avg ${Math.round(
        stats.averageDurationMinutes || 0
      )} min`;
    if (avgDurationEl)
      avgDurationEl.textContent = `${Math.round(stats.averageDurationMinutes || 0)} min`;

    const profileStreakEl = document.getElementById("tf-profile-streak");
    const profileConsistencyEl = document.getElementById("tf-profile-consistency");
    const profileWorkoutsEl = document.getElementById("tf-profile-workouts");
    if (profileStreakEl) profileStreakEl.textContent = streakValue;
    if (profileConsistencyEl) profileConsistencyEl.textContent = consistencyValue;
    if (profileWorkoutsEl) profileWorkoutsEl.textContent = workoutsValue;
  } catch {
    // ignore if not signed in or backend not available
  }
}

async function loadRoutineTasks() {
  const listEl = document.getElementById("tf-routine-list");
  const emptyEl = document.getElementById("tf-routine-empty");
  const countLabel = document.getElementById("tf-routine-count-label");
  if (!listEl || !emptyEl || !countLabel) return;

  try {
    const tasks = await authorizedFetch("/routines", { method: "GET" });
    listEl.innerHTML = "";

    if (!tasks.length) {
      emptyEl.style.display = "block";
      countLabel.textContent = "0 tasks";
      return;
    }

    emptyEl.style.display = "none";
    countLabel.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;

    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = "tf-routine-item";
      if (task.completed) {
        li.classList.add("tf-routine-item-completed");
      }

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "tf-routine-checkbox";
      checkbox.checked = task.completed;

      const main = document.createElement("div");
      main.className = "tf-routine-item-main";

      const title = document.createElement("span");
      title.className = "tf-routine-item-title";
      title.textContent = task.title;

      const meta = document.createElement("span");
      meta.className = "tf-routine-item-meta";
      const dateLabel = task.targetDate ? `Target: ${task.targetDate}` : "No target date";
      meta.textContent = dateLabel;

      main.appendChild(title);
      main.appendChild(meta);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "tf-btn tf-btn-ghost";
      deleteBtn.textContent = "Remove";

      checkbox.addEventListener("change", async () => {
        try {
          await authorizedFetch(`/routines/${task.id}/completed?value=${checkbox.checked}`, {
            method: "PATCH",
          });
          if (checkbox.checked) {
            li.classList.add("tf-routine-item-completed");
          } else {
            li.classList.remove("tf-routine-item-completed");
          }
        } catch {
          checkbox.checked = !checkbox.checked;
        }
      });

      deleteBtn.addEventListener("click", async () => {
        try {
          await authorizedFetch(`/routines/${task.id}`, { method: "DELETE" });
          li.remove();
        } catch {
          // no-op
        }
      });

      li.appendChild(checkbox);
      li.appendChild(main);
      li.appendChild(deleteBtn);
      listEl.appendChild(li);
    });
  } catch {
    // ignore for now
  }
}

function setupRoutineForm() {
  const form = document.getElementById("tf-routine-form");
  const statusEl = document.getElementById("tf-routine-status");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const targetDate = String(formData.get("targetDate") || "").trim();
    const description = String(formData.get("description") || "").trim();

    if (!title) return;
    statusEl.textContent = "Saving task…";

    try {
      await authorizedFetch("/routines", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || null,
          targetDate: targetDate || null,
        }),
      });
      form.reset();
      statusEl.textContent = "Task added to your routine.";
      loadRoutineTasks();
    } catch (err) {
      statusEl.textContent = err.message || "Unable to save task.";
    }
  });
}

function initializeBackendDrivenUi() {
  loadOverviewStats();
  loadRoutineTasks();
}

function applySessionUi(session, options = {}) {
  const authButtons = document.getElementById("tf-auth-buttons");
  const profilePill = document.getElementById("tf-profile-pill");
  const profileAvatar = document.getElementById("tf-profile-avatar");
  const profileName = document.getElementById("tf-profile-name");
  const profileAvatarLg = document.getElementById("tf-profile-avatar-lg");
  const profileNameMain = document.getElementById("tf-profile-name-main");
  const profileEmailMain = document.getElementById("tf-profile-email-main");

  const name = session?.name || "User";
  const email = session?.email || "";
  const initial = name.trim().charAt(0).toUpperCase() || "U";

  if (authButtons) {
    authButtons.style.display = "none";
  }
  if (profilePill) {
    profilePill.hidden = false;
  }
  if (profileAvatar) {
    profileAvatar.textContent = initial;
  }
  if (profileName) {
    profileName.textContent = name;
  }
  if (profileAvatarLg) {
    profileAvatarLg.textContent = initial;
  }
  if (profileNameMain) {
    profileNameMain.textContent = name;
  }
  if (profileEmailMain) {
    profileEmailMain.textContent = email;
  }

  document.title = name || ORIGINAL_TITLE;

  const pill = document.getElementById("tf-profile-pill");
  if (pill) {
    pill.addEventListener("click", () => {
      window.location.href = "profile-tasks.html";
    });
  }

  if (options.redirectToProfile) {
    window.location.href = "profile-tasks.html";
  }
}

function logoutUser() {
  clearSession();
  const authButtons = document.getElementById("tf-auth-buttons");
  const profilePill = document.getElementById("tf-profile-pill");
  if (authButtons) {
    authButtons.style.display = "";
  }
  if (profilePill) {
    profilePill.hidden = true;
  }
  document.title = ORIGINAL_TITLE;
  window.location.href = "index.html#hero";
}

function loadChecklistFromStorage() {
  const session = getStoredSession();
  const userKey = session && session.userId ? String(session.userId) : "anonymous";
  const key = `${CHECKLIST_STORAGE_PREFIX}${userKey}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveChecklistToStorage(items) {
  const session = getStoredSession();
  const userKey = session && session.userId ? String(session.userId) : "anonymous";
  const key = `${CHECKLIST_STORAGE_PREFIX}${userKey}`;
  window.localStorage.setItem(key, JSON.stringify(items));
}

function computeChecklistStatus(phases) {
  const total = phases.length;
  const completed = phases.filter(Boolean).length;
  if (completed === 0) return { label: "Not started", className: "tf-checklist-status-not-started" };
  if (completed === total) return { label: "Complete", className: "tf-checklist-status-complete" };
  return { label: "In progress", className: "tf-checklist-status-progress" };
}

function renderChecklist() {
  const tbody = document.getElementById("tf-checklist-rows");
  const emptyEl = document.getElementById("tf-checklist-empty");
  const summaryEl = document.getElementById("tf-checklist-summary");
  if (!tbody || !emptyEl || !summaryEl) return;

  const items = loadChecklistFromStorage();
  tbody.innerHTML = "";

  if (!items.length) {
    emptyEl.style.display = "block";
    summaryEl.textContent = "0/0 tasks complete";
    return;
  }

  emptyEl.style.display = "none";

  let completeCount = 0;

  items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.dataset.id = item.id;

    const nameTd = document.createElement("td");
    nameTd.className = "tf-checklist-task-name";
    nameTd.textContent = item.title;

    const phasesTds = [0, 1, 2].map((index) => {
      const td = document.createElement("td");
      td.className = "tf-checklist-phase";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.phase = String(index);
      checkbox.checked = !!item.phases[index];
      td.appendChild(checkbox);
      return td;
    });

    const statusTd = document.createElement("td");
    statusTd.className = "tf-checklist-status";
    const status = computeChecklistStatus(item.phases);
    statusTd.textContent = status.label;
    statusTd.classList.add(status.className);
    if (status.label === "Complete") {
      completeCount += 1;
    }

    const deleteTd = document.createElement("td");
    deleteTd.className = "tf-checklist-delete";
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "tf-btn tf-btn-ghost";
    deleteBtn.textContent = "Remove";
    deleteTd.appendChild(deleteBtn);

    tr.appendChild(nameTd);
    phasesTds.forEach((td) => tr.appendChild(td));
    tr.appendChild(statusTd);
    tr.appendChild(deleteTd);

    tbody.appendChild(tr);
  });

  summaryEl.textContent = `${completeCount}/${items.length} tasks complete`;
}

function setupChecklistPage() {
  const tbody = document.getElementById("tf-checklist-rows");
  const form = document.getElementById("tf-checklist-form");
  if (!tbody || !form) return;

  renderChecklist();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("tf-checklist-title");
    if (!input) return;
    const title = input.value.trim();
    if (!title) return;

    const items = loadChecklistFromStorage();
    const newItem = {
      id: Date.now().toString(36),
      title,
      phases: [false, false, false],
    };
    items.push(newItem);
    saveChecklistToStorage(items);
    input.value = "";
    renderChecklist();
  });

  tbody.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
    const tr = target.closest("tr");
    if (!tr || !tr.dataset.id) return;

    const items = loadChecklistFromStorage();
    const item = items.find((i) => i.id === tr.dataset.id);
    if (!item) return;

    const phaseIndex = Number(target.dataset.phase || "0");
    if (Number.isNaN(phaseIndex)) return;

    item.phases[phaseIndex] = target.checked;
    saveChecklistToStorage(items);
    renderChecklist();
  });

  tbody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.tagName !== "BUTTON") return;
    const tr = target.closest("tr");
    if (!tr || !tr.dataset.id) return;

    let items = loadChecklistFromStorage();
    items = items.filter((i) => i.id !== tr.dataset.id);
    saveChecklistToStorage(items);
    renderChecklist();
  });
}

function setupLogoutControl() {
  const btn = document.getElementById("tf-logout-btn");
  if (!btn) return;
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    logoutUser();
  });
}

function bootstrap() {
  setupFooterYear();
  setupSmoothScroll();
  setupScrollAnimations();
  setupAuthModal();
  setupRoutineForm();

  const existingSession = getStoredSession();
  if (existingSession) {
    applySessionUi(existingSession, { redirectToProfile: false });
    initializeBackendDrivenUi();
  }

  setupChecklistPage();
  setupLogoutControl();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

