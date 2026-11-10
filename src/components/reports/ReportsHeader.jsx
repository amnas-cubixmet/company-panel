
import { Download, FileSpreadsheet, Printer, RefreshCw } from 'lucide-react';

export const ReportsHeader = ({ onRefresh, onCsv, onPrint, loading = false, exportDisabled = false, periodLabel }) => (
  <header className="reports-dashboard-header no-print">
    <div className="reports-dashboard-header__title">
      <span className="reports-dashboard-eyebrow">WORKSHOP ANALYTICS</span>
      <h1>Business Reports</h1>
      <p>Financial performance, collections, expenses and stock insights.</p>
      {periodLabel && <span className="reports-dashboard-period-badge">{periodLabel}</span>}
    </div>
    <div className="reports-dashboard-actions">
      <button type="button" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={16} className={loading ? 'reports-spinning' : ''}/> {loading ? 'Refreshing…' : 'Refresh'}
      </button>
      <button type="button" onClick={onCsv} disabled={loading || exportDisabled}>
        <FileSpreadsheet size={16}/> Export CSV
      </button>
      <button type="button" onClick={onPrint} disabled={loading || exportDisabled}>
        <Printer size={16}/> Print
      </button>
      <button type="button" className="is-primary" onClick={onPrint} disabled={loading || exportDisabled}
        title="Opens your browser Print dialog. Choose Save as PDF to export all report sections.">
        <Download size={16}/> Save as PDF
      </button>
    </div>
  </header>
);