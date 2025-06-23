// encode.js
const fs = require('fs');
const path = require('path');

// 📷 Accept file from command line or default
const fileArg = process.argv[2] || 'testLicenses/license.jpg';
const filePath = path.resolve(__dirname, fileArg);

// ✅ Validate file exists
if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

// 🔁 Read and encode
const image = fs.readFileSync(filePath);
const base64 = image.toString('base64');
console.log(base64);
