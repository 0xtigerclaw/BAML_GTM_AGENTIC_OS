#!/bin/bash

# scripts/add_rss_source.sh
# Usage: ./scripts/add_rss_source.sh "Name" "URL" "Category"

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 \"Name\" \"URL\" \"Category\""
    exit 1
fi

NAME=$1
URL=$2
CATEGORY=$3

echo "🚀 Adding RSS source: $NAME ($URL) in category $CATEGORY..."

npx convex run rss:add "{\"name\": \"$NAME\", \"url\": \"$URL\", \"category\": \"$CATEGORY\"}"

echo "✅ Done."
