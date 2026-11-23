// HR panel → metafor (CRM): ishga olingan nomzodni o‘qituvchi yoki xodim qilib o‘tkazish.
// So‘rov HR_SSO_SECRET bilan imzolanadi: X-HR-Signature = hex(HMAC-SHA256(`${ts}.${body}`)).
import crypto from "crypto";

export class CrmError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

function crmBase() {
  return (process.env.CRM_API_URL || "https://metafor.uz/api/v1").replace(/\/+$/, "");
}

export function crmWebBase() {
  return (process.env.CRM_WEB_URL || "https://metafor.uz").replace(/\/+$/, "");
}

const CRM_MESSAGES = {
  "Bad HR signature": "metafor kalitni qabul qilmadi (HR_SSO_SECRET ikkala serverda bir xil emas)",
  "HR request expired": "So‘rov eskirgan — server soatini tekshiring",
  "HR link is not configured": "metafor tomonida HR ulanmagan",
  "A teacher with this phone already exists in the center": "Bu telefon raqamli o‘qituvchi metafor’da allaqachon bor",
  "A user with this email already exists": "Bu foydalanuvchi metafor’da allaqachon bor",
  "Choose a position (lavozim) for the employee": "Xodim uchun lavozimni tanlang",
  "Center CEO not found": "metafor’da markaz CEO’si topilmadi",
  "Percent salary cannot exceed 100": "Foiz 100 dan oshmasin",
  "Role not found": "Lavozim topilmadi — ro‘yxatni yangilang",
};

export async function crmCall(path, body) {
  const secret = process.env.HR_SSO_SECRET || "";
  if (secret.length < 32) throw new CrmError("HR_SSO_SECRET sozlanmagan", 503);
  const ts = Math.floor(Date.now() / 1000);
  const text = JSON.stringify(body ?? {});
  const signature = crypto.createHmac("sha256", secret).update(`${ts}.${text}`).digest("hex");
  let res;
  try {
    res = await fetch(`${crmBase()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-HR-Timestamp": String(ts), "X-HR-Signature": signature },
      body: text,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new CrmError("metafor bilan aloqa yo‘q — birozdan keyin urinib ko‘ring");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const raw = data?.message || data?.error?.message || data?.error || "";
    const message = typeof raw === "string" ? raw : "";
    throw new CrmError(CRM_MESSAGES[message] || `metafor xatosi: ${message || res.status}`, res.status >= 500 ? 502 : 400);
  }
  return data?.data ?? data;
}

const toDigits = (value) => String(value || "").replace(/\D/g, "");

function phone998(value) {
  const digits = toDigits(value);
  if (digits.length < 9) return undefined;
  return `+998${digits.slice(-9)}`;
}

function isoBirth(value) {
  const m = String(value || "").match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

function genderOf(patronymic) {
  const p = String(patronymic || "").toLowerCase().replace(/[‘’ʻ`']/g, "'");
  if (/\bqizi\b/.test(p)) return "FEMALE";
  if (/\bo'g'li\b|\bogli\b|\bo'gli\b/.test(p)) return "MALE";
  return undefined;
}

export function splitPerson(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return { lastName: parts[0] || "", firstName: parts[1] || parts[0] || "", patronymic: parts.slice(2).join(" ") };
}

// HR arizasidagi ma’lumotlarni metafor kartasiga moslash (oylik/lavozim kabi tanlovlar dialogdan keladi)
export function buildImportPayload(item, choice, photo) {
  const person = splitPerson(item.fullName);
  const fatherName = String(item.fatherName || "").trim() || person.patronymic;
  const notes = (item.notes || []).map((note) => `• ${note.text} (${note.byName || "—"})`);
  if (String(item.note || "").trim()) notes.unshift(`• ${item.note.trim()}`);
  const lines = [
    "HR paneldan o‘tkazildi (sv.kingsedu.uz).",
    fatherName && `Otasining ismi: ${fatherName}`,
    item.position && `HR yo‘nalishi: ${item.position}`,
    item.education && `Ma’lumot: ${item.education}`,
    item.languageLevel && `Til darajasi: ${item.languageLevel}`,
    item.computerSkills && `Kompyuter: ${item.computerSkills}`,
    item.agreedSalary && `Kelishilgan oylik: ${item.agreedSalary}`,
    item.workHours && `Ish vaqti: ${item.workHours}`,
    item.workStart && `Ish boshlash: ${item.workStart}`,
    item.prevJob && `Oldingi ish: ${item.prevJob}`,
    item.maritalStatus && `Oilaviy holat: ${item.maritalStatus}`,
    // Xodim kartasida bu maydonlar yo‘q — izohga yozamiz
    choice.kind === "employee" && item.address && `Manzil: ${item.address}`,
    choice.kind === "employee" && item.parentPhone && `Qo‘shimcha telefon: ${item.parentPhone}`,
    choice.kind === "employee" && (item.institution || item.graduationYear) && `O‘qigan joyi: ${[item.institution, item.graduationYear].filter(Boolean).join(", ")}`,
    item.nation && `Millati: ${item.nation}`,
    (item.passportSeries || item.jshshir) && `Pasport: ${item.passportSeries || "—"}, JSHSHIR: ${item.jshshir || "—"}`,
    item.contractNumber && `Mehnat shartnomasi №: ${item.contractNumber}`,
    item.assessmentScore != null && `Suhbat bali: ${item.assessmentScore}/100`,
    notes.length && `Izohlar:\n${notes.join("\n")}`,
  ].filter(Boolean);
  const graduated = [item.institution, item.graduationYear].filter(Boolean).join(", ");
  const salary = Number(toDigits(choice.salaryAmount));
  const payload = {
    kind: choice.kind === "employee" ? "employee" : "teacher",
    firstName: person.firstName,
    lastName: person.lastName,
    phone: phone998(item.phone),
    extraPhone: phone998(item.parentPhone),
    gender: genderOf(fatherName),
    birthDate: isoBirth(item.birthday),
    address: item.address ? String(item.address).slice(0, 500) : undefined,
    graduatedFrom: graduated ? graduated.slice(0, 500) : undefined,
    notes: lines.join("\n").slice(0, 2000),
    specialization: choice.kind === "employee" ? undefined : String(choice.specialization || "").trim().slice(0, 80) || undefined,
    roleId: choice.kind === "employee" ? choice.roleId || undefined : undefined,
    branchId: choice.branchId || undefined,
    salaryAmount: Number.isFinite(salary) && salary > 0 ? salary : undefined,
    salaryMode: choice.salaryMode === "percent" ? "percent" : "fixed",
    password: String(choice.password || "").length >= 4 ? String(choice.password) : undefined,
    profilePhoto: photo,
  };
  // undefined maydonlarni olib tashlaymiz — imzo JSON matni bo‘yicha hisoblanadi
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""));
}
