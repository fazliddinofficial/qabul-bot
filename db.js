import mongoose from "mongoose";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const userSchema = new mongoose.Schema(
  {
    ownerToken: { type: String, required: true },
    userId: { type: String, required: true },
    jobsTitle: { type: [String], required: true },
  },
  { collection: "applicant_users" },
);

userSchema.index({ ownerToken: 1, userId: 1 }, { unique: true });

const applicationSchema = new mongoose.Schema(
  {
    ownerToken: { type: String, required: true, index: true },
    telegramUserId: { type: String, required: true },
    username: { type: String, default: "" },
    position: { type: String, default: "" },
    fullName: { type: String, default: "" },
    fatherName: { type: String, default: "" },
    birthday: { type: String, default: "" },
    nation: { type: String, default: "" },
    address: { type: String, default: "" },
    education: { type: String, default: "" },
    institution: { type: String, default: "" },
    graduationYear: { type: String, default: "" },
    prevJob: { type: String, default: "" },
    maritalStatus: { type: String, default: "" },
    computerSkills: { type: String, default: "" },
    lastSalary: { type: String, default: "" },
    workDuration: { type: String, default: "" },
    parentPhone: { type: String, default: "" },
    languageLevel: { type: String, default: "" },
    workHours: { type: String, default: "" },
    expectedSalary: { type: String, default: "" },
    phone: { type: String, default: "" },
    foundResource: { type: String, default: "" },
    interviewStatus: { type: String, default: "none" },
    score: { type: Number, default: null },
    note: { type: String, default: "" },
    agreedSalary: { type: String, default: "" },
    interviewAt: { type: String, default: "" },
    workStart: { type: String, default: "" },
    passportSeries: { type: String, default: "" },
    jshshir: { type: String, default: "" },
    contractNumber: { type: String, default: "" },
    contractKind: { type: String, default: "teacher" },
    hiredAt: { type: String, default: "" },
    contractTerm: { type: String, default: "" },
    contractEnd: { type: String, default: "" },
    department: { type: String, default: "" },
    probation: { type: String, default: "" },
    perStudentPay: { type: String, default: "" },
    passportIssued: { type: String, default: "" },
    passportIssuer: { type: String, default: "" },
    passportFront: { data: Buffer, contentType: { type: String, default: "" } },
    passportBack: { data: Buffer, contentType: { type: String, default: "" } },
    diploma: { data: Buffer, contentType: { type: String, default: "" } },
    certificate: { data: Buffer, contentType: { type: String, default: "" } },
    signedContract: { data: Buffer, contentType: { type: String, default: "" } },
    hasPassportFront: { type: Boolean, default: false },
    hasPassportBack: { type: Boolean, default: false },
    hasDiploma: { type: Boolean, default: false },
    hasCertificate: { type: Boolean, default: false },
    hasSignedContract: { type: Boolean, default: false },
    passportFrontType: { type: String, default: "" },
    passportBackType: { type: String, default: "" },
    diplomaType: { type: String, default: "" },
    certificateType: { type: String, default: "" },
    signedContractType: { type: String, default: "" },
    passportFrontName: { type: String, default: "" },
    passportBackName: { type: String, default: "" },
    diplomaName: { type: String, default: "" },
    certificateName: { type: String, default: "" },
    signedContractName: { type: String, default: "" },
    interviewerId: { type: String, default: "" },
    interviewerName: { type: String, default: "" },
    callerId: { type: String, default: "" },
    callerName: { type: String, default: "" },
    favorite: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    hasPhoto: { type: Boolean, default: false },
    photo: {
      data: Buffer,
      contentType: { type: String, default: "image/jpeg" },
    },
  },
  { collection: "applications", timestamps: { createdAt: true, updatedAt: false } },
);

const staffSchema = new mongoose.Schema(
  {
    ownerToken: { type: String, required: true, index: true },
    username: { type: String, required: true },
    passwordHash: { type: String, required: true },
    surname: { type: String, default: "" },
    name: { type: String, default: "" },
    role: { type: String, default: "staff" },
  },
  { collection: "staff_users", timestamps: true },
);

