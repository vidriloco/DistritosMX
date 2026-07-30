from django.contrib.gis.db import models
from ..official_transports.metro_stations import MetroStation
from ..official_transports.metrobus_stations import MetrobusStation
from ..official_transports.rtp_stations import RTPStation
from ..official_transports.concesionados_stations import ConcesionadosStation
from ..official_transports.interurbano_stations import InterurbanoStation
from ..official_transports.suburbano_stations import SuburbanoStation
from ..official_transports.mexibus_stations import MexibusStation
from ..official_transports.mexicable_stations import MexicableStation
from ..official_transports.tren_ligero_stations import TrenLigeroStation
from ..official_transports.cablebus_stations import CablebusStation
from ..official_transports.ecobici_stations import EcobiciStation

class GeoZoneMobilityExtension:
    """Extension class for GeoZone model to handle mobility-related updates"""

    def update_mobility(self):
        metro_stations_computed = self.get_mobility_geometries_of(self.transport_stations_computed('metro'), 'metro')
        self.metro_stations = len(metro_stations_computed)
        self.metro_stations_list = metro_stations_computed

        metrobus_stations_computed = self.get_mobility_geometries_of(self.transport_stations_computed('metrobus'))
        self.metrobus_stations = len(metrobus_stations_computed)
        self.metrobus_stations_list = metrobus_stations_computed

        rtp_stations_computed = self.get_mobility_geometries_of(self.transport_stations_computed('rtp'))
        self.rtp_stations = len(rtp_stations_computed)
        self.rtp_stations_list = rtp_stations_computed

        concesionados_stations_computed = self.get_mobility_geometries_of(self.transport_stations_computed('concesionados'))
        self.concesionados_stations = len(concesionados_stations_computed)
        self.concesionados_stations_list = concesionados_stations_computed

        tren_interurbano_stations_computed = self.get_mobility_geometries_of(self.transport_stations_computed('tren_interurbano'))
        self.tren_interurbano_stations = len(tren_interurbano_stations_computed)
        self.tren_interurbano_stations_list = tren_interurbano_stations_computed

        tren_suburbano_stations_computed = self.get_mobility_geometries_of(self.transport_stations_computed('tren_suburbano'))
        self.tren_suburbano_stations = len(tren_suburbano_stations_computed)
        self.tren_suburbano_stations_list = tren_suburbano_stations_computed

        mexibus_stations_computed = self.get_mobility_geometries_of(self.transport_stations_computed('mexibus'))
        self.mexibus_stations = len(mexibus_stations_computed)
        self.mexibus_stations_list = mexibus_stations_computed

        mexicable_stations_computed = self.get_mobility_geometries_of(self.transport_stations_computed('mexicable'))
        self.mexicable_stations = len(mexicable_stations_computed)
        self.mexicable_stations_list = mexicable_stations_computed

        tren_ligero_stations_computed = self.get_mobility_geometries_of(self.transport_stations_computed('tren_ligero'))
        self.tren_ligero_stations = len(tren_ligero_stations_computed)
        self.tren_ligero_stations_list = tren_ligero_stations_computed

        ecobici_stations_computed = self.get_mobility_geometries_of(self.transport_stations_computed('ecobici'))
        self.ecobici_stations = len(ecobici_stations_computed)
        self.ecobici_stations_list = ecobici_stations_computed

        cablebus_stations_computed = self.get_mobility_geometries_of(self.transport_stations_computed('cablebus'))
        self.cablebus_stations = len(cablebus_stations_computed)
        self.cablebus_stations_list = cablebus_stations_computed

        self.save()

    def get_mobility_geometries_of(self, records, aggregate = None):
        if aggregate == 'metro':
            return [f"{record.geometry.x}, {record.geometry.y}" for record in records]
        return [f"{record.location.x}, {record.location.y}" for record in records]

    def transport_stations_computed(self, transport_system):
        station_mapping = {
            "metro": MetroStation,
            "metrobus": MetrobusStation,
            "rtp": RTPStation,
            "concesionados": ConcesionadosStation,
            "tren_interurbano": InterurbanoStation,
            "tren_suburbano": SuburbanoStation,
            "mexibus": MexibusStation,
            "mexicable": MexicableStation,
            "tren_ligero": TrenLigeroStation,
            "ecobici": EcobiciStation,
            "cablebus": CablebusStation
        }

        if transport_system in station_mapping:
            if transport_system == 'metro':
                return station_mapping[transport_system].objects.filter(geometry__within=self.geometry)
            else:
                return station_mapping[transport_system].objects.filter(location__within=self.geometry)