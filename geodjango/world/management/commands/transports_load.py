from django.core.management.base import BaseCommand
from world.models.official_transports.cablebus_lines import CablebusLine
from world.models.official_transports.cablebus_stations import CablebusStation
from world.models.official_transports.interurbano_lines import InterurbanoLine
from world.models.official_transports.interurbano_stations import InterurbanoStation
from world.models.official_transports.concesionados_lines import ConcesionadosLine
from world.models.official_transports.concesionados_stations import ConcesionadosStation
from world.models.official_transports.metrobus_lines import MetrobusLine
from world.models.official_transports.metrobus_stations import MetrobusStation
from world.models.official_transports.rtp_lines import RTPLine
from world.models.official_transports.rtp_stations import RTPStation
from world.models.official_transports.metro_lines import MetroLine
from world.models.official_transports.metro_stations import MetroStation
from world.models.official_transports.suburbano_lines import SuburbanoLine
from world.models.official_transports.suburbano_stations import SuburbanoStation
from world.models.official_transports.tren_ligero_lines import TrenLigeroLine
from world.models.official_transports.tren_ligero_stations import TrenLigeroStation
from world.models.official_transports.trolebus_lines import TrolebusLine
from world.models.official_transports.trolebus_stations import TrolebusStation
from world.models.official_transports.mexicable_stations import MexicableStation
from world.models.official_transports.mexicable_lines import MexicableLine
from world.models.official_transports.metadata import LineMetadata, StationMetadata
from world.models.official_transports.mexibus_stations import MexibusStation
from world.models.official_transports.mexibus_lines import MexibusLine
from world.models.official_transports.ecobici_stations import EcobiciStation
import os

