export function Bintang({ nilai }) {
  return (
    <span className="bintang" aria-label={`${nilai} dari 5 bintang`}>
      {"★".repeat(nilai)}{"☆".repeat(5 - nilai)}
    </span>
  );
}

export function PilihBintang({ value, onChange }) {
  return (
    <div role="group" aria-label="Pilih rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className="star" aria-pressed={n <= value} aria-label={`${n} bintang`} onClick={() => onChange(n)}>
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}