staffSchema.index({ ownerToken: 1, username: 1 }, { unique: true });

const activitySchema = new mongoose.Schema(
  {
    ownerToken: { type: String, required: true, index: true },
    actorId: { type: String, default: "" },
    actorName: { type: String, default: "" },
    actorUsername: { type: String, default: "" },
    action: { type: String, required: true },
    detail: { type: String, default: "" },
  },
  { collection: "activity_log", timestamps: { createdAt: true, updatedAt: false } },
);

const User = mongoose.models.ApplicantUser || mongoose.model("ApplicantUser", userSchema);
const Staff = mongoose.models.StaffUser || mongoose.model("StaffUser", staffSchema);
const Activity = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activitySchema);
const Application =
  mongoose.models.Application || mongoose.model("Application", applicationSchema);

const withoutFiles =
  "-photo -passportFront -passportBack -diploma -certificate -signedContract";

export const DOC_SLOTS = {
  passportFront: { flag: "hasPassportFront", typeField: "passportFrontType", nameField: "passportFrontName", label: "Pasport oldi" },
  passportBack: { flag: "hasPassportBack", typeField: "passportBackType", nameField: "passportBackName", label: "Pasport orqasi" },
  diploma: { flag: "hasDiploma", typeField: "diplomaType", nameField: "diplomaName", label: "Diplom" },
  certificate: { flag: "hasCertificate", typeField: "certificateType", nameField: "certificateName", label: "Sertifikat" },
  signedContract: { flag: "hasSignedContract", typeField: "signedContractType", nameField: "signedContractName", label: "Imzolangan shartnoma" },
};

const answerFields = [
  "position",
  "fullName",
  "birthday",
  "nation",
  "address",
  "education",
  "institution",
  "graduationYear",
  "prevJob",
  "maritalStatus",
  "computerSkills",
  "lastSalary",
  "workDuration",
  "parentPhone",
  "languageLevel",
  "workHours",
  "expectedSalary",
  "phone",
  "foundResource",
];

function personMark(surname, name) {
  const family = String(surname || "").trim();
  const given = String(name || "").trim().replace(/\./g, "");
  const initial = given ? `${given.charAt(0).toUpperCase()}.` : "";
  return [family, initial].filter(Boolean).join(" ");
}

