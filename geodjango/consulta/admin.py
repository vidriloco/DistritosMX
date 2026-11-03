from django.contrib import admin

from .models import Area, MuestraInicial, Opcion, Pregunta, Respuesta


class OpcionInline(admin.TabularInline):
    model = Opcion
    extra = 0


@admin.register(Pregunta)
class PreguntaAdmin(admin.ModelAdmin):
    list_display = ("texto", "area", "orden")
    list_filter = ("area",)
    inlines = [OpcionInline]


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ("orden", "titulo", "slug")
    ordering = ("orden",)


@admin.register(Respuesta)
class RespuestaAdmin(admin.ModelAdmin):
    list_display = ("id", "creado", "actualizado", "municipio")
    readonly_fields = ("creado", "actualizado", "visitante")


@admin.register(MuestraInicial)
class MuestraInicialAdmin(admin.ModelAdmin):
    list_display = ("__str__", "updated_at", "updated_by")
