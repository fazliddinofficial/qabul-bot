const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const listEl = document.querySelector("#list");
const searchEl = document.querySelector("#search");
const positionEl = document.querySelector("#position-filter");
const statusEl = document.querySelector("#status-filter");
const sortEl = document.querySelector("#sort-filter");
const dateFromEl = document.querySelector("#date-from");
const dateToEl = document.querySelector("#date-to");
const statsEl = document.querySelector("#stats");
const detail = document.querySelector("#detail");
const detailBody = document.querySelector("#detail-body");
const detailTitle = document.querySelector("#detail-title");
const detailPosition = document.querySelector("#detail-position");

const labels = {
  fullName: "I.F.Sh",
  birthday: "Tug‘ilgan sana",
  nation: "Millati",
  address: "Manzil",
  phone: "Telefon",
  parentPhone: "Ota-ona telefoni",
  education: "Ma’lumot",
  institution: "O‘quv muassasasi",
  graduationYear: "Tugatish yili",
  languageLevel: "Til darajasi",
  computerSkills: "Kompyuter",
  prevJob: "Oldingi ish",
  lastSalary: "Oxirgi oylik",
  expectedSalary: "Kutilayotgan oylik",
  maritalStatus: "Oilaviy holat",
  workHours: "Ish vaqti",
  workDuration: "Ishlash muddati",
  foundResource: "E’lon manbasi",
  username: "Telegram",
  telegramUserId: "Telegram ID",
  createdAt: "Yuborilgan vaqt",
};

let currentUser = null;
let allItems = [];
let knownPositions = [];
let activePosition = "";
let activeStatus = "";
let activeSort = "position";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function prettyStamp(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) return value || "";
  const months = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  const time = match[4] ? `, ${match[4]}:${match[5]}` : "";
  return `${match[3]} ${months[Number(match[2]) - 1]}${time}`;
}

function formatDate(value) {
  if (!value) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tashkent",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  const months = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  return `${parts.day} ${months[Number(parts.month) - 1]}, ${parts.hour}:${parts.minute}`;
}

function showLogin() {
  loginView.classList.remove("hidden");
  appView.classList.add("hidden");
}

function showApp() {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  const who = [currentUser?.surname, currentUser?.name].filter(Boolean).join(" ");
  document.querySelector("#whoami-name").textContent = who;
  document.querySelector("#open-staff").classList.toggle("hidden", currentUser?.role !== "admin");
}

function byName(a, b) {
  return String(a.fullName || "").localeCompare(String(b.fullName || ""), "uz");
}

function byDate(direction) {
  return (a, b) => {
    const left = new Date(a.createdAt || 0).getTime();
    const right = new Date(b.createdAt || 0).getTime();
    return direction === "oldest" ? left - right : right - left;
  };
}

function searchedItems() {
  const query = searchEl.value.trim().toLowerCase();
  if (!query) return allItems;
  return allItems.filter((item) =>
    [item.fullName, item.phone, item.parentPhone, item.username, item.position]
      .some((value) => String(value || "").toLowerCase().includes(query)),
  );
}

function interviewKey(status) {
  if (status === "arrived") return "arrived";
  if (status === "hired") return "hired";
  if (status === "missed") return "missed";
  if (status === "expected" || status === "called") return "expected";
  return "none";
}

const interviewLabels = {
  none: "Chaqirilmagan",
  expected: "Chaqirildi",
  arrived: "Keldi",
  missed: "Kelmagan",
  hired: "Ishga kirgan",
};

function dateMatch(item) {
  const from = dateFromEl.value;
  const to = dateToEl.value;
  if (!from && !to) return true;
  const time = new Date(item.createdAt || 0).getTime();
  if (!Number.isFinite(time)) return false;
  if (from && time < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && time > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}

function statusMatch(item) {
  if (activeStatus === "none" || activeStatus === "expected" || activeStatus === "arrived" || activeStatus === "missed" || activeStatus === "hired") {
    return interviewKey(item.interviewStatus) === activeStatus;
  }
  if (activeStatus === "scored") return item.score !== null && item.score !== undefined;
  return true;
}

function staffMark(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const initial = parts[1] ? `${parts[1].replace(/\./g, "").charAt(0).toUpperCase()}.` : "";
  return [parts[0], initial].filter(Boolean).join(" ");
}

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { surname: "—", name: "—", patronymic: "—" };
  if (parts.length === 1) return { surname: parts[0], name: "—", patronymic: "—" };
  const [surname, name, ...rest] = parts;
  return { surname, name, patronymic: rest.join(" ") || "—" };
}

