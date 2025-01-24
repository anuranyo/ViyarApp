/**
 * This module provides functions to parse Excel files into TXT and JSON formats.
 * It handles file uploads, processes the data, and saves the results in specified directories.
 * 
 * Principles from Clean Code:
 * - Functions should do one thing and do it well.
 * - Use meaningful names for variables and functions.
 * - Keep functions small and focused.
 */

const GLOBAL_FILE_NAME = "UnifiedFileName"; // Global file name for all created files

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const TXT_DIR = path.join(__dirname, "../uploads"); // Directory for storing TXT files
const JSON_DIR = path.join(__dirname, "../tmpr_json"); // Directory for storing JSON files

// Array of month names for converting date strings
const monthNames = [
    "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
    "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
];

/**
 * Parses uploaded Excel files to TXT format.
 * This function reads Excel files, extracts relevant data, and writes it to TXT files.
 * It also initiates the conversion of TXT files to JSON format.
 */
/**
 * Parses uploaded Excel files to TXT format.
 * @param {Object} req - The request object containing uploaded files.
 * @param {Object} res - The response object for sending responses.
 */
exports.parseExcelToTxt = async (req, res) => {
    try {
        const txtFilePaths = []; // Array to store paths of generated TXT files
        const uploadedFiles = req.files; // Retrieve uploaded files from the request
        // Ensure that files are uploaded before proceeding

        if (!uploadedFiles || uploadedFiles.length === 0) {
            return console.log('No files uploaded.'); // Log message if no files are uploaded
        }

        uploadedFiles.forEach((file) => {
            const filePath = file.path; // Path of the uploaded file
            const workbook = xlsx.readFile(filePath); // Read the Excel file
            // Process each sheet in the workbook
            const txtLines = []; // Array to store lines of the TXT file

            workbook.SheetNames.forEach((sheetName) => {
                const sheet = workbook.Sheets[sheetName]; // Access each sheet in the workbook
                const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // Convert sheet to JSON format
                // Extract headers and determine processing limits
                const headers = rows[0]; // Extract headers from the first row
                const endIndex = headers.findIndex(header => header === "ВСЬОГО ЛК"); // Find index of specific header
                const limit = endIndex !== -1 ? endIndex : headers.length; // Determine limit for processing columns

                rows.forEach((row, index) => {
                    if (index === 0) return; // Skip header row

                    const nameCell = rows[index] ? rows[index][2] : null; // Extract employee name
                    // Skip rows that do not contain employee data
                    if (nameCell === "Всього працює") return; // Skip summary row

                    let positionCell = ""; // Initialize position cell
                    if (rows[index][3] === "керівник") { // Check if position is "керівник"
                        positionCell = rows[index][3]?.toString().trim();
                    } else {
                        positionCell = rows[index + 1]?.[3]?.toString().trim();
                    }

                    if (!positionCell) return; // Skip if position is not found

                    txtLines.push(`Ім'я працівника: ${nameCell}`); // Add employee name to TXT lines
                    // Append position, date, action, department, and duty status to TXT lines
                    txtLines.push(`Посада: ${positionCell}`); // Add position to TXT lines

                    for (let i = 4; i < limit; i++) {
                        let isDuty = false; // Initialize duty status
                        const date = headers[i].split(' ')[0]; // Extract date from headers
                        const action = row[i] || "Рв"; // Default action if not specified
                        const department = positionCell === "керівник" ? "" : rows[index + 1]?.[i] || ""; // Determine department
                        if (positionCell == "керівник") { // Check duty status for "керівник"
                            isDuty = rows[index + 1][i] === "ч" || rows[index + 1][i] === "Ч"; 
                        } else if (rows[index + 2]) {
                            isDuty = rows[index + 2][i] === "ч" || rows[index + 2][i] === "Ч"; 
                        }                    

                        txtLines.push(`${date}: ${action}`.trim()); // Add date and action to TXT lines
                        txtLines.push(`Departament: ${department || ""}`); // Add department to TXT lines
                        txtLines.push(`Duty: ${isDuty ? "true" : "false"}`); // Add duty status to TXT lines
                    }

                    txtLines.push(""); // Add empty line for separation
                });

                const dateString = rows[0]?.[4]; // Extract date string for file naming
                // Validate date string and construct file name
                if (!dateString) {
                    throw new Error("Cannot determine date from the first row.");
                }

                const monthNumber = parseInt(dateString.split('.')[1], 10); // Parse month number
                const monthName = monthNames[monthNumber - 1]; // Get month name from array

                const txtFileName = `${monthName}.txt`; // Construct TXT file name
                const txtFilePath = path.join(TXT_DIR, txtFileName); // Determine TXT file path

                fs.writeFileSync(txtFilePath, txtLines.join("\n"), 'utf8'); // Write TXT file
                console.log(`Parsed TXT saved: ${txtFilePath}`); // Log success message
                this.parseTxtToJson({ body: { filePath: txtFilePath } }, res); // Convert TXT to JSON
                // Store path of generated TXT file
                txtFilePaths.push(txtFilePath); // Add TXT file path to array
            });
        });

        return txtFilePaths; // Return array of TXT file paths
        // Consider sending a response to the client here

        //res.status(200).send('Files uploaded and converted to TXT successfully.');
    } catch (error) {
        console.error('Error processing files:', error); // Log error
        // Consider sending an error response to the client
    }
};

