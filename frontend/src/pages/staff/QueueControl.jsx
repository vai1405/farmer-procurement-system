import { useCallback, useEffect, useState } from 'react';

import ConnectionStatus from '../../components/queue/ConnectionStatus';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import ProcurementForm from '../../components/procurement/ProcurementForm';

import { usePageTitle } from '../../hooks/usePageTitle';
import TokenPill from '../../components/queue/TokenPill';
import { useToast } from '../../context/ToastContext';
import { useQueueSocket } from '../../hooks/useQueueSocket';

import { getErrorMessage } from '../../services/api';
import { centreService } from '../../services/centreService';
import { procurementService } from '../../services/procurementService';
import { queueService } from '../../services/queueService';
import { slotService } from '../../services/slotService';

import { formatTime } from '../../utils/formatters';

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Staff/Admin queue control dashboard.
 *
 * Features:
 * - Select centre/date/slot
 * - View live queue
 * - Call next farmer
 * - Record procurement directly from currently-serving farmer
 * - Real-time queue updates through WebSocket
 */
const QueueControl = () => {
  usePageTitle('Queue Control');

  const toast = useToast();

  const [centres, setCentres] = useState([]);
  const [centreId, setCentreId] = useState('');
  const [date, setDate] = useState(todayISO());

  const [slots, setSlots] = useState([]);
  const [slotId, setSlotId] = useState('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [isCallingNext, setIsCallingNext] = useState(false);

  // Procurement modal state
  const [procurementBooking, setProcurementBooking] = useState(null);
  const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);

  // Track which bookings already have procurement records.
  const [procurementByBooking, setProcurementByBooking] = useState({});

  const {
    queueData,
    connectionStatus,
  } = useQueueSocket(slotId);

  // -------------------------------------------------------------------------
  // LOAD CENTRES
  // -------------------------------------------------------------------------

  useEffect(() => {
    centreService
      .listActive()
      .then(setCentres)
      .catch((error) => {
        toast.error(getErrorMessage(error));
      });
  }, [toast]);

  // -------------------------------------------------------------------------
  // LOAD SLOTS
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!centreId || !date) {
      setSlots([]);
      setSlotId('');
      return;
    }

    setIsLoadingSlots(true);

    slotService
      .list({
        centreId,
        dateFrom: date,
        dateTo: date,
        status: 'ACTIVE',
        pageSize: 50,
      })
      .then((result) => {
        setSlots(result.slots);

        setSlotId((current) =>
          result.slots.some((slot) => slot.id === current)
            ? current
            : '',
        );
      })
      .catch((fetchError) => {
        toast.error(getErrorMessage(fetchError));
      })
      .finally(() => {
        setIsLoadingSlots(false);
      });
  }, [centreId, date, toast]);

  // -------------------------------------------------------------------------
  // CHECK EXISTING PROCUREMENT RECORDS
  // -------------------------------------------------------------------------

  useEffect(() => {
    const currentlyServing =
      queueData?.currently_serving || [];

    if (currentlyServing.length === 0) {
      return;
    }

    let cancelled = false;

    const checkProcurementRecords = async () => {
      const results = await Promise.all(
        currentlyServing.map(async (booking) => {
          try {
            const procurement =
              await procurementService.getByBooking(
                booking.booking_id,
              );

            return {
              bookingId: booking.booking_id,
              exists: Boolean(procurement),
            };
          } catch {
            return {
              bookingId: booking.booking_id,
              exists: false,
            };
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setProcurementByBooking((previous) => {
        const next = { ...previous };

        results.forEach(({ bookingId, exists }) => {
          next[bookingId] = exists;
        });

        return next;
      });
    };

    checkProcurementRecords();

    return () => {
      cancelled = true;
    };
  }, [queueData]);

  // -------------------------------------------------------------------------
  // CALL NEXT FARMER
  // -------------------------------------------------------------------------

  const handleCallNext = useCallback(async () => {
    if (!slotId) {
      return;
    }

    setIsCallingNext(true);

    try {
      const result = await queueService.callNext(slotId);

      toast.success(
        `Token #${result.token_number} (${result.farmer_name}) called.`,
      );

      // No manual queue refetch is required.
      // Django Channels + Redis broadcasts the updated queue.
    } catch (callError) {
      toast.error(getErrorMessage(callError));
    } finally {
      setIsCallingNext(false);
    }
  }, [slotId, toast]);

  // -------------------------------------------------------------------------
  // OPEN PROCUREMENT FORM
  // -------------------------------------------------------------------------

  const handleRecordProcurement = useCallback(
    async (booking) => {
      try {
        // Check again before opening the form.
        const existing =
          await procurementService.getByBooking(
            booking.booking_id,
          );

        if (existing) {
          setProcurementByBooking((previous) => ({
            ...previous,
            [booking.booking_id]: true,
          }));

          toast.info(
            `Procurement for token #${booking.token_number} has already been recorded.`,
          );

          return;
        }

        setProcurementBooking(booking);
        setIsProcurementModalOpen(true);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [toast],
  );

  // -------------------------------------------------------------------------
  // SUBMIT PROCUREMENT
  // -------------------------------------------------------------------------

  const handleProcurementSubmit = useCallback(
    async (payload) => {
      try {
        const procurement =
          await procurementService.create(payload);

        setProcurementByBooking((previous) => ({
          ...previous,
          [payload.booking_id]: true,
        }));

        setIsProcurementModalOpen(false);
        setProcurementBooking(null);

        toast.success(
          `Procurement recorded successfully. Total amount: ₹${Number(
            procurement.total_amount,
          ).toLocaleString('en-IN')}.`,
        );
      } catch (error) {
        throw new Error(getErrorMessage(error));
      }
    },
    [toast],
  );

  // -------------------------------------------------------------------------
  // CLOSE PROCUREMENT MODAL
  // -------------------------------------------------------------------------

  const handleCloseProcurement = useCallback(() => {
    setIsProcurementModalOpen(false);
    setProcurementBooking(null);
  }, []);

  const selectedSlot = slots.find(
    (slot) => slot.id === slotId,
  );

  return (
    <div>
      <PageHeader
        title="Queue Control"
        subtitle="Manage the live procurement queue"
      >
        {slotId && (
          <ConnectionStatus
            status={connectionStatus}
          />
        )}
      </PageHeader>

      {/* ------------------------------------------------------------------ */}
      {/* CENTRE / DATE / SLOT SELECTORS                                    */}
      {/* ------------------------------------------------------------------ */}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">

            {/* Centre */}
            <div className="col-12 col-md-4">
              <label className="form-label fw-medium">
                Centre
              </label>

              <select
                className="form-select"
                value={centreId}
                onChange={(event) =>
                  setCentreId(event.target.value)
                }
              >
                <option value="">
                  Select a centre...
                </option>

                {centres.map((centre) => (
                  <option
                    key={centre.id}
                    value={centre.id}
                  >
                    {centre.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="col-12 col-md-3">
              <label className="form-label fw-medium">
                Date
              </label>

              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(event) =>
                  setDate(event.target.value)
                }
              />
            </div>

            {/* Slot */}
            <div className="col-12 col-md-5">
              <label className="form-label fw-medium">
                Slot
              </label>

              <select
                className="form-select"
                value={slotId}
                onChange={(event) =>
                  setSlotId(event.target.value)
                }
                disabled={
                  !centreId || isLoadingSlots
                }
              >
                <option value="">
                  {isLoadingSlots
                    ? 'Loading slots...'
                    : !centreId
                    ? 'Select a centre first'
                    : slots.length === 0
                    ? 'No active slots on this date'
                    : 'Select a slot...'}
                </option>

                {slots.map((slot) => (
                  <option
                    key={slot.id}
                    value={slot.id}
                  >
                    {formatTime(slot.start_time)} -{' '}
                    {formatTime(slot.end_time)} (
                    {slot.booked_count}/
                    {slot.max_farmers} booked)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* WEBSOCKET ERROR                                                    */}
      {/* ------------------------------------------------------------------ */}

      {connectionStatus === 'error' &&
        slotId && (
          <div className="alert alert-danger">
            Unable to establish a live connection.
            Your session may have expired — try
            refreshing the page and logging in again.
          </div>
        )}

      {/* ------------------------------------------------------------------ */}
      {/* NO SLOT SELECTED                                                   */}
      {/* ------------------------------------------------------------------ */}

      {!slotId ? (
        <EmptyState
          icon="⏱️"
          title="Select a slot to manage its queue"
          message="Choose a centre, date, and time slot above to see who's waiting and call the next farmer."
        />
      ) : !queueData ? (
        <Loader
          message="Connecting to live queue..."
          fullPage={false}
        />
      ) : (
        <div className="row g-4">

          {/* -------------------------------------------------------------- */}
          {/* CURRENT TOKEN                                                  */}
          {/* -------------------------------------------------------------- */}

          <div className="col-12 col-lg-5">
            <div className="current-token-panel h-100 d-flex flex-column justify-content-center">

              <div className="text-uppercase small opacity-75 fw-semibold mb-1">
                Current Token
              </div>

              <div className="current-token-value mb-2">
                {queueData.current_token
                  ? `#${queueData.current_token}`
                  : '—'}
              </div>

              <div className="opacity-75 small mb-4">
                {selectedSlot &&
                  `${formatTime(
                    selectedSlot.start_time,
                  )} - ${formatTime(
                    selectedSlot.end_time,
                  )}`}
              </div>

              <button
                type="button"
                className="btn btn-light btn-lg fw-bold"
                onClick={handleCallNext}
                disabled={
                  isCallingNext ||
                  queueData.waiting_count === 0
                }
              >
                {isCallingNext ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Calling...
                  </>
                ) : (
                  '📢 CALL NEXT FARMER'
                )}
              </button>

              {queueData.waiting_count === 0 && (
                <div className="small opacity-75 mt-2">
                  No farmers waiting
                </div>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* CURRENTLY SERVING + WAITING                                    */}
          {/* -------------------------------------------------------------- */}

          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">

                {queueData.currently_serving.length >
                  0 && (
                  <>
                    <h6 className="fw-bold text-muted text-uppercase small mb-2">
                      Currently Serving
                    </h6>

                    {queueData.currently_serving.map(
                      (booking) => (
                        <TokenPill
                          key={booking.booking_id}
                          booking={booking}
                          variant="serving"
                          onRecordProcurement={
                            handleRecordProcurement
                          }
                          hasProcurement={
                            Boolean(
                              procurementByBooking[
                                booking.booking_id
                              ],
                            )
                          }
                        />
                      ),
                    )}

                    <hr />
                  </>
                )}

                <h6 className="fw-bold text-muted text-uppercase small mb-2">
                  Waiting ({queueData.waiting_count})
                </h6>

                {queueData.waiting.length === 0 ? (
                  <p className="text-muted small mb-0">
                    No farmers currently waiting.
                  </p>
                ) : (
                  <div
                    style={{
                      maxHeight: 340,
                      overflowY: 'auto',
                    }}
                  >
                    {queueData.waiting.map(
                      (booking) => (
                        <TokenPill
                          key={booking.booking_id}
                          booking={booking}
                          variant="waiting"
                        />
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PROCUREMENT MODAL                                                  */}
      {/* ------------------------------------------------------------------ */}

      <Modal
        title={
          procurementBooking
            ? `Record Procurement — Token #${procurementBooking.token_number}`
            : 'Record Procurement'
        }
        isOpen={isProcurementModalOpen}
        onClose={handleCloseProcurement}
        size="modal-lg"
      >
        {procurementBooking && (
          <ProcurementForm
            booking={procurementBooking}
            onSubmit={handleProcurementSubmit}
            onCancel={handleCloseProcurement}
          />
        )}
      </Modal>
    </div>
  );
};

export default QueueControl;