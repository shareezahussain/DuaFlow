import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import DuaListPanel from './DuaListPanel'

interface Props {
  onClose: () => void
}

export default function PrintCartPanel({ onClose }: Props) {
  const navigate = useNavigate()
  const { printCollection, removeFromPrint } = useApp()

  const items = printCollection.map(({ dua }) => dua)

  function goToDesigner() {
    onClose()
    navigate('/print')
  }

  return (
    <DuaListPanel
      title="Print Collection"
      items={items}
      onRemove={removeFromPrint}
      onClose={onClose}
      footer={
        items.length > 0 ? (
          <button
            onClick={goToDesigner}
            className="w-full py-2.5 bg-navy hover:bg-navy-light text-white font-bold text-sm rounded-xl transition-colors"
          >
            🖨 Design &amp; Print ({items.length})
          </button>
        ) : undefined
      }
    />
  )
}
