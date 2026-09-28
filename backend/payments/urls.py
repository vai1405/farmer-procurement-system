from django.urls import path

from payments.views import (
    MyPaymentsView,
    PaymentByProcurementView,
    PaymentDetailView,
    PaymentListCreateView,
)

urlpatterns = [
    path('', PaymentListCreateView.as_view(), name='payment-list-create'),
    path('my/', MyPaymentsView.as_view(), name='payment-my'),
    path('by-procurement/<str:procurement_id>/', PaymentByProcurementView.as_view(),
         name='payment-by-procurement'),
    path('<str:payment_id>/', PaymentDetailView.as_view(), name='payment-detail'),
]