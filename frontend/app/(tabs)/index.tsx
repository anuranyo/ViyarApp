import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, FlatList, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import DropDownPicker from 'react-native-dropdown-picker';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const DAY_WIDTH = SCREEN_WIDTH / 8;
const DAY_HEIGHT = SCREEN_HEIGHT / 13;

export default function App() {
  const [calendarType, setCalendarType] = useState('monthly'); // Default to monthly view
  const [openDropdown, setOpenDropdown] = useState(false);
  const [currentMonth, setCurrentMonth] = useState('');
  const [currentWeek, setCurrentWeek] = useState<string[]>([]); // Current week dates
  const [selectedDay, setSelectedDay] = useState<string>(''); // Selected day
  const events: { [key: string]: { color: string; description: string }[] } = {
    '2025-01-01': [{ color: 'yellow', description: 'New Year Party' }],
    '2025-01-07': [
      { color: 'yellow', description: 'Team Meeting' },
      { color: 'green', description: 'Lunch with John' },
    ],
    '2025-01-14': [
      { color: 'yellow', description: 'Project Deadline' },
      { color: 'black', description: 'Yoga Class' },
    ],
    '2025-01-20': [
      { color: 'yellow', description: 'Doctor Appointment' },
      { color: 'green', description: 'Gym Session' },
      { color: 'blue', description: 'Call with Client' },
      { color: 'black', description: 'Dinner with Family' },
    ],
  };

  // Initialize current month and week
  useEffect(() => {
    const today = new Date();

    // Set current month
    const monthName = today.toLocaleString('default', { month: 'long' });
    setCurrentMonth(monthName);

    // Set current week
    const week = getCurrentWeek(today);
    setCurrentWeek(week);

    // Set selected day as today
    setSelectedDay(today.toISOString().split('T')[0]); // YYYY-MM-DD
  }, []);

  // Calculate current week's dates (Monday to Sunday)
  const getCurrentWeek = (date: Date): string[] => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Set to Monday
    const weekDates: string[] = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDates.push(day.toISOString().split('T')[0]); // Format: YYYY-MM-DD
    }
    return weekDates;
  };

  // Handle month change in monthly view
  const handleMonthChange = (month: any) => {
    const date = new Date(month.dateString);
    const monthName = date.toLocaleString('default', { month: 'long' });
    setCurrentMonth(monthName);
  };

  // Get events for the selected day
  const selectedEvents = events[selectedDay] || [];

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        {/* Dropdown to toggle calendar types */}
        <DropDownPicker
          open={openDropdown}
          value={calendarType}
          items={[
            { label: 'Monthly View', value: 'monthly' },
            { label: 'Weekly View', value: 'weekly' },
          ]}
          setOpen={setOpenDropdown}
          setValue={setCalendarType}
          placeholder="Select View"
          containerStyle={styles.dropdownContainer}
          style={styles.dropdown}
        />

        {/* Calendar */}
        {calendarType === 'monthly' ? (
          <View>
            <Calendar
              onMonthChange={handleMonthChange}
              markingType="multi-dot"
              markedDates={Object.keys(events).reduce((acc, date) => {
                acc[date] = { dots: events[date] };
                return acc;
              }, {} as any)}
              dayComponent={({ date, marking, state }) => {
                if (!date) return null; // Safely handle undefined
                const dots = marking?.dots || [];
                const isSelected = date.dateString === selectedDay;

                return (
                  <TouchableOpacity
                    onPress={() => setSelectedDay(date.dateString)}
                    style={[
                      styles.weekDayContainer,
                      isSelected && styles.selectedDayContainer,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayName,
                        isSelected && styles.selectedDayName,
                        state === 'disabled' && styles.fadedDayName,
                      ]}
                    >
                      {date.day}
                    </Text>
                    <View style={styles.dotContainer}>
                      {dots.map((dot: any, index: number) => (
                        <View
                          key={index}
                          style={[styles.dot, { backgroundColor: dot.color }]}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        ) : (
          <View style={styles.weeklyContainer}>
            <View style={styles.weekRow}>
              {currentWeek.map((item) => {
                const date = new Date(item);
                const dayName = date
                  .toLocaleString('default', { weekday: 'short' })
                  .toUpperCase();
                const dayNumber = date.getDate();
                const isSelected = item === selectedDay;
                const dots = events[item] || [];

                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setSelectedDay(item)}
                    style={[
                      styles.weekDayContainer,
                      isSelected && styles.selectedDayContainer,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayName,
                        isSelected && styles.selectedDayName,
                      ]}
                    >
                      {dayName}
                    </Text>
                    <Text style={styles.dayNumber}>{dayNumber}</Text>
                    <View style={styles.dotContainer}>
                      {dots.map((dot, index) => (
                        <View
                          key={index}
                          style={[styles.dot, { backgroundColor: dot.color }]}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Shelter Below Calendar */}
        <View style={styles.shelter}>
          {selectedEvents.length === 0 ? (
            <Text style={styles.noEventsText}>
              Haha, chill, no events today ,')
            </Text>
          ) : (
            <FlatList
              data={selectedEvents}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <Text style={styles.eventText}>
                  {index + 1}. {item.description}
                </Text>
              )}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  dropdown: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  weekDayContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: DAY_HEIGHT,
    width: DAY_WIDTH,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  selectedDayContainer: {
    backgroundColor: '#5c4dff',
    borderRadius: 15,
    paddingVertical: 5,
  },
  dayName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  fadedDayName: {
    color: '#ccc', // Fix for missing style
  },
  selectedDayName: {
    color: '#ffffff',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 1,
  },
  weeklyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 11,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 5,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  shelter: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 5,
  },
  noEventsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  eventText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 5,
  },
});
