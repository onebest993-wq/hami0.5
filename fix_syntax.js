const fs = require('fs');
const file = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const lines = fs.readFileSync(file, 'utf-8').split('\n');

// 15975 is index 15974
// 20705 is index 20704

if (lines[15974].includes('</div>') && lines[20704].includes('</div>')) {
    // Remove the lines
    lines.splice(20704, 1); // Remove higher index first
    lines.splice(15974, 1);
    
    fs.writeFileSync(file, lines.join('\n'));
    console.log('Successfully removed lines 15975 and 20705.');
} else {
    console.log('Error: Lines did not contain expected </div> :');
    console.log('15975:', lines[15974]);
    console.log('20705:', lines[20704]);
}
