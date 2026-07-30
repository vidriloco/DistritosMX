from django.conf import settings

def get_station_image_url(system: str, line_number: str, station_code: str) -> str:
    """
    Generate the S3 URL for a station image.
    
    Args:
        system: The transport system (e.g., 'cablebus', 'metro')
        line_number: The line number
        station_code: The station identifier/code
        
    Returns:
        The complete S3 URL for the station image
    """
    return f"{settings.S3_BASE_URL}/{settings.S3_TRANSPORTS_PATH}/{system}/{line_number}/{station_code}.png" 

def get_system_image_url(system: str) -> str:
    return f"{settings.S3_BASE_URL}/{settings.S3_SYSTEMS_PATH}/{system}-logo.png" 
