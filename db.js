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
    // Pedagogik suhbat (20 savol × 0–5 ball). assessmentScore — jami 0–100
    assessment: { type: mongoose.Schema.Types.Mixed, default: null },
    assessmentScore: { type: Number, default: null },
    note: { type: String, default: "" },
    // Izohlar tarixi: har biri alohida — kim, qachon yozgan
    notes: {
      type: [
        {
          text: { type: String, default: "" },
          at: { type: Date, default: Date.now },
          byId: { type: String, default: "" },
          byName: { type: String, default: "" },
        },
      ],
      default: [],
    },
    agreedSalary: { type: String, default: "" },
    // metafor (CRM) ga o‘tkazilgani: o‘qituvchi yoki xodim kartasi
    crmTransfer: {
      kind: { type: String, default: "" },
      id: { type: String, default: "" },
      path: { type: String, default: "" },
      at: { type: Date, default: null },
      byName: { type: String, default: "" },
    },
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
    diplomaAppendix: { data: Buffer, contentType: { type: String, default: "" } },
    certificate: { data: Buffer, contentType: { type: String, default: "" } },
    signedContract: { data: Buffer, contentType: { type: String, default: "" } },
    hasPassportFront: { type: Boolean, default: false },
    hasPassportBack: { type: Boolean, default: false },
    hasDiploma: { type: Boolean, default: false },
    hasDiplomaAppendix: { type: Boolean, default: false },
    hasCertificate: { type: Boolean, default: false },
    hasSignedContract: { type: Boolean, default: false },
    passportFrontType: { type: String, default: "" },
    passportBackType: { type: String, default: "" },
    diplomaType: { type: String, default: "" },
    diplomaAppendixType: { type: String, default: "" },
    certificateType: { type: String, default: "" },
    signedContractType: { type: String, default: "" },
    passportFrontName: { type: String, default: "" },
    passportBackName: { type: String, default: "" },
    diplomaName: { type: String, default: "" },
    diplomaAppendixName: { type: String, default: "" },
    certificateName: { type: String, default: "" },
    signedContractName: { type: String, default: "" },
    interviewerId: { type: String, default: "" },
    interviewerName: { type: String, default: "" },
    callerId: { type: String, default: "" },
    callerName: { type: String, default: "" },
    favorite: { type: Boolean, default: false },
    // Panelda birinchi marta ochilgan vaqt. Bo'sh bo'lsa ariza "Yangi" (ochilmagan) hisoblanadi
    seenAt: { type: Date, default: null },
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    hasPhoto: { type: Boolean, default: false },
    photoFileId: { type: String, default: "" },
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
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
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

// O'quvchilar shartnomasi — bot orqali o'quvchi yuborgan hujjatlar va pasport ma'lumotlari
const studentFile = { data: Buffer, contentType: { type: String, default: "" } };
const studentContractSchema = new mongoose.Schema(
  {
    ownerToken: { type: String, required: true, index: true },
    telegramUserId: { type: String, default: "" },
    username: { type: String, default: "" },
    fullName: { type: String, default: "" },
    birthday: { type: String, default: "" },
    course: { type: String, default: "" },
    passportSeries: { type: String, default: "" },
    passportIssued: { type: String, default: "" },
    passportIssuer: { type: String, default: "" },
    jshshir: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    // Kirill shartnoma uchun qo‘lda tuzatilgan ism/manzil (bo‘sh bo‘lsa avtomatik o‘giriladi)
    fullNameCyr: { type: String, default: "" },
    addressCyr: { type: String, default: "" },
    // Ism/manzilni shartnoma yozuviga (kirill/lotin) avtomatik o‘girish — panelda yoqib/o‘chiriladi
    transliterate: { type: Boolean, default: true },
    // Shartnoma qaysi hujjat bilan: id (ID karta) | passport | birth (tug'ilganlik guvohnomasi)
    docType: { type: String, default: "" },
    note: { type: String, default: "" },
    email: { type: String, default: "" },
    // Shartnoma (panelda to‘ldiriladi)
    contractNumber: { type: String, default: "" },
    contractDate: { type: String, default: "" },
    contractCourse: { type: String, default: "" },
    contractMonths: { type: String, default: "" },
    contractPrice: { type: String, default: "" },
    contractTemplateId: { type: String, default: "" },
    courseId: { type: String, default: "" },
    seenAt: { type: Date, default: null },
    passportFront: studentFile,
    passportBack: studentFile,
    birthCertificate: studentFile,
    hasPassportFront: { type: Boolean, default: false },
    hasPassportBack: { type: Boolean, default: false },
    hasBirthCertificate: { type: Boolean, default: false },
    passportFrontType: { type: String, default: "" },
    passportBackType: { type: String, default: "" },
    birthCertificateType: { type: String, default: "" },
    passportFrontName: { type: String, default: "" },
    passportBackName: { type: String, default: "" },
    birthCertificateName: { type: String, default: "" },
  },
  { collection: "student_contracts", timestamps: true },
);
studentContractSchema.index({ ownerToken: 1, createdAt: -1 });
const StudentContract =
  mongoose.models.StudentContract || mongoose.model("StudentContract", studentContractSchema);

