from django.contrib.gis.db import models
from world.models.airbnb_listing import AirbnbListing

class GeoZoneAirbnbExtension:
    """Extension class for GeoZone model to handle Airbnb-related updates"""

    def update_airbnb(self):
        # Get all listings within this geozone
        airbnb_listings = AirbnbListing.objects.filter(location__within=self.geometry)
        
        # Calculate price metrics first using the actual objects
        prices = [listing.price for listing in airbnb_listings if listing.price is not None]
        self.airbnb_listings_price = sum(prices) if prices else 0
        self.airbnb_listings_price_average = int(sum(prices) / len(prices)) if prices else 0
        
        # Convert to coordinate strings for the list
        self.airbnb_listings = len(airbnb_listings)
        self.airbnb_listings_list = self.get_geometries_of(airbnb_listings, 'airbnb')

        # Calculate price metrics for full house listings
        full_house_listings = airbnb_listings.filter(room_type='Entire home/apt')
        full_house_prices = [listing.price for listing in full_house_listings if listing.price is not None]
        self.airbnb_listings_full_house = len(full_house_listings)
        self.airbnb_listings_full_house_price = sum(full_house_prices) if full_house_prices else 0
        self.airbnb_listings_full_house_price_average = int(sum(full_house_prices) / len(full_house_prices)) if full_house_prices else 0
        
        # Calculate price metrics for private room listings
        private_room_listings = airbnb_listings.filter(room_type='Private room')
        private_room_prices = [listing.price for listing in private_room_listings if listing.price is not None]
        self.airbnb_listings_private_room = len(private_room_listings)
        self.airbnb_listings_private_room_price = sum(private_room_prices) if private_room_prices else 0
        self.airbnb_listings_private_room_price_average = int(sum(private_room_prices) / len(private_room_prices)) if private_room_prices else 0

        # Calculate price metrics for shared room listings
        shared_room_listings = airbnb_listings.filter(room_type='Shared room')
        shared_room_prices = [listing.price for listing in shared_room_listings if listing.price is not None]
        self.airbnb_listings_shared_room = len(shared_room_listings)
        self.airbnb_listings_shared_room_price = sum(shared_room_prices) if shared_room_prices else 0
        self.airbnb_listings_shared_room_price_average = int(sum(shared_room_prices) / len(shared_room_prices)) if shared_room_prices else 0

        # Calculate price metrics for entire hotel listings
        entire_hotel_listings = airbnb_listings.filter(room_type='Hotel room')
        entire_hotel_prices = [listing.price for listing in entire_hotel_listings if listing.price is not None]
        self.airbnb_listings_entire_hotel = len(entire_hotel_listings)
        self.airbnb_listings_entire_hotel_price = sum(entire_hotel_prices) if entire_hotel_prices else 0
        self.airbnb_listings_entire_hotel_price_average = int(sum(entire_hotel_prices) / len(entire_hotel_prices)) if entire_hotel_prices else 0
        
        
        self.save()