class Command(BaseCommand):
    help = 'Loads transport data from GeoJSON files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--data-dir',
            type=str,
            help='Directory containing the GeoJSON files',
            default='data/transports'
        )

    def load_cablebus_data(self, data_dir):
        # Load Cablebús lines
        cablebus_lines_path = os.path.join(data_dir, 'cablebus/lines.geojson')
        if os.path.exists(cablebus_lines_path):
            CablebusLine.objects.all().delete()
            count = CablebusLine.load_from_geojson(cablebus_lines_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Cablebús lines'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {cablebus_lines_path}'))

        # Load Cablebús stations
        cablebus_stations_path = os.path.join(data_dir, 'cablebus/stations.geojson')
        if os.path.exists(cablebus_stations_path):
            CablebusStation.objects.all().delete()
            count = CablebusStation.load_from_geojson(cablebus_stations_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Cablebús stations'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {cablebus_stations_path}'))

    def load_interurbano_data(self, data_dir):
        # Load Interurbano lines
        interurbano_lines_path = os.path.join(data_dir, 'interurbano/lines.geojson')
        if os.path.exists(interurbano_lines_path):
            InterurbanoLine.objects.all().delete()
            count = InterurbanoLine.load_from_geojson(interurbano_lines_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Interurbano lines'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {interurbano_lines_path}'))

        # Load Interurbano stations
        interurbano_stations_path = os.path.join(data_dir, 'interurbano/stations.geojson')
        if os.path.exists(interurbano_stations_path):
            InterurbanoStation.objects.all().delete()
            count = InterurbanoStation.load_from_geojson(interurbano_stations_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Interurbano stations'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {interurbano_stations_path}'))

    def load_concesionados_data(self, data_dir):
        # Load Concesionados lines
        concesionados_lines_path = os.path.join(data_dir, 'concesionados/lines.geojson')
        if os.path.exists(concesionados_lines_path):
            ConcesionadosLine.objects.all().delete()
            count = ConcesionadosLine.load_from_geojson(concesionados_lines_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Concesionados lines'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {concesionados_lines_path}'))

        # Load Concesionados stations
        concesionados_stations_path = os.path.join(data_dir, 'concesionados/stations.geojson')
        if os.path.exists(concesionados_stations_path):
            ConcesionadosStation.objects.all().delete()
            count = ConcesionadosStation.load_from_geojson(concesionados_stations_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Concesionados stations'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {concesionados_stations_path}'))

    def load_metrobus_data(self, data_dir):
        # Load Metrobus lines
        metrobus_lines_path = os.path.join(data_dir, 'metrobus/lines.geojson')
        if os.path.exists(metrobus_lines_path):
            MetrobusLine.objects.all().delete()
            count = MetrobusLine.load_from_geojson(metrobus_lines_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Metrobus lines'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {metrobus_lines_path}'))

        # Load Metrobus stations
        metrobus_stations_path = os.path.join(data_dir, 'metrobus/stations.geojson')
        if os.path.exists(metrobus_stations_path):
            MetrobusStation.objects.all().delete()
            count = MetrobusStation.load_from_geojson(metrobus_stations_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Metrobus stations'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {metrobus_stations_path}'))

    def load_rtp_data(self, data_dir):
        # Load RTP lines
        rtp_lines_path = os.path.join(data_dir, 'rtp/lines.geojson')
        if os.path.exists(rtp_lines_path):
            RTPLine.objects.all().delete()
            count = RTPLine.load_from_geojson(rtp_lines_path)   
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} RTP lines'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {rtp_lines_path}'))

        # Load RTP stations
        rtp_stations_path = os.path.join(data_dir, 'rtp/stations.geojson')
        if os.path.exists(rtp_stations_path):
            RTPStation.objects.all().delete()
            count = RTPStation.load_from_geojson(rtp_stations_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} RTP stations'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {rtp_stations_path}'))

    def load_metro_data(self, data_dir):
        # Load Metro lines
        metro_lines_path = os.path.join(data_dir, 'metro/lines.geojson')
        if os.path.exists(metro_lines_path):
            MetroLine.objects.all().delete()
            count = MetroLine.load_from_geojson(metro_lines_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Metro lines'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {metro_lines_path}'))

        # Load Metro stations
        metro_stations_path = os.path.join(data_dir, 'metro/stations.geojson')  
        if os.path.exists(metro_stations_path):
            MetroStation.objects.all().delete()
            count = MetroStation.load_from_geojson(metro_stations_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Metro stations'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {metro_stations_path}'))
    
    def load_suburbano_data(self, data_dir):
        # Load Suburbano lines
        suburbano_lines_path = os.path.join(data_dir, 'suburbano/lines.geojson')
        if os.path.exists(suburbano_lines_path):
            SuburbanoLine.objects.all().delete()
            count = SuburbanoLine.load_from_geojson(suburbano_lines_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Suburbano lines'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {suburbano_lines_path}'))

        # Load Suburbano stations
        suburbano_stations_path = os.path.join(data_dir, 'suburbano/stations.geojson')
        if os.path.exists(suburbano_stations_path):
            SuburbanoStation.objects.all().delete()
            count = SuburbanoStation.load_from_geojson(suburbano_stations_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Suburbano stations'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {suburbano_stations_path}'))

    def load_tren_ligero_data(self, data_dir):
        # Load Tren Ligero lines
        tren_ligero_lines_path = os.path.join(data_dir, 'tren_ligero/lines.geojson')
        if os.path.exists(tren_ligero_lines_path):
            TrenLigeroLine.objects.all().delete()
            count = TrenLigeroLine.load_from_geojson(tren_ligero_lines_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Tren Ligero lines'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {tren_ligero_lines_path}'))

        # Load Tren Ligero stations
        tren_ligero_stations_path = os.path.join(data_dir, 'tren_ligero/stations.geojson')
        if os.path.exists(tren_ligero_stations_path):
            TrenLigeroStation.objects.all().delete()
            count = TrenLigeroStation.load_from_geojson(tren_ligero_stations_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Tren Ligero stations'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {tren_ligero_stations_path}'))
    
    def load_trolebus_data(self, data_dir):
        # Load Trolebús lines
        trolebus_lines_path = os.path.join(data_dir, 'trolebus/lines.geojson')
        if os.path.exists(trolebus_lines_path):
            TrolebusLine.objects.all().delete()
            count = TrolebusLine.load_from_geojson(trolebus_lines_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Trolebús lines'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {trolebus_lines_path}'))

        # Load Trolebús stations
        trolebus_stations_path = os.path.join(data_dir, 'trolebus/stations.geojson')
        if os.path.exists(trolebus_stations_path):
            TrolebusStation.objects.all().delete()
            count = TrolebusStation.load_from_geojson(trolebus_stations_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Trolebús stations'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {trolebus_stations_path}'))

    def load_mexicable_data(self, data_dir):
        # Load Mexicable lines
        mexicable_lines_path = os.path.join(data_dir, 'mexicable/lines.geojson')
        if os.path.exists(mexicable_lines_path):
            MexicableLine.objects.all().delete()
            count = MexicableLine.load_from_geojson(mexicable_lines_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Mexicable lines'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {mexicable_lines_path}'))

        # Load Mexicable stations
        mexicable_stations_path = os.path.join(data_dir, 'mexicable/stations.geojson')
        if os.path.exists(mexicable_stations_path):
            MexicableStation.objects.all().delete()
            count = MexicableStation.load_from_geojson(mexicable_stations_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Mexicable stations'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {mexicable_stations_path}'))

    def load_mexibus_data(self, data_dir):
        # Load Mexibús lines
        mexibus_lines_path = os.path.join(data_dir, 'mexibus/lines.geojson')
        if os.path.exists(mexibus_lines_path):
            MexibusLine.objects.all().delete()
            count = MexibusLine.load_from_geojson(mexibus_lines_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Mexibús lines'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {mexibus_lines_path}'))

        # Load Mexibús stations
        mexibus_stations_path = os.path.join(data_dir, 'mexibus/stations.geojson')
        if os.path.exists(mexibus_stations_path):
            MexibusStation.objects.all().delete()
            count = MexibusStation.load_from_geojson(mexibus_stations_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Mexibús stations'))
        else:
            self.stdout.write(self.style.WARNING(f'File not found: {mexibus_stations_path}'))

    def load_ecobici_data(self, data_dir): 
        # Load Ecobici stations
        ecobici_stations_path = os.path.join(data_dir, 'ecobici/stations.geojson')
        if os.path.exists(ecobici_stations_path):
            EcobiciStation.objects.all().delete()
            count = EcobiciStation.load_from_geojson(ecobici_stations_path)
            self.stdout.write(self.style.SUCCESS(f'Loaded {count} Ecobici stations'))
        else:
            self.stdout.write(self.style.WARNING('Ecobici stations file not found')) 

    def handle(self, *args, **options):
        data_dir = options['data_dir']
        
        LineMetadata.objects.all().delete()
        StationMetadata.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('Deleted all metadata records'))
        
        self.load_cablebus_data(data_dir)
        self.load_interurbano_data(data_dir)
        self.load_concesionados_data(data_dir)
        self.load_metrobus_data(data_dir)
        self.load_rtp_data(data_dir)
        self.load_metro_data(data_dir)
        self.load_suburbano_data(data_dir)
        self.load_tren_ligero_data(data_dir)
        self.load_trolebus_data(data_dir)
        self.load_mexicable_data(data_dir)
        self.load_mexibus_data(data_dir)
        self.load_ecobici_data(data_dir)

        self.stdout.write(self.style.SUCCESS('Successfully loaded all transport data'))