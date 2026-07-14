#!/usr/bin/env python3
"""Build the compact Brazilian broadcast catalog used by the web app."""

import csv
import hashlib
import io
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "apps/web/public/radio-catalog-br.json"
SOURCES = {
    "scr": "https://s3.mcom.gov.br/radcom/SCR_DADOS_RADIODIFUSAO_TV_GTVD_RTV_RTVD_FM_OM.csv",
    "radcom": "https://s3.mcom.gov.br/radcom/rep_srd_radcomsl.csv",
    "srd": "https://s3.mcom.gov.br/radcom/rep_srd_estacao_dados_abertos.csv",
}


def download(url):
    request = urllib.request.Request(url, headers={"User-Agent": "PL-330-Companion/1.0"})
    with urllib.request.urlopen(request, timeout=180) as response:
        return response.read().decode("latin-1", errors="replace")


def number(value):
    try:
        return float((value or "").replace(".", "").replace(",", "."))
    except ValueError:
        return None


def coordinate(value):
    direct = number(value)
    if direct is not None and abs(direct) <= 180:
        return direct
    match = re.fullmatch(r"(\d{2,3})([NSEW])(\d{2})(\d{2})", value or "")
    if not match:
        return None
    degrees, direction, minutes, seconds = match.groups()
    result = int(degrees) + int(minutes) / 60 + int(seconds) / 3600
    return -result if direction in "SW" else result


def clean(value):
    return re.sub(r"\s+", " ", (value or "").strip())


def station_id(*parts):
    return hashlib.sha1("|".join(map(str, parts)).encode()).hexdigest()[:16]


def add(result, seen, station):
    key = (station["band"], station["frequencyKHz"], station.get("city"), station.get("state"), station["name"])
    if key in seen:
        return
    seen.add(key)
    station["id"] = station_id(*key)
    result.append(station)


def build():
    stations, seen = [], set()
    scr_text = download(SOURCES["scr"])
    for row in csv.DictReader(io.StringIO(scr_text), delimiter=";"):
        service = row.get("SiglaServico")
        if service not in {"FM", "RTRFM", "OM"}:
            continue
        status = clean(row.get("Status_descricao"))
        if re.search(r"vago|exclu|cancel", status, re.I):
            continue
        frequency = number(row.get("frequency"))
        if frequency is None:
            continue
        band = "FM" if service in {"FM", "RTRFM"} else "MW"
        frequency_khz = round(frequency * 1000 if band == "FM" else frequency, 1)
        if (band == "FM" and not 64000 <= frequency_khz <= 108000) or (band == "MW" and not 520 <= frequency_khz <= 1710):
            continue
        name = clean(row.get("licenca_entidade_NomeFantasia")) or clean(row.get("licensee")) or clean(row.get("licenca_entidade_NomeEntidade"))
        if not name:
            continue
        latitude = coordinate(row.get("licenca_srd_planobasico_MedLatitudeDecimal") or row.get("srd_planobasico_MedLatitudeDecimal"))
        longitude = coordinate(row.get("licenca_srd_planobasico_MedLongitudeDecimal") or row.get("srd_planobasico_MedLongitudeDecimal"))
        item = {
            "name": name,
            "frequencyKHz": frequency_khz,
            "band": band,
            "mode": "FM" if band == "FM" else "AM",
            "city": clean(row.get("NomeMunicipio")),
            "state": clean(row.get("SiglaUF")),
            "country": "Brasil",
            "status": status,
            "callsign": clean(row.get("licenca_estacao_NomeIndicativo")),
            "sourceLabel": "MCom/Anatel — SCR",
        }
        if latitude is not None: item["latitude"] = round(latitude, 6)
        if longitude is not None: item["longitude"] = round(longitude, 6)
        add(stations, seen, item)

    radcom_text = download(SOURCES["radcom"])
    for row in csv.DictReader(io.StringIO(radcom_text), delimiter=";"):
        channel = number(row.get("NumCanal"))
        if channel is None:
            continue
        frequency_khz = round((87.9 + (channel - 200) * 0.2) * 1000, 1)
        if not 64000 <= frequency_khz <= 108000:
            continue
        name = clean(row.get("NomeFantasia")) or clean(row.get("nomeentidade"))
        if not name:
            continue
        item = {
            "name": name,
            "frequencyKHz": frequency_khz,
            "band": "FM",
            "mode": "FM",
            "city": clean(row.get("NomeMunicipioEst") or row.get("NomeMunicipioEstudo")),
            "state": clean(row.get("SiglaUFEst") or row.get("SiglaUFEstudo")),
            "country": "Brasil",
            "status": clean(row.get("siglasituacao_descricao")) or "Rádio comunitária",
            "callsign": clean(row.get("NomeIndicativoEstacao")),
            "sourceLabel": "MCom — RADCOM",
        }
        latitude, longitude = coordinate(row.get("MedLatitude")), coordinate(row.get("MedLongitude"))
        if latitude is not None: item["latitude"] = round(latitude, 6)
        if longitude is not None: item["longitude"] = round(longitude, 6)
        add(stations, seen, item)

    srd_text = download(SOURCES["srd"])
    for row in csv.DictReader(io.StringIO(srd_text.lstrip("?")), delimiter=";"):
        frequency = number(row.get("freqop"))
        if frequency is None or not 1711 <= frequency <= 29999:
            continue
        callsign = clean(row.get("nomeindicativoestacao"))
        name = clean(row.get("respnomeentidade")) or callsign or "Estação brasileira OC/OT"
        item = {
            "name": name,
            "frequencyKHz": round(frequency, 1),
            "band": "SW",
            "mode": "AM",
            "city": clean(row.get("endnomemunicipiotransm")),
            "state": clean(row.get("endsiglauftransm")),
            "country": "Brasil",
            "status": "Estação licenciada OC/OT",
            "callsign": callsign,
            "sourceLabel": "MCom — SRD",
        }
        latitude, longitude = coordinate(row.get("medlatitude")), coordinate(row.get("medlongitude"))
        if latitude is not None: item["latitude"] = round(latitude, 6)
        if longitude is not None: item["longitude"] = round(longitude, 6)
        add(stations, seen, item)

    stations.sort(key=lambda item: (item["frequencyKHz"], item.get("state", ""), item.get("city", ""), item["name"]))
    generated = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    references = [{"name": key, "url": url} for key, url in SOURCES.items()]
    return {"generatedAt": generated, "country": "BR", "count": len(stations), "sources": references, "stations": stations}


if __name__ == "__main__":
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = build()
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {payload['count']} stations to {OUTPUT}")
