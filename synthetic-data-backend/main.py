import io
import math
import random
import zipfile
from typing import Optional
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

app = FastAPI(title="SynthData AI Backend")

# Enable CORS and expose the bounding box headers to Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-BBox-X", 
        "X-BBox-Y", 
        "X-BBox-W", 
        "X-BBox-H", 
        "X-Img-W", 
        "X-Img-H"
    ]
)

def create_composite(
    fg_img: Image.Image, 
    bg_img: Image.Image, 
    min_scale: float, 
    max_scale: float, 
    max_rotation: int
):
    """
    Resizes, rotates, and places the foreground object onto the background.
    Returns the final composited image and the bounding box (x, y, w, h).
    """
    bg_w, bg_h = bg_img.size
    
    # 1. Calculate random scale
    scale_factor = random.uniform(min_scale, max_scale)
    target_w = int(bg_w * scale_factor)
    aspect_ratio = fg_img.height / fg_img.width
    target_h = int(target_w * aspect_ratio)
    
    resized_fg = fg_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # 2. Apply rotation if specified
    if max_rotation > 0:
        angle = random.randint(-max_rotation, max_rotation)
        rotated_fg = resized_fg.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    else:
        rotated_fg = resized_fg

    fg_w, fg_h = rotated_fg.size

    # 3. Choose a random valid placement within background boundaries
    max_x = max(0, bg_w - fg_w)
    max_y = max(0, bg_h - fg_h)
    
    pos_x = random.randint(0, max_x) if max_x > 0 else 0
    pos_y = random.randint(0, max_y) if max_y > 0 else 0

    # 4. Paste foreground onto background copy
    composite = bg_img.copy()
    composite.paste(rotated_fg, (pos_x, pos_y), rotated_fg)

    # 5. Extract tighter bounding box based on threshold
    box_x, box_y, box_w, box_h = pos_x, pos_y, fg_w, fg_h
    alpha = rotated_fg.getchannel('A') if 'A' in rotated_fg.getbands() else None
    if alpha:
        bbox = alpha.getbbox() # (left, upper, right, lower) relative to rotated_fg
        if bbox:
            box_x = pos_x + bbox[0]
            box_y = pos_y + bbox[1]
            box_w = bbox[2] - bbox[0]
            box_h = bbox[3] - bbox[1]

    return composite, box_x, box_y, box_w, box_h


@app.post("/api/preview")
async def preview_composite(
    foreground: UploadFile = File(...),
    background: UploadFile = File(...),
    auto_remove_bg: str = Form("false"),
    add_shadows: str = Form("true"),
    min_scale: str = Form("0.2"),
    max_scale: str = Form("0.5"),
    max_rotation: str = Form("30")
):
    min_s = float(min_scale)
    max_s = float(max_scale)
    max_rot = int(max_rotation)

    fg_bytes = await foreground.read()
    bg_bytes = await background.read()

    fg_img = Image.open(io.BytesIO(fg_bytes)).convert("RGBA")
    bg_img = Image.open(io.BytesIO(bg_bytes)).convert("RGBA")

    composite, box_x, box_y, box_w, box_h = create_composite(
        fg_img, bg_img, min_s, max_s, max_rot
    )

    bg_w, bg_h = bg_img.size

    buffer = io.BytesIO()
    composite.convert("RGB").save(buffer, format="JPEG", quality=90)
    buffer.seek(0)

    headers = {
        "X-BBox-X": str(box_x),
        "X-BBox-Y": str(box_y),
        "X-BBox-W": str(box_w),
        "X-BBox-H": str(box_h),
        "X-Img-W": str(bg_w),
        "X-Img-H": str(bg_h)
    }

    return StreamingResponse(
        buffer, 
        media_type="image/jpeg", 
        headers=headers
    )


@app.post("/api/generate")
async def generate_dataset(
    foreground: UploadFile = File(...),
    background: UploadFile = File(...),
    count: str = Form("10"),
    export_format: str = Form("yolo"),
    auto_remove_bg: str = Form("false"),
    add_shadows: str = Form("true"),
    min_scale: str = Form("0.2"),
    max_scale: str = Form("0.5"),
    max_rotation: str = Form("30")
):
    num_images = int(count)
    min_s = float(min_scale)
    max_s = float(max_scale)
    max_rot = int(max_rotation)

    fg_bytes = await foreground.read()
    bg_bytes = await background.read()
    fg_img = Image.open(io.BytesIO(fg_bytes)).convert("RGBA")
    bg_img = Image.open(io.BytesIO(bg_bytes)).convert("RGBA")

    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for i in range(1, num_images + 1):
            composite, box_x, box_y, box_w, box_h = create_composite(
                fg_img, bg_img, min_s, max_s, max_rot
            )

            bg_w, bg_h = bg_img.size

            # Save JPEG image into zip
            img_buffer = io.BytesIO()
            composite.convert("RGB").save(img_buffer, format="JPEG", quality=90)
            img_filename = f"images/synthetic_{i:04d}.jpg"
            zip_file.writestr(img_filename, img_buffer.getvalue())

            # YOLO coordinate calculation
            x_center = (box_x + box_w / 2.0) / bg_w
            y_center = (box_y + box_h / 2.0) / bg_h
            norm_w = box_w / bg_w
            norm_h = box_h / bg_h

            annotation_txt = f"0 {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}\n"
            label_filename = f"labels/synthetic_{i:04d}.txt"
            zip_file.writestr(label_filename, annotation_txt)

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=dataset_{export_format}.zip"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
