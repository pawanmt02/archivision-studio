from pydantic import BaseModel, Field

class ExportPDFRequest(BaseModel):
    original_sketch: str = Field(..., description="Base64 encoded PNG of the original sketch")
    generated_render: str = Field(..., description="Base64 encoded PNG of the generated render")
    architectural_prompt: str = Field(..., description="Architectural prompt description")
    fidelity_score: float = Field(..., description="Canny-Edge IoU or structural fidelity score (0-100 or 0-1)")
    client_name: str = Field("Antigravity Client", description="Client or architect name")
