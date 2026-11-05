
import { Clock3, LogIn, Repeat2, TimerReset } from 'lucide-react';

const modes = [
  {
    value: 'single',
    title: 'Single Punch',
    description: 'One session per day; no second check-in.',
    icon: LogIn,
  },
  {
    value: 'multi',
    title: 'Multi Punch',
    description: 'Multiple check-in/out sessions.',
    icon: Repeat2,
  },
  {
    value: 'auto_checkout',
    title: 'Auto Checkout',
    description: 'Automatic checkout at shift end; no manual checkout.',
    icon: Clock3,
  },
  {
    value: 'hybrid',
    title: 'Hybrid',
    description: 'Manual checkout, or automatic checkout if missed.',
    icon: TimerReset,
  },
];

export const AttendanceModeSelector = ({ value, onChange }) => (
  <div className="attendance-mode-grid">
    {modes.map(({ value: modeValue, title, description, icon: Icon }) => {
      const selected = value === modeValue;
      return (
        <button
          key={modeValue}
          type="button"
          className={`attendance-mode-card ${selected ? 'is-selected' : ''}`}
          onClick={() => onChange(modeValue)}
        >
          <span className="attendance-mode-icon"><Icon size={17} /></span>
          <span className="attendance-mode-copy">
            <strong>{title}</strong>
            <span className="am-mode-description">{description}</span>
          </span>
          <span className="attendance-mode-radio" aria-hidden="true" />
        </button>
      );
    })}
  </div>
);
