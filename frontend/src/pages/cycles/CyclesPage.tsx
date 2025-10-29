// frontend/src/pages/cycles/CyclesPage.tsx

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Calendar, Users } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { dateUtils } from '@/lib/utils'
import { useCyclesStore } from '../../stores/cyclesStore'
import { useAuthStore } from '../../stores/authStore'
import { CreateCycle } from '../../components/cycles/CreateCycle'
import { CycleDetails } from '../../components/cycles/CycleDetails'
import { CycleFilters } from '../../components/cycles/CycleFilters'
import { Cycle, CycleStatus, CycleFilters as CycleFiltersType } from '../../types/cycles.types'

export default function CyclesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null)
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { user } = useAuthStore()
  const {
    cycles,
    isLoading,
    error,
    filters,
    fetchCycles,
    createCycle,
    isCreating,
    createError,
    clearCreateError,
    setFilters,
    clearFilters,
  } = useCyclesStore()

  // Check if user can create cycles (admin or manager only)
  const canCreateCycles = user?.roles?.includes('admin') || user?.roles?.includes('manager')

  useEffect(() => {
    fetchCycles(filters)
  }, [fetchCycles, filters])

  const getStatusBadge = (status: CycleStatus) => {
    switch (status) {
      case CycleStatus.ACTIVE:
        return <Badge variant="success">Active</Badge>
      case CycleStatus.DRAFT:
        return <Badge variant="secondary">Draft</Badge>
      case CycleStatus.IN_PROGRESS:
        return <Badge variant="primary">In Progress</Badge>
      case CycleStatus.CLOSED:
        return <Badge variant="outline">Closed</Badge>
      case CycleStatus.ARCHIVED:
        return <Badge variant="secondary">Archived</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredCycles = (cycles || []).filter(cycle =>
    (cycle.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cycle.description && cycle.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleCreateSuccess = () => {
    setShowCreateModal(false)
    fetchCycles() // Refresh the list
  }

  const handleViewDetails = (cycleId: string) => {
    setSelectedCycleId(cycleId)
  }

  const handleEdit = (cycle: Cycle) => {
    setEditingCycle(cycle)
    setShowCreateModal(true)
  }

  const handleFiltersChange = (newFilters: CycleFiltersType) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    clearFilters()
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback Cycles</h1>
          <p className="text-gray-600">Manage and track your feedback cycles</p>
        </div>
        {canCreateCycles && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
            Create Cycle
          </Button>
        )}
      </div>

      {/* Filters and search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search cycles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <Button 
              variant="outline" 
              leftIcon={<Filter className="h-4 w-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter Panel */}
      {showFilters && (
        <CycleFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cycles...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => fetchCycles()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cycles grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCycles.map((cycle) => (
            <Card key={cycle.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{cycle.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{cycle.description}</p>
                  </div>
                  {getStatusBadge(cycle.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Dates */}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {dateUtils.format(new Date(cycle.startDate), 'MMM dd')} - {dateUtils.format(new Date(cycle.endDate), 'MMM dd, yyyy')}
                    </span>
                  </div>

                  {/* Participants */}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{cycle.participants || 0} participants</span>
                  </div>

                  {/* Progress */}
                  {cycle.participants && cycle.participants > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">
                          {cycle.completed || 0}/{cycle.participants} completed
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${((cycle.completed || 0) / cycle.participants) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Created by */}
                  <div className="text-xs text-gray-500">
                    Created by {cycle.creatorName || cycle.createdBy} • {dateUtils.formatRelative(new Date(cycle.createdAt))}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewDetails(cycle.id)}
                    >
                      View Details
                    </Button>
                    {cycle.status === CycleStatus.DRAFT && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(cycle)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredCycles.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No cycles found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'No cycles match your search criteria.'
                  : 'Get started by creating your first feedback cycle.'
                }
              </p>
              {canCreateCycles && (
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
                  Create Your First Cycle
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Cycle Modal */}
      {showCreateModal && canCreateCycles && (
        <CreateCycle
          onClose={() => {
            setShowCreateModal(false)
            setEditingCycle(null)
            clearCreateError()
          }}
          onSuccess={handleCreateSuccess}
          editingCycle={editingCycle}
        />
      )}

      {/* Cycle Details Modal */}
      {selectedCycleId && (
        <CycleDetails
          cycleId={selectedCycleId}
          onClose={() => setSelectedCycleId(null)}
          onEdit={handleEdit}
        />
      )}
    </div>
  )
}
