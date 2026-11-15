"""
PDF Report Generator for Archivision Studio / Antigravity AI
Generates an A4 Project Design Report with futuristic 'Antigravity' aesthetics.
"""

import io
import base64
import html
from datetime import datetime, timezone
from PIL import Image, ImageDraw

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


def _decode_b64_to_rl_image(b64_str: str, target_width: float = 240, target_height: float = 240) -> tuple[RLImage, io.BytesIO]:
    """
    Decodes a base64 PNG/JPEG string and returns a ReportLab Image flowable
    along with the underlying BytesIO buffer (which must remain in memory during document build).
    """
    try:
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        raw_bytes = base64.b64decode(b64_str)
        pil_img = Image.open(io.BytesIO(raw_bytes))

        if pil_img.mode == "RGBA":
            # Composite onto dark slate background matching futuristic aesthetic
            bg = Image.new("RGB", pil_img.size, (15, 23, 42))
            bg.paste(pil_img, mask=pil_img.split()[3])
            pil_img = bg
        elif pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        out_buf = io.BytesIO()
        pil_img.save(out_buf, format="PNG")
        out_buf.seek(0)
        return RLImage(out_buf, width=target_width, height=target_height), out_buf

    except Exception:
        # Fallback placeholder if decoding fails
        fallback = Image.new("RGB", (512, 512), (30, 41, 59))
        draw = ImageDraw.Draw(fallback)
        draw.rectangle([10, 10, 502, 502], outline=(99, 198, 210), width=3)
        draw.text((120, 240), "Preview Not Available", fill=(226, 232, 240))
        out_buf = io.BytesIO()
        fallback.save(out_buf, format="PNG")
        out_buf.seek(0)
        return RLImage(out_buf, width=target_width, height=target_height), out_buf


def _draw_antigravity_background(canvas, doc):
    """Draws futuristic corner HUD brackets and subtle cyber grid markers."""
    canvas.saveState()
    pw, ph = doc.pagesize

    # Neon Cyan color for corner brackets
    canvas.setStrokeColor(colors.HexColor("#06B6D4"))
    canvas.setLineWidth(1.2)

    bracket_len = 16
    m = 24  # margin

    # Top-Left Bracket
    canvas.line(m, ph - m, m + bracket_len, ph - m)
    canvas.line(m, ph - m, m, ph - (m + bracket_len))

    # Top-Right Bracket
    canvas.line(pw - m, ph - m, pw - (m + bracket_len), ph - m)
    canvas.line(pw - m, ph - m, pw - m, ph - (m + bracket_len))

    # Bottom-Left Bracket
    canvas.line(m, m, m + bracket_len, m)
    canvas.line(m, m, m, m + bracket_len)

    # Bottom-Right Bracket
    canvas.line(pw - m, m, pw - (m + bracket_len), m)
    canvas.line(pw - m, m, pw - m, m + bracket_len)

    # Subtle top accent bar
    canvas.setFillColor(colors.HexColor("#06B6D4"))
    canvas.rect(36, ph - 28, pw - 72, 2, fill=True, stroke=False)

    canvas.restoreState()


