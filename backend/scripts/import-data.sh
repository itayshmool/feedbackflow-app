#!/bin/bash

# Import test data script
echo "🚀 Starting test data import..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the backend directory"
    exit 1
fi

# Make sure the import script is executable
chmod +x scripts/import-test-data.js

# Run the import
echo "📊 Running data import..."
node scripts/import-test-data.js

echo "✅ Import completed!"

