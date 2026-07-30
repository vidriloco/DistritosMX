from django.core.management.base import BaseCommand
from django.db.models import Count
from world.models import PhoneLocation


class Command(BaseCommand):
    help = 'Count unique device_ids in PhoneLocation table'

    def add_arguments(self, parser):
        parser.add_argument(
            '--by-os',
            action='store_true',
            help='Show breakdown by operating system'
        )
        parser.add_argument(
            '--by-country',
            action='store_true',
            help='Show breakdown by country'
        )
        parser.add_argument(
            '--top-devices',
            type=int,
            default=10,
            help='Show top N devices by location count (default: 10)'
        )

    def handle(self, *args, **options):
        # Get total count of records
        total_records = PhoneLocation.objects.count()
        
        # Get unique device count
        unique_devices = PhoneLocation.objects.values('device_id').distinct().count()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nPhoneLocation Statistics:\n'
                f'Total records: {total_records:,}\n'
                f'Unique devices: {unique_devices:,}\n'
                f'Average locations per device: {total_records / unique_devices:.1f}'
            )
        )
        
        # Show breakdown by operating system
        if options['by_os']:
            self.stdout.write('\nBreakdown by Operating System:')
            os_stats = PhoneLocation.objects.values('device_os').annotate(
                device_count=Count('device_id', distinct=True),
                total_locations=Count('id')
            ).order_by('-device_count')
            
            for stat in os_stats:
                os_name = stat['device_os'] or 'Unknown'
                self.stdout.write(
                    f"  {os_name}: {stat['device_count']:,} devices, "
                    f"{stat['total_locations']:,} locations "
                    f"({stat['total_locations'] / stat['device_count']:.1f} avg)"
                )
        
        # Show breakdown by country
        if options['by_country']:
            self.stdout.write('\nBreakdown by Country:')
            country_stats = PhoneLocation.objects.values('country').annotate(
                device_count=Count('device_id', distinct=True),
                total_locations=Count('id')
            ).order_by('-device_count')
            
            for stat in country_stats:
                country = stat['country'] or 'Unknown'
                self.stdout.write(
                    f"  {country}: {stat['device_count']:,} devices, "
                    f"{stat['total_locations']:,} locations "
                    f"({stat['total_locations'] / stat['device_count']:.1f} avg)"
                )
        
        # Show top devices by location count
        if options['top_devices'] > 0:
            self.stdout.write(f'\nTop {options["top_devices"]} Devices by Location Count:')
            top_devices = PhoneLocation.objects.values('device_id', 'device_os', 'country').annotate(
                location_count=Count('id')
            ).order_by('-location_count')[:options['top_devices']]
            
            for i, device in enumerate(top_devices, 1):
                os_name = device['device_os'] or 'Unknown'
                country = device['country'] or 'Unknown'
                self.stdout.write(
                    f"  {i:2d}. {device['device_id'][:20]}... "
                    f"({os_name}, {country}): {device['location_count']:,} locations"
                )
        
        # Show recent activity
        self.stdout.write('\nRecent Activity:')
        recent_devices = PhoneLocation.objects.values('device_id').distinct().order_by('-created_at')[:5]
        for device in recent_devices:
            latest_record = PhoneLocation.objects.filter(
                device_id=device['device_id']
            ).order_by('-created_at').first()
            
            self.stdout.write(
                f"  {device['device_id'][:20]}... "
                f"last seen: {latest_record.created_at.strftime('%Y-%m-%d %H:%M:%S')}"
            )
