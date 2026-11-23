import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from PIL import Image

from core.utils import AVATAR_INPUT_MAX_BYTES, AVATAR_MAX_BYTES, process_avatar


class AvatarProcessingTests(SimpleTestCase):
    def test_large_source_is_compressed_below_target(self):
        source = Image.effect_noise((1200, 1200), 100).convert("RGB")
        buffer = io.BytesIO()
        source.save(buffer, format="PNG")
        upload = SimpleUploadedFile("avatar.png", buffer.getvalue(), content_type="image/png")

        result = process_avatar(upload)

        self.assertGreater(upload.size, AVATAR_MAX_BYTES)
        self.assertLessEqual(len(result), AVATAR_MAX_BYTES)
        with Image.open(io.BytesIO(result)) as image:
            self.assertEqual(image.format, "WEBP")
            self.assertLessEqual(max(image.size), 2048)

    def test_source_above_input_limit_is_rejected(self):
        upload = SimpleUploadedFile(
            "avatar.png",
            b"0" * (AVATAR_INPUT_MAX_BYTES + 1),
            content_type="image/png",
        )

        with self.assertRaisesMessage(ValueError, "Image must be 12 MB or smaller."):
            process_avatar(upload)
