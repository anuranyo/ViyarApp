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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null); // New state for selected group
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

    const loadSelectedGroup = async () => {
      try {
        const savedGroupId = await AsyncStorage.getItem('selectedGroupId');
        const savedGroup = await AsyncStorage.getItem('selectedGroup');
    
        console.log('Retrieved Selected Group ID from AsyncStorage:', savedGroupId); // Debug log
        console.log('Retrieved Selected Group from AsyncStorage:', savedGroup); // Debug log
    
        if (savedGroup) {
          const parsedGroup = JSON.parse(savedGroup);
          console.log('Parsed Selected Group:', parsedGroup); // Debug log
          // setSelectedGroup(parsedGroup);
          // fetchSchedules(parsedGroup);
        } else {
          console.log('No selected group found.');
        }
      } catch (error) {
        console.error('Failed to load selected group:', error);
      }
    };
    
    
  
    loadSelectedGroup();
    loadData();
  }, []);

  // Save selected items to AsyncStorage
  const saveSelectedItems = async (updatedSelection: string[]) => {
    try {
      await AsyncStorage.setItem('selectedItems', JSON.stringify(updatedSelection));
    } catch (error) {
      console.error('Failed to save selected items:', error);
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

// Helper function to classify items as names or departments
const classifyItems = (items: string[]) => {
  const names: string[] = [];
  const departments: string[] = [];

  items.forEach((item) => {
    if (item.startsWith('Employee:')) {
      names.push(item);
    } else if (item.startsWith('Department:')) {
      departments.push(item);
    }
  });

  return { names, departments };
};

// Create a new group from selected items with validation
const saveSelectedGroup = async (group: any) => {
  try {
    await AsyncStorage.setItem('selectedGroup', JSON.stringify(group));
    console.log('Saved Selected Group:', group); // Debug log
  } catch (error) {
    console.error('Failed to save selected group:', error);
  }
};

// Call this in `createGroup` after saving the group
const createGroup = async () => {
  if (selectedItems.length === 0) {
    Alert.alert('Error', 'No items selected to create a group.');
    return;
  }

  const { names, departments } = classifyItems(selectedItems);

  if (names.length > 1 || departments.length > 1) {
    Alert.alert(
      'Error',
      'A group can contain only one name or one department. Please adjust your selection.'
    );
    return;
  }

  const newGroup = {
    id: `${Date.now()}`,
    items: [...selectedItems],
  };

  const updatedGroups = [...groups, newGroup];
  await saveGroups(updatedGroups);
  setSelectedItems([]);

  // Save the newly created group as the selected group
  await saveSelectedGroup(newGroup);

  Alert.alert('Success', 'Group created successfully!');
};


const toggleSelection = (item: string) => {
  setSelectedItems((prev) => {
    const updatedSelection = prev.includes(item)
      ? prev.filter((i) => i !== item)
      : [...prev, item];

    saveSelectedItems(updatedSelection); // Save the updated selection
    return updatedSelection;
  });
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

  // Function to handle group selection
  const selectGroup = async (id: string) => {
    const updatedGroupId = selectedGroupId === id ? null : id; // Toggle selection
    setSelectedGroupId(updatedGroupId);
  
    try {
      await AsyncStorage.setItem('selectedGroupId', JSON.stringify(updatedGroupId));
      console.log('Saved Selected Group ID:', updatedGroupId); // Debug log
  
      const selectedGroup = groups.find(group => group.id === updatedGroupId);
      if (selectedGroup) {
        await AsyncStorage.setItem('selectedGroup', JSON.stringify(selectedGroup));
        console.log('Saved Selected Group:', selectedGroup); // Debug log
      }
    } catch (error) {
      console.error('Failed to save selected group:', error);
    }
  };
  
  

  // Render a single group
  const renderGroup = ({ item }: { item: { id: string; items: string[] } }) => {
    const isSelected = selectedGroupId === item.id;

    return (
      <TouchableOpacity
        onPress={() => selectGroup(item.id)} // Handle group selection
        style={[
          styles.groupItem,
          isSelected && styles.selectedGroup, // Apply styles if selected
        ]}
      >
        <Text style={styles.groupText}>{item.items.join('\n')}</Text>
        <View style={styles.groupActions}>
          <TouchableOpacity onPress={() => deleteGroup(item.id)} style={styles.deleteGroupButton}>
            <Ionicons name="trash" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

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
    borderWidth: 2, // Add a default border width
    borderColor: '#333333', // Default border color
  },  
  selectedGroup: {
    borderColor: '#4CAF50', // Highlight selected group with green border
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
