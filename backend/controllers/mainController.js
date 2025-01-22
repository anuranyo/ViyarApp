const fs = require('fs');
const path = require('path');
const Employee = require('../models/Employee');
const Schedule = require('../models/Schedule');

/**
 * Add data from JSON files to the database and clean up temporary folders.
 * @param {Array} files - Array of file paths (JSON files).
 * @returns {Promise<void>}
 */
const addDataFromJsonAndClean = async (files) => {
    try {
        console.log('Starting data import...');
        for (const filePath of files) {
            console.log(`Processing file: ${filePath}`);
            const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            // Check if the JSON data contains employees
            if (jsonData.employees) {
                for (const employeeData of jsonData.employees) {
                    await Employee.create(employeeData);
                }
                console.log(`Employees added from file: ${filePath}`);
            }

            // Check if the JSON data contains schedules
            if (jsonData.schedules) {
                for (const scheduleData of jsonData.schedules) {
                    await Schedule.create(scheduleData);
                }
                console.log(`Schedules added from file: ${filePath}`);
            }
        }

        console.log('Data import completed. Cleaning up folders...');
        await cleanFolders([
            path.join(__dirname, 'backend', 'tmpr_files'),
            path.join(__dirname, 'backend', 'tmpr_json'),
            path.join(__dirname, 'backend', 'uploads'),
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
            console.log(`Folder cleaned: ${folder}`);
        } catch (error) {
            console.error(`Error cleaning folder ${folder}:`, error);
        }
    }
};

module.exports = {
    addDataFromJsonAndClean,
};
