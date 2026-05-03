const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
            callback(dirPath);
        }
    });
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;

    const classRegex = /(hover:|focus:|active:|group-hover:|group-focus:)?(text|bg|border|fill|stroke|ring|from|to|via|shadow)-\[#(6b46c1|714b67|6B46C1|714B67)\](\/[0-9]+)?/g;
    
    newContent = newContent.replace(classRegex, (match, prefix1, prefix2, hex, opacity) => {
        return `${prefix1 || ''}${prefix2}-primary${opacity || ''}`;
    });

    newContent = newContent.replace(/color="#(6b46c1|6B46C1)"/g, 'color="#714B67"');

    // Just in case there's any remaining raw hex that wasn't caught by the regex above (e.g. style={{color: '#6b46c1'}})
    newContent = newContent.replace(/#6B46C1/ig, '#714B67');

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

['app', 'components'].forEach(dir => {
    if (fs.existsSync(dir)) {
        walk(dir, processFile);
    }
});
