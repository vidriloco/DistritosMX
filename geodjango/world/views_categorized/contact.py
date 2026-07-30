"""
Intake for the "Contacto" form in the navigation bar.

One endpoint, one direction: leads come in and are read from the Django admin.
Nothing written here is ever served back out.
"""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from world.models.contact_lead import ContactLead


@csrf_exempt
@require_POST
def submit_contact_lead(request):
    """
    Store a contact message for follow-up by email.
    """
    try:
        data = json.loads(request.body)
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Cuerpo de la petición inválido.'}, status=400)

    # Honeypot: a field hidden from people and irresistible to form bots. Answer
    # as if it worked — a bot that gets a 400 here learns to stop filling it in.
    if (data.get('website') or '').strip():
        return JsonResponse({'ok': True}, status=201)

    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    message = (data.get('message') or '').strip()

    if not name:
        return JsonResponse({'error': 'Necesitamos un nombre para dirigirnos a ti.'}, status=400)
    if not email or '@' not in email:
        return JsonResponse({'error': 'Necesitamos un correo válido para contactarte.'}, status=400)
    if not message:
        return JsonResponse({'error': 'Escríbenos un mensaje para saber en qué podemos ayudarte.'}, status=400)

    lead = ContactLead.objects.create(
        name=name[:120],
        email=email[:254],
        message=message[:4000],
        source_path=(data.get('sourcePath') or '').strip()[:200],
    )

    return JsonResponse({'ok': True, 'id': lead.id}, status=201)
