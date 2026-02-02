#!/bin/bash

###############################################################################
# Sanity to Payload Migration Orchestration Script
#
# This script orchestrates the complete migration from Sanity CMS to Payload.
# It handles data export, transformation, and import in the correct order.
#
# Usage:
#   ./scripts/migrate-sanity.sh [options]
#
# Options:
#   --export-only    Only export from Sanity (skip import)
#   --import-only    Only import to Payload (requires existing export)
#   --dry-run        Validate setup without making changes
#   --help           Show this help message
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
EXPORT_ONLY=false
IMPORT_ONLY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --export-only)
      EXPORT_ONLY=true
      shift
      ;;
    --import-only)
      IMPORT_ONLY=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      head -n 20 "$0" | tail -n +3
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       Sanity → Payload CMS Migration Tool                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Validate environment
echo -e "${YELLOW}🔍 Validating environment...${NC}"

if [ ! -f ".env" ]; then
  echo -e "${RED}❌ .env file not found${NC}"
  echo "Please create .env file with:"
  echo "  SANITY_PROJECT_ID=your-project-id"
  echo "  SANITY_DATASET=production"
  echo "  SANITY_TOKEN=your-read-token"
  echo "  PAYLOAD_SECRET=your-secret"
  exit 1
fi

# Check required env vars
source .env
if [ -z "$SANITY_PROJECT_ID" ] && [ "$IMPORT_ONLY" = false ]; then
  echo -e "${RED}❌ SANITY_PROJECT_ID not set in .env${NC}"
  exit 1
fi

if [ -z "$PAYLOAD_SECRET" ] && [ "$EXPORT_ONLY" = false ]; then
  echo -e "${RED}❌ PAYLOAD_SECRET not set in .env${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Environment validated${NC}\n"

# Dry run mode
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🔍 DRY RUN MODE - No changes will be made${NC}\n"
  echo "Would perform:"
  if [ "$IMPORT_ONLY" = false ]; then
    echo "  1. Export data from Sanity"
  fi
  if [ "$EXPORT_ONLY" = false ]; then
    echo "  2. Import data to Payload"
  fi
  echo ""
  echo "Sanity Project: $SANITY_PROJECT_ID"
  echo "Sanity Dataset: $SANITY_DATASET"
  echo ""
  exit 0
fi

# Step 1: Export from Sanity
if [ "$IMPORT_ONLY" = false ]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Step 1: Export Data from Sanity${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

  echo -e "${YELLOW}📥 Exporting from Sanity...${NC}"
  echo "Project: $SANITY_PROJECT_ID"
  echo "Dataset: $SANITY_DATASET"
  echo ""

  tsx scripts/sanity-export.ts

  if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Export completed successfully${NC}\n"
  else
    echo -e "\n${RED}❌ Export failed${NC}"
    exit 1
  fi
fi

# Stop if export-only mode
if [ "$EXPORT_ONLY" = true ]; then
  echo -e "${GREEN}✅ Export-only mode completed${NC}"
  echo "Export files are in: data/sanity-export/"
  exit 0
fi

# Step 2: Import to Payload
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 2: Import Data to Payload${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check export exists
if [ ! -f "data/sanity-export/all-data.json" ]; then
  echo -e "${RED}❌ Export data not found${NC}"
  echo "Please run with --export-only first, or without --import-only"
  exit 1
fi

echo -e "${YELLOW}📦 Importing to Payload...${NC}\n"

tsx scripts/sanity-to-payload-import.ts

if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}✅ Import completed successfully${NC}\n"
else
  echo -e "\n${RED}❌ Import failed${NC}"
  exit 1
fi

# Step 3: Post-migration tasks
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 3: Post-Migration Tasks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}🔍 Initializing search indices...${NC}\n"

tsx scripts/initialize-search.ts

echo -e "\n${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                 ✅ Migration Complete!                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "📋 Summary:"
echo "  ✅ Data exported from Sanity"
echo "  ✅ Data imported to Payload"
echo "  ✅ Search indices initialized"
echo ""
echo "📝 Next steps:"
echo "  1. Review imported data: http://localhost:3000/admin"
echo "  2. Migrate images (see docs/sanity-migration.md)"
echo "  3. Test your application thoroughly"
echo "  4. Update any hardcoded Sanity references in frontend"
echo ""
echo "📂 Export files saved in: data/sanity-export/"
echo ""
