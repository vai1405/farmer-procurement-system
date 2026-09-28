/**
 * Accessible on/off toggle used for the centre and slot active-status
 * controls.
 */
const ToggleSwitch = ({ checked, onChange, disabled = false, label }) => (
  <div className="form-check form-switch">
    <input
      className="form-check-input"
      type="checkbox"
      role="switch"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      style={{ cursor: disabled ? 'wait' : 'pointer' }}
    />
    {label && <label className="form-check-label small">{label}</label>}
  </div>
);

export default ToggleSwitch;