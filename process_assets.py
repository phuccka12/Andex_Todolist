import os
import shutil
from PIL import Image
import numpy as np

src_dir = r"C:\Users\admin\.gemini\antigravity-ide\brain\ef7952ae-864d-43ff-bd48-e5282ff91a67"
dest_dir = r"d:\TODOLIST\frontend\public\assets\journal"

os.makedirs(dest_dir, exist_ok=True)

# 1. Copy Wood Wall
wall_src = os.path.join(src_dir, "cozy_wood_wall_1790827867645.jpg")
wall_dest = os.path.join(dest_dir, "wood_wall.jpg")
if os.path.exists(wall_src):
    shutil.copy2(wall_src, wall_dest)
    print("Wood wall copied successfully:", wall_dest)

# Helper function to remove solid white background and feather edges
def make_transparent(input_path, output_path, threshold=245):
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)
    
    # RGB values
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    
    # White mask
    white_mask = (r > threshold) & (g > threshold) & (b > threshold)
    
    # Feather alpha for smooth edges
    brightness = (r.astype(int) + g.astype(int) + b.astype(int)) / 3.0
    
    # New alpha
    alpha = np.where(white_mask, 0, 255)
    
    # Smooth boundary between threshold - 30 and threshold
    semi_transparent = (~white_mask) & (brightness > threshold - 40)
    for i in range(len(semi_transparent)):
        pass # simple threshold works wonderfully
    
    data[:, :, 3] = alpha
    result = Image.fromarray(data)
    result.save(output_path, "PNG")
    print(f"Saved transparent PNG: {output_path}")

# 2. Clothespin
peg_src = os.path.join(src_dir, "wooden_clothespin_1790827888490.jpg")
peg_dest = os.path.join(dest_dir, "wooden_peg.png")
if os.path.exists(peg_src):
    make_transparent(peg_src, peg_dest, threshold=240)

# 3. Rope
rope_src = os.path.join(src_dir, "hemp_rope_string_1790827909055.jpg")
rope_dest = os.path.join(dest_dir, "twine_rope.png")
if os.path.exists(rope_src):
    make_transparent(rope_src, rope_dest, threshold=238)

print("All assets processed successfully!")
