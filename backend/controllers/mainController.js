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
                            uniqueDates.add(parsedDate.toISOString().split('T')[0]);
                        }
                    });
                }
            });

            // Delete existing schedules for all unique dates
            for (const isoDate of uniqueDates) {
                const dateToDelete = new Date(isoDate);
                await deleteSchedulesForDate(dateToDelete);
            }

            // Process and upsert employee and schedule data
            await upsertEmployeesAndSchedules(jsonData);

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
 * Inserts or updates employees and schedules from JSON data.
 * @param {Object} jsonData - JSON data containing employees and their schedules.
 * @returns {Promise<void>}
 */
const upsertEmployeesAndSchedules = async (jsonData) => {
    for (const employeeData of jsonData.employees) {
        try {
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

                if (isNaN(parsedDate.getTime())) {
                    console.warn(`Invalid date format in schedule: ${schedule.date}`);
                    continue;
                }

                const scheduleFilter = {
                    employee: employee._id,
                    date: parsedDate,
                };

                const scheduleUpdate = {
                    action: schedule.action,
                    department: schedule.department || null,
                    duty: schedule.duty,
                };

                await Schedule.findOneAndUpdate(scheduleFilter, scheduleUpdate, {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                });
            }
        } catch (error) {
            console.error(`Error processing employee ${employeeData.name}:`, error);
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

        // **Filter out employees with name "undefined"**
        const validEmployees = employees.filter((employee) => employee.name && employee.name !== 'undefined');

        if (validEmployees.length === 0) {
            return res.status(404).json({ message: 'No valid employees found for the specified departments.' });
        }

        // Step 3: Fetch all schedules for these employees
        const allSchedules = await Schedule.find({ employee: { $in: validEmployees.map((emp) => emp._id) } });

        // Step 4: Map schedules to their corresponding employees
        const result = validEmployees.map((employee) => {
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


/**
 * Search for employees and schedules by department or name.
 * @route GET /findData/:query
 * @param {string} query - Search term for name or department.
 * @returns {Object} - Matched employees and their schedules.
 */
exports.findData = async (req, res) => {
    try {
        const { query } = req.params;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required.' });
        }

        // Step 1: Search employees by name (partial match, case-insensitive)
        const employeesByName = await Employee.find({
            name: new RegExp(query, 'i'),
        });

        // Step 2: Search schedules by department (partial match, case-insensitive)
        const schedulesByDepartment = await Schedule.find({
            department: new RegExp(query, 'i'),
        });

        // Extract unique employee IDs from the schedules by department
        const employeeIdsFromSchedules = [
            ...new Set(schedulesByDepartment.map((schedule) => schedule.employee.toString())),
        ];

        // Fetch employees corresponding to the IDs from the schedules
        const employeesByDepartment = await Employee.find({
            _id: { $in: employeeIdsFromSchedules },
        });

        // Combine results and remove duplicates
        const allEmployees = [
            ...new Map(
                [...employeesByName, ...employeesByDepartment].map((employee) => [employee._id.toString(), employee])
            ).values(),
        ];

        if (allEmployees.length === 0) {
            return res.status(404).json({ message: 'No matches found for the query.' });
        }

        // Fetch all schedules for these employees
        const allEmployeeIds = allEmployees.map((employee) => employee._id);
        const allSchedules = await Schedule.find({ employee: { $in: allEmployeeIds } });

        // Map schedules to their corresponding employees
        const result = allEmployees.map((employee) => {
            return {
                name: employee.name,
                position: employee.position,
                schedules: allSchedules.filter((schedule) => schedule.employee.equals(employee._id)),
            };
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error during search operation:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};


/**
 * Get schedules for a specific month and year.
 * @route GET /api/getByMonth
 * @query {string} date - Month and year in the format "MM.YYYY".
 * @returns {Object} - Schedules for the specified month and year.
 */
exports.getSchedulesByMonth = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter (MM.YYYY) is required.' });
        }

        const [month, year] = date.split('.').map(Number);

        // Validate month and year
        if (!month || !year || month < 1 || month > 12) {
            return res.status(400).json({ error: 'Invalid date format. Use MM.YYYY.' });
        }

        // Create date range for the specified month
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // Last moment of the month

        console.log(`Fetching schedules for month: ${month}, year: ${year}`);

        // Query schedules within the specified date range
        const schedules = await Schedule.find({
            date: { $gte: startDate, $lte: endDate },
        }).populate('employee', 'name position'); // Populate employee details

        if (schedules.length === 0) {
            return res.status(404).json({ message: `No schedules found for ${date}.` });
        }

        // Group schedules by employee
        const groupedSchedules = schedules.reduce((acc, schedule) => {
            const employeeId = schedule.employee._id.toString();
            if (!acc[employeeId]) {
                acc[employeeId] = {
                    name: schedule.employee.name,
                    position: schedule.employee.position,
                    schedules: [],
                };
            }
            acc[employeeId].schedules.push(schedule);
            return acc;
        }, {});

        // Convert grouped schedules to an array
        const result = Object.values(groupedSchedules);

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching schedules by month:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};


/**
 * Get schedules for a specific month and year, filtered independently by name and/or department.
 * @route GET /api/getByMonth&NameOrDepartment
 * @query {string} date - Month and year in the format "MM.YYYY".
 * @query {string} [name] - (Optional) Employee name to filter by.
 * @query {string} [department] - (Optional) Department name to filter by.
 * @returns {Object} - Schedules matching the specified filters.
 */
exports.getSchedulesByMonthAndNameOrDepartment = async (req, res) => {
    try {
        const { date, name, department } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter (MM.YYYY) is required.' });
        }

        const [month, year] = date.split('.').map(Number);

        if (!month || !year || month < 1 || month > 12) {
            return res.status(400).json({ error: 'Invalid date format. Use MM.YYYY.' });
        }

        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

        console.log(`Fetching schedules for month: ${month}, year: ${year}, name: ${name}, department: ${department}`);

        let employees = await Employee.find({});
        const validEmployees = employees.filter((employee) => employee.name && employee.name !== 'undefined');

        if (name && !department) {
            const employee = validEmployees.find(emp => new RegExp(name, 'i').test(emp.name));
            if (!employee) {
                return res.status(404).json({ message: `No employee found with name "${name}".` });
            }

            const schedules = await Schedule.find({
                date: { $gte: startDate, $lte: endDate },
                employee: employee._id,
            }).populate('employee', 'name position');

            return res.status(200).json({
                name: employee.name,
                position: employee.position,
                schedules,
            });
        }

        if (!name && department) {
            const schedules = await Schedule.find({
                date: { $gte: startDate, $lte: endDate },
                department: new RegExp(department, 'i'),
            }).populate('employee', 'name position');

            if (schedules.length === 0) {
                return res.status(404).json({ message: 'No schedules found for the specified department.' });
            }

            const groupedSchedules = schedules.reduce((acc, schedule) => {
                const employeeId = schedule.employee._id.toString();
                if (!acc[employeeId]) {
                    acc[employeeId] = {
                        name: schedule.employee.name,
                        position: schedule.employee.position,
                        schedules: [],
                    };
                }
                acc[employeeId].schedules.push(schedule);
                return acc;
            }, {});

            return res.status(200).json(Object.values(groupedSchedules));
        }

        if (name && department) {
            const employee = validEmployees.find(emp => new RegExp(name, 'i').test(emp.name));
            let employeeId = employee ? employee._id : null;

            const schedules = await Schedule.find({
                date: { $gte: startDate, $lte: endDate },
                $or: [
                    { employee: employeeId },
                    { department: new RegExp(department, 'i') },
                ],
            }).populate('employee', 'name position');

            if (schedules.length === 0) {
                return res.status(404).json({ message: 'No schedules found for the specified filters.' });
            }

            const groupedSchedules = schedules.reduce((acc, schedule) => {
                const employeeId = schedule.employee._id.toString();
                if (!acc[employeeId]) {
                    acc[employeeId] = {
                        name: schedule.employee.name,
                        position: schedule.employee.position,
                        schedules: [],
                    };
                }
                acc[employeeId].schedules.push(schedule);
                return acc;
            }, {});

            return res.status(200).json(Object.values(groupedSchedules));
        }

        const schedules = await Schedule.find({
            date: { $gte: startDate, $lte: endDate },
        }).populate('employee', 'name position');

        if (schedules.length === 0) {
            return res.status(404).json({ message: 'No schedules found for the specified month.' });
        }

        const groupedSchedules = schedules.reduce((acc, schedule) => {
            const employeeId = schedule.employee._id.toString();
            if (!acc[employeeId]) {
                acc[employeeId] = {
                    name: schedule.employee.name,
                    position: schedule.employee.position,
                    schedules: [],
                };
            }
            acc[employeeId].schedules.push(schedule);
            return acc;
        }, {});

        return res.status(200).json(Object.values(groupedSchedules));
    } catch (error) {
        console.error('Error fetching schedules by month, name, or department:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Search for employees and departments matching a partial string.
 * @route GET /api/findAll
 * @query {string} info - Partial string to search for in employee names and department names.
 * @returns {Object} - Matched employees and departments.
 */
exports.findAll = async (req, res) => {
    try {
        const { info } = req.query;

        if (!info) {
            return res.status(400).json({ error: 'Search query (info) is required.' });
        }

        console.log(`Performing live search for: ${info}`);

        // Find employees matching the search query
        const employees = await Employee.find({
            name: new RegExp(info, 'i'), // Case-insensitive partial match
        }).select('name position'); // Return only name and position fields

        // Find departments matching the search query
        const schedules = await Schedule.find({
            department: new RegExp(info, 'i'), // Case-insensitive partial match
        }).select('department'); // Return only department field

        // Extract unique departments from schedules
        const uniqueDepartments = [...new Set(schedules.map((schedule) => schedule.department))].filter(Boolean);

        // Combine results
        const result = {
            employees,
            departments: uniqueDepartments,
        };

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error during live search:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
