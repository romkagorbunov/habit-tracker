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

// Вспомогательная функция для расчета ТЕКУЩЕГО стрика
function calculateCurrentStreak(history: string[], todayStr: string): number {
  if (history.length === 0) return 0;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Стрик жив, если есть отметка сегодня или вчера
  const hasToday = history.includes(todayStr);
  const hasYesterday = history.includes(yesterdayStr);

  if (!hasToday && !hasYesterday) return 0;

  let streak = 0;
  let checkDate = new Date(hasToday ? todayStr : yesterdayStr);

  while (true) {
    const checkStr = checkDate.toISOString().slice(0, 10);
    if (history.includes(checkStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// Вспомогательная функция для расчета МАКСИМАЛЬНОГО стрика
function calculateMaxStreak(history: string[]): number {
  if (history.length === 0) return 0;
  
  const sorted = [...history].sort(); // Сортируем от старых к новым
  let max = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    
    // Добавляем 1 день к предыдущей дате
    prev.setDate(prev.getDate() + 1);
    
    if (prev.toISOString().slice(0, 10) === sorted[i]) {
      current++;
    } else {
      current = 1;
    }
    
    if (current > max) max = current;
  }
  return max;
}

// ОСНОВНАЯ ФУНКЦИЯ
export async function getHabitsWithHistory() {
  const habits = await getHabits(); // Твоя базовая функция получения списка
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7); // "2026-02"
  const currentYearStr = todayStr.slice(0, 4);   // "2026"

  // Загружаем всю историю из БД
  const allHistory = await db.getAllAsync<{ habit_id: string; date: string }>(
    `SELECT habit_id, date FROM habit_days ORDER BY date DESC`
  );

  return habits.map(habit => {
    // Фильтруем историю для конкретной привычки
    const history = allHistory
      .filter(h => h.habit_id === habit.id)
      .map(h => h.date);

    // Группируем данные для подсчета максимумов
    const monthsMap: { [key: string]: number } = {};
    const yearsMap: { [key: string]: number } = {};

    history.forEach(date => {
      const m = date.slice(0, 7);
      const y = date.slice(0, 4);
      monthsMap[m] = (monthsMap[m] || 0) + 1;
      yearsMap[y] = (yearsMap[y] || 0) + 1;
    });

    // Расчет текущих и рекордных значений
    const monthCount = monthsMap[currentMonthStr] || 0;
    const yearCount = yearsMap[currentYearStr] || 0;
    const maxMonthCount = Math.max(0, ...Object.values(monthsMap));
    const maxYearCount = Math.max(0, ...Object.values(yearsMap));

    return {
      ...habit,
      doneDays: history,
      monthCount,
      yearCount,
      maxMonthCount,
      maxYearCount,
      currentStreak: calculateCurrentStreak(history, todayStr),
      maxStreak: calculateMaxStreak(history)
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
