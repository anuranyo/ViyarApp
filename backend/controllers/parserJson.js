/**
 * This module provides functions to parse Excel files into TXT and JSON formats.
 * It handles file uploads, processes the data, and saves the results in specified directories.
 */

const GLOBAL_FILE_NAME = "UnifiedFileName"; // Global file name for all created files

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const TXT_DIR = path.join(__dirname, "../uploads"); // Directory for storing TXT files
const JSON_DIR = path.join(__dirname, "../tmpr_json"); // Directory for storing JSON files



const monthNames = [ // Array of month names for converting date strings
    "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
    "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
];

/**
 * Parses uploaded Excel files to TXT format.
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

        if (!uploadedFiles || uploadedFiles.length === 0) {
            return res.status(400).send('No files uploaded.'); // Send error response if no files are uploaded
        }

        uploadedFiles.forEach((file) => {
            const filePath = file.path; // Path of the uploaded file
            const workbook = xlsx.readFile(filePath); // Read the Excel file
            const txtLines = []; // Array to store lines of the TXT file

            workbook.SheetNames.forEach((sheetName) => {
                const sheet = workbook.Sheets[sheetName]; // Access each sheet in the workbook
                const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // Convert sheet to JSON format
                const headers = rows[0]; // Extract headers from the first row
                const endIndex = headers.findIndex(header => header === "ВСЬОГО ЛК"); // Find index of specific header
                const limit = endIndex !== -1 ? endIndex : headers.length; // Determine limit for processing columns

                rows.forEach((row, index) => {
                    if (index === 0) return; // Skip header row

                    const nameCell = rows[index] ? rows[index][2] : null; // Extract employee name
                    if (nameCell === "Всього працює") return; // Skip summary row

                    let positionCell = ""; // Initialize position cell
                    if (rows[index][3] === "керівник") { // Check if position is "керівник"
                        positionCell = rows[index][3]?.toString().trim();
                    } else {
                        positionCell = rows[index + 1]?.[3]?.toString().trim();
                    }

                    if (!positionCell) return; // Skip if position is not found

                    txtLines.push(`Ім'я працівника: ${nameCell}`); // Add employee name to TXT lines
                    txtLines.push(`Посада: ${positionCell}`); // Add position to TXT lines

                    for (let i = 4; i < limit; i++) {
                        let isDuty = false; // Initialize duty status
                        const date = headers[i]; // Extract date from headers
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
                txtFilePaths.push(txtFilePath); // Add TXT file path to array
            });
        });

        //res.status(200).send('Files uploaded and converted to TXT successfully.');
    } catch (error) {
        console.error('Error processing files:', error); // Log error
        res.status(500).send('Error processing files.'); // Send error response
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
        const { filePath } = req.body; // Extract file path from request body

        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(400).send('Invalid or missing file path.'); // Send error response if file path is invalid
        }

        const lines = fs.readFileSync(filePath, 'utf8').split('\n').map(line => line.trim()); // Read and trim lines from TXT file
        const employees = []; // Array to store employee data
        let currentEmployee = null; // Initialize current employee object

        lines.forEach((line, idx) => {
            if (line.startsWith("Ім'я працівника:")) {
                // Save previous employee if exists
                if (currentEmployee) {
                    employees.push(currentEmployee);
                }
        
                // Start a new employee
                const name = line.split(":")[1].trim();
                currentEmployee = { name, position: "", schedule: [] };
            } else if (line.startsWith("Посада:")) {
                // Set position
                if (currentEmployee) {
                    currentEmployee.position = line.split(":")[1].trim();
                }
            } else if (line.match(/^\d{2}\.\d{2}\.\d{4}/)) {
                // Process line with date and schedule
                const [datePart, ...rest] = line.split(":");
                const [date, day] = datePart.trim().split(' ');
                const action = rest.join(':').trim();
        
                const departmentLine = lines[idx + 1]?.trim() || "";
                const dutyLine = lines[idx + 2]?.trim() || "";
        
                const department = departmentLine.startsWith("Departament:")
                    ? departmentLine.split(":")[1].trim()
                    : "";
        
                const duty = dutyLine.startsWith("Duty:") && dutyLine.split(":")[1]?.trim().toLowerCase() === "true";
        
                if (currentEmployee) {
                    currentEmployee.schedule.push({
                        date,
                        //day,
                        action,
                        department,
                        duty,
                    });
                }
            }
        });
        
        // Add the last employee
        if (currentEmployee) {
            employees.push(currentEmployee);
        }
        
        const jsonFileName = `${path.basename(filePath, path.extname(filePath))}.json`; // Construct JSON file name
        const jsonFilePath = path.join(JSON_DIR, jsonFileName); // Determine JSON file path

        fs.writeFileSync(jsonFilePath, JSON.stringify({ employees }, null, 2), 'utf8'); // Write JSON file
        console.log(`Parsed JSON saved: ${jsonFilePath}`); // Log success message

        //res.status(200).send(`JSON file created at ${jsonFilePath}`);
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).send('Error processing file.'); // Send error response
    }
};

/**
 * Parses uploaded Excel files directly to JSON format.
 * @param {Object} req - The request object containing uploaded files.
 * @param {Object} res - The response object for sending responses.
 */
/**
 * Parses uploaded Excel files directly to JSON format.
 * @param {Object} req - The request object containing uploaded files.
 * @param {Object} res - The response object for sending responses.
 */
exports.parseExcelToJson = async (req, res) => {
    try {
        // First, parse the Excel file to a text file
        const txtFilePaths = await exports.parseExcelToTxt(req, res); // Convert Excel to TXT first

        // Then, parse the text file to JSON
        const uploadedFiles = req.files; // Retrieve uploaded files from the request
        if (!uploadedFiles || uploadedFiles.length === 0) {
            return res.status(400).send('No files uploaded.'); // Send error response if no files are uploaded
        }

        // Process each uploaded file
        txtFilePaths.forEach((txtFilePath) => { // Process each TXT file
            req.body.filePath = txtFilePath;
        });
        exports.parseTxtToJson(req, res); // Convert TXT to JSON

    } catch (error) {
        console.error('Error processing files:', error); // Log error
        res.status(500).send('Error processing files.'); // Send error response
    }
};
