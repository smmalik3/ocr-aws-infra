
# 🧾 OCR Integration Guide for Flutter

This guide explains how to integrate your Flutter app with the AWS-hosted OCR API that processes either a **Driver’s License** or **Boarding Pass** and returns structured JSON with relevant extracted fields.

---

## 📍 API Endpoint

**Method:** `POST`  
**URL:** `https://knjdgrv83i.execute-api.us-east-1.amazonaws.com/process`  
**Content-Type:** `application/json`  

---

## 📤 Request Body

Send a base64-encoded image in the following format:

```json
{
  "image_base64": "BASE64_ENCODED_IMAGE"
}
```

- Ensure the image is a clear photo or scan of either a **Driver’s License** or a **Boarding Pass**.
- The image should be encoded using:

```dart
final base64 = base64Encode(imageBytes);
```

---

## ✅ Response Structure

### 🎫 If **Boarding Pass**:

```json
{
  "first_name": {
    "value": "JOSHUA",
    "confidence": "97.2"
  },
  "last_name": {
    "value": "SOLLE",
    "confidence": "96.4"
  },
  "pnr": {
    "value": "QHSLJX",
    "confidence": "95.1"
  },
  "flight_number": {
    "value": "NW9030",
    "confidence": "94.7"
  }
}
```

### 🪪 If **Driver’s License**:

```json
{
  "first_name": {
    "value": "SALMAN MOHAMMED",
    "confidence": "98.3"
  },
  "last_name": {
    "value": "MALIK",
    "confidence": "97.6"
  },
  "address_1": {
    "value": "2101 CHAMPLAIN ST NW APT#417",
    "confidence": "96.9"
  },
  "address_2": {
    "value": "APT#417",
    "confidence": "96.9"
  },
  "city": {
    "value": "WASHINGTON",
    "confidence": "95.4"
  },
  "state": {
    "value": "DC",
    "confidence": "95.0"
  },
  "zip": {
    "value": "20009-3172",
    "confidence": "94.3"
  },
  "dob": {
    "value": "07/10/1987",
    "confidence": "98.7"
  }
}
```

---

## 🧪 Flutter Integration Example

### 📷 1. Pick or capture an image
```dart
final picker = ImagePicker();
final image = await picker.pickImage(source: ImageSource.camera);
final imageBytes = await image.readAsBytes();
```

### 🧼 2. Encode to Base64
```dart
final base64Image = base64Encode(imageBytes);
```

### 📬 3. Send to API
```dart
final response = await http.post(
  Uri.parse('https://knjdgrv83i.execute-api.us-east-1.amazonaws.com/process'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({"image_base64": base64Image}),
);
```

### 📖 4. Parse the result
```dart
final result = jsonDecode(response.body);
final firstName = result['first_name']?['value'];
final pnr = result['pnr']?['value'];
// Use values as needed
```

---

## 🧠 Notes

- The API automatically determines whether the document is a **license** or **boarding pass**.
- Confidence scores are returned per field so you can filter or flag uncertain values.
- Image quality **strongly affects** OCR performance.

---

## 🆘 Troubleshooting

- Ensure the base64 string does not include a data URI prefix like `data:image/jpeg;base64,`.
- If the API fails, you'll get a response like:
```json
{
  "error": "OCR failed",
  "details": "Error message here"
}
```

---

## 📬 Contact

For support or integration help, contact the API maintainer.