// O‘quvchilar kurslari: botda tugma bo‘lib chiqadi, narxi va muddati shartnomaga tushadi
const studentCourseSchema = new mongoose.Schema(
  {
    ownerToken: { type: String, required: true, index: true },
    name: { type: String, default: "" },
    contractName: { type: String, default: "" },
    months: { type: String, default: "" },
    price: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { collection: "student_courses", timestamps: true },
);
const StudentCourse = mongoose.models.StudentCourse || mongoose.model("StudentCourse", studentCourseSchema);

// Shartnoma shablonlari — panelga yuklangan Word (.docx) fayllar
const contractTemplateSchema = new mongoose.Schema(
  {
    ownerToken: { type: String, required: true, index: true },
    name: { type: String, default: "" },
    fileName: { type: String, default: "" },
    tags: { type: [String], default: [] },
    unknownTags: { type: [String], default: [] },
    size: { type: Number, default: 0 },
    data: Buffer,
    createdBy: { type: String, default: "" },
  },
  { collection: "contract_templates", timestamps: true },
);
const ContractTemplate =
  mongoose.models.ContractTemplate || mongoose.model("ContractTemplate", contractTemplateSchema);

const User = mongoose.models.ApplicantUser || mongoose.model("ApplicantUser", userSchema);
const Staff = mongoose.models.StaffUser || mongoose.model("StaffUser", staffSchema);
const Activity = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activitySchema);
// Ro'yxat har doim shu tartibda so'raladi: egasi, arxiv, eng yangisi birinchi
applicationSchema.index({ ownerToken: 1, archived: 1, createdAt: -1 });

const Application =
  mongoose.models.Application || mongoose.model("Application", applicationSchema);

const withoutFiles =
  "-photo -passportFront -passportBack -diploma -diplomaAppendix -certificate -signedContract";

