from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from world.models.felony import Felony
from world.models.ageb_risk import AgebRisk
from world.transformers.risks import AbuseTransformer, RiskGeoJSONTransformer, AgebRiskTransformer

@csrf_exempt
def get_risk_by_type(request, risk_type):
    """Get all risks by type"""
    risks = []
    
    if risk_type == "sexual-abuse":
        risks = Felony.objects.filter(crime_type__in=Felony.SEXUAL_ABUSE_TYPES)
    elif risk_type == "harrassment":
        risks = Felony.objects.filter(crime_type__in=Felony.HARASSMENT_TYPES)
    elif risk_type == "pt-thefts":
        risks = Felony.objects.filter(crime_type__in=Felony.PUBLIC_TRANSPORT_THEFT_TYPES)
    elif risk_type == "cellphone-thefts":
        risks = Felony.objects.filter(crime_type__in=Felony.CELLPHONE_THEFT_TYPES)
    elif risk_type == "taxi-theft":
        risks = Felony.objects.filter(crime_type__in=Felony.TAXI_THEFT_TYPES)
    elif risk_type == "despojo-viviendas":
        risks = Felony.objects.filter(crime_type__in=Felony.DESPOJO_TYPES)
    else:
        return JsonResponse({"error": "Invalid risk type"}, status=400)
    
    return JsonResponse(RiskGeoJSONTransformer([AbuseTransformer.from_model(risk) for risk in risks], risk_type).to_geojson())

@csrf_exempt
def get_risk_by_id(request, risk_id):
    """Get a risk by id"""
    risk = Felony.objects.get(id=risk_id)
    return JsonResponse(AbuseTransformer.from_model(risk).to_geojson())

@csrf_exempt
def get_ageb_risks(request):
    """Get all AGEB risks as GeoJSON"""
    ageb_risks = AgebRisk.objects.all()
    features = [AgebRiskTransformer.from_model(risk) for risk in ageb_risks]
    
    return JsonResponse({
        "type": "FeatureCollection",
        "features": features
    })
    