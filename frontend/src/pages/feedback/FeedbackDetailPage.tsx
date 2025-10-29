// frontend/src/pages/feedback/FeedbackDetailPage.tsx

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { FeedbackDetail } from '@/components/feedback/FeedbackDetail';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export default function FeedbackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (!id) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">No feedback ID provided.</p>
          <Button onClick={() => navigate('/feedback')} className="mt-4">
            Back to Feedback
          </Button>
        </div>
      </div>
    );
  }

  const handleClose = () => {
    // Navigate back to the previous page or team feedback if coming from there
    const referrer = document.referrer;
    if (referrer.includes('/team-feedback')) {
      navigate('/team-feedback');
    } else {
      navigate('/feedback');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={handleClose}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Feedback Detail Component */}
      <FeedbackDetail
        feedbackId={id}
        onClose={handleClose}
        currentUserId={user?.id}
        openInEditMode={false}
      />
    </div>
  );
}
