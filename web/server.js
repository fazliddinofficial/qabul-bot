import express from "express";
import session from "express-session";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { DEPARTMENTS, VALID_POSITIONS } from "../constants.js";
import {
  authenticateStaff,
  createStaff,
  deleteApplication,
  restoreApplication,
  deleteStaff,
  ensureDefaultAdmin,
  getApplicationById,
  getApplicationPhoto,
  getApplicationFile,
  saveApplicationFile,
  clearApplicationFile,
  DOC_SLOTS,
  listApplications,
  importApplications,
  listActivity,
  listStaff,
  recordActivity,
  updateApplicationReview,
  setApplicationFavorite,
  updateStaff,
} from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.status(401).json({ error: "Avval tizimga kiring" });
}

function requireAdmin(req, res, next) {
  if (req.session?.user?.role === "admin") return next();
  return res.status(403).json({ error: "Bu bo‘lim faqat admin uchun" });
}

function actorOf(req) {
  return req.session?.user || null;
}

const reviewFields = [
  ["interviewStatus", "Suhbat"],
  ["score", "Ball"],
  ["interviewAt", "Suhbat vaqti"],
  ["workStart", "Ish boshlash"],
  ["agreedSalary", "Kelishilgan oylik"],
  ["expectedSalary", "Kutilayotgan oylik"],
  ["phone", "Telefon"],
  ["parentPhone", "Ota-ona telefoni"],
  ["workHours", "Ish vaqti"],
  ["workDuration", "Ishlash muddati"],
  ["passportSeries", "Pasport seriyasi"],
  ["jshshir", "JSHSHIR"],
  ["contractNumber", "Shartnoma raqami"],
  ["contractKind", "Shartnoma turi"],
  ["hiredAt", "Ishga qabul qilingan kun"],
  ["contractTerm", "Shartnoma muddati (oy)"],
  ["contractEnd", "Shartnoma tugash sanasi"],
  ["department", "Bo‘lim"],
  ["probation", "Sinov muddati"],
  ["perStudentPay", "O‘quvchi uchun haq"],
  ["passportIssued", "Pasport berilgan sana"],
  ["passportIssuer", "Pasport bergan organ"],
  ["position", "Lavozim"],
  ["fullName", "I.F.Sh"],
  ["fatherName", "Otasining ismi"],
  ["address", "Manzil"],
  ["birthday", "Tug‘ilgan sana"],
  ["note", "Izoh"],
  ["callerName", "Suhbatga chaqirgan"],
  ["interviewerName", "Suhbat o‘tkazuvchi"],
];

const statusNames = {
  none: "Chaqirilmagan",
  expected: "Chaqirildi",
  called: "Chaqirildi",
  arrived: "Keldi",
  missed: "Kelmagan",
  hired: "Ishga kirgan",
};

function shown(key, value) {
  if (value === null || value === undefined || value === "") return "bo‘sh";
  if (key === "interviewStatus") return statusNames[value] || String(value);
  if (key === "score") return `${value} / 10`;
  return String(value);
}

function reviewChanges(before, after) {
  return reviewFields
    .filter(([key]) => shown(key, before?.[key]) !== shown(key, after?.[key]))
    .map(([key, label]) => `${label}: ${shown(key, before?.[key])} → ${shown(key, after?.[key])}`);
}

function sendStoredFile(res, file, downloadLabel) {
  const contentType = file.contentType || "application/octet-stream";
  res.setHeader("Content-Type", contentType);
  if (downloadLabel) {
    const ext = contentType.includes("pdf")
      ? "pdf"
      : contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "jpg";
    const name = `${String(downloadLabel).replace(/[\\/:*?"<>|]+/g, "").trim() || "rasm"}.${ext}`;
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.setHeader("Cache-Control", "private, no-store");
  } else {
    res.setHeader("Cache-Control", "private, max-age=3600");
  }
  res.send(Buffer.from(file.data));
}

