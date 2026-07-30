from world.models import *
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
import json
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.http import HttpResponseBadRequest
from datetime import datetime
from enum import Enum
from django.contrib.auth import authenticate
from django.core.exceptions import ObjectDoesNotExist
from django.core.files.base import ContentFile
from django.contrib.gis.geos import Point
import base64
import time
from django.utils import timezone
from django.db.models import Max, Q
from django.db.utils import IntegrityError
import pytz

class ApiErrorCode(Enum):
    USERNAME_EXISTS = "USERNAME_EXISTS"
    EMAIL_EXISTS = "EMAIL_EXISTS"
    INVALID_DATA = "INVALID_DATA"
    MISSING_FIELDS = "MISSING_FIELDS"
    INVALID_METHOD = "INVALID_METHOD"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    UNAUTHORIZED = "UNAUTHORIZED"
    INVALID_TOKEN = "INVALID_TOKEN"
    DUPLICATE_RECORD = "DUPLICATE_RECORD"

def get_user_from_token(request):
    """Helper function to get user from bearer token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    try:
        user_details = UserDetails.objects.get(session_key=token)
        return user_details.user
    except UserDetails.DoesNotExist:
        return None

def yucatan_lines(request):
    lines_list = Line.get_all_from_yucatan()
    
    return JsonResponse({ 'lines': lines_list })

def get_user_response(user):
    """Helper function to generate the user response payload"""
    user_details = user.user_details
    return JsonResponse({
        'session_key': user_details.session_key,
        'user': {
            'username': user.username,
            'email': user.email,
        },
        'user_details': {
            'bio': user_details.bio,
            'twitter': user_details.twitter,
            'facebook': user_details.facebook,
            'youtube': user_details.youtube,
            'instagram': user_details.instagram,
            'tiktok': user_details.tiktok,
            'website': user_details.website,
            'picture_url': user_details.get_user_pic_url(),
            'avatar_url': user_details.get_user_avatar_url(),
            'date_of_birth': user_details.date_of_birth.isoformat() if user_details.date_of_birth else None,
            'gender': user_details.gender
        }
    })

@csrf_exempt
def update_user_account(request):
    if request.method == 'POST':
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return JsonResponse({
                    'error_code': ApiErrorCode.UNAUTHORIZED.value,
                    'message': 'Invalid or missing authentication token'
                }, status=401)
            
            data = json.loads(request.body)
            user_details = user.user_details
            
            # Update user fields if provided
            if 'username' in data:
                # Check if username is already taken by another user
                if User.objects.filter(username=data['username']).exclude(id=user.id).exists():
                    return JsonResponse({
                        'error_code': ApiErrorCode.USERNAME_EXISTS.value,
                        'message': 'Username already exists'
                    }, status=404)
                user.username = data['username']
                user.save()
            
            # Update user_details fields if provided
            if 'bio' in data:
                user_details.bio = data['bio']
            if 'twitter' in data:
                user_details.twitter = data['twitter']
            if 'facebook' in data:
                user_details.facebook = data['facebook']
            if 'youtube' in data:
                user_details.youtube = data['youtube']
            if 'instagram' in data:
                user_details.instagram = data['instagram']
            if 'tiktok' in data:
                user_details.tiktok = data['tiktok']
            if 'website' in data:
                user_details.website = data['website']
            if 'dateOfBirth' in data:
                user_details.date_of_birth = datetime.fromisoformat(data['dateOfBirth']).date()
            if 'gender' in data:
                user_details.gender = data['gender']
            if 'picture_url' in data:
                # Handle base64 image data
                try:
                    image_data = data['picture_url']
                    if image_data.startswith('data:image'):
                        # Remove the data URL prefix
                        image_data = image_data.split(',')[1]
                    
                    # Decode base64 data
                    image_binary = base64.b64decode(image_data)
                    
                    # Generate filename
                    filename = f"profile_{user.id}_{int(datetime.now().timestamp())}.jpg"
                    
                    # Save the image
                    user_details.picture.save(filename, ContentFile(image_binary), save=False)
                except Exception as e:
                    return JsonResponse({
                        'error_code': ApiErrorCode.INVALID_DATA.value,
                        'message': f'Invalid image data: {str(e)}'
                    }, status=400)
            
            user_details.save()
            return get_user_response(user)
            
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only POST method is allowed'
        }, status=405)

@csrf_exempt
def login_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Check for required fields
            required_fields = ['identifier', 'password']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return JsonResponse({
                    'error_code': ApiErrorCode.MISSING_FIELDS.value,
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=400)
            
            identifier = data['identifier']
            password = data['password']
            
            # Try to find user by email or username
            try:
                user = User.objects.get(email=identifier)
            except ObjectDoesNotExist:
                try:
                    user = User.objects.get(username=identifier)
                except ObjectDoesNotExist:
                    return JsonResponse({
                        'error_code': ApiErrorCode.INVALID_CREDENTIALS.value,
                        'message': 'Invalid credentials'
                    }, status=401)
            
            # Authenticate user
            user = authenticate(username=user.username, password=password)
            
            if user is None:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_CREDENTIALS.value,
                    'message': 'Invalid credentials'
                }, status=401)
            
            # Ensure user has a valid session key
            if not user.user_details.has_valid_session_key():
                user.user_details.generate_new_session_key()
                user.user_details.save()
            
            return get_user_response(user)
            
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only POST method is allowed'
        }, status=405)

@csrf_exempt
def create_new_user_account(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Check for required fields first
            required_fields = ['username', 'email', 'password']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return JsonResponse({
                    'error_code': ApiErrorCode.MISSING_FIELDS.value,
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=400)
            
            username = data['username']
            email = data['email']
            password = data['password']
            
            # Optional fields
            date_of_birth = None
            if 'dateOfBirth' in data and data['dateOfBirth']:
                date_of_birth = datetime.fromisoformat(data['dateOfBirth']).date()
            
            gender = None
            if 'gender' in data and data['gender']:
                gender = data['gender']
            
            # Check if user already exists
            if User.objects.filter(username=username).exists():
                return JsonResponse({
                    'error_code': ApiErrorCode.USERNAME_EXISTS.value,
                    'message': 'Username already exists'
                }, status=404)
            if User.objects.filter(email=email).exists():
                return JsonResponse({
                    'error_code': ApiErrorCode.EMAIL_EXISTS.value,
                    'message': 'Email already exists'
                }, status=404)
            
            user = User.objects.create_user(username=username, email=email, password=password)
            user_details = UserDetails(user=user, date_of_birth=date_of_birth, gender=gender)
            
            # Generate session key if it doesn't exist
            if not user_details.has_valid_session_key():
                user_details.generate_new_session_key()
            
            user_details.save()
            
            return get_user_response(user)
            
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            print(e)
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only POST method is allowed'
        }, status=405)

@csrf_exempt
def create_review(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ['happiness', 'report_type', 'location', 'message', 'transport', 'userSession']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return JsonResponse({
                    'error_code': ApiErrorCode.MISSING_FIELDS.value,
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=400)
            
            user = get_user_from_token(request)
            
            # Create Point from coordinates
            location_data = data['location']
            point = Point(location_data['longitude'], location_data['latitude'], srid=4326)
            
            # Create Point for reviewed object location from transport coordinates
            transport_coords = data['transport']['coordinates']
            reviewed_object_point = Point(transport_coords[0], transport_coords[1], srid=4326)
            
            # Create review object
            review = StationReview(
                happiness_value=data['happiness']['value'],
                report_type=data['report_type']['id'],
                location=point,
                message=data['message'],
                transport_id=data['transport']['id'],
                transport_identifier=data['transport']['identifier'],
                transport_system=data['transport']['system'],
                user=user,
                reviewed_object_location=reviewed_object_point
            )
            
            try:
                # Handle image if provided
                if 'image' in data and data['image'] is not None:
                    try:
                        image_data = data['image']['data']
                        
                        if image_data.startswith('data:image'):
                            # Remove the data URL prefix
                            image_data = image_data.split(',')[1]
                        
                        # Decode base64 data
                        image_binary = base64.b64decode(image_data)
                        
                        # Generate filename
                        filename = f"review_{data['transport']['id']}_{int(time.time())}.jpg"
                        
                        # Save the image
                        review.image.save(filename, ContentFile(image_binary), save=False)
                    except Exception as e:
                        return JsonResponse({
                            'error_code': ApiErrorCode.INVALID_DATA.value,
                            'message': f'Invalid image data: {str(e)}'
                        }, status=400)
                review.save()
            except IntegrityError as e:
                if 'world_stationreview_transport_id_transport_i_db82510e_uniq' in str(e):
                    return JsonResponse({
                        'error_code': ApiErrorCode.DUPLICATE_RECORD.value,
                        'message': 'You have already submitted a review for this transport on this date'
                    }, status=400)
                raise e
            
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': review.id
                }
            })
            
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only POST method is allowed'
        }, status=405)

@csrf_exempt
def delete_user_status(request, status_id):
    if request.method == 'DELETE':
        try:
            # Get the Authorization header
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return JsonResponse({
                    'error_code': ApiErrorCode.UNAUTHORIZED.value,
                    'message': 'No Bearer token provided'
                }, status=401)
                
            # Extract the session key from the Bearer token
            session_key = auth_header.split(' ')[1]
            
            # Get the user details with the session key
            try:
                user_details = UserDetails.objects.get(session_key=session_key)
                user = user_details.user
            except UserDetails.DoesNotExist:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_TOKEN.value,
                    'message': 'Invalid or expired session token'
                }, status=401)
            
            # Try to get the status and verify ownership
            try:
                status = UserStatus.objects.get(id=status_id, user=user)
                status.delete()
                return JsonResponse({
                    'status': 'success',
                    'message': 'Status deleted successfully'
                })
            except UserStatus.DoesNotExist:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Status not found or you do not have permission to delete it'
                }, status=404)
                
        except Exception as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': str(e)
            }, status=500)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only DELETE method is allowed'
        }, status=405)

@csrf_exempt
def get_available_avatars(request):
    """Get list of all available avatars"""
    try:
        avatars = Avatar.objects.all().order_by('identifier')
        avatar_list = []
        for avatar in avatars:
            avatar_dict = {
                'id': avatar.id,
                'identifier': avatar.identifier,
                'name': avatar.name,
                'image_url': avatar.get_avatar_url()
            }
            avatar_list.append(avatar_dict)
            
        return JsonResponse({'avatars': avatar_list})
        
    except Exception as e:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_DATA.value,
            'message': str(e)
        }, status=500)

@csrf_exempt
def update_user_avatar(request):
    """Update user's avatar"""
    if request.method == 'POST':
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return JsonResponse({
                    'error_code': ApiErrorCode.UNAUTHORIZED.value,
                    'message': 'Invalid or missing authentication token'
                }, status=401)
            
            data = json.loads(request.body)
            
            # Validate required fields
            if 'avatar_id' not in data:
                return JsonResponse({
                    'error_code': ApiErrorCode.MISSING_FIELDS.value,
                    'message': 'Missing required field: avatar_id'
                }, status=400)
            
            # Get the avatar
            try:
                avatar = Avatar.objects.get(id=data['avatar_id'])
            except Avatar.DoesNotExist:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Avatar not found'
                }, status=404)
            
            # Update user's avatar
            user_details = user.user_details
            user_details.default_avatar = avatar
            user_details.save()
            
            return get_user_response(user)
            
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only POST method is allowed'
        }, status=405)
    
