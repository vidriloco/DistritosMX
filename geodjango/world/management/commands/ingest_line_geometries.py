import csv
from django.core.management.base import BaseCommand
from world.models import Line
import json
from django.contrib.gis.geos import GEOSGeometry
from django.utils import timezone
from django.contrib.auth.models import User

class LineData:
    def __init__(self, identifier, route, geom, operative_status, system, updated_at, user_id):
        self.identifier = identifier
        self.route = route
        self.geom = geom
        self.operative_status = operative_status
        self.system = system
        self.updated_at = updated_at
        self.user_id = user_id

    def add_geometry(self, additional_geom):
        self.geom.append(additional_geom)

class Command(BaseCommand):
    help = 'Import metrobus lines'

    def handle(self, *args, **kwargs):
        with open(f'./data/lines/lineas-metrobus.geojson') as f:
            data = json.load(f)

            lines = {}

            for feature in data['features']:
                geometry = feature['geometry']
                properties = feature['properties']
                
                linea_id = properties.get('LINEA')
                
                if linea_id is not None and linea_id.isdigit():
                    linea_id = int(linea_id)
                    
                    if linea_id in lines:
                        lines[linea_id].add_geometry(geometry["coordinates"][0])
                    else:
                        lines[linea_id] = LineData(
                            identifier=linea_id,
                            route=properties.get('RUTA'),
                            geom=[geometry["coordinates"][0]],
                            operative_status=Line.OperativeStatus.OPEN,
                            system=Line.System.METROBUS,
                            updated_at=timezone.now(),
                            user_id=User.objects.get(username='vidriloco').id
                        )
            
            for line_id, line in lines.items():
                Line.objects.create(
                    identifier=f"{line.identifier}",
                    route=line.route,
                    geom=GEOSGeometry(json.dumps({
                        "type": "MultiLineString",
                        "coordinates": line.geom
                    })),
                    operative_status=Line.OperativeStatus.OPEN,
                    system=Line.System.METROBUS,
                    updated_at=timezone.now(),
                    user_id=User.objects.get(username='vidriloco').id
                )
