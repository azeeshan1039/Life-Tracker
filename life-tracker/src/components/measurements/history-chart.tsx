import { parseDecimal } from "../../lib/decimal";

export function HistoryChart({ points }: { points: { recordedOn: string; value: string }[] }) {
  const chronological = [...points].sort((left, right) => left.recordedOn.localeCompare(right.recordedOn));
  if (chronological.length === 0) {
    return null;
  }
  const width = 320;
  const height = 120;
  const scaled = chronological.map((point) => parseDecimal(point.value));
  const min = scaled.reduce((lowest, value) => (value < lowest ? value : lowest));
  const max = scaled.reduce((highest, value) => (value > highest ? value : highest));
  const span = max - min;
  const coordinates = scaled.map((value, index) => {
    const x = chronological.length === 1 ? width / 2 : (index / (chronological.length - 1)) * (width - 8) + 4;
    const y = span === BigInt(0) ? height / 2 : Number(((max - value) * BigInt(height - 8)) / span) + 4;
    return { x, y };
  });

  return (
    <svg
      role="img"
      aria-label="Measurement history chart. The table lists every value."
      viewBox={`0 0 ${width} ${height}`}
      className="h-32 w-full text-neutral-900"
    >
      {coordinates.length === 1 && coordinates[0] ? (
        <circle cx={coordinates[0].x} cy={coordinates[0].y} r="4" fill="currentColor" />
      ) : (
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")}
        />
      )}
    </svg>
  );
}
