import { useCallback, useEffect, useState } from 'react';

import BookingConfirmation from '../../components/bookings/BookingConfirmation';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import SlotAvailability from '../../components/slots/SlotAvailability';
import { useToast } from '../../context/ToastContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getErrorMessage } from '../../services/api';
import { bookingService } from '../../services/bookingService';
import { centreService } from '../../services/centreService';
import { slotService } from '../../services/slotService';

/**
 * Farmer's slot-browsing and booking screen.
 *
 * Booking flow:
 *   1. Farmer picks a centre -> available slots load.
 *   2. Farmer clicks "Book This Slot" -> POST /api/bookings/.
 *   3. On success, a confirmation modal shows the token, centre, date,
 *      time, and status exactly as specified.
 *   4. Slots reload so the just-booked slot's availability count updates
 *      immediately, without a full page refresh.
 */
const BookSlot = () => {
  usePageTitle('Book a Slot');

  const toast = useToast();

  const [centres, setCentres] = useState([]);
  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [availability, setAvailability] = useState(null);

  const [isLoadingCentres, setIsLoadingCentres] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [error, setError] = useState('');

  const [bookingSlotId, setBookingSlotId] = useState(null); // slot currently being booked
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    centreService
      .listActive()
      .then(setCentres)
      .catch((fetchError) => setError(getErrorMessage(fetchError)))
      .finally(() => setIsLoadingCentres(false));
  }, []);

  const loadSlots = useCallback(async (centreId) => {
    if (!centreId) {
      setAvailability(null);
      return;
    }

    setIsLoadingSlots(true);
    setError('');

    try {
      const result = await slotService.getAvailable(centreId);
      setAvailability(result);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    loadSlots(selectedCentreId);
  }, [selectedCentreId, loadSlots]);

  const handleBook = async (slot) => {
    setBookingSlotId(slot.id);

    try {
      const booking = await bookingService.create(slot.id);
      setConfirmedBooking(booking);
      toast.success(`Slot booked! Your token is #${booking.token_number}.`);
      // Refresh availability so the card the farmer just filled updates
      // (or disappears if it's now full) without a manual reload.
      loadSlots(selectedCentreId);
    } catch (bookError) {
      toast.error(getErrorMessage(bookError));
    } finally {
      setBookingSlotId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Book a Procurement Slot"
        subtitle="Select a centre to see available dates and time slots"
      />

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <label htmlFor="centre" className="form-label fw-medium">
            Procurement Centre
          </label>

          {isLoadingCentres ? (
            <Loader message="Loading centres..." fullPage={false} />
          ) : centres.length === 0 ? (
            <EmptyState
              icon="🏢"
              title="No centres available"
              message="There are currently no active procurement centres. Please check back later."
            />
          ) : (
            <select
              id="centre"
              className="form-select form-select-lg"
              value={selectedCentreId}
              onChange={(event) => setSelectedCentreId(event.target.value)}
            >
              <option value="">Select a procurement centre...</option>
              {centres.map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.name} — {centre.location}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => loadSlots(selectedCentreId)}
        />
      )}

      {selectedCentreId && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom fw-semibold py-3">
            Available Slots
            {availability?.centre && (
              <span className="text-muted fw-normal">
                {' '}
                — {availability.centre.name}
              </span>
            )}
          </div>

          <div className="card-body">
            {isLoadingSlots ? (
              <Loader
                message="Checking availability..."
                fullPage={false}
              />
            ) : !availability || availability.slots.length === 0 ? (
              <EmptyState
                icon="📅"
                title="No slots available"
                message="There are no open procurement slots at this centre right now. Please check back soon or try another centre."
              />
            ) : (
              <div className="row g-3">
                {availability.slots.map((slot) => (
                  <div key={slot.id} className="col-12 col-sm-6 col-lg-4">
                    <div
                      className={`card h-100 ${
                        slot.is_full ? 'border-danger' : 'border-light'
                      }`}
                    >
                      <div className="card-body">
                        <SlotAvailability slot={slot} />
                        <button
                          type="button"
                          className="btn btn-agri w-100 mt-3"
                          disabled={
                            slot.is_full || bookingSlotId === slot.id
                          }
                          onClick={() => handleBook(slot)}
                        >
                          {bookingSlotId === slot.id ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" />
                              Booking...
                            </>
                          ) : slot.is_full ? (
                            'Slot Full'
                          ) : (
                            'Book This Slot'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <BookingConfirmation
        booking={confirmedBooking}
        isOpen={Boolean(confirmedBooking)}
        onClose={() => setConfirmedBooking(null)}
      />
    </div>
  );
};

export default BookSlot;