import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';
import { 
  addHabit, 
  getHabitsWithHistory, 
  updateHabitName, 
  deleteHabit, 
  toggleHabitDay 
} from '../storage/habits';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HabitListScreen({ navigation }: any) {
  const [habits, setHabits] = useState<any[]>([]);
  const [text, setText] = useState('');

  // 1. Загрузка данных
  async function loadHabits() {
    try {
      const data = await getHabitsWithHistory();
      setHabits(data);
    } catch (e) {
      console.error("Ошибка загрузки данных", e);
    }
  }

  useEffect(() => {
    loadHabits();
  }, []);

  // 2. Генерация сетки текущего месяца для превью
  const currentMonthDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Пн - 0, Вс - 6
    const lastDay = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < offset; i++) days.push(null); // Пустые ячейки для выравнивания
    for (let i = 1; i <= lastDay; i++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    }
    return days;
  }, []);

  // 3. Действия (Добавление, Редактирование, Удаление)
  async function onAddHabit() {
    if (text.trim().length === 0) return;
    await addHabit(text.trim());
    setText('');
    await loadHabits();
  }

  function onEditHabit(id: string, currentName: string) {
    Alert.alert(
      "Управление привычкой",
      `Настройки для "${currentName}"`,
      [
        { text: "Отмена", style: "cancel" },
        { text: "Переименовать", onPress: () => showRenamePrompt(id, currentName) },
        { text: "Удалить", style: "destructive", onPress: () => confirmDelete(id, currentName) }
      ]
    );
  }

  function showRenamePrompt(id: string, currentName: string) {
    Alert.prompt(
      "Переименовать",
      "Введите новое название",
      [{ text: "Отмена", style: "cancel" },
       { text: "Сохранить", onPress: async (newName) => {
         if (newName?.trim()) {
           await updateHabitName(id, newName.trim());
           await loadHabits();
         }
       }}],
      "plain-text",
      currentName
    );
  }

  async function confirmDelete(id: string, name: string) {
    Alert.alert("Удаление", `Удалить "${name}"?`, [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: async () => {
        await deleteHabit(id);
        await loadHabits();
      }}
    ]);
  }

  // 4. Отрисовка мини-календаря
  const renderMonthPreview = (habit: any) => (
    <View style={styles.monthGrid}>
      {currentMonthDays.map((date, index) => {
        if (!date) return <View key={`empty-${index}`} style={styles.miniDotEmpty} />;
        
        const isDone = habit.doneDays.includes(date);
        const isToday = date === new Date().toISOString().slice(0, 10);
        
        return (
          <TouchableOpacity
            key={date}
            onPress={async () => {
              // Запрет на будущее прямо в превью
              if (date > new Date().toISOString().slice(0, 10)) return;
              await toggleHabitDay(habit.id, date, !isDone);
              await loadHabits();
            }}
            style={[
              styles.miniDot, 
              isDone && styles.miniDotDone,
              isToday && !isDone && styles.miniDotToday
            ]}
          >
            <Text style={[styles.miniText, isDone && styles.miniTextDone]}>
              {date.split('-')[2]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Новая привычка..."
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
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.habitCard}>
            <TouchableOpacity
              onPress={() => navigation.navigate('HabitCalendar', { 
                habitId: item.id, 
                habitName: item.name 
              })}
              onLongPress={() => onEditHabit(item.id, item.name)}
              style={styles.habitMainInfo}
            >
              <View>
                <Text style={styles.habitText}>{item.name}</Text>
                <Text style={styles.editHint}>удерживайте для настроек</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
            
            {renderMonthPreview(item)}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  inputContainer: { flexDirection: 'row', marginBottom: 20, marginTop: 10 },
  input: { 
    flex: 1, backgroundColor: '#fff', padding: 15, 
    borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#eee' 
  },
  addButton: { 
    backgroundColor: '#5856D6', width: 55, marginLeft: 10, 
    borderRadius: 12, justifyContent: 'center', alignItems: 'center' 
  },
  addButtonText: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  habitCard: { 
    backgroundColor: '#fff', borderRadius: 18, marginBottom: 15, 
    padding: 15, elevation: 3, shadowColor: '#000', 
    shadowOpacity: 0.05, shadowRadius: 10 
  },
  habitMainInfo: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', marginBottom: 10 
  },
  habitText: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  editHint: { fontSize: 10, color: '#bbb' },
  arrow: { fontSize: 20, color: '#ddd' },
  monthGrid: { 
    flexDirection: 'row', flexWrap: 'wrap', 
    borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 10 
  },
  miniDot: { 
    width: (SCREEN_WIDTH - 80) / 7, height: 28, margin: 1, 
    borderRadius: 6, backgroundColor: '#f9f9f9', 
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#f0f0f0'
  },
  miniDotEmpty: { width: (SCREEN_WIDTH - 80) / 7, height: 28, margin: 1 },
  miniDotDone: { backgroundColor: '#5856D6', borderColor: '#5856D6' },
  miniDotToday: { borderColor: '#5856D6', borderWidth: 1.5 },
  miniText: { fontSize: 10, color: '#999' },
  miniTextDone: { color: '#fff', fontWeight: 'bold' },
});