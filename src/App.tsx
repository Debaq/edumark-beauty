import { useDocumentStore } from '@/store/document'
import { useUIStore } from '@/store/ui'
import { Welcome } from '@/components/layout/Welcome'
import { Toolbar } from '@/components/layout/Toolbar'
import { Panels } from '@/components/layout/Panels'
import { ConfigPanel } from '@/components/config/ConfigPanel'
import { ExportModal } from '@/components/export/ExportModal'
import { ToastContainer } from '@/components/ui/Toast'

export default function App() {
  const source = useDocumentStore((s) => s.source)
  const configPanelOpen = useUIStore((s) => s.configPanelOpen)

  // Si no hay documento cargado, mostrar pantalla de bienvenida
  if (!source) {
    return (
      <div className="h-full flex flex-col">
        <Welcome />
        <ToastContainer />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <Panels />
        {configPanelOpen && <ConfigPanel />}
      </div>
      <ExportModal />
      <ToastContainer />
    </div>
  )
}
