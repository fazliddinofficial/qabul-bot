import fs, { write } from "fs";
import { readFile, writeFile } from "fs/promises";
import path from "path";

const USERS_FILE = path.join(process.cwd(), "users.json");

export const userTestData = {
  1328121428: ["manager"],
  1328121438: ["manager"],
  1328121425: ["manager"],
};

export const stringtype = JSON.stringify(userTestData);

export function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading users:", error);
  }
  return "";
}

export async function writeData(data) {
  if (typeof data === "string") {
    await writeFile("users.json", data);
  }
}

writeData(userTestData);
