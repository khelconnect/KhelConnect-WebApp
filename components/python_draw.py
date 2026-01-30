from PIL import Image, ImageDraw

def create_barcode_png(id_string, output_filename="barcode.png", scale_factor=20):
    """
    Generates a high-res, transparent PNG barcode based on the provided React logic.
    
    Args:
        id_string (str): The ID to encode.
        output_filename (str): Where to save the file.
        scale_factor (int): Multiplier for resolution (High Quality).
    """
    
    # --- Logic Replicated from React Component ---
    total_bars = 55
    
    # The React viewBox is roughly 0 0 300 50. 
    # We set base dimensions slightly larger to accommodate the last bar width.
    base_width = 310 
    base_height = 50
    
    # Calculate High-Res Dimensions
    img_width = base_width * scale_factor
    img_height = base_height * scale_factor
    
    # Create Image: Mode 'RGBA' for transparency, (0,0,0,0) is fully transparent background
    img = Image.new('RGBA', (img_width, img_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Color: "text-white/90" roughly translates to White with 90% opacity (alpha 230)
    bar_color = (255, 255, 255, 230) 

    for i in range(total_bars):
        # JS: id.charCodeAt(i % id.length) -> Python: ord(...)
        char_index = i % len(id_string)
        char_code = ord(id_string[char_index])
        
        # JS: const width = (charCode % 3) + 1;
        w_unit = (char_code % 3) + 1
        
        # JS: const x = i * 5.5;
        x_unit = i * 5.5
        
        # JS: if (i > 2 && i < totalBars - 2 && (charCode % 7 === 0)) continue;
        if i > 2 and i < total_bars - 2 and (char_code % 7 == 0):
            continue

        # Convert vector units to pixel coordinates based on scale_factor
        x0 = x_unit * scale_factor
        y0 = 0
        x1 = (x_unit + w_unit) * scale_factor
        y1 = img_height # Height is "100%"
        
        draw.rectangle([x0, y0, x1, y1], fill=bar_color)

    # Save the file
    img.save(output_filename)
    print(f"Success! High-quality PNG saved as '{output_filename}'")

# --- EXECUTE ---
# Replace 'YOUR_ID_HERE' with the actual ID you want to encode
create_barcode_png("YOUR_ID_HERE")