const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const TXT_DIR = path.join(__dirname, "../uploads");

exports.parseExcelToTxt = async (req, res) => {
    try {
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

                rows.forEach(async (row, index) => {
                    if (index === 0) return; // Пропускаем заголовки

                    const nameCell = rows[index] ? rows[index][2] : null; // Столбец C
                    if (nameCell === "Всього працює") return;
                    console.log("nameCell:", nameCell);
                    
                    let positionCell = "";
                    if (rows[index][3]=="керівник"){
                        positionCell = (rows[index] && rows[index][3]) ? rows[index][3].toString().trim() : null; // Столбец D
                    }else{
                        positionCell = (rows[index + 1] && rows[index + 1][3]) ? rows[index + 1][3].toString().trim() : null; // Столбец D
                    }

                    if (!positionCell) return;
                    console.log("positionCell:", positionCell);
                    
                    txtLines.push(`Ім'я працівника: ${nameCell}`);
                    txtLines.push(`Посада: ${positionCell}`);

                    for (let i = 4; i < limit; i++) {
                        let isDuty = false;
                        let department = ""; 
                        const date = headers[i];
                        const action = row[i] || "Рв";
                        if (positionCell == "керівник") {
                            department = "";
                        } else {
                            department = rows[index + 1][i] || ""; // Проверяем значение в следующей строке
                        }
                        
                        if (positionCell == "керівник") {
                            isDuty = rows[index + 1][i] === "ч" || rows[index + 1][i] === "Ч"; // Проверяем значение в следующей строке
                        } else if (rows[index + 2]) {
                            isDuty = rows[index + 2][i] === "ч" || rows[index + 2][i] === "Ч"; 
                        }
                    
                        txtLines.push(`${date}: ${action}`.trim());
                        txtLines.push(`Departament: ${department || ""}`); // Если undefined, явно указываем
                        txtLines.push(`Duty: ${isDuty ? "true" : "false"}`);
                    }
                    
                    txtLines.push(""); // Добавляем пустую строку
                });

                txtLines.push(""); // Разделяем листы
            });

            // Сохраняем текстовый файл
            const txtFileName = `${path.basename(filePath, path.extname(filePath))}.txt`;
            const txtFilePath = path.join(TXT_DIR, txtFileName);
            fs.writeFileSync(txtFilePath, txtLines.join("\n"), 'utf8');
            console.log(`Parsed TXT saved: ${txtFilePath}`);
        });

        res.status(200).send('Files uploaded and converted to TXT successfully.');
    } catch (error) {
        console.error('Error processing files:', error);
        res.status(500).send('Error processing files.');
    }
};


exports.parseTxtToJson = (req, res) => {
    const { filePath } = req.body; // Получаем путь из тела запроса
    console.log("filePath:", filePath);

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(400).send('Invalid or missing file path.');
    }

    try {
        const lines = fs.readFileSync(filePath, 'utf8').split('\n').map(line => line.trim());

        const employees = [];
        let currentEmployee = null;

        lines.forEach(line => {
            if (line.startsWith("Ім'я працівника:")) {
                // Сохраняем предыдущего сотрудника в список
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
                // Добавляем расписание
                const [datePart, ...rest] = line.split(":");
                const [date, day] = datePart.trim().split(' ');
                const action = rest.join(':').trim();

                const departmentLine = lines[lines.indexOf(line) + 1];
                const dutyLine = lines[lines.indexOf(line) + 2];

                const department = departmentLine.startsWith("Departament:")
                    ? departmentLine.split(":")[1].trim()
                    : "undefined";

                const duty = dutyLine.startsWith("Duty:") && dutyLine.split(":")[1].trim() === "true";

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

        res.status(200).json({ employees });
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).send('Error processing file.');
    }
};
