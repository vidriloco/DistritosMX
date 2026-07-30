from django.core.management.base import BaseCommand
from django.db.models import Count
from world.models import PhoneLocation


class Command(BaseCommand):
    help = 'Get basic statistics about PhoneLocation table'

    def handle(self, *args, **options):
        try:
            # Basic counts
            total_records = PhoneLocation.objects.count()
            unique_devices = PhoneLocation.objects.values('device_id').distinct().count()
            
            if total_records == 0:
                self.stdout.write(
                    self.style.WARNING('No records found in PhoneLocation table.')
                )
                return
            
            # Calculate average
            avg_locations = total_records / unique_devices
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n📱 PhoneLocation Statistics:\n'
                    f'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                    f'📊 Total records: {total_records:,}\n'
                    f'📱 Unique devices: {unique_devices:,}\n'
                    f'📈 Average locations per device: {avg_locations:.1f}\n'
                    f'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                )
            )
            
            # Quick breakdown by OS
            os_breakdown = PhoneLocation.objects.values('device_os').annotate(
                count=Count('device_id', distinct=True)
            ).order_by('-count')
            
            if os_breakdown:
                self.stdout.write('\n📱 By Operating System:')
                for os_stat in os_breakdown:
                    os_name = os_stat['device_os'] or 'Unknown'
                    self.stdout.write(f"  • {os_name}: {os_stat['count']:,} devices")
            
            # Quick breakdown by country
            country_breakdown = PhoneLocation.objects.values('country').annotate(
                count=Count('device_id', distinct=True)
            ).order_by('-count')[:5]
            
            if country_breakdown:
                self.stdout.write('\n🌍 Top Countries:')
                for country_stat in country_breakdown:
                    country = country_stat['country'] or 'Unknown'
                    self.stdout.write(f"  • {country}: {country_stat['count']:,} devices")
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error getting statistics: {str(e)}')
            )
