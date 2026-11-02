from __future__ import annotations

import json
from collections import Counter

from django.conf import settings
from django.db.models import Count
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Area, Opcion, Pregunta, Respuesta
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
    """Draft the letter. With `guardar: true` the answers are also stored for the aggregate."""
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
    if cuerpo.get("guardar") and elecciones:
        # The aggregate never stores the name or the street-level address: only the municipality.
        anonimo = componer(elecciones, comentarios, municipio)
        Respuesta.objects.create(
            municipio=municipio, elecciones=elecciones, comentarios=comentarios, texto=anonimo["texto"]
        )
    return JsonResponse({**borrador, "consulta": settings.POZMVM_CONSULTA})


@require_GET
def resultados(request):
    """How other citizens answered, per question, so a reader can see they are not alone."""
    conteo: dict[str, Counter] = {}
    total = 0
    todas = list(Respuesta.objects.values_list("elecciones", flat=True))
    for elecciones in todas:
        total += 1
        for slug, valor in elecciones.items():
            conteo.setdefault(slug, Counter())[valor] += 1
    areas = []
    for area in Area.objects.prefetch_related("preguntas"):
        slugs = set(area.preguntas.values_list("slug", flat=True))
        participantes = sum(1 for e in todas if slugs & set(e.keys()))
        areas.append({"slug": area.slug, "titulo": area.titulo, "participantes": participantes})
    salida = []
    for p in Pregunta.objects.select_related("area").prefetch_related("opciones"):
        c = conteo.get(p.slug, Counter())
        salida.append(
            {
                "pregunta": p.slug,
                "texto": p.texto,
                "area": p.area.slug,
                "total": sum(c.values()),
                "opciones": [{"valor": o.valor, "etiqueta": o.etiqueta, "n": c.get(o.valor, 0)} for o in p.opciones.all()],
            }
        )
    return JsonResponse({"respuestas": total, "areas": areas, "preguntas": salida})