function ownerToken() {
  return process.env.DASHBOARD_TOKEN || "";
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(String(password), salt, 32)).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = (await scryptAsync(String(password), salt, 32)).toString("hex");
  const left = Buffer.from(hash, "hex");
  const right = Buffer.from(next, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function publicStaff(doc) {
  return {
    id: String(doc._id),
    username: doc.username,
    surname: doc.surname || "",
    name: doc.name || "",
    role: doc.role === "admin" ? "admin" : "staff",
  };
}

export async function recordActivity({ actor, action, detail }) {
  try {
    await Activity.create({
      ownerToken: ownerToken(),
      actorId: String(actor?.id || ""),
      actorName: [actor?.surname, actor?.name].filter(Boolean).join(" ") || actor?.username || "Noma’lum",
      actorUsername: String(actor?.username || ""),
      action: String(action || "").slice(0, 120),
      detail: String(detail || "").slice(0, 2000),
    });
  } catch (error) {
    console.error("Tarix yozilmadi:", error.message);
  }
}

export async function listActivity() {
  const items = await Activity.find({ ownerToken: ownerToken() }).sort({ createdAt: -1 }).limit(400).lean();
  return items.map((item) => ({
    id: String(item._id),
    at: item.createdAt,
    actorName: item.actorName,
    actorUsername: item.actorUsername,
    action: item.action,
    detail: item.detail,
  }));
}

export async function ensureDefaultAdmin() {
  const username = String(process.env.ADMIN_USERNAME || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");
  if (!username || !password) return null;
  const existing = await Staff.findOne({ ownerToken: ownerToken(), username });
  if (existing) return publicStaff(existing);
  const created = await Staff.create({
    ownerToken: ownerToken(),
    username,
    passwordHash: await hashPassword(password),
    surname: "Admin",
    name: "Panel",
    role: "admin",
  });
  return publicStaff(created);
}

export async function authenticateStaff(username, password) {
  const login = String(username || "").trim().toLowerCase();
  if (!login || !password) return null;
  const doc = await Staff.findOne({ ownerToken: ownerToken(), username: login });
  if (!doc) return null;
  const ok = await verifyPassword(password, doc.passwordHash);
  if (!ok) return null;
  return publicStaff(doc);
}

export async function listStaff() {
  const rows = await Staff.find({ ownerToken: ownerToken() }).sort({ role: 1, surname: 1, name: 1 }).lean();
  return rows.map(publicStaff);
}

function cleanPerson(value) {
  return String(value || "").trim().slice(0, 60);
}

function cleanUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export async function createStaff({ surname, name, username, password }) {
  const login = cleanUsername(username);
  if (!/^[a-z0-9._-]{3,32}$/.test(login)) {
    const error = new Error("Login 3–32 ta belgi: harf, raqam, nuqta");
    error.status = 400;
    throw error;
  }
  if (String(password || "").length < 4) {
    const error = new Error("Parol kamida 4 ta belgi bo‘lishi kerak");
    error.status = 400;
    throw error;
  }
  const personName = cleanPerson(name);
  const personSurname = cleanPerson(surname);
  if (!personName || !personSurname) {
    const error = new Error("Ism va familiya kerak");
    error.status = 400;
    throw error;
  }
  const taken = await Staff.findOne({ ownerToken: ownerToken(), username: login });
  if (taken) {
    const error = new Error("Bu login band");
    error.status = 409;
    throw error;
  }
  const created = await Staff.create({
    ownerToken: ownerToken(),
    username: login,
    passwordHash: await hashPassword(password),
    surname: personSurname,
    name: personName,
    role: "staff",
  });
  return publicStaff(created);
}

export async function updateStaff(id, input) {
  if (!mongoose.isValidObjectId(id)) return null;
  const doc = await Staff.findOne({ _id: id, ownerToken: ownerToken() });
  if (!doc) return null;
  const personName = cleanPerson(input.name);
  const personSurname = cleanPerson(input.surname);
  if (!personName || !personSurname) {
    const error = new Error("Ism va familiya kerak");
    error.status = 400;
    throw error;
  }
  const login = cleanUsername(input.username);
  if (!/^[a-z0-9._-]{3,32}$/.test(login)) {
    const error = new Error("Login 3–32 ta belgi: harf, raqam, nuqta");
    error.status = 400;
    throw error;
  }
  const taken = await Staff.findOne({ ownerToken: ownerToken(), username: login, _id: { $ne: doc._id } });
  if (taken) {
    const error = new Error("Bu login band");
    error.status = 409;
    throw error;
  }
  doc.surname = personSurname;
  doc.name = personName;
  doc.username = login;
  if (input.password) {
    if (String(input.password).length < 4) {
      const error = new Error("Parol kamida 4 ta belgi bo‘lishi kerak");
      error.status = 400;
      throw error;
    }
    doc.passwordHash = await hashPassword(input.password);
  }
  await doc.save();
  return publicStaff(doc);
}

export async function deleteStaff(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const doc = await Staff.findOne({ _id: id, ownerToken: ownerToken() });
  if (!doc || doc.role === "admin") return null;
  await doc.deleteOne();
  return publicStaff(doc);
}

export async function connectDb(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}

export async function createUser({ userId, jobsTitle }) {
  return User.create({
    ownerToken: ownerToken(),
    userId: String(userId),
    jobsTitle,
  });
}

export async function getUserById(userId) {
  return User.findOne({
    ownerToken: ownerToken(),
    userId: String(userId),
  }).lean();
}

export async function addJobToUser(userId, newJob) {
  const user = await getUserById(userId);
  if (!user) return null;

  user.jobsTitle.push(newJob);

  await User.updateOne(
    { ownerToken: ownerToken(), userId: String(userId) },
    { jobsTitle: user.jobsTitle },
  );

  return user;
}

async function downloadTelegramFile(fileId) {
  const token = process.env.BOT_TOKEN;
  const metaRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
  );
  const meta = await metaRes.json();
  if (!meta.ok || !meta.result?.file_path) {
    throw new Error(meta.description || "Telegram faylini ololmadi");
  }

  const fileRes = await fetch(
    `https://api.telegram.org/file/bot${token}/${meta.result.file_path}`,
  );
  if (!fileRes.ok) {
    throw new Error("Telegram rasmi yuklanmadi");
  }

  const path = meta.result.file_path.toLowerCase();
  let contentType = "image/jpeg";
  if (path.endsWith(".png")) contentType = "image/png";
  if (path.endsWith(".webp")) contentType = "image/webp";

  return {
    data: Buffer.from(await fileRes.arrayBuffer()),
    contentType,
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assignContractNumbers() {
  const rows = await Application.find({ ownerToken: ownerToken() })
    .select("contractNumber")
    .sort({ createdAt: 1 })
    .lean();
  const used = new Set();
  for (const row of rows) {
    const current = String(row.contractNumber || "").trim();
    const key = current.toLowerCase();
    if (current && !used.has(key)) {
      used.add(key);
      continue;
    }
    const contractNumber = await nextContractNumber();
    await Application.updateOne({ _id: row._id }, { $set: { contractNumber } });
    used.add(contractNumber.toLowerCase());
  }
}

export async function listApplications({ q, position, archived } = {}) {
  await assignContractNumbers();
  const filter = {
    ownerToken: ownerToken(),
    archived: archived ? true : { $ne: true },
  };

  if (position) {
    filter.position = position;
  }

  const query = String(q || "").trim();
  if (query) {
    const pattern = new RegExp(escapeRegex(query), "i");
    filter.$or = [
      { fullName: pattern },
      { phone: pattern },
      { parentPhone: pattern },
      { position: pattern },
      { username: pattern },
      { address: pattern },
    ];
  }

  return Application.find(filter)
    .select(withoutFiles)
    .sort({ createdAt: -1 })
    .lean();
}

export async function getApplicationById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  await assignContractNumbers();

  return Application.findOne({
    _id: id,
    ownerToken: ownerToken(),
  })
    .select(withoutFiles)
    .lean();
}

export async function getApplicationPhoto(id) {
  if (!mongoose.isValidObjectId(id)) return null;

  const doc = await Application.findOne({
    _id: id,
    ownerToken: ownerToken(),
  })
    .select("photo hasPhoto")
    .lean();

  if (!doc?.hasPhoto || !doc.photo?.data) return null;
  const raw = doc.photo.data;
  const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw.buffer || raw);
  if (!data.length) return null;
  return { data, contentType: doc.photo.contentType };
}

function fileBuffer(raw) {
  const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw?.buffer || raw || []);
  return data.length ? data : null;
}

