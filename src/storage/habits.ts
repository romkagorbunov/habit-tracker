import { db } from './sqlite';
import { Habit } from '../domain/types';

export async function addHabit(name: string): Promise<void> {
  const id = Math.random().toString(36).substring(7) + Date.now();
  const createdAt = new Date().toISOString();

  // Используем runSync для записи
  await db.runAsync(
    `INSERT INTO habits (id, name, created_at) VALUES (?, ?, ?)`,
    [id, name, createdAt]
  );
}

export async function getHabits(): Promise<Habit[]> {
  // Используем getAllAsync для получения массива объектов
  const allRows = await db.getAllAsync<Habit>(`SELECT * FROM habits ORDER BY created_at DESC`);
  return allRows;
}

export async function toggleHabitDay(habitId: string, date: string, isDone: boolean): Promise<void> {
  if (isDone) {
    await db.runAsync(
      `INSERT OR IGNORE INTO habit_days (habit_id, date) VALUES (?, ?)`,
      [habitId, date]
    );
  } else {
    await db.runAsync(
      `DELETE FROM habit_days WHERE habit_id = ? AND date = ?`,
      [habitId, date]
    );
  }
}

export async function getDoneDays(habitId: string): Promise<string[]> {
  const rows = await db.getAllAsync<{date: string}>(
    `SELECT date FROM habit_days WHERE habit_id = ?`,
    [habitId]
  );
  return rows.map(r => r.date);
}

// src/storage/habits.ts
export async function updateHabitName(id: string, newName: string): Promise<void> {
  console.log("SQL UPDATE: ", newName, id); // Добавь этот лог
  // Важно: Сначала name, потом id, так как в запросе SET name = ? WHERE id = ?
  await db.runAsync(
    'UPDATE habits SET name = ? WHERE id = ?', 
    [newName, id]
  );
}

export async function deleteHabit(id: string): Promise<void> {
  // Сначала удаляем все дни выполнения этой привычки
  await db.runAsync('DELETE FROM habit_days WHERE habit_id = ?', [id]);
  // Затем саму привычку
  await db.runAsync('DELETE FROM habits WHERE id = ?', [id]);
}
