import re
from datetime import date

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from ..services import report_builder as rb

router = APIRouter(prefix="/api", tags=["reports"])


class ReportRequest(BaseModel):
    format: str = Field(pattern="^(pptx|docx|pdf)$")
    title: str = Field("Global Market Performance Review", max_length=120)
    months: int = Field(12, ge=1, le=12)
    region: str | None = None
    sections: list[str] = Field(default_factory=lambda: list(rb.ALL_SECTIONS))
    weights: dict[str, float] | None = None


@router.post("/reports")
def create_report(req: ReportRequest):
    sections = [s for s in req.sections if s in rb.ALL_SECTIONS]
    if not sections:
        raise HTTPException(400, "Choose at least one section for the report.")
    region = None if req.region in (None, "", "All") else req.region
    ctx = rb.build_context(req.months, region, sections, req.weights)
    builder, mime = rb.BUILDERS[req.format]
    data = builder(ctx, req.title)
    slug = re.sub(r"[^a-z0-9]+", "-", req.title.lower()).strip("-") or "report"
    filename = f"{slug}-{date.today():%Y%m%d}.{req.format}"
    return Response(content=data, media_type=mime,
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})