export async function getApplicationFile(id, slot) {
  const meta = DOC_SLOTS[slot];
  if (!meta || !mongoose.isValidObjectId(id)) return null;
  const doc = await Application.findOne({ _id: id, ownerToken: ownerToken() })
    .select(`${slot} ${meta.flag}`)
    .lean();
  if (!doc?.[meta.flag] || !doc[slot]?.data) return null;
  const data = fileBuffer(doc[slot].data);
  if (!data) return null;
  return { data, contentType: doc[slot].contentType || "application/octet-stream" };
}

export async function saveApplicationFile(id, slot, file) {
  const meta = DOC_SLOTS[slot];
  if (!meta || !mongoose.isValidObjectId(id)) return null;
  return Application.findOneAndUpdate(
    { _id: id, ownerToken: ownerToken() },
    {
      $set: {
        [slot]: { data: file.data, contentType: file.contentType },
        [meta.flag]: true,
        [meta.typeField]: file.contentType,
        [meta.nameField]: String(file.fileName || "").slice(0, 120),
      },
    },
    { new: true },
  )
    .select(`fullName ${meta.flag} ${meta.typeField} ${meta.nameField}`)
    .lean();
}

export async function clearApplicationFile(id, slot) {
  const meta = DOC_SLOTS[slot];
  if (!meta || !mongoose.isValidObjectId(id)) return null;
  return Application.findOneAndUpdate(
    { _id: id, ownerToken: ownerToken() },
    {
      $unset: { [slot]: "" },
      $set: { [meta.flag]: false, [meta.typeField]: "", [meta.nameField]: "" },
    },
    { new: true },
  )
    .select(`fullName ${meta.flag} ${meta.typeField} ${meta.nameField}`)
    .lean();
}

