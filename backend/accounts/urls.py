from django.urls import path

from accounts.views import (
    AdminStaffCentreAssignView,
    AdminStaffCreateView,
    AdminUserListView,
    AdminUserStatusView,
    CurrentUserView,
    LoginView,
    LogoutView,
    RefreshTokenView,
    RegisterView,
    StaffLoginView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('staff-login/', StaffLoginView.as_view(), name='auth-staff-login'),
    path('refresh/', RefreshTokenView.as_view(), name='auth-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', CurrentUserView.as_view(), name='auth-me'),

    # Admin-only (Step 14)
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<str:user_id>/status/', AdminUserStatusView.as_view(), name='admin-user-status'),
    path('admin/staff/', AdminStaffCreateView.as_view(), name='admin-staff-create'),
    path('admin/staff/<str:user_id>/centre/', AdminStaffCentreAssignView.as_view(),
         name='admin-staff-centre'),
]