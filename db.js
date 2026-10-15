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
    interviewerId: { type: String, default: "" },
    interviewerName: { type: String, default: "" },
    callerId: { type: String, default: "" },
    callerName: { type: String, default: "" },
    favorite: { type: Boolean, default: false },
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

export async function listApplications({ q, position } = {}) {
  const filter = { ownerToken: ownerToken() };

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
    .select("-photo")
    .sort({ createdAt: -1 })
    .lean();
}

export async function getApplicationById(id) {
  if (!mongoose.isValidObjectId(id)) return null;

  return Application.findOne({
    _id: id,
    ownerToken: ownerToken(),
  })
    .select("-photo")
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

export async function updateApplicationReview(id, input, actor) {
  if (!mongoose.isValidObjectId(id)) return null;

  const prev = await Application.findOne({ _id: id, ownerToken: ownerToken() }).select("-photo");
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
  prev.interviewAt = interviewAt;
  prev.workStart = String(input.workStart || "").slice(0, 40);

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
  return item;
}

export async function setApplicationFavorite(id, favorite) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Application.findOneAndUpdate(
    { _id: id, ownerToken: ownerToken() },
    { favorite: Boolean(favorite) },
    { new: true },
  )
    .select("-photo")
    .lean();
}

export async function deleteApplication(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Application.findOneAndDelete({
    _id: id,
    ownerToken: ownerToken(),
  }).select("_id");
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
    };
    for (const field of answerFields) {
      doc[field] = String(row[field] || "").slice(0, 500);
    }
    doc.fullName = fullName;
    doc.phone = phone;
    doc.position = position;
    await Application.create(doc);
    added += 1;
  }
  return { added, skipped };
}
