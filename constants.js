export const POSITION_OPTIONS = {
  manager: "Manager",
  admin: "Admin",
  english: "Ingliz tili o'qituvchisi",
  russian: "Rus tili o'qituvchisi",
  korean: "Koreys tili o'qituvchisi",
  german: "Nemis tili o'qituvchisi",
  japanese: "Yapon tili o'qituvchisi",
  arabic: "Arab tili o'qituvchisi",
  turkish: "Turk tili o'qituvchisi",
  motherTongueAndLiterature: "Ona tili va adabiyot o'qituvchisi",
  mathAndScience: "Matematika va fizika o'qituvchisi",
  biologyAndChemistry: "Biologiya va kimyo o'qituvchisi",
  computerOffice: "Kompyuter va ofis dasturlari o'qituvchisi",
  webDevelopment: "Veb dasturlash o'qituvchisi",
  graphicDesign: "Grafik dizayn o'qituvchisi",
  accounting: "Buxgalteriya o'qituvchisi",
  marketing: "SMM va mobilografiya mutaxassis",
  trading: "Treyding o'qituvchisi",
};

export const VALID_POSITIONS = Object.values(POSITION_OPTIONS);

export const DEPARTMENTS = [
  {
    id: "office",
    name: "Ma’muriyat",
    positions: [POSITION_OPTIONS.manager, POSITION_OPTIONS.admin],
  },
  {
    id: "languages",
    name: "Chet tillari",
    positions: [
      POSITION_OPTIONS.english,
      POSITION_OPTIONS.russian,
      POSITION_OPTIONS.korean,
      POSITION_OPTIONS.german,
      POSITION_OPTIONS.japanese,
      POSITION_OPTIONS.arabic,
      POSITION_OPTIONS.turkish,
    ],
  },
  {
    id: "subjects",
    name: "Fanlar",
    positions: [
      POSITION_OPTIONS.mathAndScience,
      POSITION_OPTIONS.biologyAndChemistry,
      POSITION_OPTIONS.computerOffice,
      POSITION_OPTIONS.webDevelopment,
      POSITION_OPTIONS.graphicDesign,
      POSITION_OPTIONS.accounting,
    ],
  },
  {
    id: "specialists",
    name: "Mutaxassislar",
    positions: [POSITION_OPTIONS.marketing, POSITION_OPTIONS.trading],
  },
];

export const POSITION_KEYBOARD = VALID_POSITIONS.map((pos) => [{ text: pos }]);
