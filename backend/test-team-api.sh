#!/bin/bash

echo "🧪 Testing Team Creation API..."
echo ""
echo "Test 1: Create team without team lead"
curl -s -X POST "http://localhost:5000/api/v1/admin/organizations/eebf5e27-5877-42dc-ab52-29a294256f0e/teams" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Team 1",
    "description": "No team lead",
    "type": "core",
    "settings": {
      "allowPeerFeedback": true,
      "requireTeamLeadApproval": false,
      "customWorkflows": [],
      "collaborationTools": []
    }
  }' | grep -o '"success":[^,]*'

echo ""
echo ""
echo "Test 2: Create team with invalid email"
curl -s -X POST "http://localhost:5000/api/v1/admin/organizations/eebf5e27-5877-42dc-ab52-29a294256f0e/teams" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Team 2",
    "description": "With invalid email",
    "type": "core",
    "teamLeadEmail": "nonexistent@example.com",
    "settings": {
      "allowPeerFeedback": true,
      "requireTeamLeadApproval": false,
      "customWorkflows": [],
      "collaborationTools": []
    }
  }' | grep -o '"success":[^,]*'

echo ""
echo ""
echo "Test 3: Create team with empty teamLeadEmail"
curl -s -X POST "http://localhost:5000/api/v1/admin/organizations/eebf5e27-5877-42dc-ab52-29a294256f0e/teams" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Team 3",
    "description": "Empty email",
    "type": "core",
    "teamLeadEmail": "",
    "settings": {
      "allowPeerFeedback": true,
      "requireTeamLeadApproval": false,
      "customWorkflows": [],
      "collaborationTools": []
    }
  }' | grep -o '"success":[^,]*'

echo ""
echo ""
echo "✅ All tests complete!"


