export const POSITION_OPTIONS = {
  teacher: "Fan o'qituvchi",
  admin: "Admin",
  english: "Ingliz tili o'qituvchi",
  russian: "Rus tili o'qituvchi",
  math: "Matematika o'qituvchi",
  biology: "Biologiya o'qituvchi",
  chemistry: "Kimyo o'qituvchi",
  arabic: "Arab tili o'qituvchi",
};

export const VALID_POSITIONS = Object.values(POSITION_OPTIONS);

export const POSITION_KEYBOARD = VALID_POSITIONS.map((pos) => [{ text: pos }]);
