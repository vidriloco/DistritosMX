def parse_line_number(value):
    """
    Parses a line number string and removes leading zeros if it's a numeric value.
    
    Args:
        value (str): The line number string to parse (e.g. "01", "A", "81-B")
        
    Returns:
        str: The parsed line number (e.g. "1", "A", "81-B")
    """
    if not isinstance(value, str):
        value = str(value)
    
    # Check if the string contains only digits
    if value.isdigit():
        return str(int(value))
    
    return value 