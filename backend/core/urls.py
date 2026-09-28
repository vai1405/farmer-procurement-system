from django.urls import path

from core.views import DatabaseHealthView, HealthView

urlpatterns = [
    path('health/', HealthView.as_view(), name='health'),
    path('db-health/', DatabaseHealthView.as_view(), name='db-health'),
]