@csrf_exempt
def get_recent_user_statuses(request):
    """Get the latest verified status from each user in the last 48 hours"""
    try:
        # Calculate the timestamp for 48 hours ago
        forty_eight_hours_ago = timezone.now() - timezone.timedelta(hours=48)
        
        # Get the latest verified status for each user within the last 48 hours
        # Using a subquery to get the latest status_id for each user
        latest_status_ids = UserStatus.objects.filter(
            created_at__gte=forty_eight_hours_ago,
            is_verified=True  # Only get verified statuses
        ).values('user').annotate(
            latest_status_id=Max('id')
        ).values_list('latest_status_id', flat=True)
        
        # Get the full status objects
        statuses = UserStatus.objects.filter(
            id__in=latest_status_ids,
            is_verified=True  # Double check verification in case of race conditions
        ).order_by('-created_at')
        
        # Convert to list of dictionaries
        status_list = []
        for status in statuses:
            status_dict = {
                'id': status.id,
                'user': {
                    'username': status.user.username,
                    'avatar_url': status.user.user_details.get_user_avatar_url()
                },
                'happiness_value': status.happiness_value,
                'report_type': status.report_type,
                'location': {
                    'lat': status.location.y,
                    'lng': status.location.x
                },
                'location_address': status.location_address,
                'event_location_category': status.event_location_category,
                'message': status.message,
                'image_url': status.image.url if status.image else None,
                'created_at': status.created_at.isoformat(),
                'is_verified': status.is_verified
            }
            status_list.append(status_dict)
            
        return JsonResponse({'statuses': status_list})
        
    except Exception as e:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_DATA.value,
            'message': str(e)
        }, status=500)
    
@csrf_exempt
def create_bike_report(request):
    """Create a new bike report"""
    if request.method == 'POST':
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return JsonResponse({
                    'error_code': ApiErrorCode.UNAUTHORIZED.value,
                    'message': 'Invalid or missing authentication token'
                }, status=401)
            
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ['category', 'description', 'location']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return JsonResponse({
                    'error_code': ApiErrorCode.MISSING_FIELDS.value,
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=400)
            
            # Create Point from coordinates
            location_data = data['location']
            point = Point(location_data['longitude'], location_data['latitude'], srid=4326)
            
            # Create bike report object
            bike_report = BikeReport(
                user=user,
                category=data['category'],
                description=data['description'],
                location=point,
                location_address=location_data['address']
            )
            
            # Handle image if provided
            if 'image' in data and data['image'] is not None:
                try:
                    image_data = data['image']
                    
                    if image_data.startswith('data:image'):
                        # Remove the data URL prefix
                        image_data = image_data.split(',')[1]
                    
                    # Decode base64 data
                    image_binary = base64.b64decode(image_data)
                    
                    # Generate filename
                    filename = f"bike_report_{user.id}_{int(time.time())}.jpg"
                    
                    # Save the image
                    bike_report.image.save(filename, ContentFile(image_binary), save=False)
                except Exception as e:
                    return JsonResponse({
                        'error_code': ApiErrorCode.INVALID_DATA.value,
                        'message': f'Invalid image data: {str(e)}'
                    }, status=400)
            
            bike_report.save()
            
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': bike_report.id,
                    'category': bike_report.category,
                    'description': bike_report.description,
                    'location': {
                        'lat': bike_report.location.y,
                        'lng': bike_report.location.x,
                        'address': bike_report.location_address
                    },
                    'image_url': bike_report.image.url if bike_report.image else None,
                    'created_at': bike_report.created_at.isoformat()
                }
            })
            
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only POST method is allowed'
        }, status=405)

