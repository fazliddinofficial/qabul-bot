import mongoose from "mongoose";

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
    hasPhoto: { type: Boolean, default: false },
    photo: {
      data: Buffer,
      contentType: { type: String, default: "image/jpeg" },
    },
  },
  { collection: "applications", timestamps: { createdAt: true, updatedAt: false } },
);

const User = mongoose.models.ApplicantUser || mongoose.model("ApplicantUser", userSchema);
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

function ownerToken() {
  return process.env.DASHBOARD_TOKEN || "";
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
