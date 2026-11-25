import io
import os
import uuid

import mysql.connector
from PIL import Image, ImageOps, UnidentifiedImageError
from django.conf import settings


AVATAR_MAX_BYTES = 2 * 1024 * 1024
AVATAR_INPUT_MAX_BYTES = 12 * 1024 * 1024
AVATAR_MAX_DIMENSION = 2048
AVATAR_ENCODE_STEPS = (
    (2048, 85),
    (2048, 75),
    (2048, 65),
    (1536, 75),
    (1024, 75),
    (768, 70),
    (512, 70),
    (384, 70),
    (256, 70),
    (128, 70),
)
AVATAR_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
AVATAR_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}


def get_db_connection():
    """Raw connection for the hand-written app views.

    Reads the same DB_* environment overrides as core/settings.py so the
    backend works identically on the host (defaults) and inside Docker
    (DB_HOST=db).
    """
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ.get("DB_USER", "root"),
        password=os.environ.get("DB_PASSWORD", "1234"),
        database=os.environ.get("DB_NAME", "suggestion_hub"),
    )


def avatar_relative_path(user_id):
    return f"avatars/{user_id}.webp"


def avatar_absolute_path(relative_path):
    if not relative_path:
        return None
    normalized = str(relative_path).replace("\\", "/")
    if os.path.isabs(normalized) or ".." in normalized.split("/"):
        return None
    root = os.path.realpath(settings.MEDIA_ROOT)
    path = os.path.realpath(os.path.join(root, normalized))
    if os.path.commonpath([root, path]) != root:
        return None
    return path


def note_absolute_path(relative_path):
    if not relative_path:
        return None
    normalized = str(relative_path).replace("\\", "/")
    if os.path.isabs(normalized) or ".." in normalized.split("/"):
        return None
    root = os.path.realpath(settings.BASE_DIR)
    path = os.path.realpath(os.path.join(root, normalized))
    if os.path.commonpath([root, path]) != root:
        return None
    return path


def avatar_url(request, user_id, avatar):
    if not avatar:
        return None
    return request.build_absolute_uri(f"/accounts/avatar/{user_id}/")


def process_avatar(uploaded_file):
    if uploaded_file.content_type not in AVATAR_CONTENT_TYPES:
        raise ValueError("Unsupported image type.")
    if uploaded_file.size > AVATAR_INPUT_MAX_BYTES:
        raise ValueError("Image must be 12 MB or smaller.")

    data = uploaded_file.read(AVATAR_INPUT_MAX_BYTES + 1)
    if not data or len(data) > AVATAR_INPUT_MAX_BYTES:
        raise ValueError("Image must be 12 MB or smaller.")

    try:
        with Image.open(io.BytesIO(data)) as source:
            image_format = (source.format or "").upper()
            if image_format not in AVATAR_FORMATS:
                raise ValueError("Unsupported image type.")
            source.verify()

        with Image.open(io.BytesIO(data)) as source:
            image = ImageOps.exif_transpose(source)
            image.load()
            image.thumbnail((AVATAR_MAX_DIMENSION, AVATAR_MAX_DIMENSION), Image.Resampling.LANCZOS)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

            current_dimension = AVATAR_MAX_DIMENSION
            for dimension, quality in AVATAR_ENCODE_STEPS:
                if dimension < current_dimension:
                    image.thumbnail((dimension, dimension), Image.Resampling.LANCZOS)
                    current_dimension = dimension
                output = io.BytesIO()
                image.save(output, format="WEBP", quality=quality, method=6)
                encoded = output.getvalue()
                if len(encoded) <= AVATAR_MAX_BYTES:
                    return encoded

            raise ValueError("Image could not be compressed below 2 MB.")
    except (UnidentifiedImageError, OSError, ValueError) as error:
        if str(error) in (
            "Unsupported image type.",
            "Image must be 12 MB or smaller.",
            "Image could not be compressed below 2 MB.",
        ):
            raise
        raise ValueError("Invalid image.") from error


def write_avatar_file(relative_path, data):
    path = avatar_absolute_path(relative_path)
    if path is None:
        raise ValueError("Invalid avatar path.")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    temporary_path = f"{path}.{uuid.uuid4().hex}.tmp"
    try:
        with open(temporary_path, "wb") as output:
            output.write(data)
        os.replace(temporary_path, path)
    finally:
        if os.path.exists(temporary_path):
            os.remove(temporary_path)
