terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  required_version = ">= 1.3.0"
}

provider "aws" {
  region = var.region
}

# 🪣 S3 Bucket to store uploaded images
resource "aws_s3_bucket" "uploads" {
  bucket = "ocr-uploads-${var.environment}-${random_id.suffix.hex}"
  force_destroy = true

  tags = {
    Environment = var.environment
  }
}

# 🪣 S3 Bucket append random id for uniqueness
resource "random_id" "suffix" {
  byte_length = 4
}

# 👮 IAM Role for Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "ocr_lambda_exec_role_${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# 🔐 IAM Policy for Lambda to access S3, Textract, and logs
resource "aws_iam_role_policy" "lambda_policy" {
  name = "ocr_lambda_policy_${var.environment}"
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ],
        Resource = [
          "${aws_s3_bucket.uploads.arn}",
          "${aws_s3_bucket.uploads.arn}/*"
        ]
      },
      {
        Effect = "Allow",
        Action = [
          "textract:DetectDocumentText"
        ],
        Resource = "*"
      }
    ]
  })
}

# 🧠 Lambda Function
resource "aws_lambda_function" "ocr_lambda" {
  function_name = var.lambda_function_name
  runtime       = "nodejs18.x"
  handler       = "index.handler"
  timeout       = 30

  role = aws_iam_role.lambda_exec.arn

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.uploads.bucket
    }
  }

  tags = {
    Environment = var.environment
  }
}

# 🌐 API Gateway (HTTP API)
resource "aws_apigatewayv2_api" "http_api" {
  name          = "ocr_api_${var.environment}"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.ocr_lambda.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "ocr_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /process"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

# 🚦 Permission for API Gateway to invoke Lambda
resource "aws_lambda_permission" "allow_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ocr_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.lambda_function_name}"
  retention_in_days = 14

  tags = {
    Environment = var.environment
  }
}
