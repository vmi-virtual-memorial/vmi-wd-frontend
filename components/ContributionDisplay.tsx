// components/ContributionDisplay.tsx

// alias Image to shut the linter up
import NextImage from 'next/image';
import { Contribution } from '@/lib/api';


interface ContributionDisplayProps {
  contributions: Contribution[];
}

export default function ContributionDisplay({ contributions }: ContributionDisplayProps) {
  if (contributions.length === 0) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-vmi-red mb-4">
        Community Contributions ({contributions.length})
      </h3>
      
      <div className="space-y-4">
        {contributions.map((contribution) => (
          <div 
            key={contribution.id} 
            className="bg-gray-50 border border-gray-200 rounded-lg p-6"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600">
                  Contributed by <span className="font-semibold">{contribution.contributor_display}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(contribution.submitted_at)}
                </p>
              </div>
              <span className={`
                px-3 py-1 rounded-full text-xs font-semibold
                ${contribution.content_type === 'text' ? 'bg-blue-100 text-blue-700' : ''}
                ${contribution.content_type === 'image' ? 'bg-green-100 text-green-700' : ''}
                ${contribution.content_type === 'both' ? 'bg-purple-100 text-purple-700' : ''}
              `}>
                {contribution.content_type === 'text' && 'Text'}
                {contribution.content_type === 'image' && 'Image'}
                {contribution.content_type === 'both' && 'Text & Image'}
              </span>
            </div>
            
            {/* Content */}
            <div className="space-y-4">
              {/* Text Content */}
              {contribution.content_text && (
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {contribution.content_text}
                  </p>
                </div>
              )}
              {/* Image Content */}
              {contribution.content_image && (
                <div className="mt-4">
                  <div 
                    className="cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => window.open(contribution.content_image, '_blank')}
                  >
                    <NextImage 
                      src={contribution.content_image} 
                      alt="Community contribution"
                      width={800}
                      height={600}
                      className="max-w-full h-auto rounded-lg border-2 border-gray-300"
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Click image to view full size
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}