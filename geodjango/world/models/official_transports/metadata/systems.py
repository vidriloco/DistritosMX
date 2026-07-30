from django.utils.translation import gettext_lazy as _

class TransportSystem:
    """Class representing different transportation systems in Mexico City."""
    
    # System codes
    METRO = "metro"
    METROBUS = "metrobus"
    TROLEBUS = "trolebus"
    RTP = "rtp"
    TREN_LIGERO = "tren-ligero"
    SUBURBANO = "tren-suburbano"
    CABLEBUS = "cablebus"
    INTERURBANO = "tren-interurbano"
    CONCESIONADOS = "concesionados"
    MEXICABLE = "mexicable"
    MEXIBUS = "mexibus"
    ECOBICI = "ecobici"

    # Humanized names
    DB_NAMES = {
        METRO: "STC Metro",
        METROBUS: "Metrobús",
        TROLEBUS: "STE Trolebús",
        RTP: "Red de Transporte de Pasajeros",
        TREN_LIGERO: "STE Tren ligero",
        SUBURBANO: "Tren Suburbano",
        CABLEBUS: "STE Cablebús",
        INTERURBANO: "INTERURBANO",
        CONCESIONADOS: "CORREDORES CONCESIONADOS",
        MEXICABLE: "Mexicable",
        MEXIBUS: "Mexibus",
        ECOBICI: "Ecobici"
    }

    HUMANIZED_NAMES = {
        METRO: "STC Metro",
        METROBUS: "Metrobús",
        TROLEBUS: "STE Trolebús",
        RTP: "Red de Transporte de Pasajeros",
        TREN_LIGERO: "STE Tren Ligero",
        SUBURBANO: "Tren Suburbano",
        CABLEBUS: "STE Cablebús",
        INTERURBANO: "Tren Interurbano",
        CONCESIONADOS: "Transporte Concesionado",
        MEXICABLE: "Mexicable",
        MEXIBUS: "Mexibús",
        ECOBICI: "Ecobici"
    }

    @classmethod
    def get_humanized_name_from_db_name(cls, db_name):
        """
        Given a DB name, returns its humanized name.
        
        Args:
            db_name (str): The database name to look up
            
        Returns:
            str: The humanized name for the given DB name
        """
        # Create a reverse mapping of DB_NAMES to find the system code
        reverse_db_names = {v: k for k, v in cls.DB_NAMES.items()}
        system_code = reverse_db_names.get(db_name)
        if system_code:
            return cls.HUMANIZED_NAMES.get(system_code, db_name)
        return db_name

    @classmethod
    def get_code_name_from_db_name(cls, db_name):
        """
        Given a DB name, returns its system code.
        
        Args:
            db_name (str): The database name to look up
            
        Returns:
            str: The system code for the given DB name
        """
        # Create a reverse mapping of DB_NAMES to find the system code
        reverse_db_names = {v: k for k, v in cls.DB_NAMES.items()}
        return reverse_db_names.get(db_name, db_name)

    
        
