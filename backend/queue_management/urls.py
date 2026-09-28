from django.urls import path

from queue_management.views import (
    BookingCancelView,
    BookingDetailView,
    BookingListCreateView,
    QueueCallNextView,
    QueueStatusView,
)

urlpatterns = [
    # Bookings
    path('bookings/', BookingListCreateView.as_view(), name='booking-list-create'),
    path('bookings/<str:booking_id>/', BookingDetailView.as_view(), name='booking-detail'),
    path('bookings/<str:booking_id>/cancel/', BookingCancelView.as_view(), name='booking-cancel'),

    # Queue
    path('queue/status/', QueueStatusView.as_view(), name='queue-status'),
    path('queue/call-next/', QueueCallNextView.as_view(), name='queue-call-next'),
]