@csrf_exempt
def get_bike_reports_in_viewport(request):
    """Get bike reports within a given map viewport"""
    try:
        # Get viewport boundaries from request parameters
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ['north', 'south', 'east', 'west']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return JsonResponse({
                'error_code': ApiErrorCode.MISSING_FIELDS.value,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }, status=400)
        
        # Extract viewport boundaries
        north = float(data['north'])
        south = float(data['south'])
        east = float(data['east'])
        west = float(data['west'])
        
        # Create a bounding box polygon for the viewport
        from django.contrib.gis.geos import Polygon
        bbox = Polygon.from_bbox((west, south, east, north))
        
        # Query bike reports within the bounding box
        bike_reports = BikeReport.objects.filter(location__within=bbox)
        
        # Get current user if authenticated
        user = get_user_from_token(request)
        # Format the response
        reports_list = []
        for report in bike_reports:
            # Check if the report is favorited by the current user
            is_favorite = False
            if user:
                is_favorite = BikeReportFavorite.objects.filter(user=user, bike_report=report).exists()
            
            reports_list.append({
                'id': report.id,
                'category': report.category,
                'description': report.description,
                'location': {
                    'lat': report.location.y,
                    'lng': report.location.x,
                    'address': report.location_address
                },
                'image_url': report.image.url if report.image else None,
                'created_at': report.created_at.isoformat(),
                'is_verified': report.is_verified,
                'favorites_count': report.favorited_by.count(),
                'is_favorite': is_favorite,
                'user': {
                    'username': report.user.username,
                    'avatar_url': report.user.user_details.get_user_avatar_url()
                }
            })

        return JsonResponse({'bike_reports': reports_list})
        
    except (KeyError, json.JSONDecodeError, ValueError) as e:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_DATA.value,
            'message': f'Invalid data: {str(e)}'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_DATA.value,
            'message': str(e)
        }, status=500)

@csrf_exempt
def delete_bike_report(request):
    """Delete a bike report by ID"""
    if request.method == 'DELETE':
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return JsonResponse({
                    'error_code': ApiErrorCode.UNAUTHORIZED.value,
                    'message': 'Invalid or missing authentication token'
                }, status=401)
            
            # Parse request body
            data = json.loads(request.body)
            
            # Validate required fields
            if 'report_id' not in data:
                return JsonResponse({
                    'error_code': ApiErrorCode.MISSING_FIELDS.value,
                    'message': 'Missing required field: report_id'
                }, status=400)
            
            report_id = data['report_id']
            
            # Try to get the bike report and verify ownership
            try:
                bike_report = BikeReport.objects.get(id=report_id, user=user)
                bike_report.delete()
                return JsonResponse({
                    'status': 'success',
                    'message': 'Bike report deleted successfully'
                })
            except BikeReport.DoesNotExist:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Bike report not found or you do not have permission to delete it'
                }, status=404)
                
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': str(e)
            }, status=500)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only DELETE method is allowed'
        }, status=405)

@csrf_exempt
def bike_report_favorite(request):
    """Handle favoriting and unfavoriting bike reports"""
    if request.method == 'POST':
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return JsonResponse({
                    'error_code': ApiErrorCode.UNAUTHORIZED.value,
                    'message': 'Invalid or missing authentication token'
                }, status=401)
            
            # Parse request body
            data = json.loads(request.body)
            
            # Validate required fields
            if 'report_id' not in data or 'action' not in data:
                return JsonResponse({
                    'error_code': ApiErrorCode.MISSING_FIELDS.value,
                    'message': 'Missing required fields: report_id, action'
                }, status=400)
            
            report_id = data['report_id']
            action = data['action']
            
            # Validate action
            if action not in ['favorite', 'unfavorite']:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Invalid action. Must be either "favorite" or "unfavorite"'
                }, status=400)
            
            # Try to get the bike report
            try:
                bike_report = BikeReport.objects.get(id=report_id)
            except BikeReport.DoesNotExist:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Bike report not found'
                }, status=404)
            
            # Handle favorite/unfavorite action
            if action == 'favorite':
                # Create favorite if it doesn't exist
                BikeReportFavorite.objects.get_or_create(
                    user=user,
                    bike_report=bike_report
                )
                message = 'Bike report favorited successfully'
            else:  # unfavorite
                # Remove favorite if it exists
                BikeReportFavorite.objects.filter(
                    user=user,
                    bike_report=bike_report
                ).delete()
                message = 'Bike report unfavorited successfully'
            
            return JsonResponse({
                'status': 'success',
                'message': message
            })
                
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': str(e)
            }, status=500)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only POST method is allowed'
        }, status=405)

@csrf_exempt
def flag_content(request):
    """Flag user-generated content"""
    if request.method == 'POST':
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return JsonResponse({
                    'error_code': ApiErrorCode.UNAUTHORIZED.value,
                    'message': 'Invalid or missing authentication token'
                }, status=401)
            
            data = json.loads(request.body)
            # Validate required fields
            required_fields = ['content_id', 'content_type', 'flag_reason']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return JsonResponse({
                    'error_code': ApiErrorCode.MISSING_FIELDS.value,
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=400)
            
            # Validate content type
            if data['content_type'] not in ['BikeReport', 'StationReview']:  # Add more content types as needed
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Invalid content type'
                }, status=400)
            
            # Validate flag reason
            if data['flag_reason'] not in ContentFlag.FlagReason.values:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Invalid flag reason'
                }, status=400)
            
            # Check if content exists
            content_id = data['content_id']
            content_type = data['content_type']
            
            # Check if user has already flagged this content
            existing_flag = ContentFlag.objects.filter(
                user=user,
                content_id=content_id,
                content_type=content_type
            ).first()
            
            if existing_flag:
                return JsonResponse({
                    'error_code': ApiErrorCode.DUPLICATE_RECORD.value,
                    'message': 'You have already flagged this content'
                }, status=400)
            
            # Create flag
            flag = ContentFlag(
                user=user,
                content_id=content_id,
                content_type=content_type,
                flag_reason=data['flag_reason'],
                additional_text=data.get('additional_text')
            )
            flag.save()
            
            return JsonResponse({
                'status': 'success',
                'message': 'Content flagged successfully'
            })
            
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': str(e)
            }, status=500)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only POST method is allowed'
        }, status=405)


@csrf_exempt
def get_station_reviews_coordinates(request):
    """Get station reviews filtered by transport parameters"""
    try:
        # Get user from token
        user = get_user_from_token(request)
        # Get query parameters
        transport_latitude = request.GET.get('transport_lat')
        transport_longitude = request.GET.get('transport_lng')
        transport_system = request.GET.get('transport_system')
        # Start with all reviews
        reviews = []

        if transport_latitude and transport_longitude:
            # Create a point from the coordinates
            point = Point(float(transport_longitude), float(transport_latitude), srid=4326)

            # Filter reviews by location within 1 km
            reviews = StationReview.objects.filter(reviewed_object_location__distance_lte=(point, 1))
        if transport_system:
            reviews = reviews.filter(transport_system=transport_system)

        reviews_list = []
        for review in reviews:
            # Get vote counts
            upvotes = Voting.objects.filter(
                reference_table_id=review.id,
                reference_table_type='StationReview',
                is_positive=True
            ).count()
            
            downvotes = Voting.objects.filter(
                reference_table_id=review.id,
                reference_table_type='StationReview',
                is_positive=False
            ).count()
            
            # Get user's vote if authenticated
            user_vote = None
            if user:
                try:
                    vote = Voting.objects.get(
                        reference_table_id=review.id,
                        reference_table_type='StationReview',
                        user=user
                    )
                    user_vote = 'up' if vote.is_positive else 'down'
                except Voting.DoesNotExist:
                    pass
            
            review_dict = {
                'id': review.id,
                'happiness_value': review.happiness_value,
                'report_type': review.report_type,
                'location': {
                    'lat': review.location.y,
                    'lng': review.location.x
                },
                'message': review.message,
                'image_url': review.image.url if review.image else None,
                'transport_id': review.transport_id,
                'transport_identifier': review.transport_identifier,
                'transport_system': review.transport_system,
                'created_at': review.created_at.isoformat(),
                'user': {
                    'username': review.user.username,
                    'avatar_url': review.user.user_details.get_user_pic_url()
                },
                'upvotes': upvotes,
                'downvotes': downvotes,
                'user_vote': user_vote,
                'is_owner': review.user == user
            }
            reviews_list.append(review_dict)
        
        return JsonResponse({'reviews': reviews_list})
        
    except Exception as e:
        print(e)
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_DATA.value,
            'message': str(e)
        }, status=500)
        
