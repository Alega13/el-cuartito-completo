# print_server.py — El Cuartito Recordstore · Genre Label Printer
#
# USAGE:
#   1. Install dependencies:
#        pip install flask flask-cors pillow brother_ql
#   2. Run the server:
#        python print_server.py
#   3. Open http://localhost:5000 in your browser
#
# PRINTER CONFIG:
#   Change PRINTER_USB below to match your printer's USB address.
#   Find yours with:  python -m brother_ql discover
#   Default is Brother QL-570: usb://0x04f9:0x2028

import io
import os
import sys

# ── USB DRIVER: add libusb1 DLL to PATH so pyusb can find it ──────────────────
_USB_DLL_DIR = r"C:\Users\Bootleggers Amager\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages\usb1"
if os.path.isdir(_USB_DLL_DIR):
    os.environ["PATH"] = _USB_DLL_DIR + ";" + os.environ.get("PATH", "")
    try:
        os.add_dll_directory(_USB_DLL_DIR)
    except AttributeError:
        pass

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont
import uuid

app = Flask(__name__)
CORS(app)

UPLOADED_LOGOS = {}
UPLOADED_RIGHT_LOGOS = {}

# ── CONFIGURATION ──────────────────────────────────────────────────────────────
PRINTER_USB   = "usb://0x04f9:0x2028"
PRINTER_MODEL = "QL-570"

LABEL_W        = 1982                    # px  (2x 991px for two 29x90 labels)
LABEL_H        = 306                     # px  (29 mm printable width)
MARGIN         = 10                      # px  margin around text/logo
WHITE_RECT_END = int(LABEL_W * 0.80)     # px  right edge of white rect = 1585
BORDER_W       = 8                       # px  black stroke around white rect
LOGO_PATH      = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logo-label.png")

GENRES = [
    "HOUSE", "TECHNO", "DISCO", "JAZZ", "SOUL", "FUNK",
    "AMBIENT", "ELECTRO", "ACID", "BREAKS", "DRUM & BASS", "HIP HOP",
    "REGGAE", "DUB", "CUMBIA", "ROCK", "PUNK", "METAL",
    "FOLK", "CLASSICAL", "R&B", "AFROBEAT", "LATIN", "WORLD", "EXPERIMENTAL",
]

# ── FONT LOADING ───────────────────────────────────────────────────────────────
_FUTURA_PATHS = [
    "/usr/share/fonts/truetype/futura/FuturaMedium.ttf",
    "/Library/Fonts/Futura Medium.ttf",
    "/Library/Fonts/Futura.ttc",
    "C:/Windows/Fonts/Futura Medium.ttf",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "futura_medium.ttf"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "FUTURAMEDIUM.TTF"),
]
_FALLBACK_PATHS = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def _locate_font():
    for p in _FUTURA_PATHS:
        if os.path.exists(p):
            print(f"[font] Futura: {p}")
            return p
    for p in _FALLBACK_PATHS:
        if os.path.exists(p):
            print(f"[font] WARNING: Futura not found — using fallback: {p}")
            return p
    print("[font] WARNING: no suitable font found, using PIL built-in")
    return None


FONT_PATH = _locate_font()


def _load(size: int) -> ImageFont.ImageFont:
    if FONT_PATH:
        try:
            return ImageFont.truetype(FONT_PATH, size)
        except Exception:
            pass
    return ImageFont.load_default()


# ── LABEL GENERATION ───────────────────────────────────────────────────────────
def _logo_white(max_w: int, max_h: int) -> Image.Image:
    """Load logo-label.png, recolour to white, scale to fit max_w × max_h."""
    if not os.path.exists(LOGO_PATH):
        return None
    logo = Image.open(LOGO_PATH).convert("RGBA")
    lw, lh = logo.size
    scale = min(max_w / lw, max_h / lh) * 0.95
    nw, nh = max(1, int(lw * scale)), max(1, int(lh * scale))
    logo = logo.resize((nw, nh), Image.LANCZOS)
    # Replace colour with white while keeping original alpha
    r, g, b, a = logo.split()
    white = Image.new("RGBA", (nw, nh), (255, 255, 255, 255))
    white.putalpha(a)
    return white


