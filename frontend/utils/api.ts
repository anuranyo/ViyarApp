import axios from 'axios';

// Create a reusable axios instance
const instance = axios.create({
  baseURL: 'https://viyarapp.onrender.com/api', // Base URL for requests
  timeout: 5000,
});

// API methods
const api = {
  // Fetch all data for a specific user by name
  getAllByUser: async (name: string) => {
    try {
      const response = await instance.get(`/getAllByUser`, {
        params: { name },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  },

  // Fetch data by a single department or multiple departments
  getByDepartments: async (departments: string | string[]) => {
    try {
      const depString = Array.isArray(departments) ? departments.join(',') : departments;
      const response = await instance.get(`/getByDepartments`, {
        params: { departments: depString },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching departments data:', error);
      throw error;
    }
  },

  // Find data by either a name or department
  findData: async (query: string) => {
    try {
      const localInstance = axios.create({
        baseURL: 'http://localhost:5001/api',
      });
      const response = await localInstance.get(`/findData/${query}`);
      return response.data;
    } catch (error) {
      console.error('Error finding data:', error);
      throw error;
    }
  },
};

export default api;