/**
 * Parses a TXT file to JSON format.
 */
/**
 * Parses a TXT file to JSON format.
 * @param {Object} req - The request object containing the file path.
 * @param {Object} res - The response object for sending responses.
 */
exports.parseTxtToJson = (req, res) => {
    try {
        const { filePath } = req.body;
        // Validate file path before proceeding

        if (!filePath || !fs.existsSync(filePath)) {
            throw new Error('Invalid or missing file path.');
        }

        const lines = fs.readFileSync(filePath, 'utf8').split('\n').map(line => line.trim());
        // Initialize variables for parsing employee data
        const employees = [];
        let currentEmployee = null;

        lines.forEach((line, idx) => {
            if (line.startsWith("Ім'я працівника:")) {
                // Start a new employee record
                if (currentEmployee) {
                    employees.push(currentEmployee);
                }

                const name = line.split(":")[1].trim();
                currentEmployee = { name, position: "", schedule: [] };
            } else if (line.startsWith("Посада:")) {
                if (currentEmployee) {
                    currentEmployee.position = line.split(":")[1].trim();
                }
            } else if (line.match(/^\d{2}\.\d{2}\.\d{4}/)) {
                const [datePart, ...rest] = line.split(":");
                const date = datePart.trim();
                const action = rest.join(':').trim();

                const departmentLine = lines[idx + 1]?.trim() || "";
                const dutyLine = lines[idx + 2]?.trim() || "";

                const department = departmentLine.startsWith("Departament:")
                // Extract department and duty information
                    ? departmentLine.split(":")[1].trim()
                    : "";

                const duty = dutyLine.startsWith("Duty:") && dutyLine.split(":")[1]?.trim().toLowerCase() === "true";

                if (currentEmployee) {
                    currentEmployee.schedule.push({
                        date,
                        action,
                        department,
                        duty,
                    });
                }
            }
        });

        if (currentEmployee) {
            employees.push(currentEmployee);
        }

        const jsonFileName = `${path.basename(filePath, path.extname(filePath))}.json`;
        const jsonFilePath = path.join(JSON_DIR, jsonFileName);

        fs.writeFileSync(jsonFilePath, JSON.stringify({ employees }, null, 2), 'utf8');
        // Write parsed employee data to JSON file
        console.log(`Parsed JSON saved: ${jsonFilePath}`);
        return jsonFilePath; // Return JSON file path
    } catch (error) {
        console.error('Error processing file:', error);
        // Consider sending an error response to the client
        throw error;
    }
};


/**
 * Parses uploaded Excel files directly to JSON format.
 * @param {Object} req - The request object containing uploaded files.
 * @param {Object} res - The response object for sending responses.
 */
exports.parseExcelToJson = async (req, res) => {
    try {
        const filePaths = req.body.filePaths; // Extract file paths from request body
        // Validate file paths before processing

        if (!filePaths || !Array.isArray(filePaths)) {
            throw new Error('Invalid or missing file paths.');
        }

        console.log('Processing file paths:', filePaths);

        const jsonPaths = []; // Array to collect JSON file paths
        // Process each file path and convert to JSON

        // Process each file
        for (const filePath of filePaths) {
            const txtFilePaths = await exports.parseExcelToTxt({ files: [{ path: filePath }] });

            if (Array.isArray(txtFilePaths)) {
                for (const txtFilePath of txtFilePaths) {
                    const mockReq = { body: { filePath: txtFilePath } };
                    const jsonFilePath = exports.parseTxtToJson(mockReq, res);

                    if (jsonFilePath) {
                        jsonPaths.push(jsonFilePath);
                    }
                }
            }
        }

        console.log('Generated JSON file paths:', jsonPaths);
        // Consider sending a response to the client with the JSON paths
        return jsonPaths; // Return collected JSON file paths
    } catch (error) {
        console.error('Error processing files:', error);
        // Consider sending an error response to the client
        throw error;
    }
};
