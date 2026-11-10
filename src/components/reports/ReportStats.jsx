
import { TrendingUp, IndianRupee, Package, ReceiptText, WalletCards, Landmark } from 'lucide-react';

export const ReportStats = ({ report, formatMoney }) => {
  const cards = [
    ['Total Billed', report.available.invoices ? formatMoney(report.sales) : '—',
      report.invoiceRows.length + ' finalized invoices', ReceiptText, 'blue'],
    ['Collections', report.available.payments ? formatMoney(report.collected) : '—',
      report.paymentRows.length + ' completed payments', WalletCards, 'green'],
    ['Expenses', report.available.expenses ? formatMoney(report.expenseTotal) : '—',
      report.expenseRows.length + ' expense entries', IndianRupee, 'orange'],
    ['Net Cash Flow', report.available.payments && report.available.expenses
      ? formatMoney(report.netCash) : '—', 'Net collections less paid operating expenses', TrendingUp, 'purple'],
    ['Invoice Balance', report.available.invoices ? formatMoney(report.outstanding) : '—',
      'Due from selected invoices', Landmark, 'red'],
    ['Stock Value', report.available.stock && report.comparable ? formatMoney(report.stockValue) : '—',
      report.comparable ? report.lowStock.length + ' low-stock items · current snapshot'
        : 'Not staff / branch scoped', Package, 'neutral'],
  ];
  return (
    <section className="reports-dashboard-stats" aria-label="Report performance summary">
      {cards.map(([label, value, note, Icon, tone]) => (
        <article key={label} className={'is-' + tone}>
          <div className="reports-dashboard-stat-main">
            <span>{label}</span>
            <strong title={value}>{value}</strong>
            <small>{note}</small>
          </div>
          <i aria-hidden="true"><Icon size={19}/></i>
        </article>
      ))}
    </section>
  );
};