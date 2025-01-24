const fs = require('fs');
const path = require('path');
const Employee = require('../models/Employee');
const Schedule = require('../models/Schedule');

/**
 * Add data from JSON files to the database and clean up temporary folders.
 * @param {Array} files - Array of file paths (JSON files).
 * @returns {Promise<void>}
 */
exports.addDataFromJsonAndClean = async (files) => {
    try {
        console.log('Starting data import...');
        for (const filePath of files) {
            // Skip files that are not JSON
            if (path.extname(filePath).toLowerCase() !== '.json') {
                console.warn(`Skipping non-JSON file: ${filePath}`);
                continue;
            }

            console.log(`Processing file: ${filePath}`);
            const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            // Check if the JSON file contains employees
            if (!jsonData.employees || jsonData.employees.length === 0) {
                console.warn(`No employees found in file: ${filePath}`);
                continue;
            }

            // Extract all unique dates from the schedules
            const uniqueDates = new Set();
            jsonData.employees.forEach((employee) => {
                if (employee.schedule && Array.isArray(employee.schedule)) {
                    employee.schedule.forEach((schedule) => {
                        const rawDate = schedule.date.split(' ')[0];
                        const [day, month, year] = rawDate.split('.').map(Number);
                        const parsedDate = new Date(Date.UTC(year, month - 1, day));
                        if (!isNaN(parsedDate.getTime())) {
                            uniqueDates.add(parsedDate.toISOString().split('T')[0]); // Add date as ISO string
                        }
                    });
                }
            });

            // Delete existing schedules for all unique dates
            for (const isoDate of uniqueDates) {
                const dateToDelete = new Date(isoDate);
                await deleteSchedulesForDate(dateToDelete);
            }

            // Process and insert new data
            await insertSchedulesFromJson(jsonData);

            console.log(`Data from file ${filePath} processed successfully.`);
        }

        console.log('Data import completed. Cleaning up folders...');
        await cleanFolders([
            path.join(__dirname, '../tmpr_json'),
            path.join(__dirname, '../tmpr_files'),
            path.join(__dirname, '../uploads'),
        ]);
        console.log('All temporary folders cleaned.');
    } catch (error) {
        console.error('Error during data import and cleanup:', error);
        throw error;
    }
};

/**
 * Deletes all schedules for a given date.
 * @param {Date} date - The date to delete schedules for.
 * @returns {Promise<void>}
 */
const deleteSchedulesForDate = async (date) => {
    try {
        console.log(`Deleting existing schedules for date: ${date.toISOString().split('T')[0]}`);
        await Schedule.deleteMany({ date });
    } catch (error) {
        console.error(`Error deleting schedules for date ${date}:`, error);
        throw error;
    }
};

/**
 * Inserts schedules and employees from JSON data into the database.
 * @param {Object} jsonData - JSON data containing employees and their schedules.
 * @returns {Promise<void>}
 */
const insertSchedulesFromJson = async (jsonData) => {
    for (const employeeData of jsonData.employees) {
        // Find or create an employee record
        const employee = await Employee.findOneAndUpdate(
            { name: employeeData.name },
            {
                name: employeeData.name,
                position: employeeData.position,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        for (const schedule of employeeData.schedule) {
            const rawDate = schedule.date.split(' ')[0];
            const [day, month, year] = rawDate.split('.').map(Number);
            const parsedDate = new Date(Date.UTC(year, month - 1, day));

            // Validate the date format
            if (isNaN(parsedDate.getTime())) {
                console.warn(`Invalid date format in schedule: ${schedule.date}`);
                continue;
            }

            const scheduleData = {
                employee: employee._id,
                date: parsedDate,
                action: schedule.action,
                department: schedule.department || null,
                duty: schedule.duty,
            };

            try {
                // Insert the schedule into the database
                await Schedule.create(scheduleData);
            } catch (error) {
                console.error(`Error inserting schedule for employee ${employee.name} on ${schedule.date}:`, error);
            }
        }
    }
};

/**
 * Remove all files from the specified folders.
 * @param {Array} folders - Array of folder paths to clean.
 * @returns {Promise<void>}
 */
const cleanFolders = async (folders) => {
    for (const folder of folders) {
        try {
            const files = fs.readdirSync(folder);
            for (const file of files) {
                const filePath = path.join(folder, file);
                if (fs.statSync(filePath).isFile()) {
                    // Delete the file
                    fs.unlinkSync(filePath);
                }
            }
        } catch (error) {
            console.error(`Error cleaning folder ${folder}:`, error);
        }
    }
};
