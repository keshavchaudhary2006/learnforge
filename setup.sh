#!/usr/bin/env bash
set -e

echo "=== Initializing Learnforge monorepo structure ==="

# 1. Ensure directories exist
mkdir -p frontend/src frontend/public
mkdir -p backend-node/src
mkdir -p backend-ai

# 2. Setup Python environment
echo "Setting up backend-ai..."
cd backend-ai
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
echo "Python venv created. Install dependencies using: source .venv/bin/activate && pip install -r requirements.txt"
cd ..

# 3. Inform about Node services
echo "Node backend and React frontend are ready."
echo "Install backend-node dependencies with: cd backend-node && npm install"
echo "Install frontend dependencies with: cd frontend && npm install"

echo "=== Setup complete! ==="
