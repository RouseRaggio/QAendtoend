import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

class StorageService:
    @staticmethod
    async def save_evidence_file(file: UploadFile) -> tuple[str, str, int]:
        # Validate content type
        content_type = file.content_type or ""
        allowed_types = settings.ALLOWED_IMAGE_MIME_TYPES + settings.ALLOWED_DOCUMENT_MIME_TYPES
        if content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '{content_type}'. Allowed: {', '.join(allowed_types)}"
            )
            
        # Read content and validate size
        content = await file.read()
        file_size = len(content)
        if file_size > settings.MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_BYTES / (1024*1024)}MB"
            )
            
        # Secure filename
        original_name = file.filename or "screenshot.png"
        ext = os.path.splitext(original_name)[1]
        if not ext:
            ext = ".png" if "image" in content_type else ".bin"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        destination_path = os.path.join(settings.UPLOAD_DIR, unique_name)
        
        async with aiofiles.open(destination_path, "wb") as out_file:
            await out_file.write(content)
            
        return unique_name, destination_path, file_size
