"""Load (or refresh) the areas, questions and options from consulta/content/pozmvm.json."""

import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from consulta.models import Area, Opcion, Pregunta

CONTENT = Path(__file__).resolve().parents[2] / "content" / "pozmvm.json"


class Command(BaseCommand):
    help = "Carga el contenido del POZMVM (áreas, preguntas y opciones) desde el JSON."

    @transaction.atomic
    def handle(self, *args, **options):
        datos = json.loads(CONTENT.read_text())
        vistos = []
        for a in datos["areas"]:
            area, _ = Area.objects.update_or_create(
                slug=a["slug"],
                defaults={
                    "orden": a["orden"],
                    "titulo": a["titulo"],
                    "icono": a.get("icono", ""),
                    "resumen": a["resumen"],
                    "diagnostico": a.get("diagnostico", []),
                    "propuestas": a.get("propuestas", []),
                },
            )
            vistos.append(area.slug)
            for i, p in enumerate(a["preguntas"]):
                pregunta, _ = Pregunta.objects.update_or_create(
                    slug=p["slug"], defaults={"area": area, "orden": i, "texto": p["texto"], "corto": p.get("corto", "")}
                )
                valores = []
                for j, o in enumerate(p["opciones"]):
                    Opcion.objects.update_or_create(
                        pregunta=pregunta,
                        valor=o["valor"],
                        defaults={"orden": j, "etiqueta": o["etiqueta"], "opinion": o["opinion"]},
                    )
                    valores.append(o["valor"])
                pregunta.opciones.exclude(valor__in=valores).delete()
            area.preguntas.exclude(slug__in=[p["slug"] for p in a["preguntas"]]).delete()
        Area.objects.exclude(slug__in=vistos).delete()
        self.stdout.write(self.style.SUCCESS(f"{len(vistos)} áreas, {Pregunta.objects.count()} preguntas, {Opcion.objects.count()} opciones"))
