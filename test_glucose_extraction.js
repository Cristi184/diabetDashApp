const fs = require('fs');
const path = require('path');

// Read the image and convert to base64
const imagePath = '/workspace/uploads/image (14).png';
const imageBuffer = fs.readFileSync(imagePath);
const base64Image = imageBuffer.toString('base64');

console.log('Image loaded successfully');
console.log('Image size:', imageBuffer.length, 'bytes');
console.log('Base64 length:', base64Image.length, 'characters');
console.log('\nThis image will be sent to the edge function for analysis.');
console.log('The AI should extract all data points from the glucose curve.');
console.log('\nExpected extraction:');
console.log('- Time range: 08:00 to 20:00 (approximately 12 hours)');
console.log('- Glucose range: 70-250 mg/dL');
console.log('- Estimated data points: 20-30 readings along the curve');
console.log('\nTo test in the app:');
console.log('1. Go to Glucose Logs page');
console.log('2. Click "Upload Glucose Image"');
console.log('3. Select this image');
console.log('4. Click "Analyze & Extract All Data"');
console.log('5. Review extracted readings');
console.log('6. Click "Import All Readings"');
