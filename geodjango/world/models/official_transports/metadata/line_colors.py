from .systems import TransportSystem

"""
Default color definitions for transportation lines in Mexico City.
Colors are defined in hexadecimal format.
"""

# Metro line colors (official colors from Wikipedia)
METRO_COLORS = {
    '1': '#ec4682',  # Red (Rosa)
    '2': '#0262a6',  # Blue (Azul)
    '3': '#a4a837',  # Green (Verde Olivo)
    '4': '#6fb3b2',  # Yellow (Cian)
    '5': '#f4d621',  # Orange (Amarillo)
    '6': '#e72428',  # Purple (Rojo)
    '7': '#f07c2c',  # Pink (Naranja)
    '8': '#01a163',  # Cyan (Verde)
    '9': '#561b00',  # Brown (Café)
    'A': '#8f268e',  # Gray (Morado)
    'B': '#008080',  # Teal (Verde y Blanco)
    '12': '#b8880b',  # Gold (Oro)
    '12-A': '#b8880b',  # Gold (Oro)
}

# Metrobus line colors (official colors from Wikipedia)
METROBUS_COLORS = {
    '1': '#bb211f',  # Red (Rojo)
    '2': '#8c3a90',  # Blue (Azul)
    '3': '#75a23b',  # Green (Verde)
    '4': '#ff9033',  # Orange (Naranja)
    '5': '#003679',  # Purple (Morado)
    '6': '#f03f96',  # Gold (Dorado)
    '7': '#00723b',  # Cyan (Turquesa)
}

# Mexicable line colors
MEXICABLE_COLORS = {
    '1': '#7C1D4E',
    '2': '#72AA40',
}

# Mexibus line colors
MEXIBUS_COLORS = {
    '1': '#95C348',
    '2': '#E9054B',
    '3': '#00A9DD',
    '4': '#ED8F45',
}

# Cablebus line colors
CABLEBUS_COLORS = {
    'default': '#07f2df'
}

# Trolebus line colors
TROLEBUS_COLORS = {
    'default': '#0057b6'
}

# Tren Ligero line colors
TREN_LIGERO_COLORS = {
    '1': '#0779bb'
}

# Suburbano line colors
SUBURBANO_COLORS = {
    '1': '#e6252e',
    '1-A': '#e6252e'
}

# RTP line colors
RTP_COLORS = {
    'default': '#6cb833'
}

# Interurbano line colors
INTERURBANO_COLORS = {
    '1': '#883330'
}

# Concesionados line colors
CONCESIONADOS_COLORS = {
    'default': '#a427b1'
}

# Dictionary containing all color definitions
LINE_COLORS = {
    TransportSystem.METRO: METRO_COLORS,
    TransportSystem.METROBUS: METROBUS_COLORS,
    TransportSystem.CABLEBUS: CABLEBUS_COLORS,
    TransportSystem.TROLEBUS: TROLEBUS_COLORS,
    TransportSystem.TREN_LIGERO: TREN_LIGERO_COLORS,
    TransportSystem.SUBURBANO: SUBURBANO_COLORS,
    TransportSystem.RTP: RTP_COLORS,
    TransportSystem.INTERURBANO: INTERURBANO_COLORS,
    TransportSystem.CONCESIONADOS: CONCESIONADOS_COLORS,
    TransportSystem.MEXICABLE: MEXICABLE_COLORS,
    TransportSystem.MEXIBUS: MEXIBUS_COLORS
}