@csrf_exempt
def get_station_reviews(request):
    """Get station reviews filtered by transport parameters"""
    try:
        # Get query parameters
        transport_id = request.GET.get('transport_id')
        transport_identifier = request.GET.get('transport_identifier')
        transport_system = request.GET.get('transport_system')
        
        # Start with all reviews
        reviews = StationReview.objects.all()
        
        # Build AND conditions
        conditions = Q()
        if transport_id:
            conditions &= Q(transport_id=transport_id)
        if transport_identifier:
            conditions &= Q(transport_identifier=transport_identifier)
        if transport_system:
            conditions &= Q(transport_system=transport_system)
        
        # Apply the AND conditions if any were added
        if conditions:
            reviews = reviews.filter(conditions)
        
        # Get current user if authenticated
        user = get_user_from_token(request)
        
        # Convert to list of dictionaries
        reviews_list = []
        for review in reviews:
            # Get vote counts
            upvotes = Voting.objects.filter(
                reference_table_id=review.id,
                reference_table_type='StationReview',
                is_positive=True
            ).count()
            
            downvotes = Voting.objects.filter(
                reference_table_id=review.id,
                reference_table_type='StationReview',
                is_positive=False
            ).count()
            
            # Get user's vote if authenticated
            user_vote = None
            if user:
                try:
                    vote = Voting.objects.get(
                        reference_table_id=review.id,
                        reference_table_type='StationReview',
                        user=user
                    )
                    user_vote = 'up' if vote.is_positive else 'down'
                except Voting.DoesNotExist:
                    pass
            
            review_dict = {
                'id': review.id,
                'happiness_value': review.happiness_value,
                'report_type': review.report_type,
                'location': {
                    'lat': review.location.y,
                    'lng': review.location.x
                },
                'message': review.message,
                'image_url': review.image.url if review.image else None,
                'transport_id': review.transport_id,
                'transport_identifier': review.transport_identifier,
                'transport_system': review.transport_system,
                'created_at': review.created_at.isoformat(),
                'user': {
                    'username': review.user.username,
                    'avatar_url': review.user.user_details.get_user_pic_url()
                },
                'upvotes': upvotes,
                'downvotes': downvotes,
                'user_vote': user_vote,
                'is_owner': review.user == user
            }
            reviews_list.append(review_dict)
        
        return JsonResponse({'reviews': reviews_list})
        
    except Exception as e:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_DATA.value,
            'message': str(e)
        }, status=500)

@csrf_exempt
def vote_on_review(request):
    """Handle voting on reviews"""
    if request.method == 'POST':
        
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return JsonResponse({
                    'error_code': ApiErrorCode.UNAUTHORIZED.value,
                    'message': 'Invalid or missing authentication token'
                }, status=401)
            
            data = json.loads(request.body)
            # Validate required fields
            required_fields = ['review_id', 'vote_type']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return JsonResponse({
                    'error_code': ApiErrorCode.MISSING_FIELDS.value,
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=400)
            
            # Validate vote type
            if data['vote_type'] not in ['up', 'down']:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Invalid vote type. Must be either "up" or "down"'
                }, status=400)
            
            review_id = data['review_id']
            is_positive = data['vote_type'] == 'up'
            
            # Check if review exists
            try:
                review = StationReview.objects.get(id=review_id)
            except StationReview.DoesNotExist:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Review not found'
                }, status=404)
            
            # Check if user already voted the same way
            existing_vote = Voting.objects.filter(
                reference_table_id=review_id,
                reference_table_type='StationReview',
                user=user,
                is_positive=is_positive
            ).first()
            
            if existing_vote:
                # If vote exists and is the same, delete it
                existing_vote.delete()
                message = 'Vote removed successfully'
            else:
                # Create or update vote
                vote, created = Voting.objects.update_or_create(
                    reference_table_id=review_id,
                    reference_table_type='StationReview',
                    user=user,
                    defaults={'is_positive': is_positive}
                )
                message = 'Vote recorded successfully'
            
            # Get updated vote counts
            upvotes = Voting.objects.filter(
                reference_table_id=review_id,
                reference_table_type='StationReview',
                is_positive=True
            ).count()
            
            downvotes = Voting.objects.filter(
                reference_table_id=review_id,
                reference_table_type='StationReview',
                is_positive=False
            ).count()
            
            return JsonResponse({
                'status': 'success',
                'message': message,
                'data': {
                    'upvotes': upvotes,
                    'downvotes': downvotes,
                    'user_vote': 'up' if is_positive else 'down' if existing_vote else None
                }
            })
            
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': str(e)
            }, status=500)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only POST method is allowed'
        }, status=405)

@csrf_exempt
def delete_station_review(request):
    if request.method == 'DELETE':
        try:
            # Get user from token
            user = get_user_from_token(request)
            if not user:
                return JsonResponse({
                    'error_code': ApiErrorCode.UNAUTHORIZED.value,
                    'message': 'Invalid or missing authentication token'
                }, status=401)
            
            # Get review_id from request body
            data = json.loads(request.body)
            if 'review_id' not in data:
                return JsonResponse({
                    'error_code': ApiErrorCode.MISSING_FIELDS.value,
                    'message': 'Missing required field: review_id'
                }, status=400)
            
            review_id = data['review_id']
            
            # Try to get the review and verify ownership
            try:
                review = StationReview.objects.get(id=review_id, user=user)
                review.delete()
                return JsonResponse({
                    'status': 'success',
                    'message': 'Review deleted successfully'
                })
            except StationReview.DoesNotExist:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Review not found or you do not have permission to delete it'
                }, status=404)
                
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': str(e)
            }, status=500)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only DELETE method is allowed'
        }, status=405)

@csrf_exempt
def get_user_reviews(request):
    """Get all reviews for the authenticated user"""
    try:
        # Get user from token
        user = get_user_from_token(request)
        if not user:
            return JsonResponse({
                'error_code': ApiErrorCode.UNAUTHORIZED.value,
                'message': 'Invalid or missing authentication token'
            }, status=401)
        
        # Get all reviews for the user
        reviews = StationReview.objects.filter(user=user).order_by('-created_at')
        
        # Convert to list of dictionaries
        reviews_list = []
        for review in reviews:
            # Get vote counts
            upvotes = Voting.objects.filter(
                reference_table_id=review.id,
                reference_table_type='StationReview',
                is_positive=True
            ).count()
            
            downvotes = Voting.objects.filter(
                reference_table_id=review.id,
                reference_table_type='StationReview',
                is_positive=False
            ).count()
            
            # Get user's vote if authenticated
            user_vote = None
            try:
                vote = Voting.objects.get(
                    reference_table_id=review.id,
                    reference_table_type='StationReview',
                    user=user
                )
                user_vote = 'up' if vote.is_positive else 'down'
            except Voting.DoesNotExist:
                pass
            
            review_dict = {
                'id': review.id,
                'happiness_value': review.happiness_value,
                'report_type': review.report_type,
                'location': {
                    'lat': review.location.y,
                    'lng': review.location.x
                },
                'message': review.message,
                'image_url': review.image.url if review.image else None,
                'transport_id': review.transport_id,
                'transport_identifier': review.transport_identifier,
                'transport_system': review.transport_system,
                'created_at': review.created_at.isoformat(),
                'user': {
                    'username': review.user.username,
                    'avatar_url': review.user.user_details.get_user_pic_url()
                },
                'upvotes': upvotes,
                'downvotes': downvotes,
                'user_vote': user_vote,
                'is_owner': True  # Since these are the user's own reviews
            }
            reviews_list.append(review_dict)
        
        return JsonResponse({'reviews': reviews_list})
        
    except Exception as e:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_DATA.value,
            'message': str(e)
        }, status=500)