export async function startWeb() {
  const username = process.env.ADMIN_USERNAME || "";
  const password = process.env.ADMIN_PASSWORD || "";
  const port = Number(process.env.WEB_PORT || 3000);
  await ensureDefaultAdmin();

  if (!username || !password) {
    console.error("ADMIN_USERNAME va ADMIN_PASSWORD .env da bo'lishi kerak");
  }
  if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET .env da bo'lishi kerak");
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "4mb" }));
  app.use(
    session({
      name: "qabul.sid",
      secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.post("/api/login", async (req, res) => {
    const username = String(req.body?.username || "").trim();
    const user = await authenticateStaff(username, req.body?.password);
    if (!user) {
      await recordActivity({
        actor: { username },
        action: "Kirish muvaffaqiyatsiz",
        detail: `Login: ${username || "bo‘sh"}`,
      });
      return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
    }

    req.session.user = user;
    await recordActivity({
      actor: user,
      action: "Tizimga kirdi",
      detail: `Login: ${user.username}`,
    });
    return res.json({ ok: true, user });
  });

  app.post("/api/logout", (req, res) => {
    const user = actorOf(req);
    req.session.destroy(async () => {
      if (user) {
        await recordActivity({
          actor: user,
          action: "Tizimdan chiqdi",
          detail: `Login: ${user.username}`,
        });
      }
      res.clearCookie("qabul.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/me", (req, res) => {
    const user = req.session?.user;
    res.json({ ok: Boolean(user), user: user || null });
  });

  app.get("/api/activity", requireAuth, async (req, res) => {
    res.json({ items: await listActivity() });
  });

  app.get("/api/staff", requireAuth, requireAdmin, async (req, res) => {
    res.json({ items: await listStaff() });
  });

  app.post("/api/staff", requireAuth, requireAdmin, async (req, res) => {
    try {
      const item = await createStaff(req.body || {});
      await recordActivity({
        actor: actorOf(req),
        action: "Hodim qo‘shdi",
        detail: `${item.surname} ${item.name}, login: ${item.username}`,
      });
      res.json({ item });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || "Hodim qo‘shilmadi" });
    }
  });

  app.patch("/api/staff/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const before = (await listStaff()).find((person) => person.id === req.params.id);
      const item = await updateStaff(req.params.id, req.body || {});
      if (!item) return res.status(404).json({ error: "Hodim topilmadi" });
      if (req.session.user?.id === item.id) req.session.user = item;
      const parts = [];
      if (before && `${before.surname} ${before.name}` !== `${item.surname} ${item.name}`) {
        parts.push(`Ism: ${before.surname} ${before.name} → ${item.surname} ${item.name}`);
      }
      if (before && before.username !== item.username) parts.push(`Login: ${before.username} → ${item.username}`);
      if (req.body?.password) parts.push("Parol yangilandi");
      await recordActivity({
        actor: actorOf(req),
        action: "Hodimni tahrirladi",
        detail: [`${item.surname} ${item.name}`, ...parts].filter(Boolean).join(". "),
      });
      res.json({ item });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || "Hodim yangilanmadi" });
    }
  });

  app.delete("/api/staff/:id", requireAuth, requireAdmin, async (req, res) => {
    if (req.session.user?.id === req.params.id) {
      return res.status(400).json({ error: "O‘zingizni o‘chirib bo‘lmaydi" });
    }
    const item = await deleteStaff(req.params.id);
    if (!item) return res.status(404).json({ error: "Hodim topilmadi" });
    await recordActivity({
      actor: actorOf(req),
      action: "Hodimni o‘chirdi",
      detail: `${item.surname} ${item.name}, login: ${item.username}`,
    });
    res.json({ ok: true });
  });

  app.post("/api/applications/import", requireAuth, async (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) return res.status(400).json({ error: "Faylda ariza topilmadi" });
    const result = await importApplications(rows);
    await recordActivity({
      actor: actorOf(req),
      action: "Import qildi",
      detail: `${result.added} ta qo‘shildi, ${result.skipped} ta o‘tkazib yuborildi`,
    });
    res.json(result);
  });

  app.get("/api/applications", requireAuth, async (req, res) => {
    const items = await listApplications({
      q: req.query.q,
      position: req.query.position,
      archived: req.query.archived === "1",
    });
    res.json({ items, positions: VALID_POSITIONS, departments: DEPARTMENTS });
  });

  app.patch("/api/applications/:id/favorite", requireAuth, async (req, res) => {
    const before = await getApplicationById(req.params.id);
    const item = await setApplicationFavorite(req.params.id, req.body?.favorite);
    if (!item) return res.status(404).json({ error: "Ariza topilmadi" });
    const on = Boolean(item.favorite);
    if (Boolean(before?.favorite) !== on) {
      await recordActivity({
        actor: actorOf(req),
        action: on ? "Sevimliga qo‘shdi" : "Sevimlidan oldi",
        detail: item.fullName || "Ariza",
      });
    }
    res.json({ item });
  });

  app.patch("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const before = await getApplicationById(req.params.id);
      const item = await updateApplicationReview(req.params.id, req.body || {}, req.session.user);
      if (!item) return res.status(404).json({ error: "Ariza topilmadi" });
      const changes = reviewChanges(before, item);
      if (changes.length) {
        await recordActivity({
          actor: actorOf(req),
          action: "Arizani o‘zgartirdi",
          detail: `${item.fullName || "Ariza"}. ${changes.join(". ")}`,
        });
      }
      res.json({ item });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || "Saqlanmadi" });
    }
  });

  app.delete("/api/applications/:id", requireAuth, requireAdmin, async (req, res) => {
    const before = await getApplicationById(req.params.id);
    const item = await deleteApplication(req.params.id);
    if (!item) return res.status(404).json({ error: "Ariza topilmadi" });
    await recordActivity({
      actor: actorOf(req),
      action: "Arxivga o‘tkazdi",
      detail: [before?.fullName, before?.position].filter(Boolean).join(", ") || "Ariza",
    });
    res.json({ ok: true });
  });

  app.post("/api/applications/:id/restore", requireAuth, requireAdmin, async (req, res) => {
    const item = await restoreApplication(req.params.id);
    if (!item) return res.status(404).json({ error: "Arxivda bunday ariza yo‘q" });
    await recordActivity({
      actor: actorOf(req),
      action: "Arxivdan qaytardi",
      detail: [item.fullName, item.position].filter(Boolean).join(", ") || "Ariza",
    });
    res.json({ item });
  });

  app.get("/api/applications/:id", requireAuth, async (req, res) => {
    const item = await getApplicationById(req.params.id);
    if (!item) return res.status(404).json({ error: "Ariza topilmadi" });
    if (req.query.silent !== "1") {
      await recordActivity({
        actor: actorOf(req),
        action: "Arizani ochdi",
        detail: [item.fullName, item.position].filter(Boolean).join(", "),
      });
    }
    res.json({ item });
  });

  const docTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

  function docContentType(req) {
    let contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    if (!docTypes.has(contentType)) {
      const name = decodeURIComponent(String(req.headers["x-file-name"] || "")).toLowerCase();
      if (name.endsWith(".pdf")) contentType = "application/pdf";
      else if (name.endsWith(".png")) contentType = "image/png";
      else if (name.endsWith(".webp")) contentType = "image/webp";
      else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) contentType = "image/jpeg";
    }
    return contentType;
  }

  app.get("/api/applications/:id/docs/:slot", requireAuth, async (req, res) => {
    const meta = DOC_SLOTS[req.params.slot];
    if (!meta) return res.status(404).end();
    const file = await getApplicationFile(req.params.id, req.params.slot);
    if (!file) return res.status(404).end();
    sendStoredFile(res, file, req.query.download === "1" ? meta.label : "");
  });

  app.put(
    "/api/applications/:id/docs/:slot",
    requireAuth,
    express.raw({ type: () => true, limit: "15mb" }),
    async (req, res) => {
      const meta = DOC_SLOTS[req.params.slot];
      if (!meta) return res.status(404).json({ error: "Hujjat turi topilmadi" });
      const contentType = docContentType(req);
      const data = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (!docTypes.has(contentType) || !data.length) {
        return res.status(400).json({ error: "Faqat JPG, PNG, WEBP yoki PDF, 15 MB gacha" });
      }
      const item = await saveApplicationFile(req.params.id, req.params.slot, {
        data,
        contentType,
        fileName: decodeURIComponent(String(req.headers["x-file-name"] || ""))
          .split(/[/\\]/)
          .pop()
          .replace(/[\r\n\0]/g, "")
          .trim()
          .slice(0, 120),
      });
      if (!item) return res.status(404).json({ error: "Ariza topilmadi" });
      await recordActivity({
        actor: actorOf(req),
        action: "Hujjat joyladi",
        detail: `${item.fullName || "Ariza"}. ${meta.label}`,
      });
      res.json({ item });
    },
  );

  app.delete("/api/applications/:id/docs/:slot", requireAuth, async (req, res) => {
    const meta = DOC_SLOTS[req.params.slot];
    if (!meta) return res.status(404).json({ error: "Hujjat turi topilmadi" });
    const item = await clearApplicationFile(req.params.id, req.params.slot);
    if (!item) return res.status(404).json({ error: "Ariza topilmadi" });
    await recordActivity({
      actor: actorOf(req),
      action: "Hujjatni olib tashladi",
      detail: `${item.fullName || "Ariza"}. ${meta.label}`,
    });
    res.json({ item });
  });

  app.get("/api/applications/:id/photo", requireAuth, async (req, res) => {
    const photo = await getApplicationPhoto(req.params.id);
    if (!photo) return res.status(404).end();
    sendStoredFile(res, photo, req.query.download === "1" ? "Nomzod rasmi" : "");
  });

  app.use(express.static(path.join(__dirname, "public")));

  app.listen(port, () => {
    console.log(`🌐 Sayt: http://localhost:${port}`);
  });
}
