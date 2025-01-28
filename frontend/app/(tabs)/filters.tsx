import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import api from '../../utils/api'; // Import the updated API utility

const App = () => {
  const [schedules, setSchedules] = useState<{ id: string; name: string; timestamp: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [groups, setGroups] = useState<{ id: string; items: string[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load saved schedules and groups from AsyncStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedSchedules = await AsyncStorage.getItem('schedules');
        const savedGroups = await AsyncStorage.getItem('groups');

        if (savedSchedules) setSchedules(JSON.parse(savedSchedules));
        if (savedGroups) setGroups(JSON.parse(savedGroups));
      } catch (error) {
        console.error('Failed to load data from AsyncStorage:', error);
      }
    };

    loadData();
  }, []);

  // Save schedules to AsyncStorage
  const saveSchedules = async (updatedSchedules: typeof schedules) => {
    try {
      await AsyncStorage.setItem('schedules', JSON.stringify(updatedSchedules));
      setSchedules(updatedSchedules);
    } catch (error) {
      console.error('Failed to save schedules:', error);
    }
  };

  // Save groups to AsyncStorage
  const saveGroups = async (updatedGroups: typeof groups) => {
    try {
      await AsyncStorage.setItem('groups', JSON.stringify(updatedGroups));
      setGroups(updatedGroups);
    } catch (error) {
      console.error('Failed to save groups:', error);
    }
  };

// Fetch live suggestions from the API
const fetchSuggestions = async (query: string) => {
  if (!query.trim()) {
    setSuggestions([]);
    return;
  }

  setLoading(true);
  try {
    const { employees = [], departments = [] } = await api.findAll(query);

    // Combine employees and departments into one list for suggestions
    const formattedSuggestions = [
      ...employees.map(
        (employee: { _id: string; name: string; position: string }) =>
          `Employee: ${employee.name} (${employee.position})`
      ),
      ...departments.map((department: string) => `Department: ${department}`),
    ];

    setSuggestions(formattedSuggestions);
  } catch (error) {
    console.error('Failed to fetch suggestions:', error);
    Alert.alert('Error', 'Failed to fetch suggestions from the server.');
  } finally {
    setLoading(false);
  }
};

  // Debounced Search
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 500); // 500ms delay
  };

  // Final request when the user finishes typing
  const handleSearchSubmit = () => {
    fetchSuggestions(searchQuery);
  };

  // Toggle item selection
  const toggleSelection = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Create a new group from selected items
  const createGroup = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'No items selected to create a group.');
      return;
    }

    const newGroup = {
      id: `${Date.now()}`,
      items: [...selectedItems],
    };

    const updatedGroups = [...groups, newGroup];
    await saveGroups(updatedGroups);
    setSelectedItems([]);
    Alert.alert('Success', 'Group created successfully!');
  };

  // Delete a group
  const deleteGroup = async (id: string) => {
    const updatedGroups = groups.filter((group) => group.id !== id);
    await saveGroups(updatedGroups);
  };

  // Render a single suggestion item
  const renderSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, selectedItems.includes(item) && styles.selectedSuggestion]}
      onPress={() => toggleSelection(item)}
    >
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  // Render a single group
  const renderGroup = ({ item }: { item: { id: string; items: string[] } }) => (
    <View style={styles.groupItem}>
      <Text style={styles.groupText}>{item.items.join('\n')}</Text>
      <View style={styles.groupActions}>
        <TouchableOpacity onPress={() => deleteGroup(item.id)} style={styles.deleteGroupButton}>
          <Ionicons name="trash" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Збережені розклади</Text>
        <TouchableOpacity onPress={createGroup} style={styles.createGroupButton}>
          <Text style={styles.createGroupButtonText}>Create Group</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search schedules..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={handleSearchChange}
          onSubmitEditing={handleSearchSubmit}
        />
        {loading && <ActivityIndicator size="small" color="#ffffff" style={styles.loader} />}
      </View>

    {/* Suggestions List */}
    {suggestions.length > 0 && (
      <FlatList
        data={suggestions}
        renderItem={renderSuggestion}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.suggestionsList}
        style={{
          maxHeight: Math.min(suggestions.length * 50, 200), // Dynamic height calculation
        }}
      />
    )}


      {/* Groups List */}
      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.groupsList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  createGroupButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createGroupButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#111111',
    zIndex: 10,
  },
  input: {
    flex: 1,
    padding: 12,
    backgroundColor: '#222222',
    color: '#ffffff',
    borderRadius: 8,
    marginRight: 10,
    fontSize: 14,
  },
  loader: {
    marginLeft: 10,
  },
  suggestionsList: {
    position: 'absolute',
    paddingHorizontal: 15,
    paddingTop: 10,
    backgroundColor: '#111111',
    width: '100%',
    flex: 1,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    borderRadius: 5,
    marginBottom: 5,
    backgroundColor: '#2F4F4F',
  },
  selectedSuggestion: {
    backgroundColor: '#4CAF50',
  },
  suggestionText: {
    fontSize: 14,
    color: '#ffffff',
  },
  groupsList: {//voteta hueta
    top: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
    backgroundColor: '#111111',
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#222222',
    borderRadius: 8,
    marginBottom: 10,
  },
  groupText: {
    color: '#ffffff',
    flex: 1,
    fontSize: 14,
  },
  groupActions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  searchGroupButton: {
    marginRight: 10,
    padding: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  deleteGroupButton: {
    padding: 8,
    backgroundColor: '#FF4D4D',
    borderRadius: 8,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#222222',
    borderRadius: 8,
    marginBottom: 10,
  },
  scheduleDetails: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scheduleTimestamp: {
    fontSize: 14,
    color: '#aaaaaa',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#aaaaaa',
  },
});

export default App;
