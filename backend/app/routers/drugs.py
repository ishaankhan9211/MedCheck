import asyncio

import httpx
from fastapi import APIRouter, Depends, Query

from ..auth import get_current_user

router = APIRouter(prefix="/api/drugs", tags=["drugs"])

FDA_LABEL = "https://api.fda.gov/drug/label.json"
FDA_NDC = "https://api.fda.gov/drug/ndc.json"
RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST"
DAILYMED = "https://dailymed.nlm.nih.gov/dailymed/services/v2"


def dedupe(items: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for item in items:
        key = item["brand"].lower().strip()
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


async def search_fda(client: httpx.AsyncClient, query: str) -> list[dict]:
    results = []
    try:
        r1, r2 = await asyncio.gather(
            client.get(FDA_LABEL, params={"search": f'openfda.brand_name:"{query}"', "limit": 10}),
            client.get(FDA_LABEL, params={"search": f'openfda.generic_name:"{query}"', "limit": 10}),
            return_exceptions=True,
        )
        for r in (r1, r2):
            if isinstance(r, httpx.Response) and r.status_code == 200:
                for item in r.json().get("results", []):
                    openfda = item.get("openfda", {}) or {}
                    brands = openfda.get("brand_name", [])
                    generics = openfda.get("generic_name", [])
                    for b in brands:
                        results.append({"brand": b, "generic": generics[0] if generics else "", "source": "FDA"})
                    if not brands and generics:
                        results.append({"brand": generics[0], "generic": generics[0], "source": "FDA"})
    except Exception:
        pass
    return results


async def search_rxnorm(client: httpx.AsyncClient, query: str) -> list[dict]:
    results = []
    try:
        r = await client.get(f"{RXNORM_BASE}/drugs.json", params={"name": query})
        if r.status_code == 200:
            groups = r.json().get("drugGroup", {}).get("conceptGroup", []) or []
            for group in groups:
                for p in group.get("conceptProperties", []) or []:
                    results.append({"brand": p.get("name", ""), "generic": p.get("synonym", ""), "source": "RxNorm/NIH"})
    except Exception:
        pass
    return results


async def search_rxnorm_approx(client: httpx.AsyncClient, query: str) -> list[dict]:
    results = []
    try:
        r = await client.get(
            f"{RXNORM_BASE}/approximateTerm.json", params={"term": query, "maxEntries": 10}
        )
        if r.status_code == 200:
            candidates = r.json().get("approximateGroup", {}).get("candidate", []) or []
            for c in candidates:
                if c.get("name"):
                    results.append({"brand": c["name"], "generic": "", "source": "RxNorm"})
    except Exception:
        pass
    return results


async def search_dailymed(client: httpx.AsyncClient, query: str) -> list[dict]:
    results = []
    try:
        r = await client.get(f"{DAILYMED}/spls.json", params={"drug_name": query, "pagesize": 10})
        if r.status_code == 200:
            for item in r.json().get("data", []) or []:
                if item.get("title"):
                    results.append({"brand": item["title"], "generic": "", "source": "DailyMed"})
    except Exception:
        pass
    return results


async def search_ndc(client: httpx.AsyncClient, query: str) -> list[dict]:
    results = []
    try:
        r = await client.get(FDA_NDC, params={"search": f'brand_name:"{query}"', "limit": 8})
        if r.status_code == 200:
            for item in r.json().get("results", []) or []:
                if item.get("brand_name"):
                    results.append(
                        {"brand": item["brand_name"], "generic": item.get("generic_name", ""), "source": "NDC"}
                    )
    except Exception:
        pass
    return results


@router.get("/search")
async def search_drugs(q: str = Query(..., min_length=2), user: dict = Depends(get_current_user)):
    async with httpx.AsyncClient(timeout=10) as client:
        results = await asyncio.gather(
            search_fda(client, q),
            search_rxnorm(client, q),
            search_rxnorm_approx(client, q),
            search_dailymed(client, q),
            search_ndc(client, q),
            return_exceptions=True,
        )

    all_results: list[dict] = []
    for r in results:
        if isinstance(r, list):
            all_results.extend(r)

    return dedupe(all_results)[:12]


@router.get("/details")
async def get_drug_details(name: str = Query(...), user: dict = Depends(get_current_user)):
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(f"{RXNORM_BASE}/rxcui.json", params={"name": name, "search": 1})
            if r.status_code != 200:
                return None
            rxcui = (r.json().get("idGroup", {}) or {}).get("rxnormId", [None])[0]
            if not rxcui:
                return None

            prop_r, class_r = await asyncio.gather(
                client.get(f"{RXNORM_BASE}/rxcui/{rxcui}/properties.json"),
                client.get(f"{RXNORM_BASE}/rxcui/{rxcui}/classes.json"),
                return_exceptions=True,
            )

            drug_name = name
            drug_class = ""
            if isinstance(prop_r, httpx.Response) and prop_r.status_code == 200:
                drug_name = prop_r.json().get("properties", {}).get("name", name)
            if isinstance(class_r, httpx.Response) and class_r.status_code == 200:
                info_list = (
                    class_r.json().get("rxclassDrugInfoList", {}).get("rxclassDrugInfo", [])
                )
                if info_list:
                    drug_class = info_list[0].get("rxclassMinConceptItem", {}).get("className", "")

            return {"name": drug_name, "rxcui": rxcui, "drugClass": drug_class}
        except Exception:
            return None
