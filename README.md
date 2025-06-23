# AWS OCR Infrastructure (Terraform)

This project provisions a fully serverless OCR pipeline using AWS services. The infrastructure is managed via Terraform and supports separate `dev` and `prod` environments using Terraform workspaces.

## 📸 Use Case

- A Flutter Windows app captures a driver's license or boarding pass
- The image is sent (as base64) to an AWS API Gateway endpoint
- A Lambda function:
  - Saves the image to S3
  - Sends it to Textract for OCR
  - Extracts key fields like `Name`, `Address`, `DOB`, and `PNR`
- The structured response is sent back to the Flutter app

---

## ⚙️ Requirements

- AWS account & IAM credentials with admin access
- macOS Terminal or Windows WSL/PowerShell
- [Terraform](https://developer.hashicorp.com/terraform/downloads)
- Node.js (for Lambda packaging)

---

## 🚀 Setup Instructions

### 1. Install Terraform

#### On macOS:
```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

#### On Windows (PowerShell):
```bash
choco install terraform
```

---

### 2. Install Lambda Dependencies & Package

```bash
cd lambda
npm install
zip -r ../lambda.zip .
cd ..
```

---

### 3. Initialize Terraform

```bash
terraform init
```

---

### 4. Create Workspaces

```bash
terraform workspace new dev
terraform workspace new prod
```

---

### 5. Deploy Dev Environment

```bash
terraform workspace select dev
terraform apply -var-file="dev.tfvars"
```

---

### 6. Deploy Prod Environment

```bash
terraform workspace select prod
terraform apply -var-file="prod.tfvars"
```

---

### 🧪 Test the API

After deployment, Terraform will output your API URL:

```bash
Outputs:
api_endpoint = "https://your-api-id.execute-api.us-east-1.amazonaws.com"
```

Send a request to `/process`:

```bash
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/process \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "<base64-encoded-image>"}'
```

---

### ✅ Example Response

```json
{
  "name": "John Doe",
  "address": "123 Main St, NY",
  "dob": "01/02/1990",
  "pnr": "ABC123"
}
```

> All extracted fields are optional — they will return `null` if not detected.

---

## 📌 Notes

- API Gateway timeout is 29 seconds. This architecture assumes fast Textract responses.
- This is synchronous. For longer OCR tasks, consider async via SQS + Step Functions.
- Textract charges by page/image. Keep images under 5MB.

---

## 🧩 Coming Soon

- [ ] API key or Cognito auth
- [ ] Async processing with WebSocket feedback
- [ ] CloudWatch log subscriptions + alarms
- [ ] AnalyzeDocument for more structured OCR (passports, IDs)

---

## 🧠 Credits

Built with ❤️ by [Salman Malik](https://www.salmanmalik.co), deployed with Terraform, and powered by AWS.
