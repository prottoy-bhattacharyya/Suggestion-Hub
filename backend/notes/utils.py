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
    directory = os.path.dirname(destination_path) or "uploaded_notes"
    os.makedirs(directory, exist_ok=True)
    with open(destination_path, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)

def getFileHash(file):
    """
    Calculate the SHA-256 hash of an uploaded file (streamed from memory).

    Args:
        file (File): The uploaded file (Django UploadedFile).
    """

    digest = hashlib.sha256()
    for chunk in file.chunks():
        digest.update(chunk)

    return digest.hexdigest()