import sys
from PIL import Image

in_path = sys.argv[1]
out_prefix = sys.argv[2]

img = Image.open(in_path).convert("RGBA")
datas = img.getdata()

newData = []
for item in datas:
    # Remove white background
    if item[0] >= 240 and item[1] >= 240 and item[2] >= 240:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)

# Save sizes
img.resize((180, 180), Image.Resampling.LANCZOS).save(f"{out_prefix}-180.png", "PNG")
img.resize((192, 192), Image.Resampling.LANCZOS).save(f"{out_prefix}-192.png", "PNG")
img.resize((512, 512), Image.Resampling.LANCZOS).save(f"{out_prefix}-512.png", "PNG")

print("Icons generated!")
