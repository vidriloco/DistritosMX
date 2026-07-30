from django import template

register = template.Library()

@register.filter
def replace_url(value, arg):
    """
    Replaces the development URL with the production URL in the password reset link
    """
    old_url, new_url = arg.split(',')
    return value.replace(old_url, new_url) 