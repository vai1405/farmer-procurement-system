/**
 * Small live/offline indicator so staff and farmers can tell whether
 * the real-time connection is actually working, rather than silently
 * looking at stale data.
 */
const STATUS_CONFIG = {
  connected: { label: 'Live', color: 'success', pulse: true },
  connecting: { label: 'Connecting...', color: 'warning', pulse: false },
  disconnected: { label: 'Reconnecting...', color: 'warning', pulse: false },
  error: { label: 'Offline', color: 'danger', pulse: false },
  idle: { label: 'Idle', color: 'secondary', pulse: false },
};

const ConnectionStatus = ({ status }) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;

  return (
    <span className={`connection-badge text-${config.color}`}>
      <span
        className={`connection-dot bg-${config.color} ${config.pulse ? 'is-pulsing' : ''}`}
      />
      {config.label}
    </span>
  );
};

export default ConnectionStatus;