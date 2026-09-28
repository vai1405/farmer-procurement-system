from django.urls import path

from farmers.views import (
    DashboardView,
    FarmerDetailView,
    FarmerDirectoryView,
    ProfileView,
    StaffDashboardView,
    SystemReportView,
)

urlpatterns = [
    # Farmer-facing
    path('profile/', ProfileView.as_view(), name='farmer-profile'),
    path('dashboard/', DashboardView.as_view(), name='farmer-dashboard'),

    # Staff-facing
    path('staff-dashboard/', StaffDashboardView.as_view(), name='staff-dashboard'),
    path('directory/', FarmerDirectoryView.as_view(), name='farmer-directory'),
    path(
        'directory/<str:farmer_id>/',
        FarmerDetailView.as_view(),
        name='farmer-detail'
    ),

    # Admin reports
    path('reports/', SystemReportView.as_view(), name='admin-reports'),
]