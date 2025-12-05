import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n/config';
import './components/ui/input-24h.css';

createRoot(document.getElementById('root')!).render(<App />);