import { FormEvent, useState } from "react";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

const colors = ["#2f7d55", "#d39a45", "#4e7ca8", "#8a6cac", "#b95f4d"];

export default function ProjectModal({ onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [color, setColor] = useState(colors[0]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await onSubmit({
        name: data.get("name"),
        description: data.get("description"),
        focus: data.get("focus"),
        status: data.get("status"),
        location_label: data.get("location_label"),
        target_carbon_tonnes: Number(data.get("target_carbon_tonnes")),
        start_date: data.get("start_date"),
        color,
      });
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create project.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-title"
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">New initiative</span>
            <h2 id="project-title">Create a project</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="form-grid">
          <label className="span-2">
            Project name
            <input
              name="name"
              placeholder="e.g. Western Ghats Corridor"
              required
              minLength={3}
            />
          </label>
          <label className="span-2">
            Description
            <textarea
              name="description"
              placeholder="What ecological outcome is this project designed to achieve?"
              rows={3}
              required
            />
          </label>
          <label>
            Primary focus
            <select name="focus" defaultValue="integrated">
              <option value="integrated">Integrated</option>
              <option value="carbon">Carbon</option>
              <option value="biodiversity">Biodiversity</option>
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue="planning">
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="monitoring">Monitoring</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label>
            Region
            <input
              name="location_label"
              placeholder="State or landscape"
              required
            />
          </label>
          <label>
            Carbon target (tCO₂e)
            <input
              name="target_carbon_tonnes"
              type="number"
              min="0"
              defaultValue="10000"
              required
            />
          </label>
          <label>
            Start date
            <input
              name="start_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </label>
          <fieldset>
            <legend>Map color</legend>
            <div className="color-options">
              {colors.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={color === item ? "selected" : ""}
                  style={{ background: item }}
                  onClick={() => setColor(item)}
                  aria-label={`Choose color ${item}`}
                />
              ))}
            </div>
          </fieldset>
          {error && <div className="form-error span-2">{error}</div>}
          <div className="modal-actions span-2">
            <button
              type="button"
              className="button button--ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="button button--primary" disabled={loading}>
              {loading ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