export const DOC_SLOTS = {
  passportFront: { flag: "hasPassportFront", typeField: "passportFrontType", nameField: "passportFrontName", label: "Pasport oldi" },
  passportBack: { flag: "hasPassportBack", typeField: "passportBackType", nameField: "passportBackName", label: "Pasport orqasi" },
  diploma: { flag: "hasDiploma", typeField: "diplomaType", nameField: "diplomaName", label: "Diplom" },
  diplomaAppendix: { flag: "hasDiplomaAppendix", typeField: "diplomaAppendixType", nameField: "diplomaAppendixName", label: "Diplom ilovasi" },
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

function flag(value) {
  return value === true || value === "true" || value === "1" || value === "on";
}

function publicStaff(doc) {
  const admin = doc.role === "admin";
  return {
    id: String(doc._id),
    username: doc.username,
    surname: doc.surname || "",
    name: doc.name || "",
    role: admin ? "admin" : "staff",
    canEdit: admin || Boolean(doc.canEdit),
    canDelete: admin || Boolean(doc.canDelete),
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

// CRM (metafor.uz) dagi CEO uchun panel hisobi: parolsiz (SSO) kiradi, oddiy login bilan kirib bo‘lmaydi
export const SSO_CEO_USERNAME = "crm-ceo";

export async function ensureSsoCeo({ name } = {}) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const surname = parts[0] || "CEO";
  const first = parts.slice(1).join(" ") || "(CRM)";
  let doc = await Staff.findOne({ ownerToken: ownerToken(), username: SSO_CEO_USERNAME });
  if (!doc) {
    doc = await Staff.create({
      ownerToken: ownerToken(),
      username: SSO_CEO_USERNAME,
      // Hech kim bilmaydigan tasodifiy parol — bu hisobga faqat CRM orqali kiriladi
      passwordHash: await hashPassword(randomBytes(32).toString("hex")),
      surname,
      name: first,
      role: "admin",
    });
  } else if (doc.role !== "admin" || doc.surname !== surname || doc.name !== first) {
    doc.role = "admin";
    doc.surname = surname;
    doc.name = first;
    await doc.save();
  }
  return publicStaff(doc);
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

export async function createStaff({ surname, name, username, password, role, canEdit, canDelete }) {
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
    role: role === "admin" ? "admin" : "staff",
    canEdit: flag(canEdit),
    canDelete: flag(canDelete),
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
  const role = input.role === "admin" ? "admin" : "staff";
  if (doc.role === "admin" && role !== "admin") {
    const admins = await Staff.countDocuments({ ownerToken: ownerToken(), role: "admin" });
    if (admins <= 1) {
      const error = new Error("Oxirgi admin rolini o‘zgartirib bo‘lmaydi");
      error.status = 400;
      throw error;
    }
  }
  doc.surname = personSurname;
  doc.name = personName;
  doc.username = login;
  doc.role = role;
  doc.canEdit = flag(input.canEdit);
  doc.canDelete = flag(input.canDelete);
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

// ---------------------------------------------------------------------------
// Brend: panel tepasidagi nom va logo (admin o'zgartiradi). app_meta kolleksiyasida saqlanadi.
// ---------------------------------------------------------------------------
export const DEFAULT_BRAND_NAME = "Qabul paneli";
const BRAND_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function brandingId() {
  return `branding:${ownerToken()}`;
}

function brandingCollection() {
  return mongoose.connection.collection("app_meta");
}

export async function getBranding() {
  const doc = await brandingCollection().findOne({ _id: brandingId() }, { projection: { "logo.data": 0 } });
  return {
    name: String(doc?.name || "").trim() || DEFAULT_BRAND_NAME,
    hasLogo: Boolean(doc?.logo?.contentType),
    updatedAt: doc?.updatedAt || null,
  };
}

export async function setBrandName(name) {
  const clean = String(name || "").replace(/\s+/g, " ").trim().slice(0, 40);
  await brandingCollection().updateOne(
    { _id: brandingId() },
    { $set: { name: clean, updatedAt: new Date() } },
    { upsert: true },
  );
  return getBranding();
}

export async function setBrandLogo({ data, contentType }) {
  if (!BRAND_LOGO_TYPES.has(contentType)) {
    const error = new Error("Logo faqat PNG, JPG yoki WEBP bo‘lishi kerak");
    error.status = 400;
    throw error;
  }
  if (!data?.length) {
    const error = new Error("Logo fayli bo‘sh");
    error.status = 400;
    throw error;
  }
  if (data.length > 2 * 1024 * 1024) {
    const error = new Error("Logo 2 MB dan katta bo‘lmasin");
    error.status = 400;
    throw error;
  }
  await brandingCollection().updateOne(
    { _id: brandingId() },
    { $set: { logo: { data, contentType }, updatedAt: new Date() } },
    { upsert: true },
  );
  return getBranding();
}

export async function clearBrandLogo() {
  await brandingCollection().updateOne(
    { _id: brandingId() },
    { $unset: { logo: "" }, $set: { updatedAt: new Date() } },
    { upsert: true },
  );
  return getBranding();
}

export async function getBrandLogo() {
  const doc = await brandingCollection().findOne({ _id: brandingId() }, { projection: { logo: 1 } });
  if (!doc?.logo?.data) return null;
  const raw = doc.logo.data;
  const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw.buffer || raw);
  return { data, contentType: doc.logo.contentType };
}

export async function connectDb(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await markExistingApplicationsSeen();
  ensureContractNumbers();
}

async function markExistingApplicationsSeen() {
  const meta = mongoose.connection.collection("app_meta");
  const flag = await meta.findOne({ _id: "seen-backfill" });
  if (flag) return;
  const cutoff = new Date("2026-10-15T19:00:00.000Z");
  await Application.updateMany(
    { seenAt: { $exists: false }, createdAt: { $lt: cutoff } },
    { $set: { seenAt: cutoff } },
  );
  await meta.insertOne({ _id: "seen-backfill", at: new Date() });
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
  if (path.endsWith(".pdf")) contentType = "application/pdf";

  return {
    data: Buffer.from(await fileRes.arrayBuffer()),
    contentType,
  };
}

async function downloadTelegramFileWithRetry(fileId) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await downloadTelegramFile(fileId);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

function storedPhoto(doc) {
  if (!doc?.photo?.data) return null;
  const raw = doc.photo.data;
  const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw.buffer || raw);
  if (!data.length) return null;
  return { data, contentType: doc.photo.contentType || "image/jpeg" };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Shartnoma raqamlarini tekshirish barcha arizalarni ko'rib chiqadi (~0,5 s).
// Avval har bir ro'yxat va har bir ariza ochilganda ishlardi — panel sekinlashardi.
// Endi faqat server ishga tushganda va importdan keyin bir marta ishlaydi;
// yangi arizalar raqamni saqlanayotganda oladi, tahrirda raqam takrorlanishi tekshiriladi.
let contractNumbersReady = null;
function ensureContractNumbers() {
  if (!contractNumbersReady) {
    contractNumbersReady = assignContractNumbers().catch((error) => {
      contractNumbersReady = null;
      console.error("Shartnoma raqamlari tekshirilmadi:", error.message);
    });
  }
  return contractNumbersReady;
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
  await ensureContractNumbers();
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

export async function markApplicationSeen(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Application.findOneAndUpdate(
    {
      _id: id,
      ownerToken: ownerToken(),
      $or: [{ seenAt: null }, { seenAt: { $exists: false } }],
    },
    { $set: { seenAt: new Date() } },
    { new: true },
  )
    .select("seenAt")
    .lean();
}

export async function getApplicationById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  await ensureContractNumbers();

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
    .select("photo hasPhoto photoFileId")
    .lean();

  const stored = storedPhoto(doc);
  if (stored) return stored;
  if (!doc?.photoFileId) return null;

  try {
    const file = await downloadTelegramFileWithRetry(doc.photoFileId);
    await Application.updateOne(
      { _id: id, ownerToken: ownerToken() },
      { photo: file, hasPhoto: true },
    );
    return file;
  } catch (error) {
    console.error("Rasm qayta yuklanmadi:", error.message);
    return null;
  }
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

  // "missed" (Kelmagan) eski yozuvlar uchun qoldirilgan — panelda endi tanlanmaydi
  const allowedStatus = new Set(["none", "expected", "arrived", "missed", "hired", "started", "left", "declined"]);
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
  // Izohlar endi alohida yo‘l bilan (/notes) yoziladi — bu yerda eski izohga tegilmaydi
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
  delete item.diplomaAppendix;
  delete item.certificate;
  delete item.signedContract;
  return item;
}

export const ASSESSMENT_COUNT = 20;
const ASSESSMENT_MAX = 5;

// Ballni serverning o'zi hisoblaydi — brauzerdan kelgan jami ballga ishonilmaydi
export async function saveAssessment(id, input, actor) {
  if (!mongoose.isValidObjectId(id)) return null;
  const rawAnswers = Array.isArray(input?.answers) ? input.answers : [];
  const rawNotes = Array.isArray(input?.notes) ? input.notes : [];
  const answers = Array.from({ length: ASSESSMENT_COUNT }, (_, index) => {
    const value = rawAnswers[index];
    if (value === null || value === undefined || value === "") return null;
    const num = Math.round(Number(value));
    if (!Number.isFinite(num) || num < 0 || num > ASSESSMENT_MAX) {
      const error = new Error(`${index + 1}-savol bahosi 0 dan ${ASSESSMENT_MAX} gacha bo'lishi kerak`);
      error.status = 400;
      throw error;
    }
    return num;
  });
  const notes = Array.from({ length: ASSESSMENT_COUNT }, (_, index) =>
    String(rawNotes[index] || "").trim().slice(0, 300),
  );
  const answered = answers.filter((value) => value !== null).length;
  const total = answers.reduce((sum, value) => sum + (value || 0), 0);

  // Qo'lda kiritilgan ball (0–100) bo'lsa, u savollar yig'indisidan ustun turadi
  let manualScore = null;
  const rawManual = input?.manualScore;
  if (rawManual !== null && rawManual !== undefined && rawManual !== "") {
    const num = Math.round(Number(rawManual));
    if (!Number.isFinite(num) || num < 0 || num > ASSESSMENT_COUNT * ASSESSMENT_MAX) {
      const error = new Error(`Qo'lda ball 0 dan ${ASSESSMENT_COUNT * ASSESSMENT_MAX} gacha bo'lishi kerak`);
      error.status = 400;
      throw error;
    }
    manualScore = num;
  }
  // Savollar to'plami: o'qituvchi, administrator yoki menejer
  const kind = ["teacher", "admin", "manager"].includes(input?.kind) ? input.kind : "teacher";

  const set = {
    assessment: {
      version: Number(input?.version) || 1,
      kind,
      answers,
      notes,
      answered,
      total,
      manualScore,
      byId: String(actor?.id || ""),
      byName: personMark(actor?.surname, actor?.name),
      at: new Date(),
    },
    assessmentScore: manualScore ?? (answered ? total : null),
  };
  // Baholagan hodim suhbat o'tkazuvchi sifatida yoziladi
  if ((answered || manualScore !== null) && actor) {
    set.interviewerId = String(actor.id || "");
    set.interviewerName = personMark(actor.surname, actor.name);
  }
  return Application.findOneAndUpdate(
    { _id: id, ownerToken: ownerToken() },
    { $set: set },
    { new: true },
  )
    .select(withoutFiles)
    .lean();
}

function actorName(actor) {
  return [actor?.surname, actor?.name].filter(Boolean).join(" ") || actor?.username || "Noma’lum";
}

export async function addApplicationNote(id, text, actor) {
  if (!mongoose.isValidObjectId(id)) return null;
  const clean = String(text || "").replace(/\r\n/g, "\n").trim().slice(0, 2000);
  if (!clean) {
    const error = new Error("Izoh bo‘sh");
    error.status = 400;
    throw error;
  }
  return Application.findOneAndUpdate(
    { _id: id, ownerToken: ownerToken() },
    { $push: { notes: { text: clean, at: new Date(), byId: String(actor?.id || ""), byName: actorName(actor) } } },
    { new: true },
  )
    .select("fullName notes note")
    .lean();
}

export async function deleteApplicationNote(id, noteId, actor) {
  if (!mongoose.isValidObjectId(id)) return null;
  // Eski (bitta matnli) izoh — faqat admin o‘chiradi
  if (noteId === "legacy") {
    if (actor?.role !== "admin") {
      const error = new Error("Eski izohni faqat admin o‘chira oladi");
      error.status = 403;
      throw error;
    }
    const before = await Application.findOne({ _id: id, ownerToken: ownerToken() }).select("note").lean();
    if (!before?.note) return null;
    const updated = await Application.findOneAndUpdate(
      { _id: id, ownerToken: ownerToken() },
      { $set: { note: "" } },
      { new: true },
    )
      .select("fullName notes note")
      .lean();
    return { item: updated, removed: { text: before.note } };
  }
  if (!mongoose.isValidObjectId(noteId)) return null;
  const doc = await Application.findOne({ _id: id, ownerToken: ownerToken() }).select("fullName notes note").lean();
  const target = doc?.notes?.find((entry) => String(entry._id) === String(noteId));
  if (!target) return null;
  if (actor?.role !== "admin" && target.byId !== String(actor?.id || "")) {
    const error = new Error("Faqat o‘zingiz yozgan izohni o‘chira olasiz");
    error.status = 403;
    throw error;
  }
  const updated = await Application.findOneAndUpdate(
    { _id: id, ownerToken: ownerToken() },
    { $pull: { notes: { _id: noteId } } },
    { new: true },
  )
    .select("fullName notes note")
    .lean();
  return { item: updated, removed: target };
}

export async function getApplicationForCrm(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Application.findOne({ _id: id, ownerToken: ownerToken() }).select(withoutFiles).lean();
}

export async function setCrmTransfer(id, transfer) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Application.findOneAndUpdate(
    { _id: id, ownerToken: ownerToken() },
    { $set: { crmTransfer: transfer } },
    { new: true },
  )
    .select("fullName crmTransfer")
    .lean();
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
  const purged = await Application.findOneAndDelete({
    _id: id,
    ownerToken: ownerToken(),
    archived: true,
  })
    .select("_id fullName position")
    .lean();
  if (purged) return { ...purged, purged: true };

  const archived = await Application.findOneAndUpdate(
    { _id: id, ownerToken: ownerToken(), archived: { $ne: true } },
    { archived: true, archivedAt: new Date() },
    { new: true },
  )
    .select("_id fullName position")
    .lean();
  if (!archived) return null;
  return { ...archived, purged: false };
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
    doc.photoFileId = String(answers.photo);
    try {
      doc.photo = await downloadTelegramFileWithRetry(answers.photo);
      doc.hasPhoto = true;
    } catch (error) {
      console.error("Rasm saqlanmadi:", error.message);
      doc.hasPhoto = true;
    }
  }

  return Application.create(doc);
}

// Botdagi "📄 Shartnoma qilish" orqali kelgan hujjatlar va pasport ma'lumotlari.
// Xodimning eng oxirgi (arxivlanmagan) arizasiga yoziladi; arizasi bo'lmasa yangisi ochiladi.
const CONTRACT_FILE_SLOTS = ["passportFront", "passportBack", "diploma", "diplomaAppendix", "certificate"];

export async function saveContractSubmission({ telegramUserId, username, answers }) {
  const parts = String(answers.fullName || "").trim().split(/\s+/).filter(Boolean);
  const set = {
    fullName: parts.join(" ").slice(0, 200),
    fatherName: parts.slice(2).join(" ").slice(0, 120),
    birthday: String(answers.birthday || "").slice(0, 20),
    passportSeries: String(answers.passportSeries || "").slice(0, 20),
    passportIssued: String(answers.passportIssued || "").slice(0, 20),
    passportIssuer: String(answers.passportIssuer || "").slice(0, 120),
    jshshir: String(answers.jshshir || "").replace(/\D/g, "").slice(0, 14),
    address: String(answers.address || "").slice(0, 300),
    phone: String(answers.phone || "").slice(0, 40),
  };
  if (username) set.username = username;

  for (const slot of CONTRACT_FILE_SLOTS) {
    const file = answers[slot];
    if (!file?.fileId) continue;
    const meta = DOC_SLOTS[slot];
    const downloaded = await downloadTelegramFileWithRetry(file.fileId);
    const contentType = file.kind === "pdf" ? "application/pdf" : downloaded.contentType;
    const ext = contentType === "application/pdf" ? "pdf" : contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    set[slot] = { data: downloaded.data, contentType };
    set[meta.flag] = true;
    set[meta.typeField] = contentType;
    set[meta.nameField] = String(file.fileName || `${meta.label}.${ext}`).slice(0, 120);
  }

  const existing = await Application.findOne({
    ownerToken: ownerToken(),
    telegramUserId: String(telegramUserId),
    archived: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .select("_id")
    .lean();

  if (existing) {
    await Application.updateOne({ _id: existing._id }, { $set: set });
    return { id: String(existing._id), created: false };
  }

  const doc = await Application.create({
    ownerToken: ownerToken(),
    telegramUserId: String(telegramUserId),
    contractNumber: await nextContractNumber(),
    note: "Bot orqali shartnoma uchun ma'lumot yubordi (avval ariza topshirmagan).",
    ...set,
  });
  return { id: String(doc._id), created: true };
}

export const STUDENT_DOC_SLOTS = {
  passportFront: { flag: "hasPassportFront", typeField: "passportFrontType", nameField: "passportFrontName", label: "Pasport oldi" },
  passportBack: { flag: "hasPassportBack", typeField: "passportBackType", nameField: "passportBackName", label: "Pasport orqasi" },
  birthCertificate: { flag: "hasBirthCertificate", typeField: "birthCertificateType", nameField: "birthCertificateName", label: "Tug'ilganlik guvohnomasi" },
};
const studentWithoutFiles = "-passportFront -passportBack -birthCertificate";
const STUDENT_TEXT_FIELDS = {
  fullName: 200,
  birthday: 20,
  course: 80,
  passportSeries: 20,
  passportIssued: 20,
  passportIssuer: 120,
  jshshir: 14,
  address: 300,
  phone: 40,
  note: 2000,
  fullNameCyr: 200,
  addressCyr: 300,
  docType: 10,
  email: 120,
  contractNumber: 40,
  contractDate: 10,
  contractCourse: 120,
  contractMonths: 3,
  contractPrice: 15,
  contractTemplateId: 40,
  courseId: 40,
};

function studentText(input) {
  const out = {};
  for (const [key, max] of Object.entries(STUDENT_TEXT_FIELDS)) {
    if (input[key] === undefined) continue;
    let value = String(input[key] ?? "").replace(key === "note" ? /[^\S\n]+/g : /\s+/g, " ").trim();
    if (key === "jshshir") value = value.replace(/\D/g, "");
    if (key === "passportSeries") value = value.toUpperCase();
    if (key === "contractMonths" || key === "contractPrice") value = value.replace(/\D/g, "");
    if (key === "docType" && !["id", "passport", "birth", ""].includes(value)) value = "";
    if (key === "passportSeries" && /^[A-Z]{2}\d{7}$/.test(value.replace(/\s/g, ""))) value = value.replace(/\s/g, "");
    if (key === "contractDate" && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) value = "";
    out[key] = value.slice(0, max);
  }
  return out;
}

// O‘quvchi shartnomalari uchun alohida raqamlash: 1/2026, 2/2026, ...
async function nextStudentContractNumber() {
  const year = new Date().getFullYear();
  const rows = await StudentContract.find({ ownerToken: ownerToken(), contractNumber: new RegExp(`/${year}$`) })
    .select("contractNumber")
    .lean();
  let max = 0;
  for (const row of rows) {
    const match = String(row.contractNumber || "").match(/^(\d+)/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${max + 1}/${year}`;
}

function cleanCourse(input = {}) {
  const out = {};
  if (input.name !== undefined) {
    const name = String(input.name || "").replace(/\s+/g, " ").trim().slice(0, 80);
    out.name = name ? name.charAt(0).toLocaleUpperCase("uz") + name.slice(1) : name;
  }
  if (input.contractName !== undefined) out.contractName = String(input.contractName || "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (input.months !== undefined) out.months = String(input.months || "").replace(/\D/g, "").slice(0, 3);
  if (input.price !== undefined) out.price = String(input.price || "").replace(/\D/g, "").slice(0, 13);
  if (input.active !== undefined) out.active = Boolean(input.active);
  return out;
}

export async function listStudentCourses({ activeOnly = false } = {}) {
  const filter = { ownerToken: ownerToken() };
  if (activeOnly) filter.active = true;
  return StudentCourse.find(filter).sort({ name: 1 }).lean();
}

export async function createStudentCourse(input) {
  const data = cleanCourse(input);
  if (!data.name) {
    const error = new Error("Kurs nomini yozing");
    error.status = 400;
    throw error;
  }
  const dup = await StudentCourse.findOne({ ownerToken: ownerToken(), name: new RegExp(`^${escapeRegex(data.name)}$`, "i") }).lean();
  if (dup) {
    const error = new Error("Bu nomdagi kurs allaqachon bor");
    error.status = 409;
    throw error;
  }
  const doc = await StudentCourse.create({ ownerToken: ownerToken(), active: true, ...data });
  return doc.toObject();
}

export async function updateStudentCourse(id, input) {
  if (!mongoose.isValidObjectId(id)) return null;
  const data = cleanCourse(input);
  if (data.name === "") {
    const error = new Error("Kurs nomini yozing");
    error.status = 400;
    throw error;
  }
  return StudentCourse.findOneAndUpdate({ _id: id, ownerToken: ownerToken() }, { $set: data }, { new: true }).lean();
}

export async function deleteStudentCourse(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return StudentCourse.findOneAndDelete({ _id: id, ownerToken: ownerToken() }).lean();
}

export async function saveStudentContract({ telegramUserId, username, answers }) {
  const doc = {
    ownerToken: ownerToken(),
    telegramUserId: String(telegramUserId || ""),
    username: username || "",
    ...studentText(answers),
    contractNumber: await nextStudentContractNumber(),
  };
  // Botda ro‘yxatdan kurs tanlangan bo‘lsa — narxi, muddati va shartnomadagi nomi o‘zi qo‘yiladi
  if (answers.courseId && mongoose.isValidObjectId(answers.courseId)) {
    const course = await StudentCourse.findOne({ _id: answers.courseId, ownerToken: ownerToken() }).lean();
    if (course) {
      doc.courseId = String(course._id);
      doc.course = course.name;
      if (course.contractName) doc.contractCourse = course.contractName;
      if (course.months) doc.contractMonths = course.months;
      if (course.price) doc.contractPrice = course.price;
    }
  }
  for (const [slot, meta] of Object.entries(STUDENT_DOC_SLOTS)) {
    const file = answers[slot];
    if (!file?.fileId) continue;
    const downloaded = await downloadTelegramFileWithRetry(file.fileId);
    const contentType = file.kind === "pdf" ? "application/pdf" : downloaded.contentType;
    const ext = contentType === "application/pdf" ? "pdf" : contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    doc[slot] = { data: downloaded.data, contentType };
    doc[meta.flag] = true;
    doc[meta.typeField] = contentType;
    doc[meta.nameField] = String(file.fileName || `${meta.label}.${ext}`).slice(0, 120);
  }
  const created = await StudentContract.create(doc);
  return { id: String(created._id), created: true };
}

export async function listStudentContracts() {
  return StudentContract.find({ ownerToken: ownerToken() })
    .select(studentWithoutFiles)
    .sort({ createdAt: -1 })
    .lean();
}

export async function getStudentContract(id, { markSeen = false } = {}) {
  if (!mongoose.isValidObjectId(id)) return null;
  const filter = { _id: id, ownerToken: ownerToken() };
  if (markSeen) {
    await StudentContract.updateOne({ ...filter, seenAt: null }, { $set: { seenAt: new Date() } });
  }
  return StudentContract.findOne(filter).select(studentWithoutFiles).lean();
}

export async function updateStudentContract(id, input) {
  if (!mongoose.isValidObjectId(id)) return null;
  const set = studentText(input || {});
  if (input && input.transliterate !== undefined) set.transliterate = input.transliterate === true || input.transliterate === "on" || input.transliterate === "true";
  return StudentContract.findOneAndUpdate(
    { _id: id, ownerToken: ownerToken() },
    { $set: set },
    { new: true },
  )
    .select(studentWithoutFiles)
    .lean();
}

export async function deleteStudentContract(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return StudentContract.findOneAndDelete({ _id: id, ownerToken: ownerToken() }).select("fullName").lean();
}

export async function listContractTemplates() {
  return ContractTemplate.find({ ownerToken: ownerToken() }).select("-data").sort({ createdAt: -1 }).lean();
}

export async function createContractTemplate({ name, fileName, data, tags, unknownTags, createdBy }) {
  const doc = await ContractTemplate.create({
    ownerToken: ownerToken(),
    name: String(name || fileName || "Shablon").replace(/\s+/g, " ").trim().slice(0, 120),
    fileName: String(fileName || "shablon.docx").slice(0, 160),
    tags,
    unknownTags,
    size: data.length,
    data,
    createdBy: String(createdBy || "").slice(0, 120),
  });
  const { data: _omit, ...rest } = doc.toObject();
  return rest;
}

export async function getContractTemplateFile(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const doc = await ContractTemplate.findOne({ _id: id, ownerToken: ownerToken() }).lean();
  if (!doc?.data) return null;
  return { ...doc, data: fileBuffer(doc.data) };
}

export async function deleteContractTemplate(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return ContractTemplate.findOneAndDelete({ _id: id, ownerToken: ownerToken() }).select("name").lean();
}

export async function getStudentContractFull(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return StudentContract.findOne({ _id: id, ownerToken: ownerToken() }).select(studentWithoutFiles).lean();
}

export async function getStudentContractFile(id, slot) {
  const meta = STUDENT_DOC_SLOTS[slot];
  if (!meta || !mongoose.isValidObjectId(id)) return null;
  const doc = await StudentContract.findOne({ _id: id, ownerToken: ownerToken() })
    .select(`${slot} ${meta.flag}`)
    .lean();
  if (!doc?.[meta.flag] || !doc[slot]?.data) return null;
  const data = fileBuffer(doc[slot].data);
  if (!data) return null;
  return { data, contentType: doc[slot].contentType || "application/octet-stream" };
}

const importStatuses = {
  chaqirilmagan: "none",
  chaqirildi: "expected",
  keldi: "arrived",
  zaxirada: "arrived",
  "ishni boshladi": "started",
  "ishdan bo‘shagan": "left",
  "ishlamaydi ekan": "declined",
  declined: "declined",
  "ishdan bo'shagan": "left",
  kelmagan: "missed",
  "ishga kirgan": "hired",
  "boshqa joyga ishga kirgan": "hired",
  none: "none",
  expected: "expected",
  arrived: "arrived",
  missed: "missed",
  hired: "hired",
  started: "started",
  left: "left",
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
      seenAt: new Date(),
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
  // import qilingan raqamlar takrorlanmasligi uchun bir marta qayta tekshiramiz
  if (added) await assignContractNumbers();
  return { added, skipped };
}
