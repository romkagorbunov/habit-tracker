import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Dimensions, 
  useColorScheme 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toggleHabitDay, getDoneDays } from '../storage/habits';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HabitCalendarScreen({ route, navigation }: any) {
  const { habitId, habitName } = route.params;
  const [doneDays, setDoneDays] = useState<string[]>([]);
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  
  const systemColorScheme = useColorScheme();
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Логика определения темы (такая же, как на главном экране)
  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  const theme = {
    bg: isDark ? '#000000' : '#f8f9fa',
    card: isDark ? '#1C1C1E' : '#ffffff',
    text: isDark ? '#FFFFFF' : '#1a1a1a',
    textSecondary: isDark ? '#8E8E93' : '#666',
    border: isDark ? '#38383A' : '#eee',
    dayDefault: isDark ? '#2C2C2E' : '#f0f0f0',
    accent: '#5856D6',
  };

  // 2. Загрузка данных и сохраненной темы
  useEffect(() => {
    const init = async () => {
      const savedTheme = await AsyncStorage.getItem('user_theme');
      if (savedTheme) setThemeMode(savedTheme as any);
      loadDoneDays();
    };
    init();
  }, []);

  // Синхронизация заголовка навигации с темой
  useEffect(() => {
    navigation.setOptions({
      headerTitle: habitName,
      headerStyle: { backgroundColor: theme.bg },
      headerTintColor: theme.text,
      headerShadowVisible: false,
    });
  }, [themeMode, isDark]);

  async function loadDoneDays() {
    const data = await getDoneDays(habitId);
    setDoneDays(data);
  }

  // Генерируем список месяцев (например, за последние 5 лет)
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({ 
        id: `${d.getFullYear()}-${d.getMonth()}`, 
        year: d.getFullYear(), 
        month: d.getMonth() 
      });
    }
    return result;
  }, []);

  // Компонент одного месяца
  const MonthItem = ({ year, month }: { year: number, month: number }) => {
    const days = [];
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Пн - 0
    const lastDay = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) days.push(null);
    for (let i = 1; i <= lastDay; i++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    }

    const monthTitle = new Date(year, month).toLocaleString('ru-RU', { 
      month: 'long', 
      year: 'numeric' 
    }).toUpperCase();

    return (
      <View style={styles.monthContainer}>
        <Text style={[styles.monthLabel, { color: theme.textSecondary }]}>{monthTitle}</Text>
        <View style={styles.grid}>
          {days.map((date, i) => {
            if (!date) return <View key={`empty-${i}`} style={styles.dayCell} />;
            
            const isDone = doneDays.includes(date);
            const isToday = date === todayStr;
            const isFuture = date > todayStr;

            return (
              <TouchableOpacity
                key={date}
                disabled={isFuture}
                onPress={async () => {
                  await toggleHabitDay(habitId, date, !isDone);
                  loadDoneDays();
                }}
                style={[
                  styles.dayCell,
                  { backgroundColor: theme.dayDefault },
                  isDone && { backgroundColor: theme.accent },
                  isToday && !isDone && { borderColor: theme.accent, borderWidth: 2 },
                  isFuture && { opacity: 0.15 }
                ]}
              >
                <Text style={[
                  styles.dayText, 
                  { color: theme.text },
                  isDone && { color: '#fff', fontWeight: 'bold' }
                ]}>
                  {parseInt(date.split('-')[2])}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <FlatList
        data={months}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingVertical: 10 }}
        renderItem={({ item }) => <MonthItem year={item.year} month={item.month} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  monthContainer: { marginBottom: 30, paddingHorizontal: 15 },
  monthLabel: { 
    fontSize: 14, 
    fontWeight: '800', 
    marginBottom: 12, 
    letterSpacing: 1 
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    justifyContent: 'flex-start'
  },
  dayCell: { 
    width: (SCREEN_WIDTH - 30) / 7 - 6, 
    height: (SCREEN_WIDTH - 30) / 7 - 6, 
    margin: 3, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  dayText: { fontSize: 13 },
});