import { useEffect, useState } from 'react';
import axios from 'axios';

interface Product {
  id: number;
  name: string;
  price: number;
}

export default function Catalog() {
  const [items, setItems] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get<{ items: Product[] }>('/api/catalog')
      .then((r) => setItems(r.data.items))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Catalog</h1>
      <ul className="divide-y bg-white border rounded">
        {items.map((p) => (
          <li key={p.id} className="flex justify-between p-3">
            <span>{p.name}</span>
            <span className="font-mono">{p.price.toLocaleString()} ₽</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
