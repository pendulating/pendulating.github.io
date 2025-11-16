#!/usr/bin/env node

/**
 * Script to organize all images and figures for uair_brief.md
 * into a single subfolder hierarchy: assets/uair-brief
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MARKDOWN_FILE = path.join(PROJECT_ROOT, 'src/content/blog/uair_brief.md');
const TARGET_DIR = path.join(PROJECT_ROOT, 'src/assets/uair-brief');
const MARKDOWN_DIR = path.dirname(MARKDOWN_FILE);

// Ensure target directory exists
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Read the markdown file
let content = fs.readFileSync(MARKDOWN_FILE, 'utf8');

// Find all image references
const imagePatterns = [
  // <img src="...">
  /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi,
  // <embed src="...">
  /<embed\s+[^>]*src=["']([^"']+)["'][^>]*>/gi,
];

const imageRefs = new Set();

for (const pattern of imagePatterns) {
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const imagePath = match[1];
    // Skip if already pointing to assets/uair-brief
    if (!imagePath.includes('assets/uair-brief')) {
      imageRefs.add(imagePath);
    }
  }
}

console.log(`Found ${imageRefs.size} image references to process:`);
imageRefs.forEach(ref => console.log(`  - ${ref}`));

// Process each image reference
const replacements = new Map();

for (const imageRef of imageRefs) {
  // Resolve the source path relative to the markdown file
  const sourcePath = path.resolve(MARKDOWN_DIR, imageRef);
  const fileName = path.basename(imageRef);
  const targetPath = path.join(TARGET_DIR, fileName);
  const newRef = `../../assets/uair-brief/${fileName}`;

  // Check if source file exists
  if (fs.existsSync(sourcePath)) {
    console.log(`\nMoving: ${imageRef}`);
    console.log(`  From: ${sourcePath}`);
    console.log(`  To:   ${targetPath}`);
    
    // Copy file to target location
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`  ✓ Copied`);
    
    // Also try to remove from source if it's in Images/ or figures/ folder
    const sourceDir = path.dirname(sourcePath);
    if (sourceDir.includes('Images') || sourceDir.includes('figures')) {
      try {
        fs.unlinkSync(sourcePath);
        console.log(`  ✓ Removed source file`);
      } catch (err) {
        console.log(`  ⚠ Could not remove source file: ${err.message}`);
      }
    }
  } else {
    console.log(`\n⚠ Source file not found: ${sourcePath}`);
    console.log(`  Will update reference anyway to: ${newRef}`);
  }

  // Store replacement mapping
  replacements.set(imageRef, newRef);
}

// Update markdown file with new paths
let updatedContent = content;
let replacementCount = 0;

for (const [oldPath, newPath] of replacements) {
  // Replace in img tags
  const imgPattern = new RegExp(`(<img\\s+[^>]*src=["'])${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(["'][^>]*>)`, 'gi');
  updatedContent = updatedContent.replace(imgPattern, (match, prefix, suffix) => {
    replacementCount++;
    return `${prefix}${newPath}${suffix}`;
  });

  // Replace in embed tags
  const embedPattern = new RegExp(`(<embed\\s+[^>]*src=["'])${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(["'][^>]*>)`, 'gi');
  updatedContent = updatedContent.replace(embedPattern, (match, prefix, suffix) => {
    replacementCount++;
    return `${prefix}${newPath}${suffix}`;
  });
}

// Write updated markdown file
if (updatedContent !== content) {
  fs.writeFileSync(MARKDOWN_FILE, updatedContent, 'utf8');
  console.log(`\n✓ Updated ${replacementCount} references in markdown file`);
} else {
  console.log(`\n✓ No changes needed in markdown file`);
}

console.log(`\n✓ Done! All images organized in: ${TARGET_DIR}`);

