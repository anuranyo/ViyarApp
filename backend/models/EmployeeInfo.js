// Import the mongoose library to interact with MongoDB
const mongoose = require('mongoose');

// Define the schema for an Employee document in MongoDB
const EmployeeInfoSchema = new mongoose.Schema({

    // Reference to the Employee document, required field
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    
    // The date of birth of the employee, which is a required date
    dateOfBirth: { type: Date, required: true },
    
    // The hire date of the employee, indicating when they started working, which is a required date
    hireDate: { type: Date, required: true },

});

// Export the Employee model based on the EmployeeSchema
module.exports = mongoose.model('EmployeeInfoSchema', EmployeeInfoSchema);
