import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory && f !== 'node_modules' && f !== '.git' && f !== 'dist') {
            walk(dirPath, callback);
        } else if (!isDirectory && (f.endsWith('.tsx') || f.endsWith('.ts'))) {
            callback(dirPath);
        }
    });
}

walk(__dirname, function (filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // First, specifically handle the PDF copyright notices 
    content = content.replace(/CREATED BY PLANEX/gi, 'Created by PlanneX');
    content = content.replace(/Généré par Planex/gi, 'Created by PlanneX');

    // Then handle the general replacements
    content = content.replace(/PlanEx/g, 'PlanneX');
    content = content.replace(/PLANEX/g, 'PlanneX');

    // Fixing an edge case where CREATED BY PLANEX became CREATED BY PlanneX
    // and we want 'Created by PlanneX'
    content = content.replace(/CREATED BY PlanneX/g, 'Created by PlanneX');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated', filePath);
    }
});