@csrf_exempt
def get_business_location_stats(request):
    """Get business statistics within a radius of given coordinates"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ['selected_codes', 'coordinates', 'radius']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return JsonResponse({
                    'error_code': ApiErrorCode.MISSING_FIELDS.value,
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=400)
            
            selected_codes = data['selected_codes']
            coordinates = data['coordinates']
            radius = data['radius']
            
            # Validate coordinates
            if not isinstance(coordinates, dict) or 'lat' not in coordinates or 'lng' not in coordinates:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Invalid coordinates format. Expected {lat: number, lng: number}'
                }, status=400)
            
            # Validate radius
            if not isinstance(radius, (int, float)) or radius <= 0:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Invalid radius. Must be a positive number'
                }, status=400)
            
            # Validate selected_codes
            if not isinstance(selected_codes, list) or len(selected_codes) == 0:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Invalid selected_codes. Must be a non-empty array'
                }, status=400)
            
            # Create Point from coordinates
            point = Point(coordinates['lng'], coordinates['lat'], srid=4326)
            
            # Use Django GIS distance query which is more efficient
            from django.contrib.gis.measure import Distance
            
            # Filter by selected codes and location using distance query
            denue_records = DenueRecord.objects.filter(
                geometry__distance_lte=(point, Distance(m=radius)),
                codigo_act__in=selected_codes
            )
            
            # Convert to list of dictionaries
            records_list = []
            for record in denue_records:
                record_dict = {
                    'id': record.id,
                    'clee': record.clee,
                    'nom_estab': record.nom_estab,
                    'raz_social': record.raz_social,
                    'codigo_act': record.codigo_act,
                    'nombre_act': record.nombre_act,
                    'per_ocu': record.per_ocu,
                    'numero_ext': record.numero_ext,
                    'letra_ext': record.letra_ext,
                    'edificio': record.edificio,
                    'edificio_e': record.edificio_e,
                    'numero_int': record.numero_int,
                    'letra_int': record.letra_int,
                    'tipo_asent': record.tipo_asent,
                    'nomb_asent': record.nomb_asent,
                    'tipoCenCom': record.tipoCenCom,
                    'nom_CenCom': record.nom_CenCom,
                    'num_local': record.num_local,
                    'cod_postal': record.cod_postal,
                    'cve_ent': record.cve_ent,
                    'entidad': record.entidad,
                    'cve_mun': record.cve_mun,
                    'municipio': record.municipio,
                    'cve_loc': record.cve_loc,
                    'localidad': record.localidad,
                    'ageb': record.ageb,
                    'manzana': record.manzana,
                    'tipoUniEco': record.tipoUniEco,
                    'geometry': {
                        'lat': record.geometry.y,
                        'lng': record.geometry.x
                    },
                    'year': record.year,
                    'average_jobs': record.average_jobs()
                }
                records_list.append(record_dict)
            
            # Calculate summary statistics
            total_businesses = len(records_list)
            total_jobs = sum(record['average_jobs'] for record in records_list)
            
            # Group by category code
            category_stats = {}
            for record in records_list:
                code = record['codigo_act']
                if code not in category_stats:
                    category_stats[code] = {
                        'count': 0,
                        'total_jobs': 0,
                        'category_name': record['nombre_act']
                    }
                category_stats[code]['count'] += 1
                category_stats[code]['total_jobs'] += record['average_jobs']
            
            return JsonResponse({
                'status': 'success',
                'data': {
                    'records': records_list,
                    'summary': {
                        'total_businesses': total_businesses,
                        'total_jobs': total_jobs,
                        'radius_meters': radius,
                        'coordinates': coordinates
                    },
                    'category_stats': category_stats
                }
            })
            
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': str(e)
            }, status=500)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only POST method is allowed'
        }, status=405)

@csrf_exempt
def get_business_categories(request):
    """Get all unique business categories from the database"""
    if request.method == 'GET':
        try:
            # Get all records and group by codigo_act
            records = DenueRecord.objects.all().distinct('codigo_act', 'nombre_act')
            
            # Group by codigo_act
            activities_by_code = {}
            for record in records:
                codigo_act = record.codigo_act
                # Apply UTF-8 mojibake fix to nombre_act
                nombre_act = record.nombre_act
                
                if codigo_act not in activities_by_code:
                    activities_by_code[codigo_act] = {
                        'codigo_act': codigo_act,
                        'nombre_act': nombre_act
                    }
            
            # Convert to list and sort by codigo_act
            activities_list = list(activities_by_code.values())
            activities_list.sort(key=lambda x: x['codigo_act'])
            
            return JsonResponse({'success': True, 'data': activities_list})
            
        except Exception as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Error retrieving business categories: {str(e)}'
            }, status=500)
    
    return JsonResponse({
        'error_code': ApiErrorCode.INVALID_METHOD.value,
        'message': 'Only GET method is allowed'
    }, status=405)

@csrf_exempt
def serve_domain_validation(request, filename):
    """Serve domain validation file for SSL certificate verification"""
    if filename == '7A7F06589A81FF92EE4164BD5B34B74B.txt':
        return HttpResponse('1D786A5A4CA5C307DE2706195B53A95D6ED92574FB253A7E7B83763E291AC8B7\ncomodoca.com\nRfIEzhrQJl', content_type='text/plain')
    return HttpResponse('File not found', status=404)

@csrf_exempt
def get_business_indicators(request):
    """Get GeoZone records that intersect with a circle defined by radius and center coordinates"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ['coordinates', 'radius']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return JsonResponse({
                    'error_code': ApiErrorCode.MISSING_FIELDS.value,
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=400)
            
            coordinates = data['coordinates']
            radius = data['radius']
            
            # Validate coordinates
            if not isinstance(coordinates, dict) or 'lat' not in coordinates or 'lng' not in coordinates:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Invalid coordinates format. Expected {lat: number, lng: number}'
                }, status=400)
            
            # Validate radius
            if not isinstance(radius, (int, float)) or radius <= 0:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Invalid radius. Must be a positive number in meters'
                }, status=400)
            
            # Create Point from coordinates
            point = Point(coordinates['lng'], coordinates['lat'], srid=4326)
            
            # Use Django GIS distance query to find intersecting GeoZones
            from django.contrib.gis.measure import Distance
            
            # Filter GeoZones that intersect with the circle
            geozones = GeoZone.objects.filter(
                geometry__distance_lte=(point, Distance(m=radius))
            )
            
            # Convert to list of dictionaries, excluding airbnb fields
            geozones_list = []
            for zone in geozones:
                # Get all field names from the model
                field_names = [field.name for field in zone._meta.fields]
                
                # Filter out fields that start with 'airbnb'
                filtered_fields = [field for field in field_names if not field.startswith('airbnb')]
                
                # Create dictionary with filtered fields
                zone_dict = {}
                for field_name in filtered_fields:
                    value = getattr(zone, field_name)
                    
                    # Handle geometry field specially
                    if field_name == 'geometry':
                        zone_dict[field_name] = {
                            'type': 'Polygon',
                            'coordinates': json.loads(value.geojson)['coordinates']
                        }
                    # Handle ArrayField fields
                    elif hasattr(value, '__iter__') and not isinstance(value, (str, bytes)):
                        zone_dict[field_name] = list(value) if value else []
                    # Handle other fields
                    else:
                        zone_dict[field_name] = value
                
                geozones_list.append(zone_dict)
            
            return JsonResponse({
                'status': 'success',
                'data': {
                    'geozones': geozones_list,
                    'count': len(geozones_list),
                    'radius_meters': radius,
                    'coordinates': coordinates
                }
            })
            
        except (KeyError, json.JSONDecodeError, ValueError) as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Invalid data: {str(e)}'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': str(e)
            }, status=500)
    else:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_METHOD.value,
            'message': 'Only POST method is allowed'
        }, status=405)

