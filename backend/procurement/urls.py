from django.urls import path

from procurement.views import (
    CentreActiveListView,
    CentreDetailView,
    CentreListCreateView,
    CentreStatusView,
    ProcurementByBookingView,
    ProcurementDetailView,
    ProcurementListCreateView,
    SlotAvailableView,
    SlotDetailView,
    SlotListCreateView,
    SlotStatusView,
)

urlpatterns = [
    # Centres
    path('centres/', CentreListCreateView.as_view(), name='centre-list-create'),
    path('centres/active/', CentreActiveListView.as_view(), name='centre-active-list'),
    path('centres/<str:centre_id>/', CentreDetailView.as_view(), name='centre-detail'),
    path('centres/<str:centre_id>/status/', CentreStatusView.as_view(), name='centre-status'),

    # Slots
    path('slots/', SlotListCreateView.as_view(), name='slot-list-create'),
    path('slots/available/', SlotAvailableView.as_view(), name='slot-available'),
    path('slots/<str:slot_id>/', SlotDetailView.as_view(), name='slot-detail'),
    path('slots/<str:slot_id>/status/', SlotStatusView.as_view(), name='slot-status'),

    # Procurement — note 'by-booking/<id>/' registered before '<id>/'
    path('procurement/', ProcurementListCreateView.as_view(), name='procurement-list-create'),
    path('procurement/by-booking/<str:booking_id>/', ProcurementByBookingView.as_view(),
         name='procurement-by-booking'),
    path('procurement/<str:procurement_id>/', ProcurementDetailView.as_view(),
         name='procurement-detail'),
]