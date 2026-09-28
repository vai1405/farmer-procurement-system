/**
 * Generic skeleton building blocks using Bootstrap's placeholder-glow
 * utility. Compose these to match the shape of the content that will
 * eventually load.
 */
export const SkeletonLine = ({ width = '100%', height = '1rem', className = '' }) => (
  <span
    className={`placeholder-glow d-inline-block ${className}`}
    style={{ width, height }}
  >
    <span className="placeholder col-12" style={{ height: '100%' }} />
  </span>
);

export const SkeletonCard = () => (
  <div className="card border-0 shadow-sm h-100">
    <div className="card-body">
      <div className="d-flex gap-3">
        <div
          className="placeholder-glow"
          style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0 }}
        >
          <span className="placeholder col-12 h-100 rounded" />
        </div>
        <div className="flex-grow-1">
          <SkeletonLine width="60%" height="0.75rem" className="mb-2" />
          <SkeletonLine width="40%" height="1.5rem" />
        </div>
      </div>
    </div>
  </div>
);

export const SkeletonStatRow = ({ count = 6 }) => (
  <div className="row g-3 mb-4">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="col-12 col-sm-6 col-xl-4">
        <SkeletonCard />
      </div>
    ))}
  </div>
);

export const SkeletonTableRows = ({ rows = 5, columns = 5 }) => (
  <>
    {Array.from({ length: rows }, (_, rowIndex) => (
      <tr key={rowIndex}>
        {Array.from({ length: columns }, (_, colIndex) => (
          <td key={colIndex}>
            <SkeletonLine width={colIndex === 0 ? '70%' : '50%'} />
          </td>
        ))}
      </tr>
    ))}
  </>
);