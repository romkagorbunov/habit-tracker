import Navigation from './ui/Navigation';
import { initDb } from './storage/sqlite';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    initDb();
  }, []);

  return <Navigation />;
}
