import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, TextInput, 
  StyleSheet, Alert, Dimensions, useColorScheme 
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  addHabit, getHabitsWithHistory, updateHabitName, 
  deleteHabit, toggleHabitDay 
} from '../storage/habits';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HabitListScreen({ navigation }: any) {
  const [habits, setHabits] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  
  const isFocused = useIsFocused();
  const systemColorScheme = useColorScheme();

  // 1. Логика темы
  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  const theme = {
    bg: isDark ? '#000000' : '#f8f9fa',
    card: isDark ? '#1C1C1E' : '#ffffff',
    text: isDark ? '#FFFFFF' : '#1a1a1a',
    textSecondary: isDark ? '#8E8E93' : '#666',
    border: isDark ? '#38383A' : '#eee',
    dot: isDark ? '#2C2C2E' : '#f0f0f0',
    accent: '#5856D6',
  };

  // 2. Загрузка данных и темы
  useEffect(() => {
    const init = async () => {
      const savedTheme = await AsyncStorage.getItem('user_theme');
      if (savedTheme) setThemeMode(savedTheme as any);
      loadHabits();
    };
    init();
  }, []);

  useEffect(() => {
    if (isFocused) loadHabits();
  }, [isFocused]);

  // Настройка шапки (кнопка переключения темы)
  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'Мои привычки',
      headerStyle: { backgroundColor: theme.bg },
      headerTintColor: theme.text,
      headerRight: () => (
        <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 15 }}>
          <Text style={{ fontSize: 20 }}>
            {themeMode === 'system' ? '🌓' : themeMode === 'dark' ? '🌙' : '☀️'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [themeMode, isDark]);

  async function loadHabits() {
    const data = await getHabitsWithHistory();
    setHabits(data);
  }

  const toggleTheme = async () => {
    const modes: ('system' | 'light' | 'dark')[] = ['system', 'light', 'dark'];
    const nextIndex = (modes.indexOf(themeMode) + 1) % modes.length;
    const nextMode = modes[nextIndex];
    setThemeMode(nextMode);
    await AsyncStorage.setItem('user_theme', nextMode);
  };

  // 3. Сетка месяца
  const currentMonthDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1; 
    const lastDay = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let i = 1; i <= lastDay; i++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    }
    return days;
  }, []);

  // 4. Функции управления
  async function onAddHabit() {
    if (text.trim().length === 0) return;
    await addHabit(text.trim());
    setText('');
    loadHabits();
  }

  function onEditHabit(id: string, currentName: string) {
    Alert.alert("Настройки", `Привычка: ${currentName}`, [
      { text: "Отмена", style: "cancel" },
      { text: "Переименовать", onPress: () => showRenamePrompt(id, currentName) },
      { text: "Удалить", style: "destructive", onPress: () => confirmDelete(id, currentName) }
    ]);
  }

  function showRenamePrompt(id: string, currentName: string) {
    Alert.prompt("Переименовать", "Введите название", [
      { text: "Отмена", style: "cancel" },
      { text: "ОК", onPress: async (val) => { 
          if(val) { await updateHabitName(id, val); loadHabits(); } 
      }}
    ], "plain-text", currentName);
  }

  async function confirmDelete(id: string, name: string) {
    Alert.alert("Удаление", `Удалить ${name}?`, [
      { text: "Отмена" },
      { text: "Удалить", style: "destructive", onPress: async () => { await deleteHabit(id); loadHabits(); }}
    ]);
  }

  const renderMonthPreview = (habit: any) => (
    <View style={[styles.monthGrid, { borderTopColor: theme.border }]}>
      {currentMonthDays.map((date, index) => {
        if (!date) return <View key={`empty-${index}`} style={styles.miniDotEmpty} />;
        const isDone = habit.doneDays.includes(date);
        const isToday = date === new Date().toISOString().slice(0, 10);
        const isFuture = date > new Date().toISOString().slice(0, 10);
        
        return (
          <TouchableOpacity
            key={date}
            disabled={isFuture}
            onPress={async () => {
              await toggleHabitDay(habit.id, date, !isDone);
              loadHabits();
            }}
            style={[
              styles.miniDot, { backgroundColor: theme.dot, borderColor: theme.border },
              isDone && { backgroundColor: theme.accent, borderColor: theme.accent },
              isToday && !isDone && { borderColor: theme.accent, borderWidth: 1.5 },
              isFuture && { opacity: 0.2 }
            ]}
          >
            <Text style={[styles.miniText, { color: theme.textSecondary }, isDone && { color: '#fff', fontWeight: 'bold' }]}>
              {date.split('-')[2]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          placeholder="Новая привычка..."
          placeholderTextColor={isDark ? '#555' : '#ccc'}
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.addButton} onPress={onAddHabit}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={habits}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.habitCard, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              onPress={() => navigation.navigate('HabitCalendar', { habitId: item.id, habitName: item.name })}
              onLongPress={() => onEditHabit(item.id, item.name)}
              style={styles.habitMainInfo}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.habitText, { color: theme.text }]}>{item.name}</Text>
                
                <View style={styles.statsRow}>
                  <View style={[styles.statBadge, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                    <Text style={styles.statLabel}>МЕСЯЦ:</Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>{item.monthCount}</Text>
                    <Text style={styles.statMax}>/ {item.maxMonthCount}</Text>
                  </View>
                  <View style={[styles.statBadge, { backgroundColor: isDark ? '#3A2A00' : '#FFF5E6' }]}>
                    <Text style={[styles.statLabel, { color: '#FF9500' }]}>🔥 СТРИК:</Text>
                    <Text style={[styles.statValue, { color: '#FF9500' }]}>{item.currentStreak}</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statBadge, { backgroundColor: isDark ? '#1A1A35' : '#EBEBFB' }]}>
                    <Text style={[styles.statLabel, { color: '#5856D6' }]}>ГОД:</Text>
                    <Text style={[styles.statValue, { color: '#5856D6' }]}>{item.yearCount}</Text>
                    <Text style={styles.statMax}>/ {item.maxYearCount}</Text>
                  </View>
                  <View style={[styles.statBadge, { backgroundColor: isDark ? '#0A2A1A' : '#E6F9F0' }]}>
                    <Text style={[styles.statLabel, { color: '#34C759' }]}>🏆 РЕКОРД:</Text>
                    <Text style={[styles.statValue, { color: '#34C759' }]}>{item.maxStreak}</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.arrow, { color: theme.border }]}>›</Text>
            </TouchableOpacity>
            {renderMonthPreview(item)}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  inputContainer: { flexDirection: 'row', marginBottom: 20, marginTop: 10 },
  input: { flex: 1, padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1 },
  addButton: { backgroundColor: '#5856D6', width: 55, marginLeft: 10, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  habitCard: { borderRadius: 18, marginBottom: 15, padding: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  habitMainInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  habitText: { fontSize: 18, fontWeight: '700', marginBottom: 5 },
  statsRow: { flexDirection: 'row', marginTop: 5 },
  statBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  statLabel: { fontSize: 8, fontWeight: '900', color: '#8E8E93', marginRight: 3 },
  statValue: { fontSize: 11, fontWeight: 'bold' },
  statMax: { fontSize: 8, color: '#666', marginLeft: 2 },
  arrow: { fontSize: 24, marginLeft: 10 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, paddingTop: 10 },
  miniDot: { width: (SCREEN_WIDTH - 80) / 7, height: 28, margin: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  miniDotEmpty: { width: (SCREEN_WIDTH - 80) / 7, height: 28, margin: 1 },
  miniText: { fontSize: 9 },
});