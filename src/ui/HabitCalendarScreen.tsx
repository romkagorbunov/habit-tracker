import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { toggleHabitDay, getDoneDays } from '../storage/habits';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function HabitCalendarScreen({ route }: any) {
  const { habitId, habitName } = route.params;
  const [doneDays, setDoneDays] = useState<string[]>([]);
  const now = new Date();

  useEffect(() => {
    loadDoneDays();
  }, []);

  async function loadDoneDays() {
    const data = await getDoneDays(habitId);
    setDoneDays(data);
  }

  // Генерируем список месяцев на 5 лет (60 месяцев)
  const months = useMemo(() => {
    const result = [];
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    
    for (let i = 0; i < 60; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() - i, 1);
      result.push({
        id: `${d.getFullYear()}-${d.getMonth()}`,
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }
    return result;
  }, []);

  const handlePress = async (date: string) => {
    const isDone = doneDays.includes(date);
    await toggleHabitDay(habitId, date, !isDone);
    loadDoneDays();
  };

  // Компонент одного месяца
  const MonthItem = ({ year, month }: { year: number, month: number }) => {
    const days = [];
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const lastDay = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) days.push(null);
    for (let i = 1; i <= lastDay; i++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    }

    const monthName = new Date(year, month).toLocaleString('ru-RU', { month: 'long' });

    return (
      <View style={styles.monthContainer}>
        <Text style={styles.monthLabel}>{monthName.toUpperCase()} {year}</Text>
        <View style={styles.dayNamesRow}>
          {DAY_NAMES.map(d => <Text key={d} style={styles.dayNameText}>{d}</Text>)}
        </View>
        <View style={styles.grid}>
          {days.map((date, index) => {
            if (!date) return <View key={`empty-${index}`} style={styles.dayEmpty} />;
            
            const isDone = doneDays.includes(date);
            const isToday = date === now.toISOString().slice(0, 10);
            const dayNum = date.split('-')[2];

            return (
              <TouchableOpacity
                key={date}
                onPress={() => handlePress(date)}
                style={[styles.day, isDone && styles.dayDone, isToday && !isDone && styles.todayBorder]}
              >
                <Text style={[styles.dayText, isDone && styles.dayTextDone]}>{parseInt(dayNum)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{habitName}</Text>
      
      <FlatList
        data={months}
        keyExtractor={item => item.id}
        initialNumToRender={2}
        renderItem={({ item }) => <MonthItem year={item.year} month={item.month} />}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      <TouchableOpacity 
        style={styles.todayButton} 
        onPress={() => handlePress(now.toISOString().slice(0, 10))}
      >
        <Text style={styles.todayButtonText}>Выполнено сегодня</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', padding: 15, backgroundColor: '#fff', zIndex: 10 },
  monthContainer: { marginBottom: 30, paddingHorizontal: 10 },
  monthLabel: { fontSize: 18, fontWeight: '600', color: '#555', marginBottom: 10, marginLeft: 5 },
  dayNamesRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 5 },
  dayNameText: { width: (SCREEN_WIDTH - 40) / 7, textAlign: 'center', color: '#bbb', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { 
    width: (SCREEN_WIDTH - 40) / 7, 
    height: (SCREEN_WIDTH - 40) / 7, 
    margin: 2, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#f9f9f9' 
  },
  dayEmpty: { width: (SCREEN_WIDTH - 40) / 7, height: (SCREEN_WIDTH - 40) / 7, margin: 2 },
  dayDone: { backgroundColor: '#5856D6' },
  todayBorder: { borderWidth: 2, borderColor: '#5856D6' },
  dayText: { fontSize: 16, color: '#444' },
  dayTextDone: { color: '#fff', fontWeight: 'bold' },
  todayButton: { 
    position: 'absolute', bottom: 30, left: 20, right: 20,
    backgroundColor: '#5856D6', padding: 18, borderRadius: 16,
    alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  todayButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});