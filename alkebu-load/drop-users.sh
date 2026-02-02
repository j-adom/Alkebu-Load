#!/bin/bash

# Drop users tables from SQLite database
# This preserves all other data (globals, products, etc.)

DB_FILE="alkebulanimages.db"

if [ ! -f "$DB_FILE" ]; then
    echo "Error: Database file not found: $DB_FILE"
    exit 1
fi

echo "Dropping users-related tables from $DB_FILE..."

# Create SQL commands
cat << 'EOF' | sqlite3 "$DB_FILE"
DROP TABLE IF EXISTS users_rels;
DROP TABLE IF EXISTS users_sessions;
DROP TABLE IF EXISTS users_preferences_favorite_categories;
DROP TABLE IF EXISTS users_shipping_addresses;
DROP TABLE IF EXISTS users;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Users tables dropped successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Run: pnpm dev"
    echo "2. The migration will create fresh users tables"
    echo "3. Create a new admin user at http://localhost:3000/admin"
else
    echo "❌ Error dropping tables"
    exit 1
fi
