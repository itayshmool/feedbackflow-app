// frontend/src/pages/cycles/CycleDetailPage.tsx

import { useParams } from 'react-router-dom'

export default function CycleDetailPage() {
  const { id } = useParams()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cycle Details</h1>
        <p className="text-gray-600">Cycle ID: {id}</p>
      </div>
      
      <div className="bg-white p-6 rounded-lg border">
        <p className="text-gray-600">Cycle detail page coming soon...</p>
      </div>
    </div>
  )
}
