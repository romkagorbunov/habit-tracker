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

export async function getHabitsWithHistory() {
  const habits = await getHabits();
  const now = new Date();
  const yearStr = `${now.getFullYear()}`;
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const allHistory = await db.getAllAsync<{habit_id: string, date: string}>(
    `SELECT habit_id, date FROM habit_days`
  );

  return habits.map(habit => {
    const history = allHistory.filter(h => h.habit_id === habit.id);
    return {
      ...habit,
      doneDays: history.map(h => h.date),
      monthCount: history.filter(h => h.date.startsWith(monthStr)).length,
      yearCount: history.filter(h => h.date.startsWith(yearStr)).length
    };
  });
}

export async function getHabitStats(habitId: string): Promise<{ month: number, year: number }> {
  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const yearCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM habit_days WHERE habit_id = ? AND date >= ?',
    [habitId, yearStart]
  );

  const monthCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM habit_days WHERE habit_id = ? AND date >= ?',
    [habitId, monthStart]
  );

  return {
    month: monthCount?.count || 0,
    year: yearCount?.count || 0
  };
}
