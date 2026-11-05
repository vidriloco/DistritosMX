"""Compose the opinion text a citizen can send to the consultation from their answers."""

from __future__ import annotations

from .models import NO_SE, Area, Opcion

def componer(elecciones: dict, comentarios: dict, municipio: str = "", firma: dict | None = None) -> dict:
    """Return the drafted letter and the per-area pieces it was built from."""
    opciones = {
        (o.pregunta.slug, o.valor): o
        for o in Opcion.objects.select_related("pregunta", "pregunta__area").filter(
            pregunta__slug__in=list(elecciones.keys())
        )
    }
    por_area: dict[str, dict] = {}
    for area in Area.objects.prefetch_related("preguntas"):
        frases = []
        for pregunta in area.preguntas.all():
            valor = elecciones.get(pregunta.slug)
            if not valor or valor == NO_SE:
                continue
            opcion = opciones.get((pregunta.slug, valor))
            if opcion:
                frases.append(opcion.opinion)
        libre = (comentarios.get(area.slug) or "").strip()
        if frases or libre:
            por_area[area.slug] = {"titulo": area.titulo, "frases": frases, "libre": libre}

    firma = {k: (v or "").strip() for k, v in (firma or {}).items()}
    colonia, estado, nombre = firma.get("colonia", ""), firma.get("estado", ""), firma.get("nombre", "")
    donde = ", ".join(x for x in (colonia, municipio.strip()) if x)
    lugar = f", como vecino/a de {donde}," if donde else ""
    partes = [
        "Asunto: Opinión ciudadana sobre el proyecto de POZMVM en consulta pública",
        "",
        "A quien corresponda en la SEDATU:",
        "",
        f"Por este medio{lugar} presento mi opinión sobre el proyecto del Programa de Ordenación de la Zona "
        "Metropolitana del Valle de México (POZMVM), con base en el documento puesto a consulta. Las páginas "
        "citadas corresponden a esa versión.",
        "",
    ]
    for datos in por_area.values():
        partes.append(f"{datos['titulo']}:")
        for frase in datos["frases"]:
            partes.append(f"- {frase}")
        if datos["libre"]:
            partes.append(f"- {datos['libre']}")
        partes.append("")
    if not por_area:
        partes.append("(Aún no has elegido ninguna respuesta. Vuelve a las áreas y elige al menos una opción.)")
        partes.append("")
    partes += [
        "Solicito que estas observaciones sean consideradas e incorporadas en la versión final del programa, "
        "y que se publique la respuesta que se dé a cada una.",
        "",
        "Atentamente,",
        nombre or "[Tu nombre]",
    ]
    direccion = ", ".join(x for x in (colonia, municipio.strip(), estado) if x)
    if direccion:
        partes.append(direccion)
    return {"texto": "\n".join(partes), "areas": por_area}
