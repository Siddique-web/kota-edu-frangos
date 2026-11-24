import { BarChart3, ShoppingBag } from 'lucide-react';
import { useEffect } from 'react';
import { AdminApp } from './admin/AdminApp';
import { CustomerApp } from './customer/CustomerApp';
import { primeAudio } from './lib/hooks';
import { actions } from './lib/store';
import { useLocalState } from './lib/hooks';
import { ToastProvider } from './lib/toast';

type Mode = 'cliente' | 'admin';

export default function App() {
  const [mode, setMode] = useLocalState<Mode>('kota-mode', 'cliente');

  // QR na mesa: https://…/?mesa=7
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const mesa = p.get('mesa');
    if (mesa && /^\d{1,3}$/.test(mesa)) actions.setTable(String(parseInt(mesa, 10)));
    if (p.get('admin') === '1') setMode('admin');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ToastProvider>
      <div className="sticky top-0 z-[60] flex h-11 items-center justify-center gap-2 border-b border-coal-600 bg-coal-950/95 px-2 backdrop-blur">
        <div role="tablist" aria-label="Alternar visão" className="flex rounded-full bg-coal-700 p-0.5">
          <ModeBtn active={mode === 'cliente'} onClick={() => setMode('cliente')} icon={<ShoppingBag size={15} />} label="Pedir" />
          <ModeBtn active={mode === 'admin'} onClick={() => { primeAudio(); setMode('admin'); }} icon={<BarChart3 size={15} />} label="Gestão" />
        </div>
      </div>
      {mode === 'cliente' ? <CustomerApp /> : <AdminApp />}
    </ToastProvider>
  );
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition ${
        active ? 'bg-ember text-white shadow-ember' : 'text-neutral-300 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
