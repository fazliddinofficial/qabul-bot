// O‘z Word (.docx) shablonlaringizni o‘quvchi ma’lumotlari bilan to‘ldirish.
// Shablon ichida {FISH}, {KURS}, {SUMMA_SOZ} kabi belgilar yoziladi — ular almashtiriladi.
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { numberToUzWords, cyrDate, courseToCyr, formatPrice } from "./public/student-contract.js";

export const TEMPLATE_TAGS = [
  ["RAQAM", "Shartnoma raqami", "1/2026"],
  ["SANA", "Shartnoma sanasi (kirill)", "«23» ноябрь 2026 й."],
  ["SANA_RAQAM", "Shartnoma sanasi (raqamda)", "23.11.2026"],
  ["FISH", "O‘quvchining F.I.Sh", "Karimov Sardor Aliyevich"],
  ["TUGILGAN_SANA", "Tug‘ilgan sana", "12.03.2006"],
  ["PASPORT", "Pasport/ID seriya va raqami", "AB7654321"],
  ["PASPORT_BERILGAN", "Pasport berilgan sana", "01.09.2022"],
  ["PASPORT_BERGAN", "Pasport bergan organ", "Jizzax IIB"],
  ["JSHSHIR", "JSHSHIR", "30603061234567"],
  ["MANZIL", "Manzil", "Jizzax sh., Sharq mahallasi 5"],
  ["TELEFON", "Telefon", "+998901112233"],
  ["EMAIL", "E-pochta", "misol@gmail.com"],
  ["KURS", "Kurs (shartnomadagi nomi)", "Бухгалтерия ҳисоби"],
  ["MUDDAT", "Muddat, oy (raqam)", "2"],
  ["MUDDAT_SOZ", "Muddat so‘z bilan", "икки"],
  ["SUMMA", "Umumiy summa (raqam)", "2 200 000"],
  ["SUMMA_SOZ", "Summa so‘z bilan", "икки миллион икки юз минг"],
];
const KNOWN = new Set(TEMPLATE_TAGS.map(([tag]) => tag));
const BLANK = "____________";

export class TemplateError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function dottedDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "";
}

export function templateValues(item) {
  const price = String(item.contractPrice || "").replace(/\D/g, "");
  const months = String(item.contractMonths || "").replace(/\D/g, "");
  return {
    RAQAM: item.contractNumber || "",
    SANA: item.contractDate ? cyrDate(item.contractDate) : "",
    SANA_RAQAM: dottedDate(item.contractDate),
    FISH: item.fullName || "",
    TUGILGAN_SANA: item.birthday || "",
    PASPORT: item.passportSeries || "",
    PASPORT_BERILGAN: item.passportIssued || "",
    PASPORT_BERGAN: item.passportIssuer || "",
    JSHSHIR: item.jshshir || "",
    MANZIL: item.address || "",
    TELEFON: item.phone || "",
    EMAIL: item.email || "",
    KURS: item.contractCourse || courseToCyr(item.course) || "",
    MUDDAT: months,
    MUDDAT_SOZ: months ? numberToUzWords(months) : "",
    SUMMA: price ? formatPrice(price) : "",
    SUMMA_SOZ: price ? numberToUzWords(price) : "",
  };
}

function explain(error) {
  const list = error?.properties?.errors || [error];
  const lines = list.slice(0, 5).map((e) => {
    const id = e?.properties?.id || "";
    const ctx = e?.properties?.context || e?.properties?.xtag || "";
    const near = String(ctx).trim().slice(0, 40);
    if (id === "unclosed_tag") return `yopilmagan belgi «${near}» — belgi oxiriga "}" qo‘ying`;
    if (id === "unopened_tag") return `ochilmagan belgi «${near}» — belgi boshiga "{" qo‘ying`;
    if (id === "duplicate_open_tag") return `Ikki marta "{" yozilgan: "${ctx}"`;
    if (id === "duplicate_close_tag") return `Ikki marta "}" yozilgan: "${ctx}"`;
    return e?.properties?.explanation || e?.message || "Shablonda xato";
  });
  return lines.join("; ");
}

function compile(buffer) {
  let zip;
  try {
    zip = new PizZip(buffer);
  } catch {
    throw new TemplateError("Fayl .docx (Word) emas yoki buzilgan. Word’da «Сохранить как → .docx» qilib qayta yuklang.");
  }
  if (!zip.file("word/document.xml")) {
    throw new TemplateError("Bu .docx Word hujjati emas.");
  }
  try {
    return new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      errorLogging: false,
      nullGetter: () => BLANK,
    });
  } catch (error) {
    throw new TemplateError(`Shablonda xato: ${explain(error)}`);
  }
}

// Yuklashda tekshiradi: qaysi belgilar bor, qaysilari noma’lum
export function inspectTemplate(buffer) {
  const doc = compile(buffer);
  const text = doc.getFullText();
  const found = [...new Set([...text.matchAll(/\{\s*([^{}]+?)\s*\}/g)].map((m) => m[1].trim()))];
  return {
    tags: found.filter((tag) => KNOWN.has(tag)),
    unknown: found.filter((tag) => !KNOWN.has(tag)),
  };
}

export function fillTemplate(buffer, item) {
  const doc = compile(buffer);
  const values = templateValues(item);
  const filled = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value || "").trim() || BLANK]));
  try {
    doc.render(filled);
  } catch (error) {
    throw new TemplateError(`Shablonni to‘ldirib bo‘lmadi: ${explain(error)}`);
  }
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}