@csrf_exempt
def get_phone_locations_by_date(request, date):
    """Get phone locations for a specific date in GeoJSON or CSV format"""
    try:
        # Convert date string to datetime objects for start and end of day
        from datetime import datetime, timedelta
        import pytz
        import csv
        from django.http import HttpResponse
        
        # Determine the response format based on the URL
        request_path = request.path
        if request_path.endswith('.csv'):
            response_format = 'csv'
            # Remove .csv suffix from date for parsing
            date = date.replace('.csv', '')
        elif request_path.endswith('.geojson'):
            response_format = 'geojson'
            # Remove .geojson suffix from date for parsing
            date = date.replace('.geojson', '')
        else:
            response_format = 'geojson'  # Default format
        
        # Parse the date parameter - support both date and datetime formats
        try:
            # Try to parse as datetime first (YYYY-MM-DDTHH:MM:SS)
            if 'T' in date or ' ' in date:
                target_datetime = datetime.strptime(date.replace(' ', 'T'), '%Y-%m-%dT%H:%M:%S')
                # Use the exact datetime provided
                start_datetime = target_datetime
                end_datetime = target_datetime
            else:
                # Parse as date (YYYY-MM-DD) and use full day
                target_date = datetime.strptime(date, '%Y-%m-%d').date()
                start_datetime = datetime.combine(target_date, datetime.min.time())
                end_datetime = datetime.combine(target_date, datetime.max.time())
        except ValueError:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': 'Invalid date format. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS'
            }, status=400)
        
        # Create timezone-aware datetime objects
        mexico_tz = pytz.timezone('America/Mexico_City')
        if start_datetime.tzinfo is None:
            start_datetime = mexico_tz.localize(start_datetime)
        if end_datetime.tzinfo is None:
            end_datetime = mexico_tz.localize(end_datetime)
        
        # Convert to UTC for database query
        start_utc = start_datetime.astimezone(pytz.UTC)
        end_utc = end_datetime.astimezone(pytz.UTC)
        
        # Convert to milliseconds for timestamp comparison
        start_timestamp = int(start_utc.timestamp() * 1000)
        end_timestamp = int(end_utc.timestamp() * 1000)
        
        # Query phone locations for the specified date/time
        phone_locations = PhoneLocation.objects.filter(
            timestamp__gte=start_timestamp,
            timestamp__lte=end_timestamp
        ).order_by('timestamp')
        
        # Build GeoJSON response
        features = []
        for location in phone_locations:
            # Get coordinates
            coords = location.coordinates()
            if coords:
                feature = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': coords
                    },
                    'properties': {
                        'device_id': location.device_id,
                        'id_type': location.id_type,
                        'device_os': location.device_os,
                        'os_version': location.os_version,
                        'horizontal_accuracy': location.horizontal_accuracy,
                        'timestamp': location.timestamp,
                        'timestamp_datetime': location.get_mexico_time().isoformat(),
                        'mexico_time': location.get_mexico_time().isoformat(),
                        'ip_address': location.ip_address,
                        'user_agent': location.user_agent,
                        'country': location.country,
                        'geohash': location.geohash,
                        'source_id': location.source_id,
                        'publisher_id': location.publisher_id,
                        'app_id': location.app_id,
                        'location_context': location.location_context,
                        'consent': location.consent,
                        'quad_id': location.quad_id,
                        'created_at': location.created_at.isoformat(),
                        'is_ios': location.is_ios,
                        'is_android': location.is_android,
                        'is_foreground': location.is_foreground,
                        'is_background': location.is_background,
                        'has_consent': location.has_consent
                    }
                }
                features.append(feature)
        
        # Return response based on format
        if response_format == 'csv':
            # Create CSV response
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="phone_locations_{date}.csv"'
            
            writer = csv.writer(response)
            # Write header
            writer.writerow([
                'device_id', 'id_type', 'device_os', 'os_version', 'horizontal_accuracy',
                'timestamp', 'timestamp_datetime', 'mexico_time', 'ip_address', 'user_agent',
                'country', 'geohash', 'source_id', 'publisher_id', 'app_id', 'location_context',
                'consent', 'quad_id', 'created_at', 'is_ios', 'is_android', 'is_foreground',
                'is_background', 'has_consent', 'latitude', 'longitude'
            ])
            
            # Write data rows
            for location in phone_locations:
                coords = location.coordinates()
                writer.writerow([
                    location.device_id,
                    location.id_type,
                    location.device_os,
                    location.os_version,
                    location.horizontal_accuracy,
                    location.timestamp,
                    location.get_mexico_time().isoformat(),
                    location.get_mexico_time().isoformat(),
                    location.ip_address,
                    location.user_agent,
                    location.country,
                    location.geohash,
                    location.source_id,
                    location.publisher_id,
                    location.app_id,
                    location.location_context,
                    location.consent,
                    location.quad_id,
                    location.created_at.isoformat(),
                    location.is_ios,
                    location.is_android,
                    location.is_foreground,
                    location.is_background,
                    location.has_consent,
                    coords[1] if coords else None,  # latitude
                    coords[0] if coords else None   # longitude
                ])
            
            return response
        else:
            # Create GeoJSON response
            geojson_response = {
                'type': 'FeatureCollection',
                'features': features,
                'properties': {
                    'date': date,
                    'count': len(features),
                    'start_timestamp': start_timestamp,
                    'end_timestamp': end_timestamp,
                    'start_datetime_utc': start_utc.isoformat(),
                    'end_datetime_utc': end_utc.isoformat(),
                    'start_datetime_mexico': start_datetime.isoformat(),
                    'end_datetime_mexico': end_datetime.isoformat(),
                    'is_exact_datetime': 'T' in date or ' ' in date
                }
            }
            
            return JsonResponse(geojson_response, content_type='application/geo+json')
        
    except Exception as e:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_DATA.value,
            'message': str(e)
        }, status=500)

