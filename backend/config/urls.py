"""
Root URL configuration.

Each feature module owns its own urls.py and is mounted under /api/.
We'll uncomment the remaining includes as those modules are built
in the steps ahead.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),

    # Health checks
    path('api/', include('core.urls')),
      # Authentication


   path('api/auth/', include('accounts.urls')),            # Step 3
    path('api/farmers/', include('farmers.urls')),          # Step 4
     path('api/', include('procurement.urls')),              # Steps 5-6, 10
    path('api/', include('queue_management.urls')),         # Steps 7-8
     path('api/payments/', include('payments.urls')),        # Step 11
    path('api/notifications/', include('notifications.urls')),  # Step 12
]