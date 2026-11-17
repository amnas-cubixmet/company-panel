import { Link, useLocation } from 'react-router-dom';

export default function StockProductLink({ itemId, branchId, children }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set('product', itemId);
  if (branchId) params.set('productBranch', branchId);
  else params.delete('productBranch');

  return (
    <Link className="cg-stock-product-link" to={{ search: `?${params}` }}
      aria-haspopup="dialog" preventScrollReset state={{ fromStockProductList: true }}>
      {children}
    </Link>
  );
}