function parseHiredAt(value) {
  const raw = String(value || "").trim().toLowerCase();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const months = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  const match = raw.match(/(\d{4})\s*-?\s*yil\s+(\d{1,2})\s*-?\s*([a-z'’ʻ]+)/);
  if (!match) return "";
  const index = months.findIndex((name) => match[3] === name || match[3].startsWith(name));
  if (index < 0) return "";
  const day = Number(match[2]);
  if (day < 1 || day > 31) return "";
  return `${match[1]}-${String(index + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function contractMonths(term) {
  const lower = String(term || "").trim().toLowerCase();
  if (!lower) return 0;
  const amount = (pattern) => {
    const hit = lower.match(pattern);
    return hit ? Number(hit[1].replace(",", ".")) : 0;
  };
  const years = amount(/(\d+(?:[.,]\d+)?)\s*yil/);
  let months = amount(/(\d+(?:[.,]\d+)?)\s*oy/);
  const days = amount(/(\d+)\s*kun/);
  if (!years && !months && !days) {
    const only = lower.match(/^(\d+(?:[.,]\d+)?)$/);
    if (!only) return 0;
    months = Number(only[1].replace(",", "."));
  }
  const total = Math.round(years * 12 + months + days / 30);
  if (!total) return 0;
  return Math.max(1, total);
}

function normalizeContractMonths(term) {
  const months = contractMonths(term);
  return months ? String(months) : "";
}

function addContractTerm(start, term) {
  const match = String(start || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  const months = contractMonths(term);
  if (!match || !months) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCMonth(date.getUTCMonth() + months);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export async function updateApplicationReview(id, input, actor) {
  if (!mongoose.isValidObjectId(id)) return null;

  const prev = await Application.findOne({ _id: id, ownerToken: ownerToken() }).select(withoutFiles);
  if (!prev) return null;

  const allowedStatus = new Set(["none", "expected", "arrived", "missed", "hired"]);
  let interviewStatus = allowedStatus.has(input.interviewStatus) ? input.interviewStatus : "none";
  if (input.interviewStatus === "called") interviewStatus = "expected";
  let score = null;
  if (input.score !== "" && input.score !== null && input.score !== undefined) {
    const num = Math.round(Number(input.score));
    if (!Number.isFinite(num) || num < 1 || num > 10) {
      const error = new Error("Ball 1 dan 10 gacha butun son bo'lishi kerak");
      error.status = 400;
      throw error;
    }
    score = num;
  }

  const note = String(input.note || "").slice(0, 2000);
  const interviewAt = String(input.interviewAt || "").slice(0, 40);
  const agreedSalary = String(input.agreedSalary || "").slice(0, 80);
  const salaryDigits = agreedSalary.replace(/\D/g, "");
  if (input.conducted && (score == null || !salaryDigits)) {
    const error = new Error("Ball va kelishilgan oylikni birga yozing");
    error.status = 400;
    throw error;
  }

  const previousStatus = prev.interviewStatus || "none";
  prev.interviewStatus = interviewStatus;
  prev.score = score;
  prev.note = note;
  prev.agreedSalary = agreedSalary;
  prev.expectedSalary = String(input.expectedSalary || "").slice(0, 80);
  prev.phone = String(input.phone || "").slice(0, 40);
  prev.parentPhone = String(input.parentPhone || "").slice(0, 40);
  prev.workHours = String(input.workHours || "").slice(0, 80);
  prev.workDuration = String(input.workDuration || "").slice(0, 200);
  prev.interviewAt = interviewAt;
  prev.workStart = String(input.workStart || "").slice(0, 40);
  prev.passportSeries = String(input.passportSeries || "").trim().toUpperCase().slice(0, 20);
  prev.jshshir = String(input.jshshir || "").replace(/\D/g, "").slice(0, 14);
  if ("contractNumber" in input) {
    const contractNumber = String(input.contractNumber || "").trim().slice(0, 40);
    if (contractNumber) {
      const taken = await Application.findOne({
        ownerToken: ownerToken(),
        _id: { $ne: prev._id },
        contractNumber: new RegExp(`^${contractNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      })
        .select("fullName")
        .lean();
      if (taken) {
        const error = new Error(`Bu shartnoma raqami ${taken.fullName || "boshqa ariza"}da bor`);
        error.status = 409;
        throw error;
      }
    }
    prev.contractNumber = contractNumber;
  }
  if ("contractKind" in input) {
    prev.contractKind = input.contractKind === "admin" ? "admin" : "teacher";
  }
  if ("hiredAt" in input) {
    prev.hiredAt = parseHiredAt(input.hiredAt);
  }
  if ("contractTerm" in input) {
    prev.contractTerm = normalizeContractMonths(input.contractTerm).slice(0, 80);
  }
  if ("contractEnd" in input) prev.contractEnd = String(input.contractEnd || "").slice(0, 10);
  const countedEnd = addContractTerm(prev.hiredAt, prev.contractTerm);
  if (countedEnd) prev.contractEnd = countedEnd;
  if ("department" in input) prev.department = String(input.department || "").trim().slice(0, 80);
  if ("probation" in input) prev.probation = String(input.probation || "").trim().slice(0, 40);
  if ("perStudentPay" in input) prev.perStudentPay = String(input.perStudentPay || "").trim().slice(0, 80);
  if ("passportIssued" in input) prev.passportIssued = String(input.passportIssued || "").trim().slice(0, 40);
  if ("passportIssuer" in input) prev.passportIssuer = String(input.passportIssuer || "").trim().slice(0, 80);
  if ("position" in input) prev.position = String(input.position || "").trim().slice(0, 120);
  if ("fullName" in input) prev.fullName = String(input.fullName || "").trim().slice(0, 200);
  if ("fatherName" in input) prev.fatherName = String(input.fatherName || "").trim().slice(0, 80);
  if ("address" in input) prev.address = String(input.address || "").trim().slice(0, 400);
  if ("birthday" in input) prev.birthday = String(input.birthday || "").trim().slice(0, 20);

  if (input.conducted && actor && score != null && salaryDigits) {
    prev.interviewerId = String(actor.id || "");
    prev.interviewerName = personMark(actor.surname, actor.name);
  }

  if (actor && interviewStatus === "expected" && previousStatus !== "expected") {
    prev.callerId = String(actor.id || "");
    prev.callerName = personMark(actor.surname, actor.name);
  }

  await prev.save();
  const item = prev.toObject();
  delete item.photo;
  delete item.passportFront;
  delete item.passportBack;
  delete item.diploma;
  delete item.certificate;
  return item;
}