def generate_antigravity_pdf(
    original_sketch: str,
    generated_render: str,
    architectural_prompt: str,
    fidelity_score: float,
    client_name: str,
) -> io.BytesIO:
    """
    Generates a high-fidelity, futuristic Antigravity Studio Project Design Report (A4 PDF).
    Returns an in-memory BytesIO buffer containing the compiled PDF document.
    """
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    usable_width = A4[0] - 72  # ~523.27 pt

    # Decode images & preserve buffers in memory
    sketch_rl, sketch_buf = _decode_b64_to_rl_image(original_sketch, target_width=245, target_height=230)
    render_rl, render_buf = _decode_b64_to_rl_image(generated_render, target_width=245, target_height=230)

    # Format fidelity score
    raw_score = float(fidelity_score)
    score_pct = raw_score * 100 if raw_score <= 1.0 else raw_score
    score_formatted = f"{score_pct:.1f}%"

    if score_pct >= 85.0:
        compliance_text = "OPTIMAL STRUCTURAL PRESERVATION"
        compliance_color = "#10B981"  # Emerald
    elif score_pct >= 70.0:
        compliance_text = "HIGH GEOMETRIC COMPLIANCE"
        compliance_color = "#06B6D4"  # Cyan
    elif score_pct >= 50.0:
        compliance_text = "MODERATE STRUCTURAL CONFORMITY"
        compliance_color = "#F59E0B"  # Amber
    else:
        compliance_text = "CREATIVE LATENT DIVERGENCE"
        compliance_color = "#8B5CF6"  # Violet

    # Escape dynamic string content for ReportLab Paragraphs
    safe_prompt = html.escape(architectural_prompt.strip() or "Architectural design specification")
    safe_client = html.escape(client_name.strip() or "Enterprise Architectural Client")
    timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # Typography Styles
    styles = getSampleStyleSheet()
    normal = styles["Normal"]

    h_title = ParagraphStyle(
        "ReportHeaderTitle",
        parent=normal,
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=21,
        textColor=colors.HexColor("#F8FAFC"),
        alignment=1,
    )
    h_sub = ParagraphStyle(
        "ReportHeaderSub",
        parent=normal,
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#06B6D4"),
        alignment=1,
    )

    meta_label = ParagraphStyle(
        "MetaLabel",
        parent=normal,
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#94A3B8"),
    )
    meta_val = ParagraphStyle(
        "MetaValue",
        parent=normal,
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#F8FAFC"),
    )

    img_title_sketch = ParagraphStyle(
        "ImgTitleSketch",
        parent=normal,
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#38BDF8"),
        alignment=1,
    )
    img_title_render = ParagraphStyle(
        "ImgTitleRender",
        parent=normal,
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#A78BFA"),
        alignment=1,
    )
    img_caption = ParagraphStyle(
        "ImgCaption",
        parent=normal,
        fontName="Helvetica",
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#64748B"),
        alignment=1,
    )

    prompt_label = ParagraphStyle(
        "PromptLabel",
        parent=normal,
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#38BDF8"),
    )
    prompt_content = ParagraphStyle(
        "PromptContent",
        parent=normal,
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#E2E8F0"),
    )

    fidelity_label = ParagraphStyle(
        "FidelityLabel",
        parent=normal,
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#94A3B8"),
        alignment=1,
    )
    fidelity_num = ParagraphStyle(
        "FidelityNum",
        parent=normal,
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=colors.HexColor(compliance_color),
        alignment=1,
    )
    fidelity_status = ParagraphStyle(
        "FidelityStatus",
        parent=normal,
        fontName="Helvetica-Bold",
        fontSize=6.5,
        leading=8,
        textColor=colors.HexColor(compliance_color),
        alignment=1,
    )
    fidelity_sub = ParagraphStyle(
        "FidelitySub",
        parent=normal,
        fontName="Helvetica",
        fontSize=6,
        leading=7.5,
        textColor=colors.HexColor("#64748B"),
        alignment=1,
    )

    footer_text = ParagraphStyle(
        "FooterText",
        parent=normal,
        fontName="Helvetica",
        fontSize=6.5,
        leading=8,
        textColor=colors.HexColor("#64748B"),
        alignment=1,
    )

    story = []

    # 1. Header Banner
    header_table = Table(
        [
            [Paragraph("ARCHIVISION STUDIO - PROJECT DESIGN REPORT", h_title)],
            [Paragraph("DUAL-CONDITIONED GENERATIVE ARCHITECTURAL SYNTHESIS SPECIFICATION", h_sub)],
        ],
        colWidths=[usable_width],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0B0F19")),
                ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor("#06B6D4")),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    story.append(header_table)
    story.append(Spacer(1, 8))

    # 2. Project Metadata Grid
    col_w = usable_width / 4.0
    meta_table = Table(
        [
            [
                Paragraph("CLIENT / ARCHITECT", meta_label),
                Paragraph("SYNTHESIS PIPELINE", meta_label),
                Paragraph("GENERATED TIMESTAMP", meta_label),
                Paragraph("VALIDATION STATUS", meta_label),
            ],
            [
                Paragraph(safe_client, meta_val),
                Paragraph("ControlNet Scribble + SD v1.5", meta_val),
                Paragraph(timestamp_str, meta_val),
                Paragraph(f"<font color='{compliance_color}'>VERIFIED INTENT</font>", meta_val),
            ],
        ],
        colWidths=[col_w, col_w, col_w, col_w],
    )
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#334155")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#1E293B")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. Side-by-Side Image Comparison Table
    img_col_w = (usable_width - 10) / 2.0  # ~256 pt each
    img_table = Table(
        [
            [
                Paragraph("ORIGINAL SPATIAL SKETCH", img_title_sketch),
                Paragraph("GENERATED ARCHITECTURAL RENDER", img_title_render),
            ],
            [sketch_rl, render_rl],
            [
                Paragraph("Input Geometric Constraints & Boundary Lines", img_caption),
                Paragraph("Dual-Conditioned Latent Diffusion Synthesis (512x512)", img_caption),
            ],
        ],
        colWidths=[img_col_w, img_col_w],
    )
    img_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#0C1929")),
                ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#1E1B4B")),
                ("BACKGROUND", (0, 1), (0, 1), colors.HexColor("#0A0D14")),
                ("BACKGROUND", (1, 1), (1, 1), colors.HexColor("#0A0D14")),
                ("BACKGROUND", (0, 2), (0, 2), colors.HexColor("#0C1929")),
                ("BACKGROUND", (1, 2), (1, 2), colors.HexColor("#1E1B4B")),
                ("BOX", (0, 0), (0, 2), 1, colors.HexColor("#0284C7")),
                ("BOX", (1, 0), (1, 2), 1, colors.HexColor("#7C3AED")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, 0), 5),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
                ("TOPPADDING", (0, 1), (-1, 1), 4),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 4),
                ("TOPPADDING", (0, 2), (-1, 2), 4),
                ("BOTTOMPADDING", (0, 2), (-1, 2), 4),
            ]
        )
    )
    story.append(img_table)
    story.append(Spacer(1, 10))

    # 4. Formatted Metadata & Quantitative Evaluation Section
    prompt_box_w = usable_width - 175  # ~348 pt
    score_box_w = 175                  # ~175 pt

    prompt_inner = Table(
        [
            [Paragraph("ARCHITECTURAL PROMPT SPECIFICATION", prompt_label)],
            [Paragraph(f'&ldquo;{safe_prompt}&rdquo;', prompt_content)],
        ],
        colWidths=[prompt_box_w - 16],
    )
    prompt_inner.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    score_inner = Table(
        [
            [Paragraph("STRUCTURAL FIDELITY SCORE", fidelity_label)],
            [Paragraph(score_formatted, fidelity_num)],
            [Paragraph(compliance_text, fidelity_status)],
            [Paragraph("Canny-Edge IoU Fidelity Ratio (|A &cap; B| / |A|)", fidelity_sub)],
        ],
        colWidths=[score_box_w - 16],
    )
    score_inner.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    meta_eval_table = Table(
        [[prompt_inner, score_inner]],
        colWidths=[prompt_box_w, score_box_w],
    )
    meta_eval_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#0F172A")),
                ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#0F172A")),
                ("BOX", (0, 0), (0, 0), 1, colors.HexColor("#0284C7")),
                ("BOX", (1, 0), (1, 0), 1, colors.HexColor(compliance_color)),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(meta_eval_table)
    story.append(Spacer(1, 10))

    # 5. Clean Footer with Timestamp
    footer_table = Table(
        [
            [
                Paragraph(
                    f"ARCHIVISION STUDIO CONFIDENTIAL ARCHITECTURAL SPECIFICATION &bull; {timestamp_str} &bull; PAGE 1 OF 1",
                    footer_text,
                )
            ]
        ],
        colWidths=[usable_width],
    )
    footer_table.setStyle(
        TableStyle(
            [
                ("LINEABOVE", (0, 0), (-1, -1), 0.75, colors.HexColor("#1E293B")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    story.append(footer_table)

    # Build PDF with background corner brackets
    doc.build(story, onFirstPage=_draw_antigravity_background)

    pdf_buffer.seek(0)
    return pdf_buffer
