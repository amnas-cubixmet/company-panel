import { NavLink } from 'react-router-dom';
import { Boxes, ShoppingBag, Truck } from 'lucide-react';
import '../../styles/stock-parts-section-nav.css';

// One canonical supplier directory and one purchase history page across all
// inventory entry points. These links never create a bill or stock movement.
export default function StockPartsSectionNav({ showPurchases = false }) {
  return (
    <nav className="cg-stock-parts-section-nav" aria-label="Stock & Parts sections">
      <NavLink to="/stock" end className={({ isActive }) => `cg-stock-parts-section-link${isActive ? ' is-active' : ''}`}>
        <Boxes size={16} aria-hidden="true" />
        <span>Stock &amp; Parts</span>
      </NavLink>
      <NavLink to="/suppliers" end={false}
        className={({ isActive }) => `cg-stock-parts-section-link${isActive ? ' is-active' : ''}`}>
        <Truck size={16} aria-hidden="true" />
        <span>Suppliers</span>
      </NavLink>
      {showPurchases && (
        <NavLink to="/suppliers/purchases"
          className={({ isActive }) => `cg-stock-parts-section-link${isActive ? ' is-active' : ''}`}>
          <ShoppingBag size={16} aria-hidden="true" />
          <span>Supplier Purchases</span>
        </NavLink>
      )}
    </nav>
  );
}