export async function setApplicationFavorite(id, favorite) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Application.findOneAndUpdate(
    { _id: id, ownerToken: ownerToken() },
    { favorite: Boolean(favorite) },
    { new: true },
  )
    .select(withoutFiles)
    .lean();
}

export async function deleteApplication(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Application.findOneAndUpdate(
    { _id: id, ownerToken: ownerToken(), archived: { $ne: true } },
    { archived: true, archivedAt: new Date() },
    { new: true },
  ).select("_id fullName position");
}

export async function restoreApplication(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Application.findOneAndUpdate(
    { _id: id, ownerToken: ownerToken(), archived: true },
    { archived: false, archivedAt: null },
    { new: true },
  )
    .select(withoutFiles)
    .lean();
}

async function nextContractNumber() {
  const year = new Date().getFullYear();
  const rows = await Application.find({ ownerToken: ownerToken() }).select("contractNumber").lean();
  let max = 0;
  for (const row of rows) {
    const match = String(row.contractNumber || "").match(/^(\d+)/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${String(max + 1).padStart(2, "0")}/${year}`;
}

export async function saveApplication({ telegramUserId, username, answers }) {
  const doc = {
    ownerToken: ownerToken(),
    telegramUserId: String(telegramUserId),
    username: username || "",
  };

  for (const field of answerFields) {
    doc[field] = answers[field] ? String(answers[field]) : "";
  }

  doc.contractNumber = await nextContractNumber();

  if (answers.photo) {
    try {
      doc.photo = await downloadTelegramFile(answers.photo);
      doc.hasPhoto = true;
    } catch (error) {
      console.error("Rasm saqlanmadi:", error.message);
    }
  }

  return Application.create(doc);
}

const importStatuses = {
  chaqirilmagan: "none",
  chaqirildi: "expected",
  keldi: "arrived",
  kelmagan: "missed",
  "ishga kirgan": "hired",
  none: "none",
  expected: "expected",
  arrived: "arrived",
  missed: "missed",
  hired: "hired",
};

export async function importApplications(rows) {
  let added = 0;
  let skipped = 0;
  for (const row of rows.slice(0, 2000)) {
    const fullName = String(row.fullName || "").trim().slice(0, 200);
    const phone = String(row.phone || "").trim().slice(0, 40);
    const position = String(row.position || "").trim().slice(0, 120);
    if (!fullName && !phone) {
      skipped += 1;
      continue;
    }
    const telegramUserId = String(row.telegramUserId || "").trim().slice(0, 40);
    const duplicate = await Application.findOne({
      ownerToken: ownerToken(),
      archived: { $ne: true },
      fullName,
      phone,
      position,
      ...(telegramUserId ? { telegramUserId } : {}),
    }).select("_id");
    if (duplicate) {
      skipped += 1;
      continue;
    }
    const statusKey = String(row.interviewStatus || "").trim().toLowerCase();
    const scoreNum = Math.round(Number(String(row.score || "").replace(/\/.*$/, "").trim()));
    const doc = {
      ownerToken: ownerToken(),
      telegramUserId: telegramUserId || `import-${Date.now()}-${added}`,
      username: String(row.username || "").replace(/^@/, "").slice(0, 80),
      interviewStatus: importStatuses[statusKey] || "none",
      score: Number.isFinite(scoreNum) && scoreNum >= 1 && scoreNum <= 10 ? scoreNum : null,
      note: String(row.note || "").slice(0, 2000),
      agreedSalary: String(row.agreedSalary || "").slice(0, 80),
      interviewAt: String(row.interviewAt || "").slice(0, 40),
      callerName: String(row.callerName || "").slice(0, 80),
      interviewerName: String(row.interviewerName || "").slice(0, 80),
      hasPhoto: false,
      passportSeries: String(row.passportSeries || "").trim().toUpperCase().slice(0, 20),
      jshshir: String(row.jshshir || "").replace(/\D/g, "").slice(0, 14),
    };
    for (const field of answerFields) {
      doc[field] = String(row[field] || "").slice(0, 500);
    }
    doc.fullName = fullName;
    doc.phone = phone;
    doc.position = position;
    doc.contractNumber = String(row.contractNumber || "").trim().slice(0, 40) || (await nextContractNumber());
    await Application.create(doc);
    added += 1;
  }
  return { added, skipped };
}