function formatSum(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return `${Number(digits).toLocaleString("ru-RU")} so'm`;
}

function formatPhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length > 9) digits = digits.slice(-9);
  if (digits.length < 9) return digits;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
}

function heartHtml(item) {
  return `<span class="fav ${item.favorite ? "on" : ""}" data-fav="${esc(item._id)}" role="button" aria-label="Izbranniy"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"/></svg></span>`;
}

function cardHtml(item) {
  const person = splitName(item.fullName);
  const photo = item.hasPhoto
    ? `<img class="id-photo" src="/api/applications/${esc(item._id)}/photo" alt="" />`
    : `<span class="id-photo id-photo-empty">Rasm yo‘q</span>`;
  return `
    <button class="idcard" type="button" data-id="${esc(item._id)}">
      ${heartHtml(item)}
      <div class="id-head">
        <span class="id-logo">QABUL</span>
        <span class="id-title tone-${interviewKey(item.interviewStatus)}">ARIZA KARTASI<span class="id-added">${esc(formatDate(item.createdAt) || "—")}</span></span>
      </div>
      <div class="id-main">
        ${photo}
        <div class="id-info">
          <p><span class="id-label">Suhbat</span><span class="id-value">${esc(interviewLabels[interviewKey(item.interviewStatus)])}</span></p>
          <p><span class="id-label">Suhbat vaqti</span><span class="id-value">${esc(prettyStamp(item.interviewAt) || "—")}</span></p>
          <p><span class="id-label">Ball</span><span class="id-value">${item.score == null || item.score === "" ? "—" : `${Math.round(Number(item.score))} / 10`}</span></p>
          <p><span class="id-label">Familiya, ism</span><span class="id-value">${esc(person.surname)} ${esc(person.name)}</span></p>
          <p><span class="id-label">Telefon</span><span class="id-value">${esc(formatPhone(item.phone) || "—")}</span></p>
          <p><span class="id-label">Tug‘ilgan sanasi</span><span class="id-meta">${esc(item.birthday || "—")}</span></p>
          <p><span class="id-label">Yo‘nalish</span><span class="id-meta">${esc(item.position || "—")}</span></p>
          <p><span class="id-label">Ota-ona telefoni</span><span class="id-meta">${esc(formatPhone(item.parentPhone) || "—")}</span></p>
          <p><span class="id-label">Til darajasi</span><span class="id-meta">${esc(item.languageLevel || "—")}</span></p>
        </div>
      </div>
    </button>`;
}

function groupOrder(items) {
  const names = [...knownPositions];
  for (const item of items) {
    if (item.position && !names.includes(item.position)) names.push(item.position);
  }
  return names;
}

