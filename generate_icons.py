#!/usr/bin/env python3
"""
Generate placeholder icons for the Chrome extension
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    """Create a simple icon with the earth emoji representation"""
    # Create image with gradient background
    img = Image.new('RGB', (size, size), color='#667eea')
    draw = ImageDraw.Draw(img)
    
    # Draw gradient effect (simple circles)
    for i in range(0, size, 2):
        opacity = int(255 * (1 - i / size))
        color = f'#{opacity:02x}{opacity:02x}ff'
        # This creates a simple gradient effect
    
    # Draw a circle for the earth
    circle_size = int(size * 0.6)
    left = (size - circle_size) // 2
    top = (size - circle_size) // 2
    right = left + circle_size
    bottom = top + circle_size
    
    # Draw earth as a green circle
    draw.ellipse([left, top, right, bottom], fill='#10B981', outline='#059669', width=2)
    
    # Draw some simple "continents" as shapes
    if size >= 48:
        # Add some detail for larger icons
        detail_size = int(circle_size * 0.3)
        draw.ellipse([left + circle_size//4, top + circle_size//4, 
                     left + circle_size//4 + detail_size, top + circle_size//4 + detail_size], 
                     fill='#059669')
    
    # Save
    img.save(output_path, 'PNG')
    print(f"Created {output_path}")

# Generate icons
icons_dir = 'icons'
os.makedirs(icons_dir, exist_ok=True)

create_icon(16, os.path.join(icons_dir, 'icon16.png'))
create_icon(48, os.path.join(icons_dir, 'icon48.png'))
create_icon(128, os.path.join(icons_dir, 'icon128.png'))

print("\n✓ All icons generated successfully!")