#!/bin/bash
# Setup script for AWS credentials as environment variables
# Automatically extracts credentials from AWS CLI configuration
# Usage: source setup_aws_env.sh [profile_name]

PROFILE="${1:-default}"
AWS_CREDENTIALS_FILE="${HOME}/.aws/credentials"

echo "Setting up AWS credentials as environment variables from AWS CLI..."

# Function to extract credential from AWS CLI config file
get_credential() {
    local profile="$1"
    local key="$2"
    
    if [ -f "$AWS_CREDENTIALS_FILE" ]; then
        awk -v profile="[${profile}]" -v key="${key}" '
            $0 == profile { found=1; next }
            found && /^\[/ { found=0 }
            found && $1 == key { print $3; exit }
        ' "$AWS_CREDENTIALS_FILE"
    fi
}

# Try to get credentials from AWS CLI
ACCESS_KEY=$(aws configure get aws_access_key_id --profile "$PROFILE" 2>/dev/null)
SECRET_KEY=$(get_credential "$PROFILE" "aws_secret_access_key")
REGION=$(aws configure get region --profile "$PROFILE" 2>/dev/null)

# If AWS CLI commands didn't work, try reading from file directly
if [ -z "$ACCESS_KEY" ]; then
    ACCESS_KEY=$(get_credential "$PROFILE" "aws_access_key_id")
fi

if [ -z "$REGION" ]; then
    REGION="us-east-2"  # Default region
fi

# Check if credentials were found
if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ]; then
    echo "Error: Could not find AWS credentials in AWS CLI configuration."
    echo ""
    echo "Please either:"
    echo "  1. Run 'aws configure' to set up your credentials"
    echo "  2. Or manually edit this script with your credentials"
    echo ""
    echo "Falling back to manual configuration..."
    export AWS_ACCESS_KEY_ID="your_aws_access_key_id_here"
    export AWS_SECRET_ACCESS_KEY="your_aws_secret_access_key_here"
    export AWS_STORAGE_BUCKET_NAME="wikiando"
    export AWS_S3_REGION_NAME="us-east-2"
else
    # Export credentials
    export AWS_ACCESS_KEY_ID="$ACCESS_KEY"
    export AWS_SECRET_ACCESS_KEY="$SECRET_KEY"
    export AWS_STORAGE_BUCKET_NAME="wikiando"
    export AWS_S3_REGION_NAME="${REGION:-us-east-2}"
    
    echo "✓ Successfully loaded AWS credentials from AWS CLI (profile: $PROFILE)"
    echo "  Access Key ID: ${ACCESS_KEY:0:10}..."
    echo "  Region: $AWS_S3_REGION_NAME"
fi

echo ""
echo "AWS credentials have been set as environment variables."
echo ""
echo "To verify, run:"
echo "  echo \$AWS_ACCESS_KEY_ID"
echo ""
echo "Now you can run: docker-compose up"
