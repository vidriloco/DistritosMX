"""
Legal pages: aviso de privacidad and términos y condiciones.

Both documents name the brand, the operator and the contact address in a dozen
places each. They are rendered from the constants below so that renaming the
site — or moving the contact address — is one edit here rather than a sweep
through two templates.
"""

from django.shortcuts import render
from django.views.decorators.http import require_GET

# Shared by both documents. `company_address` is published as the responsable's
# domicilio under the LFPDPPP, so it should be the address you are willing to
# receive an ARCO request at.
LEGAL_CONTEXT = {
    'site_name': 'Distritos MX',
    'company_name': 'Taller de Apps',
    'company_address': 'Ciudad de México, México',
    'contact_email': 'alex@tallerdeapps.mx',
    'updated_at': '30 de julio de 2026',
}


def _legal_context(active):
    return dict(LEGAL_CONTEXT, active=active)


@require_GET
def privacy_page(request):
    return render(request, 'legal/privacidad.html', _legal_context('privacidad'))


@require_GET
def terms_page(request):
    return render(request, 'legal/terminos.html', _legal_context('terminos'))
