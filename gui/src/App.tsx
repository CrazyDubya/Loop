import { ReactFlowProvider } from '@xyflow/react';
import { AppShell } from '@/components/layout/AppShell';
import { useUIStore } from '@/stores/uiStore';

export function App() {
  const { theme } = useUIStore();

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <ReactFlowProvider>
        <AppShell />
      </ReactFlowProvider>
    </div>
  );
}
