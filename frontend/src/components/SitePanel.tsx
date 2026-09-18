import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { ArrowDownRight, ArrowUpRight, Leaf, TreePine, X } from "lucide-react";
import { Line } from "react-chartjs-2";
import type { SiteAnalytics } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

export default function SitePanel({
  site,
  onClose,
}: {
  site: SiteAnalytics;
  onClose: () => void;
}) {
  const labels = site.measurements.map((item) =>
    new Date(item.recorded_at).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    }),
  );
  const chartData = {
    labels,
    datasets: [
      {
        label: "Carbon (tCO₂e)",
        data: site.measurements.map((item) => item.carbon_tonnes),
        borderColor: "#1d6844",
        backgroundColor: "rgba(58, 132, 88, .12)",
        pointBackgroundColor: "#1d6844",
        tension: 0.38,
        fill: true,
        yAxisID: "yCarbon",
      },
      {
        label: "Biodiversity score",
        data: site.measurements.map((item) => item.biodiversity_score),
        borderColor: "#c89038",
        backgroundColor: "transparent",
        pointBackgroundColor: "#c89038",
        tension: 0.38,
        yAxisID: "yBiodiversity",
      },
    ],
  };

  return (
    <aside className="site-panel">
      <button
        className="icon-button site-panel__close"
        onClick={onClose}
        aria-label="Close details"
      >
        <X size={18} />
      </button>
      <span className="eyebrow">Site analytics</span>
      <h2>{site.name}</h2>
      <p className="subtle">
        {site.project_name} · {site.area_hectares.toLocaleString()} ha
      </p>
      <div className="site-panel__hero">
        <span>Latest verified carbon stock</span>
        <strong>{site.latest_carbon_tonnes.toLocaleString()} tCO₂e</strong>
        <em className="positive">
          <ArrowUpRight size={15} /> {site.carbon_change_percent.toFixed(1)}%
          since baseline
        </em>
      </div>
      <div className="mini-metrics">
        <article>
          <Leaf size={18} />
          <span>Biodiversity</span>
          <strong>{site.latest_biodiversity_score.toFixed(1)}</strong>
          <em
            className={
              site.biodiversity_change_percent >= 0 ? "positive" : "negative"
            }
          >
            {site.biodiversity_change_percent >= 0 ? (
              <ArrowUpRight size={13} />
            ) : (
              <ArrowDownRight size={13} />
            )}
            {Math.abs(site.biodiversity_change_percent).toFixed(1)}%
          </em>
        </article>
        <article>
          <TreePine size={18} />
          <span>Trees planted</span>
          <strong>{site.total_trees_planted.toLocaleString()}</strong>
          <em>{site.measurement_count} observations</em>
        </article>
      </div>
      <div className="chart-header">
        <div>
          <h3>Impact trajectory</h3>
          <span>Environmental performance over time</span>
        </div>
      </div>
      <div className="chart-box">
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: "index" },
            plugins: {
              legend: {
                position: "bottom",
                labels: { usePointStyle: true, boxWidth: 7, padding: 18 },
              },
            },
            scales: {
              x: { grid: { display: false }, ticks: { maxRotation: 0 } },
              yCarbon: {
                type: "linear",
                position: "left",
                grid: { color: "rgba(30, 54, 42, .08)" },
                beginAtZero: false,
              },
              yBiodiversity: {
                type: "linear",
                position: "right",
                grid: { drawOnChartArea: false },
                min: 0,
                max: 100,
              },
            },
          }}
        />
      </div>
      <div className="data-note">
        <span>Data provenance</span>
        <p>
          Synthetic monitoring data for demonstration. Ready for field or
          satellite ingestion.
        </p>
      </div>
    </aside>
  );
}
