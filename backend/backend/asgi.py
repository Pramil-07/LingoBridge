import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

# 1️⃣ Set settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# 2️⃣ Initialize Django before importing anything that uses models
django.setup()

# 3️⃣ Now safe to import anything that depends on Django models
from app.middleware import JWTAuthMiddleware
import app.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(app.routing.websocket_urlpatterns)
    ),
})
