from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.export_schema import ExportPDFRequest
from app.services.pdf_generator import generate_antigravity_pdf

router = APIRouter(tags=["Export"])

@router.post("/api/export-pdf")
@router.post("/export-pdf")
async def export_pdf(request: ExportPDFRequest):
    """
    Generate and stream an A4 Archivision Studio Project Design Report PDF.
    Receives base64 sketch, base64 render, exact architectural prompt, fidelity score, and client name.
    """
    try:
        pdf_buffer = generate_antigravity_pdf(
            original_sketch=request.original_sketch,
            generated_render=request.generated_render,
            architectural_prompt=request.architectural_prompt,
            fidelity_score=request.fidelity_score,
            client_name=request.client_name,
        )

        headers = {
            "Content-Disposition": 'attachment; filename="Archivision_Design_Report.pdf"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers=headers,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate Archivision PDF Report: {str(e)}",
        )
