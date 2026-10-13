from abc import ABC, abstractmethod
from typing import List, Dict, Any
from app.schemas.schemas import AIAnalysisResult, AIGeneratedCase

class AIProvider(ABC):
    @abstractmethod
    async def analyze_user_story(
        self,
        story_text: str,
        acceptance_criteria: List[str],
        business_rules: str = ""
    ) -> AIAnalysisResult:
        pass

    @abstractmethod
    async def generate_test_cases(
        self,
        title: str,
        story_text: str,
        acceptance_criteria: List[str],
        analysis: AIAnalysisResult,
        test_types: List[str],
        detail_level: str = "HIGH"
    ) -> List[AIGeneratedCase]:
        pass