function fillSelect(select, options, current) {
  select.innerHTML = options
    .map((option) => `<option value="${esc(option.value)}">${esc(option.label)}</option>`)
    .join("");
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function render() {
  const found = searchedItems().filter(dateMatch).filter(statusMatch);
  const dated = allItems.filter(dateMatch);
  const counts = new Map();
  for (const item of found) {
    const key = item.position || "Yo‘nalishsiz";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const directions = groupOrder(found).filter((name) => counts.get(name));
  const directionCount = new Set(allItems.map((item) => item.position).filter(Boolean)).size;
  const latest = allItems[0] ? formatDate(allItems[0].createdAt) : "—";

  statsEl.innerHTML = `
    <div class="stat"><span>Jami ariza</span><b>${allItems.length}</b></div>
    <div class="stat"><span>Yo‘nalishlar</span><b>${directionCount}</b></div>
    <div class="stat"><span>So‘nggi ariza</span><b style="font-size:18px">${esc(latest)}</b></div>
  `;

  const positionPool = groupOrder(allItems);
  fillSelect(
    positionEl,
    [
      { value: "", label: "Barchasi" },
      ...positionPool
        .map((name) => {
          const count = dated.filter((item) => item.position === name).length;
          return count ? { value: name, label: `${name} (${count})` } : null;
        })
        .filter(Boolean),
    ],
    activePosition,
  );

  const countStatus = (key) => dated.filter((item) => interviewKey(item.interviewStatus) === key).length;
  const scoredCount = dated.filter((item) => item.score !== null && item.score !== undefined).length;
  fillSelect(
    statusEl,
    [
      { value: "", label: "Barchasi" },
      { value: "none", label: `Chaqirilmagan (${countStatus("none")})` },
      { value: "expected", label: `Chaqirildi (${countStatus("expected")})` },
      { value: "arrived", label: `Keldi (${countStatus("arrived")})` },
      { value: "missed", label: `Kelmagan (${countStatus("missed")})` },
      { value: "hired", label: `Ishga kirgan (${countStatus("hired")})` },
      { value: "scored", label: `Ball qo‘yilgan (${scoredCount})` },
    ],
    activeStatus,
  );

  let visible = activePosition
    ? found.filter((item) => item.position === activePosition)
    : found;
  if (activeSort === "favorite") visible = visible.filter((item) => item.favorite);
  const sort = activeSort;

  if (!visible.length) {
    listEl.innerHTML = `<p class="empty">Hozircha bu bo‘yicha ariza yo‘q. Botdan yangi ariza kelganda shu yerda ko‘rinadi.</p>`;
    return;
  }

  if (sort === "position" && !activePosition) {
    listEl.innerHTML = directions
      .map((name) => {
        const cards = visible
          .filter((item) => (item.position || "Yo‘nalishsiz") === name)
          .sort(byDate("newest"))
          .map(cardHtml)
          .join("");
        return `
          <section class="group">
            <div class="group-head">
              <h2>${esc(name)}</h2>
              <span class="badge">${counts.get(name)} ta</span>
            </div>
            <div class="cards">${cards}</div>
          </section>`;
      })
      .join("");
    return;
  }

  if (sort === "name") visible = [...visible].sort(byName);
  else visible = [...visible].sort(byDate(sort === "oldest" ? "oldest" : "newest"));

  const title = activePosition
    || (sort === "favorite" ? "Izbranniy" : sort === "all" ? "Barchasi" : sort === "name" ? "Ism bo‘yicha" : sort === "oldest" ? "Eskisidan" : sort === "newest" ? "Yangisidan" : "Sana bo‘yicha");
  listEl.innerHTML = `
    <section class="group">
      <div class="group-head">
        <h2>${esc(title)}</h2>
        <span class="badge">${visible.length} ta</span>
      </div>
      <div class="cards">${visible.map(cardHtml).join("")}</div>
    </section>`;
}

async function loadApplications() {
  const res = await fetch("/api/applications");
  if (res.status === 401) return showLogin();
  const data = await res.json();
  allItems = data.items || [];
  knownPositions = data.positions || [];
  render();
}

async function openDetail(id) {
  const res = await fetch(`/api/applications/${id}`);
  if (!res.ok) return;
  const { item } = await res.json();
  detailTitle.textContent = item.fullName || "Ariza";
  detailPosition.textContent = item.position || "Yo‘nalishsiz";

  const person = splitName(item.fullName);
  const shown = (value) => (value === 0 || value ? esc(value) : "—");
  const block = (label, value, wide = false) => `
    <div class="pass-field ${wide ? "wide" : ""}">
      <span>${label}</span>
      <strong>${shown(value)}</strong>
    </div>`;
  const editCard = (key, label, display, control, askSave = false) => `
    <div class="pass-field edit-card" data-edit="${key}">
      <span>${label}</span>
      <strong class="edit-view">${shown(display)}</strong>
      <div class="edit-box">
        ${control}
        ${askSave ? `<button type="button" class="card-save">Saqlash</button>` : ""}
      </div>
    </div>`;

  const interview = interviewKey(item.interviewStatus);
  const photoUrl = `/api/applications/${esc(item._id)}/photo`;
  detailBody.innerHTML = `
    <article class="pass">
      <div class="pass-top">
      <div class="pass-photo-col">
        ${
          item.hasPhoto
            ? `<button type="button" class="photo-open" id="open-photo"><img src="${photoUrl}" alt="Nomzod rasmi" /></button>`
            : `<div class="pass-empty">Rasm yo‘q</div>`
        }
      </div>
        <div class="pass-identity">
          <div class="pass-who">
            <p class="pass-kicker">Familiya · Ism · Otasining ismi</p>
            <h2 class="pass-name">${esc(person.surname)} ${esc(person.name)} ${esc(person.patronymic)}</h2>
            <p class="pass-role">${esc(item.position || "Yo‘nalishsiz")}</p>
            <p class="pass-interviewer" id="who-called">Suhbatga chaqirgan: ${esc(staffMark(item.callerName) || "hali belgilanmagan")}</p>
            <p class="pass-interviewer" id="who-ran">Suhbat o‘tkazuvchi: ${esc(staffMark(item.interviewerName) || "hali belgilanmagan")}</p>
          </div>
          ${editCard(
            "interviewStatus",
            "Suhbat",
            interviewLabels[interview],
            `<div class="choice mini">
              <button type="button" data-call="none">Chaqirilmagan</button>
              <button type="button" data-call="expected">Chaqirildi</button>
              <button type="button" data-call="arrived">Keldi</button>
              <button type="button" data-call="missed">Kelmagan</button>
              <button type="button" data-call="hired">Ishga kirgan</button>
            </div>`,
          )}
          ${editCard("interviewAt", "Suhbat vaqti", prettyStamp(item.interviewAt), `<input name="interviewAt" type="datetime-local" value="${esc(item.interviewAt || "")}" />`)}
          ${editCard("workStart", "Ish boshlash", prettyStamp(item.workStart), `<input name="workStart" type="date" value="${esc(item.workStart || "")}" />`)}
          ${editCard("agreedSalary", "Kelishilgan oylik", formatSum(item.agreedSalary), `<input name="agreedSalary" value="${esc(formatSum(item.agreedSalary))}" placeholder="5 000 000" />`)}
          ${editCard(
            "score",
            "Ball",
            item.score == null || item.score === "" ? "" : `${Math.round(Number(item.score))} / 10`,
            `<input name="score" type="number" min="1" max="10" step="1" value="${item.score == null || item.score === "" ? "" : Math.round(Number(item.score))}" placeholder="1–10" />`,
          )}
          <div class="pass-next">
            ${block("Tug‘ilgan sana", item.birthday)}
            ${editCard("phone", "Telefon", formatPhone(item.phone), `<input name="phone" value="${esc(formatPhone(item.phone))}" placeholder="99 999 99 99" />`, true)}
            ${editCard("parentPhone", "Ota-ona telefoni", formatPhone(item.parentPhone), `<input name="parentPhone" value="${esc(formatPhone(item.parentPhone))}" placeholder="99 999 99 99" />`, true)}
            ${block("Millati", item.nation)}
          </div>
        </div>
        <div class="pass-raise">
          ${block("Oilaviy holat", item.maritalStatus)}
          ${block("Telegram", item.username ? `@${item.username}` : "")}
          ${block("Ma’lumot", item.education)}
          ${block("Tugatish yili", item.graduationYear)}
          ${block("Til darajasi", item.languageLevel)}
          ${block("Kompyuter", item.computerSkills)}
          ${editCard("workHours", "Ish vaqti", item.workHours, `<input name="workHours" value="${esc(item.workHours || "")}" placeholder="09:00 dan 14:00 gacha" />`, true)}
          ${block("Ishlash muddati", item.workDuration)}
        </div>
      </div>
        <div class="pass-grid">
          ${block("Oxirgi oylik", formatSum(item.lastSalary))}
          ${block("Kutilayotgan oylik", formatSum(item.expectedSalary))}
          ${block("Yuborilgan vaqt", formatDate(item.createdAt))}
          ${block("O‘quv muassasasi", item.institution, true)}
          ${block("Manzil", item.address, true)}
          ${block("Oldingi ish", item.prevJob, true)}
          ${block("E’lon manbasi", item.foundResource)}
          ${block("Telegram ID", item.telegramUserId)}
        </div>
        ${editCard("note", "Izoh", item.note, `<textarea name="note" rows="4" maxlength="2000" placeholder="Izoh yozing">${esc(item.note || "")}</textarea>`)}
    </article>
    ${
      item.hasPhoto
        ? `<div id="photo-lightbox" class="lightbox hidden"><button type="button" class="ghost" id="close-photo">Yopish</button><img src="${photoUrl}" alt="" /></div>`
        : ""
    }
  `;
  const detailFav = document.querySelector("#detail-fav");
  detailFav.classList.toggle("on", Boolean(item.favorite));
  detailFav.dataset.fav = item._id;
  detail.showModal();

  const draft = {
    interviewStatus: interview,
    score: item.score == null || item.score === "" ? "" : Math.round(Number(item.score)),
    note: item.note || "",
    agreedSalary: formatSum(item.agreedSalary),
    lastSalary: formatSum(item.lastSalary),
    expectedSalary: formatSum(item.expectedSalary),
    phone: formatPhone(item.phone),
    parentPhone: formatPhone(item.parentPhone),
    workHours: item.workHours || "",
    interviewAt: item.interviewAt || "",
    workStart: item.workStart || "",
  };

  const interviewCard = detailBody.querySelector('[data-edit="interviewStatus"]');
  function paintInterview(card) {
    card.classList.remove("tone-none", "tone-expected", "tone-arrived", "tone-missed", "tone-hired");
    card.classList.add(`tone-${interviewKey(draft.interviewStatus)}`);
  }
  if (interviewCard) paintInterview(interviewCard);

  function viewText(key) {
    if (key === "interviewStatus") return interviewLabels[interviewKey(draft.interviewStatus)];
    if (key === "interviewAt" || key === "workStart") return prettyStamp(draft[key]) || "—";
    if (key === "phone" || key === "parentPhone") return formatPhone(draft[key]) || "—";
    if (key === "agreedSalary" || key === "lastSalary" || key === "expectedSalary") return formatSum(draft[key]) || "—";
    if (key === "score") return draft.score === "" || draft.score == null ? "—" : `${draft.score} / 10`;
    if (draft[key] === 0 || draft[key]) return String(draft[key]);
    return "—";
  }

  async function commit(card) {
    const key = card.dataset.edit;
    const input = card.querySelector("input, textarea");
    if (key === "interviewStatus") {
      draft.interviewStatus = card.dataset.pending || draft.interviewStatus;
    } else if (key === "score") {
      const raw = String(input?.value || "").trim();
      if (!raw) draft.score = "";
      else {
        const num = Math.round(Number(raw));
        if (!Number.isFinite(num) || num < 1 || num > 10) return;
        draft.score = num;
        input.value = String(num);
      }
    } else if (input) {
      if (key === "phone" || key === "parentPhone") draft[key] = formatPhone(input.value);
      else if (key === "agreedSalary" || key === "lastSalary" || key === "expectedSalary") draft[key] = formatSum(input.value);
      else draft[key] = input.value;
      input.value = draft[key];
    }
    const salaryReady = String(draft.agreedSalary || "").replace(/\D/g, "");
    const conducted = (key === "score" || key === "agreedSalary") && draft.score !== "" && draft.score != null && Boolean(salaryReady);
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, conducted }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const index = allItems.findIndex((entry) => entry._id === id);
    if (index >= 0) allItems[index] = { ...allItems[index], ...data.item };
    card.querySelector(".edit-view").textContent = viewText(key);
    if (key === "interviewStatus") paintInterview(card);
    const who = detailBody.querySelector("#who-ran");
    if (who) who.textContent = `Suhbat o‘tkazuvchi: ${staffMark(data.item.interviewerName) || "hali belgilanmagan"}`;
    const caller = detailBody.querySelector("#who-called");
    if (caller) caller.textContent = `Suhbatga chaqirgan: ${staffMark(data.item.callerName) || "hali belgilanmagan"}`;
    render();
  }

  detailBody.querySelectorAll(".edit-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest(".edit-box")) return;
      if (card.classList.contains("editing")) return;
      detailBody.querySelectorAll(".edit-card.editing").forEach((other) => other.classList.remove("editing"));
      card.classList.add("editing");
      if (card.dataset.edit === "interviewStatus") {
        card.dataset.pending = draft.interviewStatus;
        card.querySelectorAll("[data-call]").forEach((button) => {
          button.classList.toggle("active", button.dataset.call === draft.interviewStatus);
        });
      }
      card.querySelector("input, textarea")?.focus();
    });
    const saveButton = card.querySelector(".card-save");
    if (saveButton) {
      saveButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        await commit(card);
        card.classList.remove("editing");
      });
    } else {
      card.querySelector("input, textarea")?.addEventListener("change", async () => {
        await commit(card);
        card.classList.remove("editing");
      });
    }
  });

  detailBody.querySelectorAll("[data-call]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const card = button.closest(".edit-card");
      card.dataset.pending = button.dataset.call;
      card.querySelectorAll("[data-call]").forEach((item) => item.classList.toggle("active", item === button));
      if (!card.querySelector(".card-save")) {
        await commit(card);
        card.classList.remove("editing");
      }
    });
  });

  detailBody.querySelector("#open-photo")?.addEventListener("click", () => {
    detailBody.querySelector("#photo-lightbox")?.classList.remove("hidden");
  });
  detailBody.querySelector("#close-photo")?.addEventListener("click", () => {
    detailBody.querySelector("#photo-lightbox")?.classList.add("hidden");
  });
  document.querySelector("#header-delete")?.remove();
  if (currentUser?.role !== "admin") return;
  const deleteButton = document.createElement("button");
  deleteButton.id = "header-delete";
  deleteButton.type = "button";
  deleteButton.className = "icon-btn danger";
  deleteButton.setAttribute("aria-label", "O‘chirish");
  deleteButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>`;
  document.querySelector("#close-detail").before(deleteButton);
  deleteButton.addEventListener("click", async () => {
    if (!confirm("Bu ariza kerakmas. O‘chirib tashlansinmi?")) return;
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    allItems = allItems.filter((entry) => entry._id !== id);
    detail.close();
    render();
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const body = Object.fromEntries(new FormData(loginForm));
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    loginError.textContent = data.error || "Kirib bo‘lmadi";
    return;
  }
  currentUser = data.user;
  showApp();
  await loadApplications();
});

document.querySelector("#whoami").addEventListener("click", () => {
  const account = document.querySelector(".account");
  const open = account.classList.toggle("open");
  document.querySelector("#whoami").setAttribute("aria-expanded", open ? "true" : "false");
  document.querySelector(".more").classList.remove("open");
});
document.querySelector("#more-actions").addEventListener("click", () => {
  document.querySelector(".more").classList.toggle("open");
  document.querySelector(".account").classList.remove("open");
  document.querySelector("#whoami").setAttribute("aria-expanded", "false");
});
document.addEventListener("click", (event) => {
  const account = document.querySelector(".account");
  const more = document.querySelector(".more");
  if (!account.contains(event.target)) account.classList.remove("open");
  if (!more.contains(event.target)) more.classList.remove("open");
});
document.querySelector("#export-applications").addEventListener("click", () => {
  document.querySelector(".more").classList.remove("open");
  const columns = [
    ["fullName", "I.F.Sh"],
    ["position", "Yo‘nalish"],
    ["birthday", "Tug‘ilgan sana"],
    ["phone", "Telefon"],
    ["parentPhone", "Ota-ona telefoni"],
    ["address", "Manzil"],
    ["nation", "Millati"],
    ["education", "Ma’lumot"],
    ["institution", "O‘quv muassasasi"],
    ["graduationYear", "Tugatish yili"],
    ["languageLevel", "Til darajasi"],
    ["computerSkills", "Kompyuter"],
    ["prevJob", "Oldingi ish"],
    ["lastSalary", "Oxirgi oylik"],
    ["expectedSalary", "Kutilayotgan oylik"],
    ["agreedSalary", "Kelishilgan oylik"],
    ["maritalStatus", "Oilaviy holat"],
    ["workHours", "Ish vaqti"],
    ["workDuration", "Ishlash muddati"],
    ["foundResource", "E’lon manbasi"],
    ["interviewStatus", "Suhbat"],
    ["interviewAt", "Suhbat vaqti"],
    ["score", "Ball"],
    ["callerName", "Suhbatga chaqirgan"],
    ["interviewerName", "Suhbat o‘tkazuvchi"],
    ["note", "Izoh"],
    ["username", "Telegram"],
    ["telegramUserId", "Telegram ID"],
    ["createdAt", "Qo‘shilgan sana"],
  ];
  const cell = (value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
  const lines = [
    columns.map(([, label]) => cell(label)).join(";"),
    ...allItems.map((item) =>
      columns
        .map(([key]) => {
          if (key === "interviewStatus") return cell(interviewLabels[interviewKey(item.interviewStatus)] || "");
          if (key === "score") return cell(item.score == null || item.score === "" ? "" : `${item.score} / 10`);
          if (key === "createdAt") return cell(formatDate(item.createdAt));
          if (key === "username") return cell(item.username ? `@${item.username}` : "");
          return cell(item[key]);
        })
        .join(";"),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "arizalar.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

const importColumns = [
  ["fullName", "I.F.Sh"],
  ["position", "Yo‘nalish"],
  ["birthday", "Tug‘ilgan sana"],
  ["phone", "Telefon"],
  ["parentPhone", "Ota-ona telefoni"],
  ["address", "Manzil"],
  ["nation", "Millati"],
  ["education", "Ma’lumot"],
  ["institution", "O‘quv muassasasi"],
  ["graduationYear", "Tugatish yili"],
  ["languageLevel", "Til darajasi"],
  ["computerSkills", "Kompyuter"],
  ["prevJob", "Oldingi ish"],
  ["lastSalary", "Oxirgi oylik"],
  ["expectedSalary", "Kutilayotgan oylik"],
  ["agreedSalary", "Kelishilgan oylik"],
  ["maritalStatus", "Oilaviy holat"],
  ["workHours", "Ish vaqti"],
  ["workDuration", "Ishlash muddati"],
  ["foundResource", "E’lon manbasi"],
  ["interviewStatus", "Suhbat"],
  ["interviewAt", "Suhbat vaqti"],
  ["score", "Ball"],
  ["callerName", "Suhbatga chaqirgan"],
  ["interviewerName", "Suhbat o‘tkazuvchi"],
  ["note", "Izoh"],
  ["username", "Telegram"],
  ["telegramUserId", "Telegram ID"],
];

function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === "\"" && src[i + 1] === "\"") {
        cell += "\"";
        i += 1;
      } else if (ch === "\"") quoted = false;
      else cell += ch;
    } else if (ch === "\"") quoted = true;
    else if (ch === ";") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((line) => line.some((value) => String(value).trim()));
}

document.querySelector("#import-applications").addEventListener("click", () => {
  document.querySelector(".more").classList.remove("open");
  document.querySelector("#import-file").click();
});
document.querySelector("#import-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  const table = parseCsv(await file.text());
  const header = table[0] || [];
  const index = new Map(header.map((label, i) => [String(label).trim(), i]));
  if (!index.has("I.F.Sh") && !index.has("Telefon")) {
    alert("Bu eksport fayli emas. Avval Eksport qilingan .csv ni tanlang.");
    return;
  }
  const rows = table.slice(1).map((line) => {
    const item = {};
    for (const [key, label] of importColumns) {
      const at = index.get(label);
      item[key] = at == null ? "" : line[at] || "";
    }
    item.username = String(item.username || "").replace(/^@/, "");
    const score = String(item.score || "").match(/\d+/);
    item.score = score ? score[0] : "";
    return item;
  });
  const res = await fetch("/api/applications/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data.error || "Import bo‘lmadi");
    return;
  }
  alert(`${data.added} ta qo‘shildi. ${data.skipped} ta allaqachon borligi uchun o‘tkazib yuborildi.`);
  await loadApplications();
});
document.querySelector("#logout").addEventListener("click", async () => {
  document.querySelector(".account").classList.remove("open");
  await fetch("/api/logout", { method: "POST" });
  showLogin();
});

document.querySelector("#close-detail").addEventListener("click", () => detail.close());
document.querySelector("#back-detail").addEventListener("click", () => detail.close());

let timer;
searchEl.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(render, 200);
});
sortEl.addEventListener("change", () => {
  activeSort = sortEl.value;
  if (activeSort === "all") {
    activePosition = "";
    activeStatus = "";
    dateFromEl.value = "";
    dateToEl.value = "";
    syncDateField(dateFromEl);
    syncDateField(dateToEl);
  }
  render();
});
function syncDateField(input) {
  input.classList.toggle("has-value", Boolean(input.value));
}
dateFromEl.addEventListener("change", () => {
  syncDateField(dateFromEl);
  render();
});
dateToEl.addEventListener("change", () => {
  syncDateField(dateToEl);
  render();
});
positionEl.addEventListener("change", () => {
  activePosition = positionEl.value;
  render();
});
statusEl.addEventListener("change", () => {
  activeStatus = statusEl.value;
  render();
});
listEl.addEventListener("click", (event) => {
  const fav = event.target.closest("[data-fav]");
  if (fav) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(fav.dataset.fav);
    return;
  }
  const card = event.target.closest("[data-id]");
  if (card) openDetail(card.dataset.id);
});

async function toggleFavorite(id) {
  const item = allItems.find((entry) => entry._id === id);
  if (!item) return;
  const res = await fetch(`/api/applications/${id}/favorite`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ favorite: !item.favorite }),
  });
  if (!res.ok) return;
  const data = await res.json();
  item.favorite = Boolean(data.item.favorite);
  render();
  const detailFav = document.querySelector("#detail-fav");
  if (detailFav?.dataset.fav === id) detailFav.classList.toggle("on", item.favorite);
}

document.querySelector("#detail-fav").addEventListener("click", () => {
  const id = document.querySelector("#detail-fav").dataset.fav;
  if (id) toggleFavorite(id);
});

const staffDialog = document.querySelector("#staff-dialog");
const staffForm = document.querySelector("#staff-form");
const staffList = document.querySelector("#staff-list");
const staffError = document.querySelector("#staff-error");

async function loadStaff() {
  const res = await fetch("/api/staff");
  if (!res.ok) return;
  const data = await res.json();
  staffList.innerHTML = data.items
    .map(
      (person) => `
      <div class="staff-row">
        <div>
          <p><strong>${esc(person.surname)} ${esc(person.name)}</strong></p>
          <p class="muted">${esc(person.username)} · ${person.role === "admin" ? "Admin" : "Hodim"}</p>
        </div>
        <div class="staff-actions">
          <button type="button" class="ghost" data-edit-staff="${esc(person.id)}" data-surname="${esc(person.surname)}" data-name="${esc(person.name)}" data-username="${esc(person.username)}">Tahrirlash</button>
          ${person.role === "admin" ? "" : `<button type="button" class="danger" data-delete-staff="${esc(person.id)}">O‘chirish</button>`}
        </div>
      </div>`,
    )
    .join("");
}

document.querySelector("#open-staff").addEventListener("click", async () => {
  document.querySelector(".account").classList.remove("open");
  staffError.textContent = "";
  staffForm.reset();
  await loadStaff();
  staffDialog.showModal();
});
document.querySelector("#close-staff").addEventListener("click", () => staffDialog.close());

const historyDialog = document.querySelector("#history-dialog");
const historyList = document.querySelector("#history-list");

async function loadHistory() {
  const res = await fetch("/api/activity");
  if (!res.ok) return;
  const data = await res.json();
  const items = data.items || [];
  historyList.innerHTML = items.length
    ? items
        .map(
          (item) => `
        <article class="history-row">
          <div class="history-top">
            <strong>${esc(item.actorName || "Noma’lum")}</strong>
            <time>${esc(formatDate(item.at) || "—")}</time>
          </div>
          <p>${esc(item.action)}</p>
          ${item.detail ? `<p class="muted">${esc(item.detail)}</p>` : ""}
        </article>`,
        )
        .join("")
    : `<p class="empty">Hozircha harakat yo‘q.</p>`;
}

document.querySelector("#open-history").addEventListener("click", async () => {
  document.querySelector(".account").classList.remove("open");
  historyList.innerHTML = `<p class="muted">Yuklanmoqda...</p>`;
  historyDialog.showModal();
  await loadHistory();
});
document.querySelector("#close-history").addEventListener("click", () => historyDialog.close());

staffForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  staffError.textContent = "";
  const body = Object.fromEntries(new FormData(staffForm));
  const id = body.id;
  delete body.id;
  if (!body.password) delete body.password;
  const res = await fetch(id ? `/api/staff/${id}` : "/api/staff", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    staffError.textContent = data.error || "Saqlanmadi";
    return;
  }
  if (currentUser?.id === data.item?.id) {
    currentUser = data.item;
    showApp();
  }
  staffForm.reset();
  await loadStaff();
});

staffList.addEventListener("click", async (event) => {
  const edit = event.target.closest("[data-edit-staff]");
  if (edit) {
    staffForm.elements.id.value = edit.dataset.editStaff;
    staffForm.elements.surname.value = edit.dataset.surname;
    staffForm.elements.name.value = edit.dataset.name;
    staffForm.elements.username.value = edit.dataset.username;
    staffForm.elements.password.value = "";
    return;
  }
  const remove = event.target.closest("[data-delete-staff]");
  if (!remove) return;
  if (!confirm("Bu hodim o‘chirilsinmi?")) return;
  const res = await fetch(`/api/staff/${remove.dataset.deleteStaff}`, { method: "DELETE" });
  if (!res.ok) return;
  await loadStaff();
});

const me = await fetch("/api/me");
const session = await me.json();
if (session.ok) {
  currentUser = session.user;
  showApp();
  await loadApplications();
} else {
  showLogin();
}
