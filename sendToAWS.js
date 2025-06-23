const fs = require("fs");
const https = require("https");
const path = require("path");

// 🧾 Use passed-in file or default
const fileArg = process.argv[2] || "license_base64.txt";
const filePath = path.resolve(__dirname, fileArg);

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

const base64 = fs.readFileSync(filePath, "utf-8");
const data = JSON.stringify({ image_base64: base64 });

const req = https.request({
  hostname: "knjdgrv83i.execute-api.us-east-1.amazonaws.com",
  path: "/process",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data),
  },
}, res => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => {
    console.log("\n✅ Response:");
    console.log(body);
  });
});

req.on("error", console.error);
req.write(data);
req.end();