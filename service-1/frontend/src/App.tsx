import { Link, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Checkout from './pages/Checkout';
import Simulate from './pages/Simulate';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-white border-b px-6 py-3 flex gap-6">
        <Link to="/" className="font-semibold">Target App</Link>
        <Link to="/catalog" className="text-gray-700 hover:text-black">Catalog</Link>
        <Link to="/checkout" className="text-gray-700 hover:text-black">Checkout</Link>
        <Link to="/simulate" className="text-gray-700 hover:text-black">Simulate</Link>
      </nav>
      <main className="p-6 max-w-4xl mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/simulate" element={<Simulate />} />
        </Routes>
      </main>
    </div>
  );
}
