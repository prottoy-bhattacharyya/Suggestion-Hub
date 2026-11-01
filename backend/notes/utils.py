import hashlib
import os

def save_file(file, destination_path):
    """
    Save an uploaded file to the specified destination path.

    Args:
        file (File): The uploaded file.
        destination_path (str): The path where the file should be saved.
    """

    if not file:
        raise ValueError("No file provided for saving.")
    os.makedirs("uploaded_notes", exist_ok=True)
    with open(destination_path, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)

def getFileHash(file):
    """
    Calculate the SHA-256 hash of a file.

    Args:
        file (File): The file to hash.
    """
   

    # Open the file in binary read mode ('rb')
    with open(file, "rb") as f:
        # Supported algorithms include "sha256", "md5", "sha1", etc.
        digest = hashlib.file_digest(f, "sha256")

    # Get the final hexadecimal hash string
    file_hash = digest.hexdigest()
    return file_hash