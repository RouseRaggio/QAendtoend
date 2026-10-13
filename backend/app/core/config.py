import os
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TestFlow QA"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = "testflow_super_secret_jwt_key_change_in_production_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = "sqlite:///./testflow.db"
    
    # Storage
    UPLOAD_DIR: str = "./uploads/evidence"
    MAX_FILE_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB
    ALLOWED_IMAGE_MIME_TYPES: List[str] = ["image/png", "image/jpeg", "image/webp"]
    ALLOWED_DOCUMENT_MIME_TYPES: List[str] = ["application/pdf"]
    
    # AI Settings
    AI_PROVIDER: str = "mock"  # mock, openai, ollama
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    
    # Jira Settings
    JIRA_BASE_URL: Optional[str] = "https://gestadoc.atlassian.net"
    JIRA_EMAIL: Optional[str] = "qa@gestadoc.com"
    JIRA_API_TOKEN: Optional[str] = None
    JIRA_ENABLED: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