@csrf_exempt
def get_phone_locations_by_date_range(request, start_date, end_date):
    """Get phone locations between two dates in GeoJSON or CSV format"""
    try:
        # Convert date strings to datetime objects
        from datetime import datetime, timedelta
        import pytz
        import csv
        from django.http import HttpResponse
        
        # Determine the response format based on the URL
        request_path = request.path
        if request_path.endswith('.csv'):
            response_format = 'csv'
            # Remove .csv suffix from dates for parsing
            start_date = start_date.replace('.csv', '')
            end_date = end_date.replace('.csv', '')
        elif request_path.endswith('.geojson'):
            response_format = 'geojson'
            # Remove .geojson suffix from dates for parsing
            start_date = start_date.replace('.geojson', '')
            end_date = end_date.replace('.geojson', '')
        else:
            response_format = 'geojson'  # Default format
        
        # Parse the date parameters - support both date and datetime formats
        try:
            # Parse start_date
            if 'T' in start_date or ' ' in start_date:
                start_datetime = datetime.strptime(start_date.replace(' ', 'T'), '%Y-%m-%dT%H:%M:%S')
            else:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                start_datetime = datetime.combine(start_date_obj, datetime.min.time())
            
            # Parse end_date
            if 'T' in end_date or ' ' in end_date:
                end_datetime = datetime.strptime(end_date.replace(' ', 'T'), '%Y-%m-%dT%H:%M:%S')
            else:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                end_datetime = datetime.combine(end_date_obj, datetime.max.time())
                
        except ValueError:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': 'Invalid date format. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS for both start_date and end_date'
            }, status=400)
        
        # Validate date range
        if start_datetime > end_datetime:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': 'start_date cannot be after end_date'
            }, status=400)
        
        # Create timezone-aware datetime objects
        mexico_tz = pytz.timezone('America/Mexico_City')
        if start_datetime.tzinfo is None:
            start_datetime = mexico_tz.localize(start_datetime)
        if end_datetime.tzinfo is None:
            end_datetime = mexico_tz.localize(end_datetime)
        
        # Convert to UTC for database query
        start_utc = start_datetime.astimezone(pytz.UTC)
        end_utc = end_datetime.astimezone(pytz.UTC)
        
        # Convert to milliseconds for timestamp comparison
        start_timestamp = int(start_utc.timestamp() * 1000)
        end_timestamp = int(end_utc.timestamp() * 1000)
        
        # Query phone locations for the specified date range
        phone_locations = PhoneLocation.objects.filter(
            timestamp__gte=start_timestamp,
            timestamp__lte=end_timestamp
        ).order_by('timestamp')
        
        # Build GeoJSON response
        features = []
        for location in phone_locations:
            # Get coordinates
            coords = location.coordinates()
            if coords:
                feature = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': coords
                    },
                    'properties': {
                        'device_id': location.device_id,
                        'id_type': location.id_type,
                        'device_os': location.device_os,
                        'os_version': location.os_version,
                        'horizontal_accuracy': location.horizontal_accuracy,
                        'timestamp': location.timestamp,
                        'timestamp_datetime': location.get_mexico_time().isoformat(),
                        'mexico_time': location.get_mexico_time().isoformat(),
                        'ip_address': location.ip_address,
                        'user_agent': location.user_agent,
                        'country': location.country,
                        'geohash': location.geohash,
                        'source_id': location.source_id,
                        'publisher_id': location.publisher_id,
                        'app_id': location.app_id,
                        'location_context': location.location_context,
                        'consent': location.consent,
                        'quad_id': location.quad_id,
                        'created_at': location.created_at.isoformat(),
                        'is_ios': location.is_ios,
                        'is_android': location.is_android,
                        'is_foreground': location.is_foreground,
                        'is_background': location.is_background,
                        'has_consent': location.has_consent
                    }
                }
                features.append(feature)
        
        # Calculate date range days (only for date-only inputs)
        date_range_days = None
        if 'T' not in start_date and ' ' not in start_date and 'T' not in end_date and ' ' not in end_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            date_range_days = (end_date_obj - start_date_obj).days + 1
        
        # Return response based on format
        if response_format == 'csv':
            # Create CSV response
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="phone_locations_{start_date}_to_{end_date}.csv"'
            
            writer = csv.writer(response)
            # Write header
            writer.writerow([
                'device_id', 'id_type', 'device_os', 'os_version', 'horizontal_accuracy',
                'timestamp', 'timestamp_datetime', 'mexico_time', 'ip_address', 'user_agent',
                'country', 'geohash', 'source_id', 'publisher_id', 'app_id', 'location_context',
                'consent', 'quad_id', 'created_at', 'is_ios', 'is_android', 'is_foreground',
                'is_background', 'has_consent', 'latitude', 'longitude'
            ])
            
            # Write data rows
            for location in phone_locations:
                coords = location.coordinates()
                writer.writerow([
                    location.device_id,
                    location.id_type,
                    location.device_os,
                    location.os_version,
                    location.horizontal_accuracy,
                    location.timestamp,
                    location.get_mexico_time().isoformat(),
                    location.get_mexico_time().isoformat(),
                    location.ip_address,
                    location.user_agent,
                    location.country,
                    location.geohash,
                    location.source_id,
                    location.publisher_id,
                    location.app_id,
                    location.location_context,
                    location.consent,
                    location.quad_id,
                    location.created_at.isoformat(),
                    location.is_ios,
                    location.is_android,
                    location.is_foreground,
                    location.is_background,
                    location.has_consent,
                    coords[1] if coords else None,  # latitude
                    coords[0] if coords else None   # longitude
                ])
            
            return response
        else:
            # Create GeoJSON response
            geojson_response = {
                'type': 'FeatureCollection',
                'features': features,
                'properties': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'count': len(features),
                    'start_timestamp': start_timestamp,
                    'end_timestamp': end_timestamp,
                    'start_datetime_utc': start_utc.isoformat(),
                    'end_datetime_utc': end_utc.isoformat(),
                    'start_datetime_mexico': start_datetime.isoformat(),
                    'end_datetime_mexico': end_datetime.isoformat(),
                    'date_range_days': date_range_days,
                    'is_datetime_range': 'T' in start_date or ' ' in start_date or 'T' in end_date or ' ' in end_date
                }
            }
            
            return JsonResponse(geojson_response, content_type='application/geo+json')
        
    except Exception as e:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_DATA.value,
            'message': str(e)
        }, status=500)

@csrf_exempt
def get_phone_locations_batches(request, hour_num, start_date, end_date):
    """Generate batches of phone locations based on hour intervals and return as ZIP file"""
    try:
        # Convert date strings to datetime objects
        from datetime import datetime, timedelta
        import pytz
        import zipfile
        import io
        import json
        
        # Parse the date parameters - support both date and datetime formats
        try:
            # Parse start_date
            if 'T' in start_date or ' ' in start_date:
                start_datetime = datetime.strptime(start_date.replace(' ', 'T'), '%Y-%m-%dT%H:%M:%S')
            else:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                start_datetime = datetime.combine(start_date_obj, datetime.min.time())
            
            # Parse end_date
            if 'T' in end_date or ' ' in end_date:
                end_datetime = datetime.strptime(end_date.replace(' ', 'T'), '%Y-%m-%dT%H:%M:%S')
            else:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                end_datetime = datetime.combine(end_date_obj, datetime.max.time())
                
        except ValueError:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': 'Invalid date format. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS for both start_date and end_date'
            }, status=400)
        
        # Validate date range
        if start_datetime > end_datetime:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': 'start_date cannot be after end_date'
            }, status=400)
        
        # Validate hour_num
        if hour_num <= 0 or hour_num > 168:  # Max 1 week (168 hours)
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': 'hour_num must be between 1 and 168 (1 week)'
            }, status=400)
        
        # Create timezone-aware datetime objects
        mexico_tz = pytz.timezone('America/Mexico_City')
        if start_datetime.tzinfo is None:
            start_datetime = mexico_tz.localize(start_datetime)
        if end_datetime.tzinfo is None:
            end_datetime = mexico_tz.localize(end_datetime)
        
        # Calculate total duration in hours
        total_duration = end_datetime - start_datetime
        total_hours = total_duration.total_seconds() / 3600
        
        # Calculate number of batches
        num_batches = int(total_hours / hour_num)
        if total_hours % hour_num != 0:
            num_batches += 1  # Add one more batch for remaining time
        
        print(f"DEBUG: Generating {num_batches} batches for {total_hours} hours with {hour_num} hour intervals")
        
        # Generate batch time windows first
        batch_windows = []
        current_start = start_datetime
        
        for i in range(num_batches):
            # Calculate batch end time
            if i == num_batches - 1:
                # Last batch - use the actual end time
                batch_end = end_datetime
            else:
                # Regular batch - add hour_num hours
                batch_end = current_start + timedelta(hours=hour_num)
            
            # Convert to UTC for database query
            batch_start_utc = current_start.astimezone(pytz.UTC)
            batch_end_utc = batch_end.astimezone(pytz.UTC)
            
            # Convert to milliseconds for timestamp comparison
            batch_start_timestamp = int(batch_start_utc.timestamp() * 1000)
            batch_end_timestamp = int(batch_end_utc.timestamp() * 1000)
            
            batch_windows.append({
                'batch_number': i + 1,
                'batch_start': current_start,
                'batch_end': batch_end,
                'batch_start_utc': batch_start_utc,
                'batch_end_utc': batch_end_utc,
                'batch_start_timestamp': batch_start_timestamp,
                'batch_end_timestamp': batch_end_timestamp
            })
            
            # Move to next batch start time
            current_start = batch_end
        
        # Create ZIP file in memory
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Process each batch window and create files
            batches_metadata = []
            total_locations = 0
            
            print(f"DEBUG: Processing {len(batch_windows)} batch windows")
            
            for i, batch_window in enumerate(batch_windows):
                print(f"DEBUG: Processing batch {i+1}/{len(batch_windows)}: {batch_window['batch_start']} to {batch_window['batch_end']}")
                
                try:
                    # Query phone locations for this batch
                    phone_locations = PhoneLocation.objects.filter(
                        timestamp__gte=batch_window['batch_start_timestamp'],
                        timestamp__lt=batch_window['batch_end_timestamp']
                    ).order_by('timestamp')
                    
                    print(f"DEBUG: Found {phone_locations.count()} locations for batch {i+1}")
                    
                    # Build GeoJSON features for this batch
                    features = []
                    for location in phone_locations:
                        # Get coordinates
                        coords = location.coordinates()
                        if coords:
                            feature = {
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Point',
                                    'coordinates': coords
                                },
                                'properties': {
                                    'device_id': location.device_id,
                                    'id_type': location.id_type,
                                    'device_os': location.device_os,
                                    'os_version': location.os_version,
                                    'horizontal_accuracy': location.horizontal_accuracy,
                                    'timestamp': location.timestamp,
                                    'timestamp_datetime': location.get_mexico_time().isoformat(),
                                    'mexico_time': location.get_mexico_time().isoformat(),
                                    'ip_address': location.ip_address,
                                    'user_agent': location.user_agent,
                                    'country': location.country,
                                    'geohash': location.geohash,
                                    'source_id': location.source_id,
                                    'publisher_id': location.publisher_id,
                                    'app_id': location.app_id,
                                    'location_context': location.location_context,
                                    'consent': location.consent,
                                    'quad_id': location.quad_id,
                                    'created_at': location.created_at.isoformat(),
                                    'is_ios': location.is_ios,
                                    'is_android': location.is_android,
                                    'is_foreground': location.is_foreground,
                                    'is_background': location.is_background,
                                    'has_consent': location.has_consent
                                }
                            }
                            features.append(feature)
                    
                    # Create batch metadata
                    batch_metadata = {
                        'batch_number': batch_window['batch_number'],
                        'total_batches': num_batches,
                        'batch_start': batch_window['batch_start'].isoformat(),
                        'batch_end': batch_window['batch_end'].isoformat(),
                        'batch_start_utc': batch_window['batch_start_utc'].isoformat(),
                        'batch_end_utc': batch_window['batch_end_utc'].isoformat(),
                        'batch_start_timestamp': batch_window['batch_start_timestamp'],
                        'batch_end_timestamp': batch_window['batch_end_timestamp'],
                        'hour_interval': hour_num,
                        'location_count': len(features)
                    }
                    batches_metadata.append(batch_metadata)
                    total_locations += len(features)
                    
                    # Create GeoJSON for this batch
                    geojson_data = {
                        'type': 'FeatureCollection',
                        'features': features,
                        'properties': {
                            'batch_number': batch_window['batch_number'],
                            'total_batches': num_batches,
                            'batch_start': batch_window['batch_start'].isoformat(),
                            'batch_end': batch_window['batch_end'].isoformat(),
                            'batch_start_utc': batch_window['batch_start_utc'].isoformat(),
                            'batch_end_utc': batch_window['batch_end_utc'].isoformat(),
                            'batch_start_timestamp': batch_window['batch_start_timestamp'],
                            'batch_end_timestamp': batch_window['batch_end_timestamp'],
                            'hour_interval': hour_num,
                            'count': len(features)
                        }
                    }
                    
                    # Create filename for this batch
                    batch_filename = f"batch_{batch_window['batch_number']:03d}_{batch_window['batch_start'].strftime('%Y%m%d_%H%M')}_to_{batch_window['batch_end'].strftime('%Y%m%d_%H%M')}.geojson"
                    
                    # Add batch file to ZIP
                    zip_file.writestr(batch_filename, json.dumps(geojson_data, indent=2))
                    
                    print(f"DEBUG: Completed batch {i+1} with {len(features)} features")
                    
                except Exception as e:
                    print(f"ERROR: Failed to process batch {i+1}: {str(e)}")
                    # Continue with next batch instead of failing completely
                    continue
            
            # Add metadata file
            metadata = {
                'request': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'hour_interval': hour_num,
                    'total_duration_hours': total_hours,
                    'num_batches': num_batches
                },
                'batches': batches_metadata,
                'summary': {
                    'total_locations': total_locations,
                    'total_batches': num_batches,
                    'average_locations_per_batch': total_locations / num_batches if num_batches > 0 else 0
                }
            }
            
            zip_file.writestr('metadata.json', json.dumps(metadata, indent=2))
        
        # Prepare ZIP file for download
        zip_buffer.seek(0)
        
        # Create filename for the ZIP file
        zip_filename = f"phone_locations_batches_{hour_num}h_{start_date.replace(':', '-').replace('T', '_')}_to_{end_date.replace(':', '-').replace('T', '_')}.zip"
        
        # Create HTTP response with ZIP file
        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
        
        return response
        
    except Exception as e:
        return JsonResponse({
            'error_code': ApiErrorCode.INVALID_DATA.value,
            'message': str(e)
        }, status=500)

