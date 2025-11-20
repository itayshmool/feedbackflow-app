#!/bin/bash

# FeedbackFlow Presentation Quick Start
# This script helps you get started with the presentation

echo "════════════════════════════════════════════════════════"
echo "   FeedbackFlow Presentation Quick Start"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   cd /Users/itays/dev/feedbackflow-app"
    exit 1
fi

echo "📁 Current directory: $(pwd)"
echo ""

# Function to check if screenshots exist
check_screenshots() {
    local count=$(ls docs/screenshots/*.png 2>/dev/null | wc -l | tr -d ' ')
    echo "📸 Current screenshots: $count / 17"
    if [ "$count" -gt 0 ]; then
        echo "   Found:"
        ls -1 docs/screenshots/*.png 2>/dev/null | xargs -n1 basename
    fi
    echo ""
}

# Main menu
while true; do
    echo "═══════════════════════════════════════"
    echo "What would you like to do?"
    echo "═══════════════════════════════════════"
    echo ""
    echo "1. 📸 Quick Win - Use existing screenshots (5 min)"
    echo "2. 📷 Capture priority screenshots (30 min)"
    echo "3. 📚 Read screenshot capture guide"
    echo "4. 🚀 Start application for screenshot capture"
    echo "5. ✅ Check screenshot progress"
    echo "6. 📖 Open visual presentation"
    echo "7. 🎓 View example with screenshots"
    echo "8. ❌ Exit"
    echo ""
    read -p "Enter your choice (1-8): " choice
    echo ""

    case $choice in
        1)
            echo "🚀 Quick Win: Copying existing screenshots..."
            echo ""
            
            # Check if source files exist
            if [ -f "frontend/simple-feedback.png" ]; then
                cp frontend/simple-feedback.png docs/screenshots/01-title-landing.png
                echo "✅ Copied login page screenshot"
            else
                echo "⚠️  simple-feedback.png not found"
            fi

            if [ -f "frontend/simple-dashboard.png" ]; then
                cp frontend/simple-dashboard.png docs/screenshots/04-dashboard-overview.png
                echo "✅ Copied dashboard screenshot"
            else
                echo "⚠️  simple-dashboard.png not found"
            fi

            if [ -f "frontend/debug-analytics-page.png" ]; then
                cp frontend/debug-analytics-page.png docs/screenshots/12-team-analytics.png
                echo "✅ Copied analytics screenshot"
            else
                echo "⚠️  debug-analytics-page.png not found"
            fi

            echo ""
            echo "✨ Quick win complete! You now have 3 screenshots."
            echo "   You can create a minimal presentation with these."
            echo ""
            check_screenshots
            read -p "Press Enter to continue..."
            ;;

        2)
            echo "📷 Priority Screenshot Capture"
            echo ""
            echo "This will guide you through capturing the 7 most important screenshots."
            echo ""
            echo "First, let's start the application..."
            echo ""
            read -p "Press Enter to continue (or Ctrl+C to cancel)..."
            echo ""
            echo "Opening terminal windows..."
            echo ""
            echo "➡️  Terminal 1: Starting backend..."
            osascript -e 'tell app "Terminal" to do script "cd '$PWD'/backend && npm run dev"' 2>/dev/null || echo "   Run manually: cd backend && npm run dev"
            sleep 2
            echo "➡️  Terminal 2: Starting frontend..."
            osascript -e 'tell app "Terminal" to do script "cd '$PWD'/frontend && npm run dev"' 2>/dev/null || echo "   Run manually: cd frontend && npm run dev"
            echo ""
            echo "⏳ Waiting for servers to start (15 seconds)..."
            sleep 15
            echo ""
            echo "✅ Servers should be running now!"
            echo ""
            echo "📖 Opening screenshot guide..."
            if command -v code &> /dev/null; then
                code docs/Screenshot-Capture-Guide.md
            elif command -v open &> /dev/null; then
                open docs/Screenshot-Capture-Guide.md
            else
                echo "   Please open: docs/Screenshot-Capture-Guide.md"
            fi
            echo ""
            echo "🌐 Application should be available at:"
            echo "   http://localhost:3003"
            echo ""
            echo "Follow the guide to capture screenshots, then save them to:"
            echo "   docs/screenshots/"
            echo ""
            read -p "Press Enter when done capturing screenshots..."
            check_screenshots
            ;;

        3)
            echo "📚 Opening Screenshot Capture Guide..."
            echo ""
            if command -v code &> /dev/null; then
                code docs/Screenshot-Capture-Guide.md
                echo "✅ Opened in VS Code"
            elif command -v open &> /dev/null; then
                open docs/Screenshot-Capture-Guide.md
                echo "✅ Opened in default viewer"
            else
                echo "📄 Please open: docs/Screenshot-Capture-Guide.md"
            fi
            echo ""
            read -p "Press Enter to continue..."
            ;;

        4)
            echo "🚀 Starting Application..."
            echo ""
            echo "This will open 2 terminal windows:"
            echo "   1. Backend server (port 5000)"
            echo "   2. Frontend server (port 3003)"
            echo ""
            read -p "Press Enter to continue (or Ctrl+C to cancel)..."
            
            echo ""
            echo "➡️  Starting backend..."
            osascript -e 'tell app "Terminal" to do script "cd '$PWD'/backend && npm run dev"' 2>/dev/null || {
                echo "   ⚠️  Could not auto-start. Run manually:"
                echo "      cd backend && npm run dev"
            }
            
            sleep 2
            
            echo "➡️  Starting frontend..."
            osascript -e 'tell app "Terminal" to do script "cd '$PWD'/frontend && npm run dev"' 2>/dev/null || {
                echo "   ⚠️  Could not auto-start. Run manually:"
                echo "      cd frontend && npm run dev"
            }
            
            echo ""
            echo "⏳ Servers starting..."
            echo ""
            echo "When ready, open:"
            echo "   http://localhost:3003"
            echo ""
            echo "Login credentials (demo):"
            echo "   Admin: admin@example.com"
            echo "   Manager: manager@example.com"
            echo "   Employee: employee@example.com"
            echo "   Password: any (mock authentication)"
            echo ""
            read -p "Press Enter to continue..."
            ;;

        5)
            echo "✅ Screenshot Progress Check"
            echo ""
            check_screenshots
            
            if [ $(ls docs/screenshots/*.png 2>/dev/null | wc -l | tr -d ' ') -eq 17 ]; then
                echo "🎉 Congratulations! All screenshots captured!"
                echo ""
                echo "Next steps:"
                echo "   1. Open docs/FeedbackFlow-Visual-Presentation.md"
                echo "   2. Replace screenshot placeholders with images"
                echo "   3. Convert to Google Slides"
            elif [ $(ls docs/screenshots/*.png 2>/dev/null | wc -l | tr -d ' ') -gt 0 ]; then
                echo "📊 You're making progress!"
                echo ""
                local remaining=$((17 - $(ls docs/screenshots/*.png 2>/dev/null | wc -l | tr -d ' ')))
                echo "   $remaining screenshots remaining"
                echo ""
                echo "Keep going! Reference the Screenshot Capture Guide."
            else
                echo "ℹ️  No screenshots captured yet."
                echo ""
                echo "Start with:"
                echo "   • Option 1: Quick Win (use existing screenshots)"
                echo "   • Option 2: Capture priority screenshots"
            fi
            echo ""
            read -p "Press Enter to continue..."
            ;;

        6)
            echo "📖 Opening Visual Presentation..."
            echo ""
            if command -v code &> /dev/null; then
                code docs/FeedbackFlow-Visual-Presentation.md
                echo "✅ Opened in VS Code"
            elif command -v open &> /dev/null; then
                open docs/FeedbackFlow-Visual-Presentation.md
                echo "✅ Opened in default viewer"
            else
                echo "📄 Please open: docs/FeedbackFlow-Visual-Presentation.md"
            fi
            echo ""
            read -p "Press Enter to continue..."
            ;;

        7)
            echo "🎓 Opening Example with Screenshots..."
            echo ""
            if command -v code &> /dev/null; then
                code docs/Example-With-Screenshots.md
                echo "✅ Opened in VS Code"
            elif command -v open &> /dev/null; then
                open docs/Example-With-Screenshots.md
                echo "✅ Opened in default viewer"
            else
                echo "📄 Please open: docs/Example-With-Screenshots.md"
            fi
            echo ""
            read -p "Press Enter to continue..."
            ;;

        8)
            echo "👋 Goodbye!"
            echo ""
            echo "Remember:"
            echo "   • All presentation files are in: docs/"
            echo "   • Screenshot guide: docs/Screenshot-Capture-Guide.md"
            echo "   • Visual presentation: docs/FeedbackFlow-Visual-Presentation.md"
            echo ""
            echo "Good luck with your presentation! 🚀"
            echo ""
            exit 0
            ;;

        *)
            echo "❌ Invalid choice. Please enter 1-8."
            echo ""
            sleep 2
            ;;
    esac
done

