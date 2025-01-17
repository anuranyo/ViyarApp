const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: mongoose.Schema.Types.ObjectId, ref: 'Date', required: true },
    status: { type: mongoose.Schema.Types.ObjectId, ref: 'Status', required: true },
    shiftCode: { type: String }, // Например, "фф" или "1"
}, { 
    timestamps: true 
});

ScheduleSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Schedule', ScheduleSchema);
