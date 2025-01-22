const mongoose = require('mongoose');

// Define the schema for a Schedule document in MongoDB
const ScheduleSchema = new mongoose.Schema({
    // Reference to the Employee document, required field
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    
    // Date of the shift, required field
    date: { type: Date, required: true },
    
    // Action performed during the shift (e.g., ВХ, Рв), required field
    action: { type: String, required: true },
    
    // Department where the shift is accounted for, optional field
    department: { type: String, required: false },
    
    // Indicates if the employee was on duty, required field
    duty: { type: Boolean, required: true }
});
// Create a unique index on employee and date to prevent duplicate entries
//ScheduleSchema.index({ employee: 1, date: 1 }, { unique: true });

// Export the Schedule model based on the schema
module.exports = mongoose.model('Schedule', ScheduleSchema);
