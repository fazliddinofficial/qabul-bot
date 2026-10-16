import { VALID_POSITIONS } from "./constants.js";

function salaryAmount(text) {
  const raw = String(text || "").trim();
  if (!/^[\d\s]+$/.test(raw)) return "";
  const digits = raw.replace(/\s/g, "").replace(/^0+(?=\d)/, "");
  if (!digits || digits.length > 12) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const WORK_SHIFTS = ["1-smena", "2-smena", "to'liq smena"];

function isImageDocument(document) {
  if (!document) return false;
  const mimeType = document.mime_type?.toLowerCase() || "";
  const fileName = document.file_name?.toLowerCase() || "";
  return (
    ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mimeType) ||
    [".jpg", ".jpeg", ".png", ".webp"].some((ext) => fileName.endsWith(ext))
  );
}

export const questions = [
  {
    id: "photo",
    text: `📝 Iltimos, savollarga birma-bir javob bering.

    📸 1) Foto suratingizni yuboring

    ⚠️ Diqqat:
    • Yuzingiz aniq va yorug‘ ko‘rinsin
    • Rasm sifatli bo‘lishi kerak
    • JPG, PNG yoki WEBP bo‘lsin
    `,
    type: "photo",
    validate: (ctx) => {
      if (ctx.message?.photo) return true;
      return isImageDocument(ctx.message?.document);
    },
    errorMsg: "❌ Iltimos, rasm yuboring (JPG, PNG yoki WEBP)!",
    extract: (ctx) => {
      if (ctx.message.photo) {
        return ctx.message.photo[ctx.message.photo.length - 1].file_id;
      }
      return ctx.message.document.file_id;
    },
  },
  {
    id: "position",
    text: "2) Qaysi yo'nalishda ishlay olasiz? (Fan o'qituvchi, admin)",
    type: "text",
    validate: (ctx) => {
      if (!ctx.message?.text) return false;
      const text = ctx.message.text.trim();
      return VALID_POSITIONS.includes(text);
    },
    errorMsg: "❌ Iltimos, yo'nalishni kiriting!",
    extract: (ctx) => {
      return ctx.message.text.replace(/\s+/g, " ").trim();
    },
  },
  {
    id: "fullName",
    text: "3) I.F.Sh kiriting: (Ism Familiya Sharif)",
    type: "text",
    validate: (ctx) => {
      const parts = ctx.message?.text?.trim().split(/\s+/) || [];
      return parts.length >= 2;
    },
    errorMsg:
      "❌ Iltimos, to'liq ismingizni kiriting (kamida Ism va Familiya)!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "birthday",
    text: "4) Tug'ilgan sanangizni kiriting (DD.MM.YYYY):",
    type: "text",
    validate: (ctx) => {
      const text = ctx.message?.text?.trim();
      if (!text) return false;

      const regex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(19|20)\d{2}$/;
      return regex.test(text);
    },
    errorMsg:
      "❌ Sana noto‘g‘ri formatda. Iltimos, DD.MM.YYYY ko‘rinishida kiriting.",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "nation",
    text: "5) Millatingizni kiring: ",
    type: "text",
    validate: (ctx) => {
      return ctx.message?.text;
    },
    errorMsg: "❌ Iltimos, millatingizni kiring!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "address",
    text: `6) Doimiy yashash manzilingiz
    (Viloyat, tuman, mahalla, ko‘cha, uy raqami)

    📌 Misol:
    Toshkent viloyati, Chirchiq shahri, Navbahor mahallasi, Mustaqillik ko‘chasi, 25-uy`,
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 3,
    errorMsg: "❌ Iltimos, manzilingizni to'liq kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "education",
    text: "7) Ma'lumoti (Oliy, o'rta, tugallanmagan oliy):",
    type: "text",
    validate: (ctx) => {
      const text = ctx.message?.text?.trim().toLowerCase();
      const valid = ["oliy", "o'rta", "orta", "oʻrta", "tugallanmagan oliy"];
      return valid.some((v) => text.includes(v));
    },
    errorMsg: "❌ Iltimos, o'rta yoki oliy deb javob bering!",
    extract: (ctx) => {
      const text = ctx.message?.text.trim().toLowerCase();
      return [
        "oliy",
        "o'rta",
        "orta",
        "Oʻrta",
        "oʻrta",
        "tugallanmagan oliy",
      ].includes(text)
        ? text
        : "mavjud emas";
    },
  },
  {
    id: "prevJob",
    text: `8) Oldingi ish tajribangiz
    (Har bir ish joyini alohida qatorda quyidagi tartibda yozing: ish boshlagan va tugatgan yili, tashkilot nomi va joylashuvi, lavozimi, ish muddati)

    📌 Misol:
     1. 2020–2022 — “ABC Education” o‘quv markazi (Toshkent), ingliz tili o‘qituvchisi — 2 yil
     2. 2022–2024 — “XYZ School” (Samarqand), administrator — 1,5 yil`,
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 10,
    errorMsg:
      "❌ Iltimos, oldingi ish joyingiz haqida to'liqroq ma'lumot bering!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "maritalStatus",
    text: "9) Oilaviy axvolingizni yozing: (turmush qurgan, yoki yo'q)",
    type: "text",
    validate: (ctx) => {
      const text = ctx.message?.text?.trim().toLowerCase();
      const valid = ["turmush qurgan", "turmush qurmagan", "ajrashgan"];
      return valid.some((v) => text.includes(v));
    },
    errorMsg: "❌ Iltimos, oilaviy axvolingizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "computerSkills",
    text: "10) Kompyuterda ishlay olasizmi?",
    type: "text",
    validate: (ctx) => {
      const text = ctx.message?.text?.trim().toLowerCase() || "";
      const valid = ["ha", "yo'q", "yaxshi", "o'rtacha", "boshlang'ich"];
      return valid.some((v) => text.includes(v));
    },
    errorMsg: "❌ Iltimos, pastdagi tugmalardan birini tanlang!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "lastSalary",
    text: "11) Oxirgi ishlagan ishingizda oylik maoshingizni faqat raqamda kiriting:",
    type: "text",
    validate: (ctx) => Boolean(salaryAmount(ctx.message?.text)),
    errorMsg: "❌ Iltimos, summani faqat raqamda kiriting! Misol: 3500000",
    extract: (ctx) => salaryAmount(ctx.message.text),
  },
  {
    id: "workDuration",
    text: "12) Bizning korxonada qancha muddat ishlay olasiz?",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, ishlash muddatini kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "parentPhone",
    text: "13) Qo'shimcha telefon raqam yoki ota-onangizning telefon raqamini kiriting:",
    type: "text",
    validate: (ctx) => {
      const phone = ctx.message?.text?.replace(/\s/g, "") || "";
      return /^\+?\d{9,13}$/.test(phone);
    },
    errorMsg: "❌ Noto'g'ri telefon raqam! Misol: +998901234567 yoki 901234567",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "languageLevel",
    text: "14) Til bilish darajangiz: (IELTSda yoki CEFRda)",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, til bilish darajangizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "workHours",
    text: "15) Soat nechidan nechigacha ishlay olasiz?",
    type: "text",
    validate: (ctx) => WORK_SHIFTS.includes(ctx.message?.text?.trim()),
    errorMsg: "❌ Iltimos, pastdagi tugmalardan birini tanlang!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "expectedSalary",
    text: "16) Bizdan qancha oylikga ishlamoqchisiz? Summani faqat raqamda kiriting:",
    type: "text",
    validate: (ctx) => Boolean(salaryAmount(ctx.message?.text)),
    errorMsg: "❌ Iltimos, summani faqat raqamda kiriting! Misol: 5000000",
    extract: (ctx) => salaryAmount(ctx.message.text),
  },
  {
    id: "phone",
    text: "17) O'zingizning shaxsiy telefon raqamingizni kiriting. Qo'shimcha yoki ota-ona raqamidan farq qilishi shart:",
    type: "contact",
    validate: (ctx) => {
      return (
        ctx.message?.contact?.phone_number !== undefined ||
        ctx.message?.text !== undefined
      );
    },
    errorMsg: "❌ Noto'g'ri telefon raqam! Misol: +998901234567 yoki 901234567",
    extract: (ctx) => {
      if (ctx.message?.contact?.phone_number) {
        return ctx.message.contact.phone_number;
      }

      if (ctx.message?.text) {
        return ctx.message.text.trim();
      }

      return null;
    },
  },
  {
    id: "foundResource",
    text: `
    Ish e’lonini aynan qaysi kanal yoki sahifadan ko‘rdingiz?

    📌 Misol:
     • telegram:@nomi
     • Instagram: @nomi
    `,
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, oxirgi maoshingizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
];

export const incompleteEducationQuestions = [
  {
    id: "institution",
    text: "Qaysi oliygohda va qaysi yo'nalishda o'qiyapsiz?",
    type: "text",
    validate: (ctx) => ctx.message?.text?.trim().length > 3,
    errorMsg: "❌ Iltimos, oliygo'h nomini kiriting!",
    extract: (ctx) => ctx.message.text.trim()
  },
  {
    id: "graduationYear",
    text: "Nechanchi kurs ekanligingizni va bitiruv yilingizni kiriting!",
    type: "text",
    validate: (ctx) => ctx.message?.text?.trim().length > 3,
    errorMsg: "❌ Noto'g'ri yil! Misol: 2-kurs, 2028-bitiraman",
    extract: (ctx) => ctx.message.text.trim()
  }
];

export const completedEducationQuestions = [
  {
    id: "institution",
    text: "Qaysi ta’lim muassasasini va qaysi yo‘nalishni tamomlagansiz?",
    type: "text",
    validate: (ctx) => ctx.message?.text?.trim().length > 3,
    errorMsg: "❌ Iltimos, o'quv muassasasi nomini kiriting!",
    extract: (ctx) => ctx.message.text.trim()
  }, {
    id: "graduationYear",
    text: "Tamomlagan yilingiz:",
    type: "text",
    validate: (ctx) => ctx.message?.text?.trim().length > 0,
    errorMsg: "❌ Noto'g'ri yil! Misol: 2020",
    extract: (ctx) => ctx.message.text.trim()
  }
];