@csrf_exempt
def list_trip_files(request):
    """List all trip files from the S3 trips directory"""
    if request.method == 'GET':
        try:
            import boto3
            import os
            from django.conf import settings
            
            # Get directory parameter from query string
            directory = request.GET.get('directory', 'trips-consolidated')
            
            # Validate directory parameter
            if directory not in ['trips', 'trips-consolidated']:
                return JsonResponse({
                    'error_code': ApiErrorCode.INVALID_DATA.value,
                    'message': 'Invalid directory parameter. Must be "trips" or "trips-consolidated"'
                }, status=400)
            
            # Initialize S3 client
            s3_client = boto3.client(
                's3',
                aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
                aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
                region_name='us-east-2'
            )
            
            # List objects in the specified directory
            bucket_name = 'distritosmexico'
            prefix = f'{directory}/'
            
            try:
                response = s3_client.list_objects_v2(
                    Bucket=bucket_name,
                    Prefix=prefix
                )
                
                trip_files = []
                if 'Contents' in response:
                    for obj in response['Contents']:
                        # Only include .geojson files
                        if obj['Key'].endswith('.geojson'):
                            filename = obj['Key'].split('/')[-1]  # Get just the filename
                            trip_files.append({
                                'filename': filename,
                                'url': f'https://{bucket_name}.s3.us-east-2.amazonaws.com/{obj["Key"]}',
                                'size': obj['Size'],
                                'last_modified': obj['LastModified'].isoformat()
                            })
                
                # Sort by filename for consistent ordering
                trip_files.sort(key=lambda x: x['filename'])
                
                return JsonResponse({
                    'status': 'success',
                    'data': {
                        'trip_files': trip_files,
                        'count': len(trip_files),
                        'directory': directory
                    }
                })
                
            except Exception as s3_error:
                # If S3 access fails, return a fallback with known files
                fallback_files = [
                    {
                        'filename': '000545a1-9a11-4e5e-aefb-84c28cdb670d-2025-09-01.geojson',
                        'url': 'https://distritosmexico.s3.us-east-2.amazonaws.com/trips/000545a1-9a11-4e5e-aefb-84c28cdb670d-2025-09-01.geojson',
                        'size': 0,
                        'last_modified': '2025-10-26T17:18:00Z'
                    }
                ]
                
                return JsonResponse({
                    'status': 'success',
                    'data': {
                        'trip_files': fallback_files,
                        'count': len(fallback_files),
                        'directory': directory,
                        'note': 'Using fallback files due to S3 access error'
                    }
                })
                
        except Exception as e:
            return JsonResponse({
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Error listing trip files: {str(e)}'
            }, status=500)
    
    return JsonResponse({
        'error_code': ApiErrorCode.INVALID_METHOD.value,
        'message': 'Only GET method is allowed'
    }, status=405)

@csrf_exempt
def validate_mundial_password(request):
    """Validate password for mundial-2025 project access"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            password = data.get('password', '')
            
            # Correct password
            correct_password = "UE1mIdQkJHw9JGW0"
            
            if password == correct_password:
                # Set session variable to indicate authenticated access
                request.session['mundial_2025_authenticated'] = True
                return JsonResponse({
                    'success': True,
                    'message': 'Password correct'
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error_code': ApiErrorCode.INVALID_CREDENTIALS.value,
                    'message': 'Incorrect password'
                }, status=401)
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error_code': ApiErrorCode.INVALID_DATA.value,
                'message': f'Error validating password: {str(e)}'
            }, status=500)
    
    return JsonResponse({
        'error_code': ApiErrorCode.INVALID_METHOD.value,
        'message': 'Only POST method is allowed'
    }, status=405)

def check_mundial_auth(request):
    """Check if user is authenticated for mundial-2025 project"""
    if request.method == 'GET':
        authenticated = request.session.get('mundial_2025_authenticated', False)
        return JsonResponse({
            'authenticated': authenticated
        })
    
    return JsonResponse({
        'error_code': ApiErrorCode.INVALID_METHOD.value,
        'message': 'Only GET method is allowed'
    }, status=405)