import * as SQLite from 'expo-sqlite';

// Открываем базу синхронно (новый API)
export const db = SQLite.openDatabaseSync('habits.db');

export function initDb() {
  // В новом API вместо .transaction(tx => ...) 
  // можно использовать прямой метод execSync для инициализации
  db.execSync(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS habit_days (
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (habit_id, date)
    );
  `);
}
