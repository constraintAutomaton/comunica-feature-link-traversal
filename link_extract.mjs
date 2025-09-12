import fs from 'fs';

function extractUrlsFromLogs(logText) {
    const lines = logText.split('\n');
    const urls = [];
    const requestingPattern = /INFO: Requesting (https?:\/\/[^\s{]+)/;
    
    lines.forEach(line => {
        const match = line.match(requestingPattern);
        if (match && match[1]) {
            urls.push(match[1]);
        }
    });
    
    return [...new Set(urls)];
}

const logContent = fs.readFileSync('./log', 'utf8');
const urls = extractUrlsFromLogs(logContent);

console.log('Extracted URLs:');
urls.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`);
});