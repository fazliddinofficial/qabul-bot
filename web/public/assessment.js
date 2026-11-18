// Birinchi suhbat savollari. O'qituvchilar uchun pedagogik savollar,
// Admin va Manager lavozimlari uchun alohida to'plamlar (har biri 20 ta savol).
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

// ---------------------------------------------------------------------------
// O'quv markaz ADMINISTRATORI uchun birinchi suhbat (20 savol × 5 ball)
// ---------------------------------------------------------------------------
export const ADMIN_SECTIONS = [
  {
    title: "Mijoz bilan muloqot",
    color: "#6366f1",
    questions: [
      {
        text: "Markazga birinchi marta kelgan ota-onani qanday kutib olasiz? Suhbatni boshidan oxirigacha aytib bering.",
        hint: "Salomlashish va o‘zini tanishtirish, ehtiyojni so‘rash (yoshi, darajasi, maqsadi), kurs haqida aniq ma’lumot, sinov darsiga yozish, telefon raqamini olish.",
      },
      {
        text: "Men mijozman, qo‘ng‘iroq qilib «Kurs narxi qancha?» deb so‘rayapman. Menga hozir javob bering (rolli o‘yin).",
        hint: "Markaz nomi va o‘z ismi bilan boshlaydi, iliq ohang; narxdan oldin ehtiyojni so‘raydi, kurs qiymatini tushuntiradi, sinov darsiga taklif qiladi, raqamni yozib oladi.",
      },
      {
        text: "Jahli chiqqan ota-ona kelib «Pulimni qaytaring!» deb baqirsa, nima qilasiz?",
        hint: "Xotirjamlik, oxirigacha tinglash, alohida joyga taklif qilish, muammoni yozib olish, rahbarga yetkazish. O‘zboshimchalik bilan va’da bermaslik — qoidaga muvofiq ish.",
      },
      {
        text: "Bir vaqtda telefon jiringlayapti, qarshingizda mijoz turibdi va o‘qituvchi sizdan nimadir so‘rayapti. Nima qilasiz?",
        hint: "Ustuvorlik: oldidagi mijozga uzr so‘rab bir daqiqa, qo‘ng‘iroqni qisqa olib keyin qayta qo‘ng‘iroq qilish, o‘qituvchiga navbat. Asabiylashmaslik.",
      },
    ],
  },
  {
    title: "Tartib, hujjatlar va kompyuter",
    color: "#0ea5e9",
    questions: [
      {
        text: "O‘quvchilar davomatini qanday yuritasiz? Dars qoldirgan o‘quvchi bilan nima qilasiz?",
        hint: "Har darsda belgilash (jurnal yoki CRM), 1–2 marta qoldirsa ota-onaga qo‘ng‘iroq, sababini yozib qo‘yish, o‘qituvchini xabardor qilish.",
      },
      {
        text: "To‘lov muddati o‘tib ketgan o‘quvchilar bilan qanday ishlaysiz?",
        hint: "Qarzdorlar ro‘yxati, muloyim eslatma, aniq muddat kelishish, rahbarga hisobot, to‘lovga chek yoki kvitansiya.",
      },
      {
        text: "Qaysi dasturlarda ishlay olasiz (Excel, Google Sheets, CRM, Telegram)? Excelda aniq nima qila olasiz?",
        hint: "Jadval tuzish, filtr, saralash, oddiy formulalar (SUM va h.k.), CRM tajribasi. Iloji bo‘lsa amalda ko‘rsatishni so‘rang.",
      },
      {
        text: "Ish kuningizni qanday rejalashtirasiz? Ertalab ishga kelib birinchi nima qilasiz?",
        hint: "Kun jadvalini tekshirish, xonalar va darslar tayyorligi, qo‘ng‘iroqlar ro‘yxati, vazifalar ro‘yxati, kun oxirida hisobot.",
      },
    ],
  },
  {
    title: "Sotuv va mijozni saqlab qolish",
    color: "#10b981",
    questions: [
      {
        text: "«O‘ylab ko‘raman» deb ketayotgan mijozni qanday qilib qaytarasiz?",
        hint: "E’tirozni aniqlash (narx, vaqt, ishonch), bepul sinov darsini taklif qilish, kontaktni olib keyin qayta bog‘lanish. Bosim o‘tkazmaslik.",
      },
      {
        text: "O‘quvchi markazni tashlab ketmoqchi bo‘lsa, nima qilasiz?",
        hint: "Sababini muloyim so‘rash, guruh yoki o‘qituvchini almashtirishni taklif qilish, ota-ona bilan gaplashish, rahbarga xabar berish.",
      },
      {
        text: "Markazimiz haqida nimalarni bilasiz? Bizda qanday kurslar bor va nega aynan bizni tanlash kerak?",
        hint: "Suhbatga tayyorlanib kelganmi: kurslar, manzil, afzalliklar. Umuman bilmasa — qiziqishi past.",
      },
      {
        text: "Instagram yoki Telegramdan «Ma’lumot bering» deb yozgan mijozga qanday javob yozasiz?",
        hint: "Tez va savodli javob, salomlashish, aniq ma’lumot, savol bilan yakunlash (yoshi, darajasi), sinov darsiga taklif.",
      },
    ],
  },
  {
    title: "Mas’uliyat va jamoada ishlash",
    color: "#f59e0b",
    questions: [
      {
        text: "Xato qilib qo‘ydingiz (masalan, o‘quvchini noto‘g‘ri guruhga yozdingiz). Nima qilasiz?",
        hint: "Xatoni tan olish, darhol tuzatish, rahbarni xabardor qilish, qayta takrorlanmasligi uchun xulosa. Yashirish yoki boshqani ayblash — salbiy.",
      },
      {
        text: "Hamkasb bilan kelishmovchilik chiqsa, qanday hal qilasiz?",
        hint: "Yuzma-yuz, xotirjam gaplashish, umumiy maqsadni eslash, mijoz oldida janjal qilmaslik, rahbarga — oxirgi chora sifatida.",
      },
      {
        text: "Oldingi ish joyingizdan nega ketdingiz?",
        hint: "Samimiy va aniq javob, oldingi rahbarni yomonlamaslik. Tez-tez ish almashtirgan bo‘lsa — sababini aniqlang.",
      },
      {
        text: "Ish vaqti tugashiga 10 daqiqa qolganda mijoz kirib keldi. Nima qilasiz?",
        hint: "Xushmuomalalik bilan kutib olib xizmat ko‘rsatish, kerak bo‘lsa ertaga qayta bog‘lanishni kelishish. «Ish tugadi» deb qaytarib yuborish — salbiy.",
      },
    ],
  },
  {
    title: "Motivatsiya va barqarorlik",
    color: "#ec4899",
    questions: [
      {
        text: "Nima uchun aynan o‘quv markazida administrator bo‘lib ishlamoqchisiz?",
        hint: "Odamlar bilan ishlashni yoqtirish, ta’lim sohasiga qiziqish, o‘sish istagi. Faqat «ish kerak edi» — zaif motivatsiya.",
      },
      {
        text: "Bir yildan keyin o‘zingizni qayerda ko‘rasiz?",
        hint: "Markazda qolib o‘sish (katta administrator, menejer). Tez orada ketish yoki boshqa sohaga o‘tish rejasi — xavf belgisi.",
      },
      {
        text: "Ish jadvali, shanba kunlari va kechki smenada ishlashga tayyormisiz?",
        hint: "Aniq javob; cheklovlari bo‘lsa (o‘qish, oila) ochiq aytadi. Noaniq javob — keyin muammo bo‘lishi mumkin.",
      },
      {
        text: "Yaxshi administratorning 3 ta asosiy sifatini ayting. O‘zingizda qaysi biri kuchli, qaysi biri ustida ishlashingiz kerak?",
        hint: "Muloyimlik, tartiblilik, mas’uliyat, tezkorlik. O‘zini real baholashi va zaif tomonini tan olishi — yaxshi belgi.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// O'quv markaz MENEJERI uchun birinchi suhbat (20 savol × 5 ball)
// ---------------------------------------------------------------------------
export const MANAGER_SECTIONS = [
  {
    title: "Sotuv va mijoz jalb qilish",
    color: "#6366f1",
    questions: [
      {
        text: "Qiziqqan mijoz (lid) kelganda uni o‘quvchiga aylantirish jarayonini bosqichma-bosqich aytib bering.",
        hint: "Tez bog‘lanish (5–15 daqiqada), ehtiyojni aniqlash, mos taklif, sinov darsi, qayta bog‘lanish, to‘lov, CRMda belgilab borish.",
      },
      {
        text: "Mijoz «Qimmat ekan» dedi. Menga hozir javob bering (rolli o‘yin).",
        hint: "Narxni emas, qiymat va natijani ko‘rsatish, solishtirish, qoida doirasida bo‘lib to‘lash yoki taklif. Bosim yoki darhol chegirma — zaif.",
      },
      {
        text: "Oldingi ishingizda oylik sotuv rejasi qancha edi va uni qanday bajargansiz? Aniq raqamlar bilan ayting.",
        hint: "Aniq raqamlar: reja, natija, konversiya foizi. Umumiy gaplar va raqamsiz javob — zaif.",
      },
      {
        text: "Sinov darsiga kelib, kursga yozilmagan mijoz bilan nima qilasiz?",
        hint: "Fikrini so‘rash, sababini aniqlash, qayta bog‘lanish rejasi, maxsus taklif, CRMga yozib qo‘yish.",
      },
    ],
  },
  {
    title: "Marketing",
    color: "#0ea5e9",
    questions: [
      {
        text: "O‘quv markazga yangi o‘quvchilarni qaysi kanallar orqali jalb qilish mumkin?",
        hint: "Instagram/Telegram reklama, maktablar bilan hamkorlik, tavsiya (referral), ochiq darslar, tadbirlar, flayerlar. Bir nechta kanalni bilishi muhim.",
      },
      {
        text: "Reklama samarali ishlayotganini qanday o‘lchaysiz?",
        hint: "Lidlar soni, bitta lid narxi, lid → o‘quvchi konversiyasi, har bir kanal bo‘yicha alohida hisob, sarflangan pul va tushum.",
      },
      {
        text: "Hozirgi o‘quvchilar orqali yangi o‘quvchi olishning qanday usullarini bilasiz?",
        hint: "Do‘stini olib kelsa bonus, sertifikat va natijalarni ko‘rsatish, ota-onalar yig‘ilishi, mamnun mijozlar fikrlari.",
      },
      {
        text: "Yaqindagi raqobatchi markaz narxini tushirdi. Nima qilasiz?",
        hint: "Narx urushiga kirmaslik, o‘z qiymatini ko‘rsatish (sifat, natija, xizmat), raqobatchini tahlil qilish, vaqtinchalik maxsus taklif.",
      },
    ],
  },
  {
    title: "Jamoa va jarayonlarni boshqarish",
    color: "#10b981",
    questions: [
      {
        text: "Administratorlar va o‘qituvchilar ishini qanday nazorat qilasiz?",
        hint: "KPI va rejalar, kunlik/haftalik hisobot, CRM, darslarni kuzatish, muntazam yig‘ilishlar.",
      },
      {
        text: "Xodim rejani bajarmayapti. Nima qilasiz?",
        hint: "Sababini aniqlash, yakkama-yakka suhbat, yordam va o‘qitish, muddatli aniq reja, natija bo‘lmasa — keyingi chora.",
      },
      {
        text: "Rahbarga qanday hisobotlar tayyorlaysiz? Qaysi ko‘rsatkichlarni muntazam kuzatasiz?",
        hint: "O‘quvchilar soni, yangi va ketganlar, tushum, qarzdorlik, konversiya, guruhlar to‘liqligi.",
      },
      {
        text: "Yangi guruh ochish uchun o‘quvchilar yetarli emas. Nima qilasiz?",
        hint: "Kutish ro‘yxati, maqsadli reklama, guruhlarni birlashtirish, aniq ochilish sanasi, yozilganlar bilan doimiy aloqa.",
      },
    ],
  },
  {
    title: "Mijozni saqlab qolish va sifat",
    color: "#f59e0b",
    questions: [
      {
        text: "O‘quvchilar ketib qolishini qanday kamaytirasiz?",
        hint: "Davomatni nazorat qilish, ota-onaga natijani ko‘rsatish, o‘qituvchi sifati, so‘rovnomalar, ketish xavfini erta aniqlash.",
      },
      {
        text: "Ota-onadan o‘qituvchi haqida shikoyat keldi. Qanday hal qilasiz?",
        hint: "Tinglash, ikkala tomonni eshitish, darsni kuzatish, yechim topish, ota-onaga qayta javob berish.",
      },
      {
        text: "Markazdagi xizmat sifatini qanday o‘lchaysiz?",
        hint: "So‘rovnoma, o‘quvchi natijalari, shikoyatlar soni, ketganlar foizi, «sirli mijoz» tekshiruvi.",
      },
      {
        text: "Qarzdor o‘quvchilar bilan ishlash tizimini qanday tuzasiz?",
        hint: "Aniq to‘lov muddatlari, avtomatik eslatmalar, shartnoma, bo‘lib to‘lash qoidalari, chegaralar va mas’ul xodim.",
      },
    ],
  },
  {
    title: "Shaxsiy sifatlar va motivatsiya",
    color: "#ec4899",
    questions: [
      {
        text: "Eng katta ish yutug‘ingiz nima? Raqamlar bilan ayting.",
        hint: "Aniq natija va raqamlar (o‘sish foizi, tushum, o‘quvchilar soni), o‘zining hissasi aniq ko‘rsatiladi.",
      },
      {
        text: "Bir vaqtda ko‘p vazifa tushganda, bosim ostida qanday ustuvorlik qilasiz?",
        hint: "Muhimlik va shoshilinchlik bo‘yicha saralash, vazifalarni taqsimlash, rejalashtirish vositalari, xotirjamlik.",
      },
      {
        text: "Nega aynan bizning markazda menejer bo‘lmoqchisiz? Markaz haqida nimalarni bilasiz?",
        hint: "Tayyorlanib kelganmi, markaz va raqobatchilarni biladimi, uzoq muddatli maqsadi bormi.",
      },
      {
        text: "Olti oydan keyin ishingizni qaysi ko‘rsatkichlar bilan baholash kerak deb o‘ylaysiz?",
        hint: "O‘zi aniq KPI taklif qilsa (o‘quvchilar soni, konversiya, tushum, ketganlar foizi) — kuchli belgi.",
      },
    ],
  },
];

// Lavozimga qarab savollar to'plami. Saqlangan baho o'z to'plami bilan qoladi.
export const ASSESSMENT_SETS = {
  teacher: { title: "Pedagogik suhbat", sections: ASSESSMENT_SECTIONS },
  admin: { title: "Administrator suhbati", sections: ADMIN_SECTIONS },
  manager: { title: "Menejer suhbati", sections: MANAGER_SECTIONS },
};

export function assessmentKindFor(position) {
  const value = String(position || "").trim().toLowerCase();
  if (value === "admin") return "admin";
  if (value === "manager") return "manager";
  return "teacher";
}

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
