import { Sprout } from "lucide-react";

export default function Brand({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`brand ${light ? "brand--light" : ""}`}
      aria-label="Darukaa Earth"
    >
      <span className="brand__mark">
        <Sprout size={18} strokeWidth={2.4} />
      </span>
      <span>darukaa</span>
      <em>.earth</em>
    </div>
  );
}
