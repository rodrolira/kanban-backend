#!/bin/bash
set -e  # Detener si algún comando falla

echo "🔧 Installing dependencies..."
npm ci --include=dev

echo "🏗️  Building TypeScript..."
npm run build

echo "📦 Generating Prisma client..."
npx prisma generate

echo "✅ Build completed successfully!"
