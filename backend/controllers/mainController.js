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
            if (path.extname(filePath).toLowerCase() !== '.json') {
                console.warn(`Skipping non-JSON file: ${filePath}`);
                continue;
            }

            console.log(`Processing file: ${filePath}`);
            const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            if (jsonData.employees) {
                for (const employeeData of jsonData.employees) {
                    await Employee.create({
                        name: employeeData.name,
                        position: employeeData.position,
                    });

                    for (const schedule of employeeData.schedule) {
                        await Schedule.create({
                            employeeName: employeeData.name,
                            date: schedule.date,
                            action: schedule.action,
                            department: schedule.department,
                            duty: schedule.duty,
                        });
                    }
                }
                console.log(`Data from file ${filePath} added successfully.`);
            } else {
                console.warn(`No employees found in file: ${filePath}`);
            }
        }

        console.log('Data import completed. Cleaning up folders...');
        await cleanFolders([
            //path.join(__dirname, 'tmpr_json'),
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
