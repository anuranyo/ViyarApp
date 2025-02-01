import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const DAY_WIDTH = SCREEN_WIDTH / 8;
const DAY_HEIGHT = SCREEN_HEIGHT / 13;

export default function App() {
  const [events, setEvents] = useState<{ [key: string]: { color: string; description: string }[] }>(
    {}
  );
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedSchedules, setSelectedSchedules] = useState<any[]>([]); // Schedules for the selected day
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null); // Selected group details

  useEffect(() => {
    const loadSelectedGroup = async () => {
      try {
        const savedGroup = await AsyncStorage.getItem('selectedGroup');
        console.log('Retrieved Selected Group from AsyncStorage:', savedGroup);

        const currentDate = new Date().toISOString().split('T')[0].slice(5, 7) + '.' + new Date().getFullYear();
        console.log('Current Date:', currentDate);

        if (savedGroup) {
          const parsedGroup = JSON.parse(savedGroup);
          console.log('Parsed Selected Group:', parsedGroup);
          setSelectedGroup(parsedGroup);
          fetchSchedules(parsedGroup);
        } else {
          console.log('No selected group found.');
        }
      } catch (error) {
        console.error('Failed to load selected group:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadSelectedGroup);
    return unsubscribe;
  }, [navigation]);
  
  const handleMonthChange = (month: any) => {
    const date = new Date(month.dateString);
    const formattedDate = `${date.toISOString().split('T')[0].slice(5, 7)}.${date.getFullYear()}`;
    fetchSchedules(formattedDate);
  };  

  // Fetch schedules for the selected group
  const fetchSchedules = async (group: any) => {
    try {
      if (!group) {
        Alert.alert('Error', 'No selected group found.');
        return;
      }
  
      const groupFilters = group.items.map((item: string) => {
        if (item.startsWith('Employee:')) {
          return `name=${encodeURIComponent(item.replace('Employee: ', '').split(' ')[0])}`;
        } else if (item.startsWith('Department:')) {
          return `department=${encodeURIComponent(item.replace('Department: ', ''))}`;
        }
        return '';
      });
  
      const currentDate = new Date().toISOString().split('T')[0].slice(5, 7) + '.' + new Date().getFullYear();
      const query = `https://viyarapp.onrender.com/api/getByMonth&NameOrDepartment?date=${currentDate}&${groupFilters.join('&')}`;
  
      console.log('Fetching schedules with query:', query);
      const response = await axios.get(query);
      console.log('API Response:', response.data);
  
      if (!response.data || !Array.isArray(response.data)) {
        console.error('Unexpected API response:', response.data);
        Alert.alert('Error', 'Invalid data received from API.');
        return;
      }
  
      const apiEvents: { [key: string]: { color: string; description: string }[] } = {};
      response.data.forEach((schedule: any) => {
        if (!schedule.date) {
          console.warn('Skipping schedule entry due to missing date:', schedule);
          return;
        }
  
        const date = schedule.date.split('T')[0]; // Format: YYYY-MM-DD
        if (!apiEvents[date]) apiEvents[date] = [];
  
        apiEvents[date].push({
          color: 'blue', // Change this for different users if needed
          description: `${schedule.employee?.name || 'Unknown'} - ${schedule.department || 'N/A'} - ${schedule.action || 'N/A'}`,
        });
      });
  
      console.log('Processed Events for Calendar:', apiEvents); // Debug log
      setEvents(apiEvents); // Update state with events
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      Alert.alert('Error', 'Failed to load schedules.');
    }
  };
  
  

  // Handle day selection
  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
    const schedulesForDay = events[day]?.map((event) => ({
      description: event.description,
    })) || [];
    setSelectedSchedules(schedulesForDay);
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        {/* Calendar */}
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


        {/* Display schedules for the selected day */}
        <View style={styles.shelter}>
          {selectedSchedules.length === 0 ? (
            <Text style={styles.noEventsText}>No events for this day.</Text>
          ) : (
            <FlatList
              data={selectedSchedules}
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
    color: '#ccc',
  },
  selectedDayName: {
    color: '#ffffff',
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