def _fit_font(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_w: int,
    max_h: int,
    start: int = 220,
) -> tuple:
    """Return (font, w, h, y_offset, size) — largest size where text fits."""
    for size in range(start, 7, -2):
        font = _load(size)
        bb = draw.textbbox((0, 0), text, font=font)
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        if w <= max_w and h <= max_h:
            return font, w, h, bb[1], size
    font = _load(8)
    bb = draw.textbbox((0, 0), text, font=font)
    return font, bb[2] - bb[0], bb[3] - bb[1], bb[1], 8


def generate_label(text: str, is_new_arrivals: bool = False, invert: bool = False, 
                   custom_logo_id: str = None, logo_scale: float = 1.0, 
                   logo_x: int = 0, logo_y: int = 0,
                   right_logo_id: str = None, right_logo_scale: float = 1.0,
                   right_logo_x: int = 0, right_logo_y: int = 0) -> Image.Image:
    """Return a 1982x306 RGB image of the full long label."""
    W, H = LABEL_W, LABEL_H
    img = Image.new("RGB", (W, H), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    logo_col_x = WHITE_RECT_END
    logo_col_w = W - logo_col_x          # 397 px

    left_block_w = logo_col_w if is_new_arrivals else 0

    # White rectangle — with margins on top / bottom
    wx1 = MARGIN if not is_new_arrivals else left_block_w
    wx2 = WHITE_RECT_END
    wy1 = MARGIN
    wy2 = H - MARGIN
    
    draw.rectangle([wx1, wy1, wx2, wy2], fill=(255, 255, 255))

    if custom_logo_id and custom_logo_id in UPLOADED_LOGOS:
        custom_logo = UPLOADED_LOGOS[custom_logo_id]
        cw, ch = custom_logo.size
        new_w, new_h = max(1, int(cw * logo_scale)), max(1, int(ch * logo_scale))
        resized_logo = custom_logo.resize((new_w, new_h), Image.LANCZOS)
        
        rect_w = wx2 - wx1
        rect_h = wy2 - wy1
        
        temp_surface = Image.new("RGBA", (rect_w, rect_h), (255, 255, 255, 0))
        temp_paste_x = (rect_w - new_w) // 2 + logo_x
        temp_paste_y = (rect_h - new_h) // 2 + logo_y
        
        if resized_logo.mode in ("RGBA", "LA"):
            temp_surface.paste(resized_logo, (temp_paste_x, temp_paste_y), resized_logo)
        else:
            temp_surface.paste(resized_logo, (temp_paste_x, temp_paste_y))
            
        img.paste(temp_surface, (wx1, wy1), temp_surface)

    elif text:
        # Genre text — auto-sized to fill white rect interior (accounting for border)
        pad = BORDER_W + 12
        txt_max_w = (wx2 - wx1) - pad * 2
        txt_max_h = (wy2 - wy1) - pad
        font, tw, th, ty_off, _ = _fit_font(draw, text, txt_max_w, txt_max_h)
        tx = wx1 + ((wx2 - wx1) - tw) // 2
        ty = wy1 + ((wy2 - wy1) - th) // 2 - ty_off
        draw.text((tx, ty), text, fill=(0, 0, 0), font=font)

    # Black border frame around the white rectangle
    draw.rectangle([wx1, wy1, wx2, wy2], outline=(0, 0, 0), width=BORDER_W)

    # Right column — logo (custom or default El Cuartito)
    logo_max_w = logo_col_w - MARGIN * 2
    logo_max_h = H - MARGIN * 2
    logo_cx    = logo_col_x + logo_col_w // 2

    if right_logo_id and right_logo_id in UPLOADED_RIGHT_LOGOS:
        # Custom right logo — recolour to white, scale & position
        custom_right = UPLOADED_RIGHT_LOGOS[right_logo_id].copy()
        # Recolour to white keeping alpha
        r, g, b, a = custom_right.split()
        white_img = Image.new("RGBA", custom_right.size, (255, 255, 255, 255))
        white_img.putalpha(a)
        cw, ch = white_img.size
        scale_fit = min(logo_max_w / cw, logo_max_h / ch) * 0.9
        eff_scale = scale_fit * right_logo_scale
        new_w = max(1, int(cw * eff_scale))
        new_h = max(1, int(ch * eff_scale))
        resized = white_img.resize((new_w, new_h), Image.LANCZOS)
        px = logo_cx - new_w // 2 + right_logo_x
        py = (H - new_h) // 2 + right_logo_y
        img.paste(resized, (px, py), resized)
    else:
        logo = _logo_white(logo_max_w, logo_max_h)
        if logo:
            lw, lh = logo.size
            img.paste(logo, (logo_cx - lw // 2, (H - lh) // 2), logo)
        else:
            # Text fallback if logo file not found
            logo1_font, lw1, lh1, ly1, sz1 = _fit_font(
                draw, "EL CUARTITO", logo_max_w, logo_max_h // 2, start=120
            )
            sz2 = max(8, round(sz1 * 18 / 28))
            logo2_font = _load(sz2)
            bb2 = draw.textbbox((0, 0), "recordstore", font=logo2_font)
            lw2, lh2, ly2 = bb2[2] - bb2[0], bb2[3] - bb2[1], bb2[1]
            gap = max(4, lh1 // 8)
            base_y = (H - lh1 - gap - lh2) // 2
            draw.text((logo_cx - lw1 // 2, base_y - ly1),
                      "EL CUARTITO", fill=(255, 255, 255), font=logo1_font)
            draw.text((logo_cx - lw2 // 2, base_y + lh1 + gap - ly2),
                      "recordstore", fill=(255, 255, 255), font=logo2_font)

    # Left column — NEW ARRIVALS
    if is_new_arrivals:
        left_cx = left_block_w // 2
        font1, lw1, lh1, ly1, sz1 = _fit_font(draw, "NEW", logo_max_w, logo_max_h // 2 - 10, start=120)
        font2, lw2, lh2, ly2, sz2 = _fit_font(draw, "ARRIVALS", logo_max_w, logo_max_h // 2 - 10, start=120)
        
        sz = min(sz1, sz2)
        f_final = _load(sz)
        
        bb1 = draw.textbbox((0, 0), "NEW", font=f_final)
        bb2 = draw.textbbox((0, 0), "ARRIVALS", font=f_final)
        
        w1, h1, y1_off = bb1[2] - bb1[0], bb1[3] - bb1[1], bb1[1]
        w2, h2, y2_off = bb2[2] - bb2[0], bb2[3] - bb2[1], bb2[1]
        
        gap = max(4, h1 // 8)
        base_y = (H - h1 - gap - h2) // 2
        
        draw.text((left_cx - w1 // 2, base_y - y1_off), "NEW", fill=(255, 255, 255), font=f_final)
        draw.text((left_cx - w2 // 2, base_y + h1 + gap - y2_off), "ARRIVALS", fill=(255, 255, 255), font=f_final)

    if invert:
        import PIL.ImageOps
        img = PIL.ImageOps.invert(img)

    return img


# ── PRINTING ───────────────────────────────────────────────────────────────────
def do_print(text: str, is_new_arrivals: bool = False, invert: bool = False,
             custom_logo_id: str = None, logo_scale: float = 1.0, 
             logo_x: int = 0, logo_y: int = 0,
             right_logo_id: str = None, right_logo_scale: float = 1.0,
             right_logo_x: int = 0, right_logo_y: int = 0) -> None:
    import subprocess
    import tempfile
    
    long_img = generate_label(text, is_new_arrivals, invert, custom_logo_id, logo_scale, logo_x, logo_y,
                              right_logo_id, right_logo_scale, right_logo_x, right_logo_y)
    
    # Split the image perfectly in half (991px each)
    img_part1 = long_img.crop((0, 0, 991, LABEL_H))
    img_part2 = long_img.crop((991, 0, 1982, LABEL_H))
    
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp1, \
         tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp2:
        img_part1.save(tmp1.name, format="PNG")
        img_part2.save(tmp2.name, format="PNG")
        tmp1_path = tmp1.name
        tmp2_path = tmp2.name

    try:
        brother_ql_exe = r"C:\Users\Bootleggers Amager\AppData\Local\Python\pythoncore-3.14-64\Scripts\brother_ql.exe"
        cmd = [
            brother_ql_exe,
            "-b", "pyusb",
            "-m", PRINTER_MODEL,
            "-p", PRINTER_USB,
            "print",
            "-l", "29x90",
            "-r", "90",
            tmp1_path,
            tmp2_path
        ]
        
        env = os.environ.copy()
        # Ensure the libusb path is included, just like in labelPrintController.ts
        env["PATH"] = _USB_DLL_DIR + ";" + env.get("PATH", "")
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"brother_ql failed: {result.stderr or result.stdout}")
    finally:
        for p in (tmp1_path, tmp2_path):
            try:
                os.remove(p)
            except Exception:
                pass


# ── ROUTES ─────────────────────────────────────────────────────────────────────
_UI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "label_ui.html")


@app.route("/")
def index():
    return send_file(_UI)


@app.route("/genres")
def genres():
    return jsonify(GENRES)


@app.route("/upload_logo", methods=["POST"])
def upload_logo():
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file"}), 400
    try:
        img = Image.open(file.stream).convert("RGBA")
        img.thumbnail((2000, 2000))
        logo_id = str(uuid.uuid4())
        UPLOADED_LOGOS[logo_id] = img
        return jsonify({"status": "ok", "logo_id": logo_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/upload_right_logo", methods=["POST"])
def upload_right_logo():
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file"}), 400
    try:
        img = Image.open(file.stream).convert("RGBA")
        img.thumbnail((2000, 2000))
        logo_id = str(uuid.uuid4())
        UPLOADED_RIGHT_LOGOS[logo_id] = img
        return jsonify({"status": "ok", "logo_id": logo_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/preview/<path:genre>")
def preview(genre: str):
    is_new_arrivals = request.args.get("new_arrivals") == "1"
    invert = request.args.get("invert") == "1"
    
    custom_logo_id = request.args.get("logo_id")
    scale = float(request.args.get("scale", 1.0))
    x_off = int(request.args.get("x", 0))
    y_off = int(request.args.get("y", 0))
    
    right_logo_id = request.args.get("right_logo_id")
    right_scale = float(request.args.get("right_scale", 1.0))
    right_x = int(request.args.get("right_x", 0))
    right_y = int(request.args.get("right_y", 0))
    
    img = generate_label(genre.upper(), is_new_arrivals, invert, custom_logo_id, scale, x_off, y_off,
                         right_logo_id, right_scale, right_x, right_y)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")


@app.route("/print", methods=["POST"])
def print_genre():
    data = request.get_json(force=True) or {}
    genre = str(data.get("genre", "")).strip().upper()
    is_new_arrivals = bool(data.get("new_arrivals", False))
    invert = bool(data.get("invert", False))
    
    custom_logo_id = data.get("custom_logo_id")
    logo_scale = float(data.get("logo_scale", 1.0))
    logo_x = int(data.get("logo_x", 0))
    logo_y = int(data.get("logo_y", 0))
    
    right_logo_id = data.get("right_logo_id")
    right_logo_scale = float(data.get("right_logo_scale", 1.0))
    right_logo_x = int(data.get("right_logo_x", 0))
    right_logo_y = int(data.get("right_logo_y", 0))
    
    if not genre:
        return jsonify({"error": "Missing 'genre'"}), 400
    try:
        do_print(genre, is_new_arrivals, invert, custom_logo_id, logo_scale, logo_x, logo_y,
                 right_logo_id, right_logo_scale, right_logo_x, right_logo_y)
        return jsonify({"status": "ok", "printed": genre})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/custom", methods=["POST"])
def print_custom():
    data = request.get_json(force=True) or {}
    text = str(data.get("text", "")).strip().upper()
    is_new_arrivals = bool(data.get("new_arrivals", False))
    invert = bool(data.get("invert", False))
    
    custom_logo_id = data.get("custom_logo_id")
    logo_scale = float(data.get("logo_scale", 1.0))
    logo_x = int(data.get("logo_x", 0))
    logo_y = int(data.get("logo_y", 0))
    
    right_logo_id = data.get("right_logo_id")
    right_logo_scale = float(data.get("right_logo_scale", 1.0))
    right_logo_x = int(data.get("right_logo_x", 0))
    right_logo_y = int(data.get("right_logo_y", 0))
    
    if not text:
        return jsonify({"error": "Missing 'text'"}), 400
    try:
        do_print(text, is_new_arrivals, invert, custom_logo_id, logo_scale, logo_x, logo_y,
                 right_logo_id, right_logo_scale, right_logo_x, right_logo_y)
        return jsonify({"status": "ok", "printed": text})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
