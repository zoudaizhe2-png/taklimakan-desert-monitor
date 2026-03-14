#!/bin/bash
# Build frontend and copy to backend/static
cd frontend && npm install && npx vite build && cd ..
rm -rf backend/static
cp -r frontend/dist backend/static
echo "Build complete — backend/static ready"
