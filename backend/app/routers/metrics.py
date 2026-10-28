from fastapi import APIRouter, Query

from ..services import analytics

router = APIRouter(prefix="/api", tags=["metrics"])


@router.get("/overview")
def overview(months: int = Query(12, ge=1, le=12), region: str | None = None):
    return analytics.overview(months, region)


@router.get("/countries")
def countries(months: int = Query(12, ge=1, le=12), region: str | None = None):
    return analytics.country_summary(months, region)


@router.get("/cohorts")
def cohorts(region: str | None = None):
    return analytics.cohorts(region)


@router.get("/market-factors")
def market_factors():
    return analytics.market_factors()


@router.get("/regions")
def regions():
    return analytics.regions()
