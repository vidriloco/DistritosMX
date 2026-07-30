# runapscheduler.py
import logging

from django.conf import settings

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from django.core.management.base import BaseCommand
from django_apscheduler.jobstores import DjangoJobStore
from django_apscheduler.models import DjangoJobExecution
from django_apscheduler import util
from django.core.management import call_command

logger = logging.getLogger(__name__)

def sync_line_one():
    call_command('update_vehicle_locations', 'world/management/commands/servers.txt', '1')

def sync_line_two():
    call_command('update_vehicle_locations', 'world/management/commands/servers.txt', '2')

def sync_line_three():
    call_command('update_vehicle_locations', 'world/management/commands/servers.txt', '3')

def sync_line_four():
    call_command('update_vehicle_locations', 'world/management/commands/servers.txt', '4')

def sync_line_five():
    call_command('update_vehicle_locations', 'world/management/commands/servers.txt', '5')

def sync_line_six():
    call_command('update_vehicle_locations', 'world/management/commands/servers.txt', '6')

def sync_line_seven():
    call_command('update_vehicle_locations', 'world/management/commands/servers.txt', '7')

@util.close_old_connections
def delete_old_job_executions(max_age=604_800):
  DjangoJobExecution.objects.delete_old_job_executions(max_age)

class Command(BaseCommand):
  help = "Runs APScheduler."

  def handle(self, *args, **options):
    scheduler = BlockingScheduler(timezone=settings.TIME_ZONE)
    scheduler.add_jobstore(DjangoJobStore(), "default")

    scheduler.add_job(
      sync_line_one,
      trigger=CronTrigger(second="*/30", hour="5-23"),  # Every 30 seconds between 5am and 11pm
      id="sync_line_one",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 1'.")

    scheduler.add_job(
      sync_line_two,
      trigger=CronTrigger(second="*/30", hour="5-23"),  # Every 120 seconds
      id="sync_line_two",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 2'.")

    scheduler.add_job(
      sync_line_three,
      trigger=CronTrigger(second="*/30", hour="5-23"),  # Every 120 seconds
      id="sync_line_three",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 3'.")

    scheduler.add_job(
      sync_line_four,
      trigger=CronTrigger(second="*/30", hour="5-23"),  # Every 120 seconds
      id="sync_line_four",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 4'.")

    scheduler.add_job(
      sync_line_five,
      trigger=CronTrigger(second="*/30", hour="5-23"),  # Every 120 seconds
      id="sync_line_five",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 5'.")

    scheduler.add_job(
      sync_line_six,
      trigger=CronTrigger(second="*/30", hour="5-23"),  # Every 120 seconds
      id="sync_line_six",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 6'.")

    scheduler.add_job(
      sync_line_seven,
      trigger=CronTrigger(second="*/30", hour="5-23"),  # Every 120 seconds
      id="sync_line_seven",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 7'.")

    # After 24 hours
    scheduler.add_job(
      sync_line_one,
      trigger=CronTrigger(second="*/30", hour="0-2"),  # Every hour between midnight and 2am
      id="midnight_sync_line_one",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 1'.")

    scheduler.add_job(
      sync_line_two,
      trigger=CronTrigger(second="*/30", hour="0-2"),  # Every 120 seconds
      id="midnight_sync_line_two",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 2'.")

    scheduler.add_job(
      sync_line_three,
      trigger=CronTrigger(second="*/30", hour="0-2"),  # Every 120 seconds
      id="midnight_sync_line_three",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 3'.")

    scheduler.add_job(
      sync_line_four,
      trigger=CronTrigger(second="*/30", hour="0-2"),  # Every 120 seconds
      id="midnight_sync_line_four",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 4'.")

    scheduler.add_job(
      sync_line_five,
      trigger=CronTrigger(second="*/30", hour="0-2"),  # Every 120 seconds
      id="midnight_sync_line_five",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 5'.")

    scheduler.add_job(
      sync_line_six,
      trigger=CronTrigger(second="*/30", hour="0-2"),  # Every 120 seconds
      id="midnight_sync_line_six",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 6'.")

    scheduler.add_job(
      sync_line_seven,
      trigger=CronTrigger(second="*/30", hour="0-2"),  # Every 120 seconds
      id="midnight_sync_line_seven",  # The `id` assigned to each job MUST be unique
      max_instances=1,
      replace_existing=True,
    )
    logger.info("Added job 'Syncing line 7'.")

    scheduler.add_job(
      delete_old_job_executions,
      trigger=CronTrigger(
        day_of_week="mon", hour="00", minute="00"
      ),  # Midnight on Monday, before start of the next work week.
      id="delete_old_job_executions",
      max_instances=1,
      replace_existing=True,
    )
    logger.info(
      "Added weekly job: 'delete_old_job_executions'."
    )

    try:
      logger.info("Starting scheduler...")
      scheduler.start()
    except KeyboardInterrupt:
      logger.info("Stopping scheduler...")
      scheduler.shutdown()
      logger.info("Scheduler shut down successfully!")