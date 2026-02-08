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

export const POSITION_KEYBOARD = VALID_POSITIONS.map((pos) => [{ text: pos }]);
