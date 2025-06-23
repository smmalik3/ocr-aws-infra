const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3();
const textract = new AWS.Textract();
const BUCKET_NAME = process.env.BUCKET_NAME;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const imageBase64 = body.image_base64;
    const buffer = Buffer.from(imageBase64, 'base64');
    const key = `${uuidv4()}.jpg`;

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    }).promise();

    const textractResponse = await textract.detectDocumentText({
      Document: { S3Object: { Bucket: BUCKET_NAME, Name: key } },
    }).promise();

    const lineBlocks = textractResponse.Blocks.filter(block => block.BlockType === 'LINE');
    const lines = lineBlocks.map(block => block.Text);
    const combinedText = lines.join(' ').toLowerCase();

    console.log("🧾 OCR LINES:\n", lines.join("\n"));
    console.log("🧾 OCR TEXT:\n", combinedText);

    const { first_name, last_name } = extractFirstAndLastName(lines, lineBlocks);
    const pnr = wrapWithConfidence(extractPNR(lines), lines, lineBlocks);
    const flight_number = wrapWithConfidence(extractFlightNumber(lines), lines, lineBlocks);

    const isBoardingPass = lines.some(line =>
      /boarding pass|flight|airlines|departure|gate|seat|pnr|locator|record/i.test(line)
    );

    console.log("📄 Document Type Detected:", isBoardingPass ? "Boarding Pass" : "Driver's License");

    const extractedData = isBoardingPass
      ? {
          first_name,
          last_name,
          pnr,
          flight_number
        }
      : {
          first_name,
          last_name,
          address_1: wrapWithConfidence(extractAddress1(lines), lines, lineBlocks),
          address_2: wrapWithConfidence(extractAddress2(lines), lines, lineBlocks),
          city: wrapWithConfidence(extractCity(lines), lines, lineBlocks),
          state: wrapWithConfidence(extractState(lines), lines, lineBlocks),
          zip: wrapWithConfidence(extractZip(lines), lines, lineBlocks),
          dob: wrapWithConfidence(extractDOB(lines), lines, lineBlocks)
        };

    return {
      statusCode: 200,
      body: JSON.stringify(extractedData, null, 2),
    };

  } catch (err) {
    console.error("❌ OCR Failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OCR failed', details: err.message }),
    };
  }
};

function wrapWithConfidence(value, lines, blocks) {
  if (!value) return { value: null, confidence: null };
  const block = blocks.find(b => b.Text?.includes(value));
  return {
    value,
    confidence: block?.Confidence?.toFixed(1) || null,
  };
}

function extractFirstAndLastName(lines, blocks) {
  let lastNameIndex = lines.findIndex(line => /^1\.\s*FAMILY NAME/i.test(line));
  let givenNameIndex = lines.findIndex(line => /^2\.\s*GIVEN NAMES?/i.test(line));

  let last_name = "";
  let first_name = "";

  if (lastNameIndex !== -1 && lines[lastNameIndex + 1]) {
    last_name = lines[lastNameIndex + 1].trim();
  }

  if (givenNameIndex !== -1) {
    let givenLines = [];
    for (let i = givenNameIndex + 1; i < lines.length; i++) {
      if (/^\d+\./.test(lines[i])) break;
      givenLines.push(lines[i].trim());
    }
    first_name = givenLines.join(" ").trim();
  }

  if (!first_name || !last_name) {
    const nameLine = lines.find(line => /^[A-Z\s]+\/[A-Z\s]+$/.test(line.trim()));
    if (nameLine) {
      const [last, first] = nameLine.split('/');
      last_name = last?.trim() || last_name;
      first_name = first?.trim() || first_name;
    }
  }

  return {
    first_name: wrapWithConfidence(first_name, lines, blocks),
    last_name: wrapWithConfidence(last_name, lines, blocks)
  };
}

function extractAddress1(lines) {
  const addrLine = lines.find(line =>
    /^\d+\s+[A-Z0-9\s]+(?:ST|RD|AVE|BLVD|DR|LN|CT|CIR|WAY|NW|NE|SW|SE)/i.test(line)
  );
  return addrLine?.trim() || null;
}

function extractAddress2(lines) {
  const keywords = ['APT', 'APARTMENT', 'UNIT', 'STE', 'SUITE', '#'];
  const pattern = new RegExp(`\\b(?:${keywords.join('|')})[#\\s]*\\d+[A-Z\\-]?\\b`, 'i');
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) return match[0].trim();
  }
  const addr1 = extractAddress1(lines);
  if (addr1 && pattern.test(addr1)) {
    const match = addr1.match(pattern);
    return match ? match[0].trim() : null;
  }
  return null;
}

function extractCity(lines) {
  const cityStateZipLine = lines.find(line =>
    /[A-Z\s]+,\s*[A-Z]{2}\s*\d{5}/.test(line)
  );
  if (!cityStateZipLine) return null;
  const match = cityStateZipLine.match(/^([A-Z\s]+),/);
  return match ? match[1].trim() : null;
}

function extractState(lines) {
  const cityStateZipLine = lines.find(line =>
    /[A-Z\s]+,\s*[A-Z]{2}\s*\d{5}/.test(line)
  );
  if (!cityStateZipLine) return null;
  const match = cityStateZipLine.match(/,\s*([A-Z]{2})\s*\d{5}/);
  return match ? match[1] : null;
}

function extractZip(lines) {
  const cityStateZipLine = lines.find(line =>
    /[A-Z\s]+,\s*[A-Z]{2}\s*\d{5}(-\d{4})?/.test(line)
  );
  if (cityStateZipLine) {
    const match = cityStateZipLine.match(/\b\d{5}(-\d{4})?\b/);
    if (match) return match[0];
  }
  for (const line of lines) {
    if (/\b[A-Z]{2}\s+\d{5}(-\d{4})?\b/.test(line)) {
      const match = line.match(/\d{5}(-\d{4})?/);
      if (match) return match[0];
    }
  }
  return null;
}

function extractDOB(lines) {
  const dobLine = lines.find(line => /3\.\s*DOB/i.test(line));
  if (dobLine) {
    const match = dobLine.match(/\d{2}\/\d{2}\/\d{4}/);
    if (match) return match[0];
  }
  for (const line of lines) {
    const match = line.match(/\d{2}\/\d{2}\/\d{4}/);
    if (match) {
      const date = new Date(match[0]);
      if (date <= new Date()) return match[0];
    }
  }
  return null;
}

function extractPNR(lines) {
  const pnrRegex = /\b([A-Z0-9]{6})\b/;
  for (const line of lines) {
    if (/pnr|locator|record|booking/i.test(line)) {
      const match = line.match(pnrRegex);
      if (match) return match[1];
    }
  }
  for (const line of lines) {
    const match = line.match(pnrRegex);
    if (match) {
      const candidate = match[1];
      if (!["TICKET", "BOARDING", "SEAT", "FLIGHT", "GATE", "GROUP", "CLASS"].includes(candidate.toUpperCase())) {
        return candidate;
      }
    }
  }
  return null;
}

function extractFlightNumber(lines) {
  const regex = /\b([A-Z]{2})\s?(\d{3,5})\b/;
  for (const line of lines) {
    const match = line.match(regex);
    if (match) return `${match[1]}${match[2]}`;
  }
  return null;
}
