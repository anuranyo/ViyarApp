import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import api from '../../utils/api';

const FiltersScreen: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [departments, setDepartments] = useState<string>('');
  const [result, setResult] = useState(null);

  // Fetch data by user name
  const fetchByName = async () => {
    try {
      const data = await api.getAllByUser(name);
      setResult(data);
      Alert.alert('Data fetched successfully!', JSON.stringify(data, null, 2));
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data by name.');
    }
  };

  // Fetch data by departments
  const fetchByDepartments = async () => {
    try {
      const departmentList = departments.split(',').map((dep) => dep.trim());
      const data = await api.getByDepartments(departmentList);
      setResult(data);
      Alert.alert('Data fetched successfully!', JSON.stringify(data, null, 2));
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data by departments.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Find by Name:</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter user name"
        value={name}
        onChangeText={setName}
      />
      <Button title="Fetch by Name" onPress={fetchByName} />

      <Text style={styles.label}>Find by Departments (comma-separated):</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter departments"
        value={departments}
        onChangeText={setDepartments}
      />
      <Button title="Fetch by Departments" onPress={fetchByDepartments} />

      {result && (
        <View style={styles.result}>
          <Text>Result:</Text>
          <Text>{JSON.stringify(result, null, 2)}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontSize: 16, marginVertical: 10 },
  input: { borderWidth: 1, padding: 10, marginBottom: 20, borderRadius: 5 },
  result: { marginTop: 20 },
});

export default FiltersScreen;
