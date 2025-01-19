const GLOBAL_FILE_NAME = "UnifiedFileName"; // Global file name for all created files

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const TXT_DIR = path.join(__dirname, "../uploads");
const JSON_DIR = path.join(__dirname, "../tmpr_json");

const monthNames = [
    "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
    "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
];

/**
 * Parses uploaded Excel files to TXT format.
 */
exports.parseExcelToTxt = async (req, res) => {
    try {
        const txtFilePaths = [];
        const uploadedFiles = req.files;

        if (!uploadedFiles || uploadedFiles.length === 0) {
            return res.status(400).send('No files uploaded.');
        }

        uploadedFiles.forEach((file) => {
            const filePath = file.path;
            const workbook = xlsx.readFile(filePath);
            const txtLines = [];

            workbook.SheetNames.forEach((sheetName) => {
                const sheet = workbook.Sheets[sheetName];
                const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
                const headers = rows[0];
                const endIndex = headers.findIndex(header => header === "ВСЬОГО ЛК");
                const limit = endIndex !== -1 ? endIndex : headers.length;

                rows.forEach((row, index) => {
                    if (index === 0) return;

                    const nameCell = rows[index] ? rows[index][2] : null;
                    if (nameCell === "Всього працює") return;

                    let positionCell = "";
                    if (rows[index][3] === "керівник") {
                        positionCell = rows[index][3]?.toString().trim();
                    } else {
                        positionCell = rows[index + 1]?.[3]?.toString().trim();
                    }

                    if (!positionCell) return;

                    txtLines.push(`Ім'я працівника: ${nameCell}`);
                    txtLines.push(`Посада: ${positionCell}`);

                    for (let i = 4; i < limit; i++) {
                        let isDuty = false;
                        const date = headers[i];
                        const action = row[i] || "Рв";
                        const department = positionCell === "керівник" ? "" : rows[index + 1]?.[i] || "";
                        if (positionCell == "керівник") {
                            isDuty = rows[index + 1][i] === "ч" || rows[index + 1][i] === "Ч"; 
                        } else if (rows[index + 2]) {
                            isDuty = rows[index + 2][i] === "ч" || rows[index + 2][i] === "Ч"; 
                        }                    

                        txtLines.push(`${date}: ${action}`.trim());
                        txtLines.push(`Departament: ${department || ""}`);
                        txtLines.push(`Duty: ${isDuty ? "true" : "false"}`);
                    }

                    txtLines.push("");
                });

                const dateString = rows[0]?.[4];
                if (!dateString) {
                    throw new Error("Cannot determine date from the first row.");
                }

                const monthNumber = parseInt(dateString.split('.')[1], 10);
                const monthName = monthNames[monthNumber - 1];

                const txtFileName = `${monthName}.txt`;
                const txtFilePath = path.join(TXT_DIR, txtFileName);

                fs.writeFileSync(txtFilePath, txtLines.join("\n"), 'utf8');
                console.log(`Parsed TXT saved: ${txtFilePath}`);
                this.parseTxtToJson({ body: { filePath: txtFilePath } }, res);
                txtFilePaths.push(txtFilePath);
            });
        });

        //res.status(200).send('Files uploaded and converted to TXT successfully.');
    } catch (error) {
        console.error('Error processing files:', error);
        res.status(500).send('Error processing files.');
    }
};

/**
 * Parses a TXT file to JSON format.
 */
exports.parseTxtToJson = (req, res) => {
    try {
        const { filePath } = req.body;

        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(400).send('Invalid or missing file path.');
        }

        const lines = fs.readFileSync(filePath, 'utf8').split('\n').map(line => line.trim());
        const employees = [];
        let currentEmployee = null;

        lines.forEach((line, idx) => {
            if (line.startsWith("Ім'я працівника:")) {
                // Сохраняем предыдущего сотрудника, если есть
                if (currentEmployee) {
                    employees.push(currentEmployee);
                }
        
                // Начинаем нового сотрудника
                const name = line.split(":")[1].trim();
                currentEmployee = { name, position: "", schedule: [] };
            } else if (line.startsWith("Посада:")) {
                // Устанавливаем должность
                if (currentEmployee) {
                    currentEmployee.position = line.split(":")[1].trim();
                }
            } else if (line.match(/^\d{2}\.\d{2}\.\d{4}/)) {
                // Обрабатываем строку с датой и расписанием
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
                        day,
                        action,
                        department,
                        duty,
                    });
                }
            }
        });
        
        // Добавляем последнего сотрудника
        if (currentEmployee) {
            employees.push(currentEmployee);
        }
        
        const jsonFileName = `${path.basename(filePath, path.extname(filePath))}.json`;
        const jsonFilePath = path.join(JSON_DIR, jsonFileName);

        fs.writeFileSync(jsonFilePath, JSON.stringify({ employees }, null, 2), 'utf8');
        console.log(`Parsed JSON saved: ${jsonFilePath}`);

        //res.status(200).send(`JSON file created at ${jsonFilePath}`);
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).send('Error processing file.');
    }
};

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
            return res.status(400).send('No files uploaded.');
        }

        // Process each uploaded file
        txtFilePaths.forEach((txtFilePath) => { 
            req.body.filePath = txtFilePath;
        });
        exports.parseTxtToJson(req, res); // Convert TXT to JSON

    } catch (error) {
        console.error('Error processing files:', error); // Log error
        res.status(500).send('Error processing files.');
    }
};
