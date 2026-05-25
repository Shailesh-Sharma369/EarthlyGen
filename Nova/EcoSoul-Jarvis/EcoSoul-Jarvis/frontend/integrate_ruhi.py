#!/usr/bin/env python3
"""
integrate_ruhi.py
=================
Automatically inject Ruhi AI Assistant into all HTML pages
This script ensures Ruhi is available on every page of the application

Usage:
  python integrate_ruhi.py [directory]
  python integrate_ruhi.py  # uses current directory
  python integrate_ruhi.py ./frontend
"""

import os
import sys
from pathlib import Path
import re

# Configuration
RUHI_SCRIPT_TAG = '  <!-- Ruhi AI Assistant -->\n  <script src="ruhi.js" defer></script>'
EXCLUDE_PATTERNS = [
    'node_modules',
    '__pycache__',
    '.git',
    'test-',
    '-copy',
    'Copy',
]

def should_process_file(filename):
    """Check if file should be processed"""
    filename_lower = filename.lower()
    
    # Must be HTML
    if not filename_lower.endswith('.html'):
        return False
    
    # Skip test and copy files
    for pattern in EXCLUDE_PATTERNS:
        if pattern.lower() in filename_lower:
            return False
    
    return True

def has_ruhi_script(content):
    """Check if file already has Ruhi script"""
    return 'ruhi.js' in content

def needs_head_closing_tag(content):
    """Check if HTML has proper closing tags"""
    return '</head>' in content and '<body>' in content

def inject_ruhi(filepath):
    """Inject Ruhi script into HTML file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Skip if already has Ruhi
        if has_ruhi_script(content):
            print(f"⏭️  SKIP: {filepath} (already has Ruhi)")
            return False
        
        # Skip if doesn't have proper structure
        if not needs_head_closing_tag(content):
            print(f"⚠️  SKIP: {filepath} (missing </head> or <body> tag)")
            return False
        
        # Find insertion point - before </head> tag
        insertion_point = content.rfind('</head>')
        
        if insertion_point == -1:
            print(f"⚠️  SKIP: {filepath} (could not find </head>)")
            return False
        
        # Insert Ruhi script before </head>
        new_content = (
            content[:insertion_point] +
            RUHI_SCRIPT_TAG + '\n  ' +
            content[insertion_point:]
        )
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✅ DONE: {filepath}")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {filepath} - {e}")
        return False

def main():
    """Main function"""
    # Get directory to process
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
    else:
        target_dir = '.'
    
    target_path = Path(target_dir).absolute()
    
    if not target_path.exists():
        print(f"❌ Directory not found: {target_path}")
        sys.exit(1)
    
    print("=" * 60)
    print("🚀 Ruhi Integration Tool")
    print("=" * 60)
    print(f"📁 Processing directory: {target_path}")
    print()
    
    # Find all HTML files
    html_files = [
        f for f in target_path.rglob('*.html')
        if should_process_file(f.name)
    ]
    
    if not html_files:
        print(f"⚠️  No HTML files found to process")
        return
    
    print(f"📋 Found {len(html_files)} HTML files to process:\n")
    
    # Process each file
    success_count = 0
    for filepath in sorted(html_files):
        if inject_ruhi(filepath):
            success_count += 1
    
    print()
    print("=" * 60)
    print(f"✅ Complete! Integrated Ruhi into {success_count}/{len(html_files)} files")
    print("=" * 60)
    print()
    print("📌 Next steps:")
    print("1. Ensure ruhi.js exists in frontend directory")
    print("2. Start Express backend: npm start")
    print("3. Start Python AI server: python agentic_ai/server.py")
    print("4. Open app in browser - Ruhi will be on every page!")
    print()

if __name__ == '__main__':
    main()
