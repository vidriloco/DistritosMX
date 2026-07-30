import csv
from datetime import datetime
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.db import transaction
from world.models import AirbnbListing

# python3 manage.py import_airbnb_listings data/airbnbs/cdmx.csv 
class Command(BaseCommand):
    help = 'Import Airbnb listings from CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file')

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        
        self.stdout.write(f'Starting import from {csv_file}...')
        
        # Counter for progress reporting
        processed = 0
        created = 0
        updated = 0
        errors = 0
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                # Process in batches for better performance
                batch_size = 1000
                batch = []
                
                for row in reader:
                    try:
                        # Clean and prepare the data
                        listing_data = {
                            'id': int(row['id']) if row['id'] else None,
                            'name': row['name'],
                            'host_id': int(row['host_id']) if row['host_id'] else None,
                            'host_name': row['host_name'] or None,
                            'neighbourhood_group': row['neighbourhood_group'] or None,
                            'neighbourhood': row['neighbourhood'],
                            'room_type': row['room_type'],
                            'price': float(row['price']) if row['price'] else None,
                            'minimum_nights': int(row['minimum_nights']) if row['minimum_nights'] else None,
                            'number_of_reviews': int(row['number_of_reviews']) if row['number_of_reviews'] else 0,
                            'reviews_per_month': float(row['reviews_per_month']) if row['reviews_per_month'] else None,
                            'calculated_host_listings_count': int(row['calculated_host_listings_count']) if row['calculated_host_listings_count'] else 1,
                            'availability_365': int(row['availability_365']) if row['availability_365'] else None,
                            'number_of_reviews_ltm': int(row['number_of_reviews_ltm']) if row['number_of_reviews_ltm'] else 0,
                            'license': row['license'] or None,
                        }

                        # Handle the date field
                        if row.get('last_review'):
                            try:
                                listing_data['last_review'] = datetime.strptime(row['last_review'], '%Y-%m-%d').date()
                            except ValueError:
                                listing_data['last_review'] = None
                        
                        # Create Point object from coordinates
                        if row['latitude'] and row['longitude']:
                            listing_data['location'] = Point(
                                float(row['longitude']),
                                float(row['latitude'])
                            )
                        
                        # Update or create the listing
                        listing, was_created = AirbnbListing.objects.update_or_create(
                            id=listing_data['id'],
                            defaults=listing_data
                        )
                        
                        if was_created:
                            created += 1
                        else:
                            updated += 1
                            
                        processed += 1
                        
                        # Progress reporting
                        if processed % 1000 == 0:
                            self.stdout.write(f'Processed {processed} listings...')
                            
                    except Exception as e:
                        errors += 1
                        self.stdout.write(
                            self.style.ERROR(
                                f'Error processing listing {row.get("id", "unknown")}: {str(e)}'
                            )
                        )
                        continue

            # Final statistics
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nImport completed!\n'
                    f'Total processed: {processed}\n'
                    f'Created: {created}\n'
                    f'Updated: {updated}\n'
                    f'Errors: {errors}'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to import data: {str(e)}')
            ) 