import geojson
import json
from django.core.management import BaseCommand
from django.contrib.gis.geos import Point, Polygon, GEOSGeometry

# Import the models 
from world.models import GeoZone, Neighbourhood

class Command(BaseCommand):
    # Show this when the user types help
    help = "Loads geographic area data from various sources based on area type"

    def add_arguments(self, parser):
        parser.add_argument(
            '--area-type',
            type=str,
            choices=['ageb', 'neighbourhood', 'municipality'],
            required=True,
            help='Type of geographic area to import: ageb, neighbourhood, or municipality'
        )
        parser.add_argument(
            '--input-file',
            type=str,
            help='Path to the input GeoJSON file (required for neighbourhood imports)'
        )
        parser.add_argument(
            '--restore',
            action='store_true',
            help='Restore neighbourhood data from a JSON backup file (vecindarios.json format)'
        )
        parser.add_argument(
            '--restore-file',
            type=str,
            default='./data/vecindarios.json',
            help='Path to the restore JSON file (default: ./data/vecindarios.json)'
        )

    def handle(self, *args, **options):
        area_type = options['area_type']
        
        # Check if restore flag is set
        if options.get('restore'):
            if area_type == 'neighbourhood':
                self.restore_neighbourhoods(options.get('restore_file'))
            else:
                self.stdout.write(
                    self.style.ERROR('--restore flag is only supported for neighbourhood area type')
                )
            return
        
        if area_type == 'ageb':
            self.import_agebs()
        elif area_type == 'neighbourhood':
            self.import_neighbourhoods(options.get('input_file'))
        elif area_type == 'municipality':
            self.import_municipalities()
        else:
            self.stdout.write(
                self.style.ERROR(f'Unknown area type: {area_type}')
            )

    def import_agebs(self):
        """Import AGEB (Área Geoestadística Básica) data"""
        print("Remove existing geo zones data")
        GeoZone.objects.all().delete()
            
        # Show this before loading the data into the database
        print("Ingesting GeoZone data")

        for area in ["cdmx", "edomex"]:
            print(f"Processing {area}")
            
            with open(f'./data/agebs/{area}.geojson') as f:
                gj = geojson.load(f)
                features = gj['features']

                index = 0

                for feature in features:
                    index += 1
                    CVEGEO = feature['properties']['CVEGEO']
                    CVE_ENT = feature['properties']['CVE_ENT']
                    CVE_MUN = feature['properties']['CVE_MUN']
                    CVE_LOC = feature['properties']['CVE_LOC']
                    CVE_AGEB = feature['properties']['CVE_AGEB']

                    geometry = feature['geometry']['coordinates']

                    print(feature['geometry']['coordinates'])

                    try:
                        geom = Polygon(geometry[0][0])
                        
                        # Check if the geometry is valid
                        if not geom.valid:
                            print(f"Warning: Invalid geometry for feature {index} (CVEGEO: {CVEGEO}), skipping...")
                            continue
                            
                    except Exception as e:
                        print(f"Warning: Could not create geometry for feature {index} (CVEGEO: {CVEGEO}): {e}")
                        continue
                    
                    geo_zone = GeoZone(
                        CVEGEO=CVEGEO,
                        CVE_ENT=CVE_ENT,
                        CVE_MUN=CVE_MUN,
                        CVE_LOC=CVE_LOC,
                        CVE_AGEB=CVE_AGEB,
                        geometry=geom
                    )
                    geo_zone.save()
                    print(f"Processed zone: {index}")

    def import_neighbourhoods(self, input_file=None):
        """Import neighbourhood (colonia) data"""
        if not input_file:
            self.stdout.write(
                self.style.ERROR('--input-file is required for neighbourhood imports')
            )
            return
        
        print("Remove existing neighbourhood data")
        Neighbourhood.objects.all().delete()
            
        print("Ingesting Neighbourhood data")

        with open(input_file) as f:
            gj = geojson.load(f)
            features = gj['features']

            index = 0

            for feature in features:
                index += 1
                properties = feature['properties']
                
                # Extract municipality information
                municipality_code = properties['mun_code'][0] if properties['mun_code'] else ''
                municipality_name = properties['mun_name'][0] if properties['mun_name'] else ''
                
                # Extract neighbourhood information
                neighbourhood_code = properties['col_code'][0] if properties['col_code'] else ''
                neighbourhood_name = properties['col_name'][0] if properties['col_name'] else ''
                
                # Extract geometry
                geometry = feature['geometry']['coordinates']
                
                try:
                    geom = Polygon(geometry[0])
                    
                    # Check if the geometry is valid
                    if not geom.valid:
                        print(f"Warning: Invalid geometry for neighbourhood {index} ({neighbourhood_name}), skipping...")
                        continue
                        
                except Exception as e:
                    print(f"Warning: Could not create geometry for neighbourhood {index} ({neighbourhood_name}): {e}")
                    continue
                
                neighbourhood = Neighbourhood(
                    municipality_code=municipality_code,
                    municipality_name=municipality_name,
                    neighbourhood_code=neighbourhood_code,
                    neighbourhood_name=neighbourhood_name,
                    geometry=geom
                )
                neighbourhood.save()
                print(f"Processed neighbourhood: {index} - {neighbourhood_name}")

    def import_municipalities(self):
        """Import municipality data - placeholder for future implementation"""
        print("Municipality import not yet implemented")
        self.stdout.write(
            self.style.WARNING('Municipality import functionality is not yet implemented')
        )

    def restore_neighbourhoods(self, restore_file=None):
        """Restore neighbourhood data from a JSON backup file (vecindarios.json format)"""
        if not restore_file:
            restore_file = './data/vecindarios.json'
        
        self.stdout.write(f"Restoring neighbourhood data from {restore_file}")
        
        try:
            with open(restore_file, 'r') as f:
                data = json.load(f)
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(f'Restore file not found: {restore_file}')
            )
            return
        except json.JSONDecodeError as e:
            self.stdout.write(
                self.style.ERROR(f'Invalid JSON file: {e}')
            )
            return
        
        # Handle both GeoJSON FeatureCollection and array of features
        if isinstance(data, dict) and 'features' in data:
            features = data['features']
        elif isinstance(data, list):
            features = data
        else:
            self.stdout.write(
                self.style.ERROR('Invalid JSON format: expected GeoJSON FeatureCollection or array of features')
            )
            return
        
        self.stdout.write(f"Found {len(features)} neighbourhood features to restore")
        
        # Clear existing data
        self.stdout.write("Removing existing neighbourhood data")
        Neighbourhood.objects.all().delete()
        
        index = 0
        errors = 0
        
        for feature in features:
            index += 1
            try:
                properties = feature.get('properties', {})
                geometry_data = feature.get('geometry', {})
                
                # Extract geometry
                if geometry_data.get('type') == 'Polygon':
                    geom = GEOSGeometry(json.dumps(geometry_data))
                else:
                    self.stdout.write(
                        self.style.WARNING(f'Feature {index}: Unsupported geometry type {geometry_data.get("type")}, skipping...')
                    )
                    errors += 1
                    continue
                
                # Check if geometry is valid
                if not geom.valid:
                    self.stdout.write(
                        self.style.WARNING(f'Feature {index}: Invalid geometry, skipping...')
                    )
                    errors += 1
                    continue
                
                # Extract basic neighbourhood information
                municipality_code = properties.get('municipality_code', '')
                municipality_name = properties.get('municipality_name', '')
                neighbourhood_code = properties.get('neighbourhood_code', '')
                neighbourhood_name = properties.get('neighbourhood_name', '')
                
                # Create neighbourhood object with all fields
                neighbourhood = Neighbourhood(
                    municipality_code=municipality_code,
                    municipality_name=municipality_name,
                    neighbourhood_code=neighbourhood_code,
                    neighbourhood_name=neighbourhood_name,
                    geometry=geom,
                    # Basic fields
                    population=properties.get('population', 0) or 0,
                    housing=properties.get('housing'),
                    # Education
                    education=properties.get('education'),
                    education_list=properties.get('education_list', []),
                    # Health
                    health=properties.get('health'),
                    health_list=properties.get('health_list', []),
                    # Leisure
                    leisure=properties.get('leisure'),
                    leisure_list=properties.get('leisure_list', []),
                    # Provision
                    provision=properties.get('provision'),
                    provision_list=properties.get('provision_list', []),
                    # Companies
                    companies=properties.get('companies'),
                    companies_list=properties.get('companies_list', []),
                    # Jobs
                    jobs=properties.get('jobs'),
                    jobs_list=properties.get('jobs_list', []),
                    # Thefts
                    thefts_2024=properties.get('thefts_2024'),
                    thefts_2024_list=properties.get('thefts_2024_list', []),
                    thefts_2023=properties.get('thefts_2023'),
                    thefts_2023_list=properties.get('thefts_2023_list', []),
                    thefts_2022=properties.get('thefts_2022'),
                    thefts_2022_list=properties.get('thefts_2022_list', []),
                    thefts_2021=properties.get('thefts_2021'),
                    thefts_2021_list=properties.get('thefts_2021_list', []),
                    thefts_2020=properties.get('thefts_2020'),
                    thefts_2020_list=properties.get('thefts_2020_list', []),
                    thefts_2019=properties.get('thefts_2019'),
                    thefts_2019_list=properties.get('thefts_2019_list', []),
                    thefts_2018=properties.get('thefts_2018'),
                    thefts_2018_list=properties.get('thefts_2018_list', []),
                    thefts_2017=properties.get('thefts_2017'),
                    thefts_2017_list=properties.get('thefts_2017_list', []),
                    # Sexual assault
                    sexual_assault_2024=properties.get('sexual_assault_2024'),
                    sexual_assault_2024_list=properties.get('sexual_assault_2024_list', []),
                    sexual_assault_2023=properties.get('sexual_assault_2023'),
                    sexual_assault_2023_list=properties.get('sexual_assault_2023_list', []),
                    sexual_assault_2022=properties.get('sexual_assault_2022'),
                    sexual_assault_2022_list=properties.get('sexual_assault_2022_list', []),
                    sexual_assault_2021=properties.get('sexual_assault_2021'),
                    sexual_assault_2021_list=properties.get('sexual_assault_2021_list', []),
                    sexual_assault_2020=properties.get('sexual_assault_2020'),
                    sexual_assault_2020_list=properties.get('sexual_assault_2020_list', []),
                    sexual_assault_2019=properties.get('sexual_assault_2019'),
                    sexual_assault_2019_list=properties.get('sexual_assault_2019_list', []),
                    sexual_assault_2018=properties.get('sexual_assault_2018'),
                    sexual_assault_2018_list=properties.get('sexual_assault_2018_list', []),
                    sexual_assault_2017=properties.get('sexual_assault_2017'),
                    sexual_assault_2017_list=properties.get('sexual_assault_2017_list', []),
                    # House thefts
                    house_thefts_2024=properties.get('house_thefts_2024'),
                    house_thefts_2024_list=properties.get('house_thefts_2024_list', []),
                    house_thefts_2023=properties.get('house_thefts_2023'),
                    house_thefts_2023_list=properties.get('house_thefts_2023_list', []),
                    house_thefts_2022=properties.get('house_thefts_2022'),
                    house_thefts_2022_list=properties.get('house_thefts_2022_list', []),
                    house_thefts_2021=properties.get('house_thefts_2021'),
                    house_thefts_2021_list=properties.get('house_thefts_2021_list', []),
                    house_thefts_2020=properties.get('house_thefts_2020'),
                    house_thefts_2020_list=properties.get('house_thefts_2020_list', []),
                    house_thefts_2019=properties.get('house_thefts_2019'),
                    house_thefts_2019_list=properties.get('house_thefts_2019_list', []),
                    house_thefts_2018=properties.get('house_thefts_2018'),
                    house_thefts_2018_list=properties.get('house_thefts_2018_list', []),
                    house_thefts_2017=properties.get('house_thefts_2017'),
                    house_thefts_2017_list=properties.get('house_thefts_2017_list', []),
                    # Business thefts
                    business_thefts_2024=properties.get('business_thefts_2024'),
                    business_thefts_2024_list=properties.get('business_thefts_2024_list', []),
                    business_thefts_2023=properties.get('business_thefts_2023'),
                    business_thefts_2023_list=properties.get('business_thefts_2023_list', []),
                    business_thefts_2022=properties.get('business_thefts_2022'),
                    business_thefts_2022_list=properties.get('business_thefts_2022_list', []),
                    business_thefts_2021=properties.get('business_thefts_2021'),
                    business_thefts_2021_list=properties.get('business_thefts_2021_list', []),
                    business_thefts_2020=properties.get('business_thefts_2020'),
                    business_thefts_2020_list=properties.get('business_thefts_2020_list', []),
                    business_thefts_2019=properties.get('business_thefts_2019'),
                    business_thefts_2019_list=properties.get('business_thefts_2019_list', []),
                    business_thefts_2018=properties.get('business_thefts_2018'),
                    business_thefts_2018_list=properties.get('business_thefts_2018_list', []),
                    business_thefts_2017=properties.get('business_thefts_2017'),
                    business_thefts_2017_list=properties.get('business_thefts_2017_list', []),
                    # Transportation stations
                    metro_stations=properties.get('metro_stations'),
                    metro_stations_list=properties.get('metro_stations_list', []),
                    metrobus_stations=properties.get('metrobus_stations'),
                    metrobus_stations_list=properties.get('metrobus_stations_list', []),
                    rtp_stations=properties.get('rtp_stations'),
                    rtp_stations_list=properties.get('rtp_stations_list', []),
                    concesionados_stations=properties.get('concesionados_stations'),
                    concesionados_stations_list=properties.get('concesionados_stations_list', []),
                    tren_interurbano_stations=properties.get('tren_interurbano_stations'),
                    tren_interurbano_stations_list=properties.get('tren_interurbano_stations_list', []),
                    tren_suburbano_stations=properties.get('tren_suburbano_stations'),
                    tren_suburbano_stations_list=properties.get('tren_suburbano_stations_list', []),
                    mexibus_stations=properties.get('mexibus_stations'),
                    mexibus_stations_list=properties.get('mexibus_stations_list', []),
                    mexicable_stations=properties.get('mexicable_stations'),
                    mexicable_stations_list=properties.get('mexicable_stations_list', []),
                    tren_ligero_stations=properties.get('tren_ligero_stations'),
                    tren_ligero_stations_list=properties.get('tren_ligero_stations_list', []),
                    ecobici_stations=properties.get('ecobici_stations'),
                    ecobici_stations_list=properties.get('ecobici_stations_list', []),
                    cablebus_stations=properties.get('cablebus_stations'),
                    cablebus_stations_list=properties.get('cablebus_stations_list', []),
                    # Airbnb listings
                    airbnb_listings=properties.get('airbnb_listings'),
                    airbnb_listings_list=properties.get('airbnb_listings_list', []),
                    airbnb_listings_price=properties.get('airbnb_listings_price'),
                    airbnb_listings_price_average=properties.get('airbnb_listings_price_average'),
                    airbnb_listings_full_house=properties.get('airbnb_listings_full_house'),
                    airbnb_listings_full_house_list=properties.get('airbnb_listings_full_house_list', []),
                    airbnb_listings_full_house_price=properties.get('airbnb_listings_full_house_price'),
                    airbnb_listings_full_house_price_average=properties.get('airbnb_listings_full_house_price_average'),
                    airbnb_listings_private_room=properties.get('airbnb_listings_private_room'),
                    airbnb_listings_private_room_list=properties.get('airbnb_listings_private_room_list', []),
                    airbnb_listings_private_room_price=properties.get('airbnb_listings_private_room_price'),
                    airbnb_listings_private_room_price_average=properties.get('airbnb_listings_private_room_price_average'),
                    airbnb_listings_shared_room=properties.get('airbnb_listings_shared_room'),
                    airbnb_listings_shared_room_list=properties.get('airbnb_listings_shared_room_list', []),
                    airbnb_listings_shared_room_price=properties.get('airbnb_listings_shared_room_price'),
                    airbnb_listings_shared_room_price_average=properties.get('airbnb_listings_shared_room_price_average'),
                    airbnb_listings_entire_hotel=properties.get('airbnb_listings_entire_hotel'),
                    airbnb_listings_entire_hotel_list=properties.get('airbnb_listings_entire_hotel_list', []),
                    airbnb_listings_entire_hotel_price=properties.get('airbnb_listings_entire_hotel_price'),
                    airbnb_listings_entire_hotel_price_average=properties.get('airbnb_listings_entire_hotel_price_average'),
                )
                
                neighbourhood.save()
                
                if index % 100 == 0:
                    self.stdout.write(f"Processed {index} neighbourhoods...")
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error processing feature {index}: {e}')
                )
                errors += 1
                continue
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Restore completed: {index - errors} neighbourhoods restored, {errors} errors'
            )
        )