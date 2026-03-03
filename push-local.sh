#!/bin/bash

# Configuration
REMOTE_USER=$1
REMOTE_HOST=$2
REMOTE_PATH=${3:-"~/thooft_omni_deploy"}
IMAGE_NAME="geldofa/thooft_omni:latest"
TAR_NAME="thooft_omni.tar.gz"

if [ -z "$REMOTE_USER" ] || [ -z "$REMOTE_HOST" ]; then
    echo "Usage: ./push-local.sh <remote_user> <remote_host> [remote_path]"
    echo "Example: ./push-local.sh antony 192.168.1.50"
    exit 1
fi

echo "🚀 Starting local push to $REMOTE_USER@$REMOTE_HOST..."

# 1. Save the Docker image
echo "📦 Saving Docker image $IMAGE_NAME..."
docker save $IMAGE_NAME | gzip > $TAR_NAME

# 2. Prepare remote directory
echo "📂 Preparing remote directory $REMOTE_PATH..."
ssh $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_PATH"

# 3. Copy files (Image + Compose + Env)
echo "🚚 Transferring files..."
scp $TAR_NAME docker-compose.windows.yml stack.env.example $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/

# 4. Load image and suggest next steps
echo "✅ Transfer complete!"
echo "------------------------------------------------"
echo "Next steps on the REMOTE PC:"
echo "1. ssh $REMOTE_USER@$REMOTE_HOST"
echo "2. cd $REMOTE_PATH"
echo "3. docker load < $TAR_NAME"
echo "4. cp stack.env.example stack.env (and edit if needed)"
echo "5. docker compose -f docker-compose.windows.yml up -d"
echo "------------------------------------------------"

# Cleanup local tar
rm $TAR_NAME
