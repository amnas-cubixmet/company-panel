import { Link, useLocation } from 'react-router-dom';
import { stockProductLocation } from '../../utils/stockProductRoutes';

export default function StockProductLink({ itemId, branchId, children }) {
  const { search } = useLocation();

  return (
    <Link className="cg-stock-product-link" to={stockProductLocation(itemId, search, branchId)}>
      {children}
    </Link>
  );
}
