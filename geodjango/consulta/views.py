from __future__ import annotations

import json
import re
from collections import Counter

from django.conf import settings
from django.db.models import Count
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import NO_SE, Area, MuestraInicial, Opcion, Pregunta, Respuesta
from .opinion import componer


def _area(area: Area, detalle: bool) -> dict:
    datos = {
        "slug": area.slug,
        "titulo": area.titulo,
        "icono": area.icono,
        "resumen": area.resumen,
        "num_preguntas": area.preguntas.count(),
        "pregunta_slugs": list(area.preguntas.values_list("slug", flat=True)),
    }
    if detalle:
        datos["diagnostico"] = area.diagnostico
        datos["propuestas"] = area.propuestas
        datos["preguntas"] = [
            {
                "slug": p.slug,
                "texto": p.texto,
                "corto": p.corto,
                "opciones": [
                    {"valor": o.valor, "etiqueta": o.etiqueta, "opinion": o.opinion} for o in p.opciones.all()
                ],
            }
            for p in area.preguntas.prefetch_related("opciones")
        ]
    return datos


@require_GET
def consulta_info(request):
    return JsonResponse(settings.POZMVM_CONSULTA)


@require_GET
def financiamiento(request):
    """Sources, destinations, profiles and per-profile effects for the ¿Quién paga? section."""
    return JsonResponse(settings.POZMVM_FINANCIAMIENTO)


@require_GET
def areas(request):
    return JsonResponse({"areas": [_area(a, detalle=False) for a in Area.objects.all()]})


@require_GET
def area_detalle(request, slug):
    try:
        area = Area.objects.get(slug=slug)
    except Area.DoesNotExist:
        return JsonResponse({"error": "no existe"}, status=404)
    return JsonResponse(_area(area, detalle=True))


@csrf_exempt
@require_http_methods(["POST"])
def opinion(request):
    """Draft the letter. Nothing is stored here: the answers reach the aggregate through `respuesta`."""
    try:
        cuerpo = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido"}, status=400)
    elecciones = cuerpo.get("elecciones") or {}
    comentarios = cuerpo.get("comentarios") or {}
    municipio = (cuerpo.get("municipio") or "")[:120]
    firma_in = cuerpo.get("firma") or {}
    firma = {k: str(firma_in.get(k) or "")[:120] for k in ("nombre", "colonia", "estado")} if isinstance(firma_in, dict) else {}
    if not isinstance(elecciones, dict) or not isinstance(comentarios, dict):
        return JsonResponse({"error": "formato"}, status=400)
    elecciones = {str(k)[:80]: str(v)[:80] for k, v in elecciones.items()}
    comentarios = {str(k)[:80]: str(v)[:1500] for k, v in comentarios.items()}

    borrador = componer(elecciones, comentarios, municipio, firma)
    return JsonResponse({**borrador, "consulta": settings.POZMVM_CONSULTA})


VISITANTE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


@csrf_exempt
@require_http_methods(["POST"])
def respuesta(request):
    """Store one browser's current answers for the aggregate, replacing what it sent before.

    The site calls this as the answers change. It never receives the name or
    the colonia of the signature, only the municipality; no answers left
    removes the browser's row.
    """
    try:
        cuerpo = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido"}, status=400)
    visitante = str(cuerpo.get("visitante") or "").lower()
    elecciones = cuerpo.get("elecciones") or {}
    comentarios = cuerpo.get("comentarios") or {}
    if not VISITANTE.match(visitante) or not isinstance(elecciones, dict) or not isinstance(comentarios, dict):
        return JsonResponse({"error": "formato"}, status=400)
    elecciones = {str(k)[:80]: str(v)[:80] for k, v in elecciones.items()}
    comentarios = {str(k)[:80]: str(v)[:1500] for k, v in comentarios.items() if str(v).strip()}
    municipio = str(cuerpo.get("municipio") or "")[:120]

    if not elecciones and not comentarios:
        Respuesta.objects.filter(visitante=visitante).delete()
        return JsonResponse({"guardado": False})
    Respuesta.objects.update_or_create(
        visitante=visitante,
        defaults={
            "municipio": municipio,
            "elecciones": elecciones,
            "comentarios": comentarios,
            "texto": componer(elecciones, comentarios, municipio)["texto"],
        },
    )
    return JsonResponse({"guardado": True})


@require_GET
def resultados(request):
    """How other citizens answered, per question, so a reader can see they are not alone.

    While the starting sample is on, its numbers are added in and `muestra`
    says how many people it stands for, so the page can say so; `reales` is
    always the count of real answers alone.
    """
    muestra = MuestraInicial.load()
    con_muestra = muestra.activa
    conteo: dict[str, Counter] = {}
    total = 0
    todas = list(Respuesta.objects.values_list("elecciones", flat=True))
    for elecciones in todas:
        total += 1
        for slug, valor in elecciones.items():
            conteo.setdefault(slug, Counter())[valor] += 1
    salida = []
    base_por_pregunta: dict[str, int] = {}
    for p in Pregunta.objects.select_related("area").prefetch_related("opciones"):
        c = conteo.get(p.slug, Counter())
        opciones = [
            {"valor": o.valor, "etiqueta": o.etiqueta, "n": c.get(o.valor, 0) + (o.base if con_muestra else 0)}
            for o in p.opciones.all()
        ]
        base_por_pregunta[p.slug] = sum(o.base for o in p.opciones.all()) if con_muestra else 0
        salida.append({"pregunta": p.slug, "texto": p.texto, "area": p.area.slug, "total": sum(o["n"] for o in opciones), "opciones": opciones})
    areas = []
    for area in Area.objects.prefetch_related("preguntas"):
        slugs = set(area.preguntas.values_list("slug", flat=True))
        # "No sé" answers say the person has no opinion on the topic, so they are left out of its participants.
        participantes = sum(1 for e in todas if any(k in slugs and v != NO_SE for k, v in e.items()))
        # The sample's people for a topic: as many as answered its most-answered question.
        participantes += max((base_por_pregunta.get(s, 0) for s in slugs), default=0)
        areas.append({"slug": area.slug, "titulo": area.titulo, "participantes": participantes})
    base = muestra.respuestas if con_muestra else 0
    return JsonResponse({"respuestas": total + base, "reales": total, "muestra": base, "areas": areas, "preguntas": salida})
