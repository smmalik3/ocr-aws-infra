output "api_endpoint" {
  description = "The invoke URL for the OCR HTTP API"
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}
