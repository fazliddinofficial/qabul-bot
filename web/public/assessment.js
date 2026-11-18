// Pedagogik suhbat: barcha o'qituvchi nomzodlar uchun bir xil 20 ta savol.
// Har bir javob 0–5 ball bilan baholanadi: 20 × 5 = 100 ball.
// Savol matnini o'zgartirish mumkin, lekin tartib va soni (20) o'zgarmasin —
// saqlangan baholar savol tartib raqami bo'yicha yoziladi.

export const ASSESSMENT_VERSION = 1;
export const MAX_PER_QUESTION = 5;

export const RATING_SCALE = [
  { value: 0, label: "Javob yo‘q" },
  { value: 1, label: "Juda zaif" },
  { value: 2, label: "Zaif" },
  { value: 3, label: "O‘rtacha" },
  { value: 4, label: "Yaxshi" },
  { value: 5, label: "A’lo" },
];

export const ASSESSMENT_SECTIONS = [
  {
    title: "Darsni rejalashtirish va metodika",
    color: "#6366f1",
    icon: "book",
    questions: [
      {
        text: "Birinchi darsingizni qanday boshlaysiz? Dars tuzilishini bosqichma-bosqich aytib bering.",
        hint: "Tanishuv va salomlashish, dars maqsadini aytish, iliqlik mashqi yoki takrorlash, yangi mavzu, mustahkamlash, uyga vazifa. Har bir bosqichga vaqt taqsimoti.",
      },
      {
        text: "Dars maqsadini qanday belgilaysiz va dars oxirida unga erishilganini qanday bilasiz?",
        hint: "Aniq, o‘lchanadigan maqsad («dars oxirida o‘quvchi ... qila oladi»). Oxirida tekshirish: qisqa savol-javob, mini test, chiqish kartochkasi.",
      },
      {
        text: "Bitta mavzuni kamida ikki xil usulda qanday tushuntirasiz? O‘z faningizdan misol keltiring.",
        hint: "Ko‘rgazmali, hayotiy misol, o‘yin, amaliy topshiriq orqali. Aniq mavzu va aniq misol keltirsa — kuchli javob.",
      },
      {
        text: "Qaysi interaktiv metodlarni bilasiz va ulardan birini darsda qanday qo‘llagansiz?",
        hint: "Juftlik va guruh ishi, aqliy hujum, rolli o‘yin, keys, klaster, viktorina (Kahoot va h.k.). Faqat nomini emas, qo‘llash tajribasini aytishi muhim.",
      },
    ],
  },
  {
    title: "Sinfni boshqarish va intizom",
    color: "#0ea5e9",
    icon: "users",
    questions: [
      {
        text: "Dars paytida o‘quvchi doim gaplashib, boshqalarga xalaqit bersa, nima qilasiz?",
        hint: "Xotirjamlik, ko‘z bilan aloqa yoki yaqinlashish, qoidani eslatish, darsdan keyin alohida suhbat, sababini aniqlash. Baqirish, haqorat, sinfdan haydash — salbiy belgi.",
      },
      {
        text: "Birinchi darsda guruh bilan qanday qoidalar o‘rnatasiz va ularga qanday rioya qildirasiz?",
        hint: "Qoidalarni o‘quvchilar bilan birga kelishish, kam va aniq qoidalar, izchillik, rag‘bat va oqibat tizimi.",
      },
      {
        text: "Guruh darsdan zerikib, qiziqishi yo‘qolib qolsa, darhol nima qilasiz?",
        hint: "Faoliyat turini almashtirish, qisqa harakatli mashq yoki o‘yin, savol va munozara, hayotiy misol, guruhga bo‘lish.",
      },
      {
        text: "Vaqtni qanday boshqarasiz: reja tugamay qolsa yoki vaqt ortib qolsa nima qilasiz?",
        hint: "Zaxira topshiriqlar tayyor turadi, eng muhim qism birinchi o‘tiladi, qolgani keyingi darsga moslanadi, har bir bosqichga vaqt chegarasi.",
      },
    ],
  },
  {
    title: "O‘quvchi bilan individual ishlash",
    color: "#10b981",
    icon: "heart",
    questions: [
      {
        text: "Guruhda darajasi har xil (kuchli va zaif) o‘quvchilar bo‘lsa, ular bilan qanday ishlaysiz?",
        hint: "Har xil qiyinlikdagi topshiriqlar, kuchli va zaifni juftlikka qo‘yish, kuchliga qo‘shimcha material, zaifga individual yordam.",
      },
      {
        text: "Mavzuni tushunmay, ortda qolayotgan o‘quvchiga qanday yordam berasiz?",
        hint: "Sababini aniqlash, boshqacha usulda qayta tushuntirish, kichik bosqichlarga bo‘lish, qo‘shimcha dars yoki vazifa, ota-ona bilan aloqa, sabr.",
      },
      {
        text: "O‘quvchini qanday motivatsiya qilasiz? Aniq misol bilan ayting.",
        hint: "Aniq va o‘z vaqtidagi maqtov, kichik muvaffaqiyatlarni ko‘rsatish, maqsad qo‘yish, o‘yin va musobaqa, o‘quvchi qiziqishiga bog‘lash.",
      },
      {
        text: "O‘quvchi uyga vazifani muntazam bajarmay kelsa, nima qilasiz?",
        hint: "Sababini so‘rash, vazifa hajmi va qiyinligini qayta ko‘rish, nazorat tizimi, ota-ona bilan bog‘lanish, rag‘bat. Faqat jazo bilan cheklansa — zaif javob.",
      },
    ],
  },
  {
    title: "Baholash va natija",
    color: "#f59e0b",
    icon: "chart",
    questions: [
      {
        text: "O‘quvchi bilimini qanday tekshirasiz va baholaysiz?",
        hint: "Og‘zaki, yozma, test, loyiha; joriy va oraliq nazorat; baholash mezonlari oldindan aytiladi; adolatli va shaffof.",
      },
      {
        text: "O‘quvchiga xatosini qanday aytasiz? Fikr-mulohazani qanday berasiz?",
        hint: "Avval yaxshi tomonini aytish, xatoni aniq va konstruktiv ko‘rsatish, o‘zi topishiga yordam berish. Ko‘pchilik oldida uyaltirmaslik.",
      },
      {
        text: "O‘quvchining oyma-oy rivojlanishini qanday kuzatasiz va natijani qanday ko‘rsatasiz?",
        hint: "Jurnal yoki jadval, oylik test, portfolio, natija grafigi, ota-onaga muntazam hisobot.",
      },
      {
        text: "Guruhingizdan o‘quvchilar ketib qolmasligi uchun nima qilasiz?",
        hint: "Qiziqarli darslar, har bir o‘quvchiga e’tibor, natijani ko‘rsatish, davomatni kuzatish, ketish sababini erta aniqlash, ota-ona bilan aloqa.",
      },
    ],
  },
  {
    title: "Muloqot, rivojlanish va kasbiy etika",
    color: "#ec4899",
    icon: "chat",
    questions: [
      {
        text: "Norozi ota-ona kelib «Farzandim hech narsa o‘rganmayapti» desa, qanday gaplashasiz?",
        hint: "Xotirjam tinglash, aniq ma’lumot (davomat, baholar, ishlar), yaxshilash rejasini taklif qilish, hamkorlik. Bahslashish yoki aybni boshqaga ag‘darish — salbiy.",
      },
      {
        text: "Oxirgi bir yilda malakangizni oshirish uchun nima qildingiz?",
        hint: "Aniq misollar: kurs, sertifikat, kitob, seminar, hamkasblar darsini kuzatish, o‘z darsini tahlil qilish.",
      },
      {
        text: "Muvaffaqiyatsiz o‘tgan bir darsingizni eslang: nima bo‘ldi va qanday xulosa chiqardingiz?",
        hint: "O‘z xatosini tan olish, sababini tahlil qilish, keyin nimani o‘zgartirganini aytish. «Bunday bo‘lmagan» degan javob — zaif.",
      },
      {
        text: "Siz uchun yaxshi o‘qituvchi kim? Nima uchun aynan o‘qituvchilikni tanladingiz?",
        hint: "O‘quvchiga mehr, mas’uliyat, sabr, doimiy o‘rganish. Samimiy va aniq motivatsiya bo‘lishi kerak.",
      },
    ],
  },
];

export const ASSESSMENT_QUESTIONS = ASSESSMENT_SECTIONS.flatMap((section) => section.questions);
export const MAX_SCORE = ASSESSMENT_QUESTIONS.length * MAX_PER_QUESTION;

// 100 ballik natija bo'yicha xulosa
export function assessmentGrade(total) {
  if (total == null) return { key: "none", label: "Baholanmagan", advice: "" };
  if (total >= 85) return { key: "excellent", label: "A’lo", advice: "Ishga olish tavsiya etiladi" };
  if (total >= 70) return { key: "good", label: "Yaxshi", advice: "Ishga olsa bo‘ladi" };
  if (total >= 55) return { key: "average", label: "O‘rtacha", advice: "Sinov muddati bilan olish mumkin" };
  if (total >= 40) return { key: "weak", label: "Zaif", advice: "Tavsiya etilmaydi" };
  return { key: "poor", label: "Mos emas", advice: "Pedagogik tajriba yetarli emas" };
}
