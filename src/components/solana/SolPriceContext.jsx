import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const SolPriceContext = createContext({ price: null, change: 0 });

export function SolPriceProvider({ children }) {
  const [price, setPrice] = useState(null);
  const [change, setChange] = useState(0);
  const prevRef = useRef(null);
  const [flash, setFlash] = useState(null); // 'up' | 'down' | null

  const fetchPrice = async () => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true'
      );
      const data = await res.json();
      const p = data?.solana?.usd;
      const ch = data?.solana?.usd_24h_change;
      if (p) {
        if (prevRef.current !== null && p !== prevRef.current) {
          const dir = p > prevRef.current ? 'up' : 'down';
          setFlash(dir);
          setTimeout(() => setFlash(null), 800);
        }
        prevRef.current = p;
        setPrice(p);
        setChange(ch || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchPrice();
    const t = setInterval(fetchPrice, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <SolPriceContext.Provider value={{ price, change, flash }}>
      {children}
    </SolPriceContext.Provider>
  );
}

export function useSolPrice() {
  return useContext(SolPriceContext);
}
