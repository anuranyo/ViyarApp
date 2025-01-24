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


/**
 * Get all schedules for a user by their name.
 * @route GET /api/getAllByUser
 * @query {string} name - The name of the user to search for.
 * @returns {Object} - User's schedules or an error message.
 */
exports.getAllSchedulesByUser = async (req, res) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res.status(400).json({ error: 'User name is required.' });
        }

        // Find the employee by name
        const employee = await Employee.findOne({ name });
        if (!employee) {
            return res.status(404).json({ error: `User with name "${name}" not found.` });
        }

        // Find all schedules linked to the employee
        const schedules = await Schedule.find({ employee: employee._id });

        if (schedules.length === 0) {
            return res.status(404).json({ message: `No schedules found for user "${name}".` });
        }

        return res.status(200).json({ employee: employee.name, schedules });
    } catch (error) {
        console.error('Error fetching schedules:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Get schedules for employees in specified departments.
 * @route GET /api/getByDepartments
 * @query {Array} departments - Comma-separated list of department names.
 * @returns {Object} - Employees and their schedules.
 */
exports.getSchedulesByDepartments = async (req, res) => {
    try {
        const { departments } = req.query;

        if (!departments) {
            return res.status(400).json({ error: 'Departments are required.' });
        }

        // Normalize the department list
        const departmentList = departments.split(',').map((d) => d.trim());
        console.log('Normalized Department List:', departmentList);

        // Step 1: Query the Schedule collection for employees in the specified departments
        const departmentSchedules = await Schedule.find({
            department: { $in: departmentList.map((d) => new RegExp(`^${d}$`, 'i')) },
        });

        if (departmentSchedules.length === 0) {
            return res.status(404).json({ message: 'No employees found for the specified departments.' });
        }

        // Extract unique employee IDs from the schedules
        const employeeIds = [...new Set(departmentSchedules.map((schedule) => schedule.employee))];

        // Step 2: Fetch all employees matching the extracted IDs
        const employees = await Employee.find({ _id: { $in: employeeIds } });

        if (employees.length === 0) {
            return res.status(404).json({ message: 'No employees found for the specified departments.' });
        }

        // Step 3: Fetch all schedules for these employees (ignoring department filtering)
        const allSchedules = await Schedule.find({ employee: { $in: employeeIds } });

        // Step 4: Map schedules to their corresponding employees
        const result = employees.map((employee) => {
            return {
                name: employee.name,
                position: employee.position,
                schedules: allSchedules.filter((schedule) => schedule.employee.equals(employee._id)),
            };
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching schedules by departments:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
