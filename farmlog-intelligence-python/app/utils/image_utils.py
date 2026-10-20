"""
app/utils/image_utils.py
Image preprocessing utilities.
A data scientist would clean and enhance images before sending to a vision model
to improve OCR accuracy — especially for field photos with shadows or tilts.
"""

import base64
import io
import logging
from PIL import Image, ImageEnhance, ImageFilter

logger = logging.getLogger(__name__)

MAX_DIMENSION = 2048   # Claude Vision works best at this resolution
JPEG_QUALITY  = 88


def base64_to_pil(image_base64: str, media_type: str = "image/jpeg") -> Image.Image:
    """Decode base64 string → PIL Image."""
    image_bytes = base64.b64decode(image_base64)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def pil_to_base64(image: Image.Image, media_type: str = "image/jpeg") -> str:
    """PIL Image → base64 string."""
    buffer = io.BytesIO()
    fmt = "JPEG" if "jpeg" in media_type else "PNG"
    image.save(buffer, format=fmt, quality=JPEG_QUALITY)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def preprocess_form_image(
    image_base64: str,
    media_type: str = "image/jpeg",
    enhance_contrast: bool = True,
    sharpen: bool = True,
    max_dimension: int = MAX_DIMENSION,
) -> tuple[str, str]:
    """
    Preprocess a form photo for better Claude Vision accuracy.

    Steps:
      1. Decode from base64
      2. Convert to RGB (drop alpha channel if present)
      3. Resize to max_dimension (preserving aspect ratio)
      4. Enhance contrast (helps with faint handwriting)
      5. Sharpen (helps with slightly blurry field photos)
      6. Re-encode as JPEG

    Returns: (processed_base64, output_media_type)
    """
    try:
        img = base64_to_pil(image_base64, media_type)

        # 1. Resize — Claude Vision handles up to 8000px but 2048 is optimal
        w, h = img.size
        if max(w, h) > max_dimension:
            ratio = max_dimension / max(w, h)
            new_size = (int(w * ratio), int(h * ratio))
            img = img.resize(new_size, Image.LANCZOS)
            logger.debug(f"Resized image from {w}×{h} to {new_size[0]}×{new_size[1]}")

        # 2. Enhance contrast — boosts faint pencil/ink on paper
        if enhance_contrast:
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.4)

        # 3. Sharpen — helps with slightly out-of-focus field photos
        if sharpen:
            img = img.filter(ImageFilter.SHARPEN)

        output_base64 = pil_to_base64(img, "image/jpeg")
        logger.debug(
            f"Preprocessed image: "
            f"original={len(image_base64)} chars → "
            f"processed={len(output_base64)} chars"
        )
        return output_base64, "image/jpeg"

    except Exception as e:
        logger.warning(f"Image preprocessing failed, using original: {e}")
        return image_base64, media_type


def validate_image(image_base64: str, max_size_mb: float = 10.0) -> None:
    """Raise ValueError if image is too large or invalid."""
    size_mb = len(image_base64) * 3 / 4 / (1024 * 1024)
    if size_mb > max_size_mb:
        raise ValueError(f"Image too large: {size_mb:.1f}MB (max {max_size_mb}MB)")

    try:
        image_bytes = base64.b64decode(image_base64)
        Image.open(io.BytesIO(image_bytes)).verify()
    except Exception as e:
        raise ValueError(f"Invalid image data: {e}")


def image_bytes_to_base64(image_bytes: bytes) -> tuple[str, str]:
    """Convert raw bytes (from Blob Storage) to base64 + media type."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=JPEG_QUALITY)
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return b64, "image/jpeg"
