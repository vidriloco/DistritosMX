"""
Default stroke color definitions for transportation lines in Mexico City.
Colors are defined in hexadecimal format.
"""

from .systems import TransportSystem

# Metro line stroke colors
LINE_STROKES = {
    TransportSystem.METRO: 4,
    TransportSystem.METROBUS: 3,
    TransportSystem.CABLEBUS: 2,
    TransportSystem.TROLEBUS: 2.5,
    TransportSystem.TREN_LIGERO: 2,
    TransportSystem.SUBURBANO: 5,
    TransportSystem.RTP: 1.5,
    TransportSystem.INTERURBANO: 5,
    TransportSystem.CONCESIONADOS: 1,
    TransportSystem.MEXICABLE: 2,
    TransportSystem.MEXIBUS: 3,
}