const BASE_PROGRESS = window.BASE_PROGRESS;
const STORAGE_KEY = "xiaotong-daily-progress-v4";
const EDIT_PASSWORD = "1215";
const yearSelect = document.querySelector("#year");
const monthSelect = document.querySelector("#month");
const daySelect = document.querySelector("#day");
const weekday = document.querySelector("#weekday");
const list = document.querySelector("#progressList");
const empty = document.querySelector("#emptyState");
const summary = document.querySelector("#summary");
const monthTitle = document.querySelector("#monthTitle");
const calendarGrid = document.querySelector("#calendarGrid");
const dialog = document.querySelector("#addDialog");
const form = document.querySelector("#addForm");
const entryDate = document.querySelector("#entryDate");
const entryText = document.querySelector("#entryText");
const unlockDialog = document.querySelector("#unlockDialog");
const unlockForm = document.querySelector("#unlockForm");
const editPassword = document.querySelector("#editPassword");
const passwordError = document.querySelector("#passwordError");
let editingUnlocked = false;

function pad(value) { return String(value).padStart(2, "0"); }
function selectedKey() { return `${yearSelect.value}-${pad(monthSelect.value)}-${pad(daySelect.value)}`; }

function localState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { added: saved.added || {}, deleted: saved.deleted || {} };
  } catch {
    return { added: {}, deleted: {} };
  }
}

function saveLocalState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function itemsForDate(key) {
  const state = localState();
  const deleted = new Set(state.deleted[key] || []);
  const base = (BASE_PROGRESS[key] || []).map((text, index) => ({ id: `base-${key}-${index}`, text, source: "base" }));
  const added = (state.added[key] || []).map(item => ({ ...item, source: "local" }));
  return [...base.filter(item => !deleted.has(item.id)), ...added];
}

function fillSelect(select, start, end) {
  select.innerHTML = "";
  for (let value = start; value <= end; value += 1) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
}

function refreshDays(preferredDay) {
  const max = new Date(Number(yearSelect.value), Number(monthSelect.value), 0).getDate();
  fillSelect(daySelect, 1, max);
  daySelect.value = Math.min(Number(preferredDay || 1), max);
}

function setDate(date) {
  yearSelect.value = date.getFullYear();
  monthSelect.value = date.getMonth() + 1;
  refreshDays(date.getDate());
  render();
}

function renderCalendar() {
  const year = Number(yearSelect.value);
  const month = Number(monthSelect.value);
  const selectedDay = Number(daySelect.value);
  monthTitle.textContent = `${year} 年 ${month} 月 · 工作日历`;
  calendarGrid.innerHTML = "";
  "日一二三四五六".split("").forEach(label => {
    const cell = document.createElement("span");
    cell.className = "calendar-weekday";
    cell.textContent = label;
    calendarGrid.append(cell);
  });
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const max = new Date(year, month, 0).getDate();
  for (let index = 0; index < firstWeekday; index += 1) {
    const blank = document.createElement("span");
    blank.className = "calendar-blank";
    calendarGrid.append(blank);
  }
  for (let day = 1; day <= max; day += 1) {
    const key = `${year}-${pad(month)}-${pad(day)}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;
    button.setAttribute("aria-label", `${month}月${day}日${itemsForDate(key).length ? "，有工作记录" : ""}`);
    if (itemsForDate(key).length) button.classList.add("worked");
    if (day === selectedDay) button.classList.add("selected");
    button.addEventListener("click", () => { daySelect.value = day; render(); });
    calendarGrid.append(button);
  }
}

function render() {
  const key = selectedKey();
  const selected = new Date(`${key}T12:00:00`);
  weekday.textContent = `星期${"日一二三四五六"[selected.getDay()]}`;
  const items = itemsForDate(key);
  list.innerHTML = "";
  items.forEach(({ id, text, source }) => {
    const item = document.createElement("li");
    item.className = "progress-item";
    const paragraph = document.createElement("p");
    paragraph.className = "progress-text";
    paragraph.textContent = text;
    item.append(paragraph);
    if (editingUnlocked) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-button";
      remove.textContent = "删除";
      remove.addEventListener("click", () => deleteItem(key, id, source));
      item.append(remove);
    }
    list.append(item);
  });
  empty.hidden = items.length > 0;
  list.hidden = items.length === 0;
  summary.textContent = items.length ? `共 ${items.length} 项已完成` : "";
  renderCalendar();
  history.replaceState(null, "", `#${key}`);
}

function deleteItem(key, id, source) {
  const state = localState();
  if (source === "local") {
    state.added[key] = (state.added[key] || []).filter(item => item.id !== id);
  } else {
    state.deleted[key] ||= [];
    if (!state.deleted[key].includes(id)) state.deleted[key].push(id);
  }
  saveLocalState(state);
  render();
}

function openAddDialog() {
  entryDate.value = selectedKey();
  entryText.value = "";
  dialog.showModal();
  entryText.focus();
}

fillSelect(yearSelect, 2024, 2032);
fillSelect(monthSelect, 1, 12);
const hashDate = location.hash.match(/^#(\d{4})-(\d{2})-(\d{2})$/);
const initial = hashDate ? new Date(`${hashDate[1]}-${hashDate[2]}-${hashDate[3]}T12:00:00`) : new Date();
setDate(initial);

yearSelect.addEventListener("change", () => { refreshDays(daySelect.value); render(); });
monthSelect.addEventListener("change", () => { refreshDays(daySelect.value); render(); });
daySelect.addEventListener("change", render);
document.querySelector("#todayButton").addEventListener("click", () => setDate(new Date()));
document.querySelector("#addButton").addEventListener("click", () => {
  if (editingUnlocked) return openAddDialog();
  editPassword.value = "";
  passwordError.textContent = "";
  unlockDialog.showModal();
  editPassword.focus();
});
document.querySelector("#cancelButton").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
document.querySelector("#cancelUnlock").addEventListener("click", () => unlockDialog.close());
unlockDialog.addEventListener("click", event => { if (event.target === unlockDialog) unlockDialog.close(); });
unlockForm.addEventListener("submit", event => {
  event.preventDefault();
  if (editPassword.value !== EDIT_PASSWORD) {
    passwordError.textContent = "密码错误，请重新输入。";
    editPassword.select();
    return;
  }
  editingUnlocked = true;
  unlockDialog.close();
  render();
  openAddDialog();
});
form.addEventListener("submit", event => {
  event.preventDefault();
  const text = entryText.value.trim();
  if (!text) return;
  const state = localState();
  state.added[entryDate.value] ||= [];
  state.added[entryDate.value].push({ id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`, text });
  saveLocalState(state);
  const savedDate = new Date(`${entryDate.value}T12:00:00`);
  dialog.close();
  setDate(savedDate);
});
