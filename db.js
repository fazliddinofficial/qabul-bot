import Database from "better-sqlite3";

const db = new Database("database.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    jobsTitle TEXT NOT NULL
  );
`);

export function createUser({ userId, jobsTitle }) {
  const stmt = db.prepare(`
    INSERT INTO users (userId, jobsTitle)
    VALUES (?, ?)
  `);

  return stmt.run(
    userId,
    JSON.stringify(jobsTitle) 
  );
}

export function getAllUsers() {
  const users = db.prepare("SELECT * FROM users").all();

  return users.map(user => ({
    ...user,
    jobsTitle: JSON.parse(user.jobsTitle)
  }));
}

export function getUserById(userId) {
  const user = db
    .prepare("SELECT * FROM users WHERE userId = ?")
    .get(userId);

  if (!user) return null;

  return {
    ...user,
    jobsTitle: JSON.parse(user.jobsTitle)
  };
}


export function addJobToUser(userId, newJob) {
  const user = getUserById(userId);
  if (!user) return null;

  user.jobsTitle.push(newJob);

  return db.prepare(`
    UPDATE users
    SET jobsTitle = ?
    WHERE userId = ?
  `).run(JSON.stringify(user.jobsTitle), userId);
}

