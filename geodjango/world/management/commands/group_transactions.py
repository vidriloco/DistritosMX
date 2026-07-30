import pandas as pd
from django.core.management.base import BaseCommand
import os
import io

class Command(BaseCommand):
    help = 'Process a CSV file and generate an output with 15-minute intervals and aggregated data'

    def add_arguments(self, parser):
        # Adding an argument to the command for the input CSV file path
        parser.add_argument('input_file', type=str, help='The path to the input CSV file')
        parser.add_argument('--output_file', type=str, help='The path to save the output CSV file')
        parser.add_argument('--output_format', type=str, choices=['json', 'csv'], default='json', help='The format on which to output the CSV file')
        parser.add_argument('--purpose', type=str, choices=['client', 'db'], default='client', 
                            help='The type of the generated output (default is "client")')
        parser.add_argument('--time_grouping', type=str, help='The type of the generated output (default is "client")')

    def handle(self, *args, **options):
        input_file = options['input_file']
        output_file = options['output_file']
        output_format = options['output_format']
        purpose = options['purpose']
        time_grouping = options['time_grouping']

        if not os.path.exists(input_file):
            self.stdout.write(self.style.ERROR(f"Input file {input_file} does not exist"))
            return

        # Step 1: Read the input CSV file into a pandas DataFrame
        print(f"Processing file: {input_file} with purpose: {purpose} and time grouping: {time_grouping}min")
        try:
            df = pd.read_csv(input_file, parse_dates=['datetime'])
            print("Read file")
            
            # Step 2: Sort the data by datetime
            df = df.sort_values('datetime')
            
            print("Sorted values")
            # Step 3: Create a new column for the 15-minute time bins
            df['time_bin'] = df['datetime'].dt.floor(f"{time_grouping}T")

            if purpose == 'client':
                # Step 4: Group by station_name, system_identifier, and time_bin
                grouped = df.groupby(['lat', 'lng', 'station_name', 'system_identifier', 'time_bin', 'operation']).agg({
                    'amount': ['sum', 'mean', 'count'],
                    'final_amount': ['sum', 'mean', 'count']
                }).reset_index()

                # Step 5: Rename columns (if necessary)
                grouped.columns = grouped.columns.map('_'.join)
                grouped.rename(columns={
                    'lat_': 'lat',
                    'lng_': 'lng',
                    'station_name_': 'station_name',
                    'operation_': 'operation',
                    'system_identifier_': 'system_identifier',
                    'time_bin_': 'time_bin'
                }, inplace=True)

                # Create new columns for recharge operations
                grouped['recharge_amount_sum'] = grouped.apply(lambda row: row['amount_sum'] if row['operation'] == 0 else 0, axis=1)
                grouped['recharge_amount_mean'] = grouped.apply(lambda row: row['amount_mean'] if row['operation'] == 0 else 0, axis=1)
                grouped['recharge_amount_count'] = grouped.apply(lambda row: row['amount_count'] if row['operation'] == 0 else 0, axis=1)

                grouped['recharge_balance_sum'] = grouped.apply(lambda row: row['final_amount_sum'] if row['operation'] == 0 else 0, axis=1)
                grouped['recharge_balance_mean'] = grouped.apply(lambda row: row['final_amount_mean'] if row['operation'] == 0 else 0, axis=1)
                grouped['recharge_balance_count'] = grouped.apply(lambda row: row['final_amount_count'] if row['operation'] == 0 else 0, axis=1)

                # Create new columns for debit operations
                grouped['debit_amount_sum'] = grouped.apply(lambda row: row['amount_sum'] if row['operation'] == 3 else 0, axis=1)
                grouped['debit_amount_mean'] = grouped.apply(lambda row: row['amount_mean'] if row['operation'] == 3 else 0, axis=1)
                grouped['debit_amount_count'] = grouped.apply(lambda row: row['amount_count'] if row['operation'] == 3 else 0, axis=1)

                grouped['debit_balance_sum'] = grouped.apply(lambda row: row['final_amount_sum'] if row['operation'] == 3 else 0, axis=1)
                grouped['debit_balance_mean'] = grouped.apply(lambda row: row['final_amount_mean'] if row['operation'] == 3 else 0, axis=1)
                grouped['debit_balance_count'] = grouped.apply(lambda row: row['final_amount_count'] if row['operation'] == 3 else 0, axis=1)

                # Create new columns for debit operations
                grouped['transfer_count'] = grouped.apply(lambda row: row['amount_count'] if row['operation'] == 7 else 0, axis=1)
                grouped['free_count'] = grouped.apply(lambda row: row['amount_count'] if row['operation'] == 4 else 0, axis=1)

                grouped = grouped.drop(columns=['amount_sum', 
                                                'amount_mean', 
                                                'amount_count', 
                                                'final_amount_sum', 
                                                'final_amount_mean', 
                                                'final_amount_count',
                                                'operation'])
                
                grouped = grouped.groupby(['lat', 'lng', 'station_name', 'system_identifier', 'time_bin']).agg({
                    'recharge_amount_sum': 'sum',
                    'recharge_amount_mean': 'sum',
                    'recharge_amount_count': 'sum',
                    'recharge_balance_sum': 'sum',
                    'recharge_balance_mean': 'sum',
                    'recharge_balance_count': 'sum',
                    'debit_amount_sum': 'sum',
                    'debit_amount_mean': 'sum',
                    'debit_amount_count': 'sum',
                    'debit_balance_sum': 'sum',
                    'debit_balance_mean': 'sum',
                    'debit_balance_count': 'sum',
                    'transfer_count': 'sum',
                    'free_count': 'sum'
                }).reset_index()

            elif purpose == 'db':
                # Step 4: Group by station_name, system_identifier, and time_bin
                grouped = df.groupby(['station_name', 'system_identifier', 'time_bin']).agg({
                    'amount': ['sum' ,list],
                    'final_amount': ['sum' ,list],
                    'datetime': list, 
                    'card_identifier': list
                }).reset_index()

                # Step 5: Rename columns (if necessary)
                grouped.rename(columns={'amount': 'amounts', 
                                        'card_identifier': 'card_identifiers', 
                                        'final_amount': 'final_amounts'}, inplace=True)


            # Step 6: Save the result
            if output_format == 'json':
                grouped.to_json(output_file, orient='records', date_format='iso')
            else:
                grouped.to_csv(output_file, index=False)
            print(self.style.SUCCESS(f"Output saved to {output_file}"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing file: {str(e)}"))
