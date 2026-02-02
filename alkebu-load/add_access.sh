#!/bin/bash
# Add public read access to collections

for collection in Books WellnessLifestyle FashionJewelry OilsIncense BlogPosts Events Businesses Authors Publishers Media; do
  file="src/collections/${collection}.ts"
  
  if [ ! -f "$file" ]; then
    continue
  fi
  
  # Check if already has access control
  if grep -q "access:" "$file"; then
    echo "Skipping $collection - already has access control"
    continue
  fi
  
  echo "Adding access control to $collection..."
  
  # Find line with "  hooks:" or "  timestamps:"
  hook_line=$(grep -n "^  hooks:\|^  timestamps:" "$file" | head -1 | cut -d: -f1)
  
  if [ -n "$hook_line" ]; then
    # Insert before hooks/timestamps
    sed -i "${hook_line}i\\  access: {\\n    read: () => true,\\n  },\\n" "$file"
    echo "✅ Added to $collection"
  else
    echo "❌ Could not find insertion point in $collection"
  fi
done
