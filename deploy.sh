#!/bin/bash

set -e  # Exit on error
LAMBDA_DIR="lambda"
ZIP_FILE="lambda.zip"
TF_VARS="dev.tfvars"

echo "🚀 Deploying Lambda from ./$LAMBDA_DIR to AWS..."

# Step 1: Clean and reinstall node_modules
echo "📦 Cleaning and installing npm packages..."
cd "$LAMBDA_DIR"
rm -rf node_modules package-lock.json
npm install

# Step 2: Zip contents
echo "📦 Zipping Lambda contents into ../$ZIP_FILE..."
zip -r "../$ZIP_FILE" .

# Step 3: Return to root
cd ..

# Step 4: Deploy with Terraform
echo "📡 Running terraform apply with $TF_VARS..."
terraform apply -var-file="$TF_VARS"

echo "✅ Lambda deployment complete!"

