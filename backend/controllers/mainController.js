const fs = require('fs');
const path = require('path');
const Employee = require('../models/Employee');
const Schedule = require('../models/Schedule');

const DEFAULT_DATE = new Date('2000-01-01'); // Default date for dateOfBirth and hireDate

/**
 * Add data from JSON files to the database and clean up temporary folders.
 * @param {Array} files - Array of file paths (JSON files).
 * @returns {Promise<void>}
 */
exports.addDataFromJsonAndClean = async (files) => {
    try {
        console.log('Starting data import...');
        for (const filePath of files) {
            if (path.extname(filePath).toLowerCase() !== '.json') {
                console.warn(`Skipping non-JSON file: ${filePath}`);
                continue;
            }

            console.log(`Processing file: ${filePath}`);
            const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            if (jsonData.employees) {
                for (const employeeData of jsonData.employees) {
                    // Set default values for missing fields
                    const dateOfBirth = DEFAULT_DATE;
                    const hireDate = DEFAULT_DATE;

                    // Insert or update the employee in the database
                    const employee = await Employee.findOneAndUpdate(
                        { name: employeeData.name }, // Match by name
                        {
                            name: employeeData.name,
                            position: employeeData.position,
                            dateOfBirth,
                            hireDate,
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true } // Create if not exists
                    );

                    for (const schedule of employeeData.schedule) {
                        const rawDate = schedule.date.split(' ')[0]; // Extract the date portion (e.g., "20.01.2025")
                        const [day, month, year] = rawDate.split('.').map(Number);
                        const parsedDate = new Date(Date.UTC(year, month - 1, day)); // Create a UTC date
                    
                        if (isNaN(parsedDate.getTime())) {
                            console.warn(`Invalid date format in schedule: ${schedule.date}`);
                            continue; // Skip invalid dates
                        }
                    
                        const scheduleData = {
                            employee: employee._id,
                            date: parsedDate,
                            action: schedule.action,
                            department: schedule.department || null,
                            duty: schedule.duty,
                        };
                    
                        try {
                            // Use `findOneAndUpdate` to upsert the schedule
                            await Schedule.findOneAndUpdate(
                                { employee: employee._id, date: parsedDate }, // Match employee and date
                                scheduleData, // Update with new data
                                { upsert: true, new: true, setDefaultsOnInsert: true } // Upsert if not exists
                            );
                        } catch (error) {
                            console.error(`Error inserting/updating schedule for employee ${employee.name} on ${schedule.date}:`, error);
                        }
                    }
                    
                    
                }
                console.log(`Data from file ${filePath} added successfully.`);
            } else {
                console.warn(`No employees found in file: ${filePath}`);
            }
        }

        console.log('Data import completed. Cleaning up folders...');
        await cleanFolders([
            path.join(__dirname, '../tmpr_json'), // Adjust path as needed
            path.join(__dirname, '../tmpr_files'), // Adjust path as needed
            path.join(__dirname, '../uploads'), // Adjust path as needed
        ]);
        console.log('All temporary folders cleaned.');
    } catch (error) {
        console.error('Error during data import and cleanup:', error);
        throw error;
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
                    fs.unlinkSync(filePath); // Delete the file
                }
            }
        } catch (error) {
            console.error(`Error cleaning folder ${folder}:`, error);
        }
    }
};
