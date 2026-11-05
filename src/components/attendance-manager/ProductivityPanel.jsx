
import { Activity } from 'lucide-react';

export const ProductivityPanel = ({ team, productive, idle, onOpenEmployee }) => (
  <article className="am-dashboard-panel">
    <header className="am-dashboard-panel-title">
      <div>
        <h2>Workshop Productivity</h2>
          </div>
      <Activity size={15} />
    </header>

    <div className="am-dashboard-mini-grid">
      <div><span>Productive Hours</span><strong>{productive.toFixed(1)}h</strong></div>
      <div><span>Idle Hours</span><strong>{idle.toFixed(1)}h</strong></div>
    </div>

    <div className="am-dashboard-productivity-list">
      {team
        .filter((item) => Number(item.productiveHours || 0) > 0)
        .slice(0, 5)
        .map((item) => {
          const productiveHours = Number(item.productiveHours || 0);
          const idleHours = Number(item.idleHours || 0);
          const total = productiveHours + idleHours;
          const pct = total ? Math.round((productiveHours / total) * 100) : 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenEmployee(item)}
              className="am-dashboard-productivity-row"
            >
              <span>{item.name}</span>
              <div className="am-dashboard-progress"><i style={{ width: `${pct}%` }} /></div>
              <strong>{pct}%</strong>
            </button>
          );
        })}

      {!team.some((item) => Number(item.productiveHours || 0) > 0) && (
        <div className="am-dashboard-empty">No productivity data yet.</div>
      )}
    </div>
  </article>
);
