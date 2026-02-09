import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet,
  Alert
} from 'react-native';
import { Habit } from '../domain/types';
import { addHabit, getHabits, updateHabitName, deleteHabit } from '../storage/habits';


export default function HabitListScreen({ navigation }: any) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [text, setText] = useState(''); // Состояние для текста новой привычки

  async function loadHabits() {
    const data = await getHabits();
    setHabits(data);
  }
  
  async function onEditHabit(id: string, currentName: string) {
    Alert.alert(
        "Управление привычкой",
        `Что вы хотите сделать с "${currentName}"?`,
        [
        { text: "Отмена", style: "cancel" },
        { 
            text: "Переименовать", 
            onPress: () => showRenamePrompt(id, currentName) 
        },
        { 
            text: "Удалить", 
            style: "destructive", // Красный цвет кнопки на iOS
            onPress: () => confirmDelete(id, currentName)
        }
        ]
    );
    }

    // Вспомогательная функция для переименования (то, что мы писали раньше)
    function showRenamePrompt(id: string, currentName: string) {
    Alert.prompt(
        "Переименовать",
        "Введите новое название",
        [
        { text: "Отмена", style: "cancel" },
        { 
            text: "Сохранить", 
            onPress: async (newName) => {
            if (newName) {
                await updateHabitName(id, newName);
                await loadHabits();
            }
            } 
        }
        ],
        "plain-text",
        currentName
    );
    }

    // Вспомогательная функция для удаления
    async function confirmDelete(id: string, name: string) {
        Alert.alert(
            "Удаление",
            `Вы уверены, что хотите удалить привычку "${name}"? Все данные календаря будут стерты.`,
            [
                { text: "Отмена", style: "cancel" },
                { 
                    text: "Удалить", 
                    style: "destructive", 
                    onPress: async () => {
                        await deleteHabit(id);
                        await loadHabits(); // Обновляем список после удаления
                    }
                }
            ]
        );
    }

  useEffect(() => {
    loadHabits();
  }, []);

  async function onAddHabit() {
    if (text.trim().length === 0) return; // Не добавляем пустые
    
    await addHabit(text);
    setText(''); // Очищаем поле
    await loadHabits();
  }

  

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Название привычки..."
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
        <TouchableOpacity
          onPress={() => navigation.navigate('HabitCalendar', { 
            habitId: item.id, 
            habitName: item.name 
          })}
          onLongPress={() => onEditHabit(item.id, item.name)} // <--- ДОЛГОЕ НАЖАТИЕ
          style={styles.habitItem}
        >
          <Text style={styles.habitText}>{item.name}</Text>
          <Text style={styles.editHint}>удерживайте для ред.</Text>
        </TouchableOpacity>
      )}
    />
    </View>
  );
}



const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5', 
    padding: 20 
  },
  inputContainer: { 
    flexDirection: 'row', 
    marginBottom: 20, 
    marginTop: 10 
  },
  input: { 
    flex: 1, 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  addButton: { 
    backgroundColor: '#5856D6', 
    width: 55, 
    marginLeft: 10, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  addButtonText: { 
    color: '#fff', 
    fontSize: 30, 
    fontWeight: 'bold' 
  },
  habitItem: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Тень для iOS
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Тень для Android
    elevation: 2, 
  },
  habitText: { 
    fontSize: 18, 
    fontWeight: '500',
    color: '#333'
  },
  editHint: { 
    fontSize: 10, 
    color: '#aaa',
    fontStyle: 'italic'
  }
});
