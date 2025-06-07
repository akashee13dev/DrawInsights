from fastapi import APIRouter , HTTPException
import base64
from io import BytesIO
from apps.calculator.utils import analyze_image
from schema import ImageData
from PIL import Image, ImageColor

router = APIRouter()

@router.post('')
async def run(data: ImageData):
    try:
        # Extract base64 part after "data:image/png;base64,"
        if "," in data.image:
            b64data = data.image.split(",")[1]
        else:
            b64data = data.image

        image_data = base64.b64decode(b64data)
        image_bytes = BytesIO(image_data)
        image = Image.open(image_bytes)
        print(data.dict_of_vars)
        stroke_color = data.dict_of_vars.get("strokeColor", "#000000")
        stroke_rgb = ImageColor.getrgb(stroke_color)
        print(stroke_color)
        print(stroke_rgb)
        # Choose background opposite to stroke color
        # Simple logic: if stroke is light, use black bg; if dark, use white
        def is_light(rgb):
            r, g, b = rgb
            return (r*0.299 + g*0.587 + b*0.114) > 186
        bg_color = (0, 0, 0) if is_light(stroke_rgb) else (255, 255, 255)
        
        if image.mode == "RGBA":
            background = Image.new("RGB", image.size, bg_color)
            image = Image.alpha_composite(background.convert("RGBA"), image).convert("RGB")
        else:
            image = image.convert("RGB")
        image.save("final.png")
        

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Drawing data: {str(e)}")

    # Defensive check before calling analyze_image
    if image is None:
        raise HTTPException(status_code=400, detail="Drawing Cant be extracted")

    # Call your analyze function and ensure it handles empty inputs
    try:
        responses = analyze_image(image, dict_of_vars=data.dict_of_vars)
        if not responses:
            raise HTTPException(status_code=500, detail=f"Error processing Drawing")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing Drawing: {str(e)}")

    # Log responses for debugging
    print("responses:", responses)

    return {"message": "Image processed", "data": responses, "status": "success"}