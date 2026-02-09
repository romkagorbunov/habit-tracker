import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import HabitListScreen from './HabitListScreen';
import HabitCalendarScreen from './HabitCalendarScreen';

export type RootStackParamList = {
  HabitList: undefined;
  HabitCalendar: { habitId: string; habitName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="HabitList"
          component={HabitListScreen}
          options={{ title: 'Привычки' }}
        />
        <Stack.Screen
          name="HabitCalendar"
          component={HabitCalendarScreen}
          options={{ title: 'Календарь' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
