"""
Custom middleware for WebSocket JWT authentication
"""
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async


@database_sync_to_async
def get_user_from_token(token):
    """Get user from JWT token - imports done inside to avoid AppRegistryNotReady"""
    # Import Django-dependent modules here to avoid AppRegistryNotReady error
    from django.contrib.auth import get_user_model
    from rest_framework_simplejwt.tokens import UntypedToken
    from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
    from jwt import decode as jwt_decode
    from django.conf import settings
    
    User = get_user_model()
    
    try:
        UntypedToken(token)
        decoded_data = jwt_decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = decoded_data.get('user_id')
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return None


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware to authenticate WebSocket connections using JWT tokens
    """
    
    async def __call__(self, scope, receive, send):
        # Only handle WebSocket connections
        if scope['type'] == 'websocket':
            # Extract token from query string
            query_string = scope.get('query_string', b'').decode()
            token = None
            
            if 'token=' in query_string:
                token = query_string.split('token=')[1].split('&')[0]
            
            if token:
                # Authenticate user
                user = await get_user_from_token(token)
                if user:
                    scope['user'] = user
                else:
                    # Close connection if authentication fails
                    await send({
                        'type': 'websocket.close',
                        'code': 4001,  # Unauthorized
                    })
                    return
            else:
                # No token provided, close connection
                await send({
                    'type': 'websocket.close',
                    'code': 4001,  # Unauthorized
                })
                return
        
        # For HTTP requests, just pass through
        return await super().__call__(scope, receive, send)

