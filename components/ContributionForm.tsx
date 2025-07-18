// components/ContributionForm.tsx
import { useState } from 'react';
// alias Image to shut up the linter
import NextImage from 'next/image';
import { submitContribution, ContributionSubmit } from '@/lib/api';

interface ContributionFormProps {
  personId: number;
  personName: string;
  onSuccess?: () => void;
}

export default function ContributionForm({ personId, personName, onSuccess }: ContributionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<ContributionSubmit>({
    contributor_email: '',
    content_type: 'text',
    content_text: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
        return;
      }
      
      setImageFile(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate required fields
    if (!formData.contributor_email) {
      setError('Please provide your email address');
      return;
    }
    
    if (formData.content_type === 'text' && !formData.content_text) {
      setError('Please provide text content');
      return;
    }
    
    if (formData.content_type === 'image' && !imageFile) {
      setError('Please select an image');
      return;
    }
    
    if (formData.content_type === 'both' && (!formData.content_text || !imageFile)) {
      setError('Please provide both text and image');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const submitData: ContributionSubmit = {
        ...formData,
        content_image: imageFile || undefined,
      };
      
      await submitContribution(personId, submitData);
      
      // Success!
      setSuccess(true);
      setFormData({
        contributor_email: '',
        content_type: 'text',
        content_text: '',
      });
      setImageFile(null);
      setImagePreview(null);
      
      // Call parent callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 5000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit contribution');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-8 shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-vmi-red">Community Contributions</h2>
      
      {/* Toggle Button */}
      {!isOpen && (
        <>
          <p className="text-gray-600 mb-4 italic">
            No community contributions for {personName} yet.
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-vmi-red text-white px-6 py-2 rounded hover:bg-vmi-dark-red transition-colors font-semibold"
          >
            Add Information or Image
          </button>
        </>
      )}
      
      {/* Contribution Form */}
      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-100 border-2 border-green-500 text-green-700 px-4 py-3 rounded">
              <p className="font-semibold">Thank you for your contribution!</p>
              <p className="text-sm">Your submission will be reviewed before being published.</p>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
            </div>
          )}
          
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
              Your Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={formData.contributor_email}
              onChange={(e) => setFormData({ ...formData, contributor_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-vmi-gold"
              placeholder="your.email@example.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Your email will be partially hidden when displayed publicly
            </p>
          </div>
          
          {/* Content Type Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Contribution Type *
            </label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="text"
                  checked={formData.content_type === 'text'}
                  onChange={(e) => setFormData({ ...formData, content_type: e.target.value as 'text' | 'image' | 'both' })}
                  className="mr-2 text-vmi-red focus:ring-vmi-gold"
                />
                <span>Text Information</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="image"
                  checked={formData.content_type === 'image'}
                  onChange={(e) => setFormData({ ...formData, content_type: e.target.value as 'text' | 'image' | 'both' })}
                  className="mr-2 text-vmi-red focus:ring-vmi-gold"
                />
                <span>Image/Photo</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="both"
                  checked={formData.content_type === 'both'}
                  onChange={(e) => setFormData({ ...formData, content_type: e.target.value as 'text' | 'image' | 'both' })}
                  className="mr-2 text-vmi-red focus:ring-vmi-gold"
                />
                <span>Both Text and Image</span>
              </label>
            </div>
          </div>
          
          {/* Text Content */}
          {(formData.content_type === 'text' || formData.content_type === 'both') && (
            <div>
              <label htmlFor="text" className="block text-sm font-bold text-gray-700 mb-2">
                Additional Information *
              </label>
              <textarea
                id="text"
                value={formData.content_text}
                onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-vmi-gold"
                placeholder="Share any additional information about this person's service, life, or sacrifice..."
                required={formData.content_type !== 'image'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Please be respectful and accurate. All submissions are reviewed before publication.
              </p>
            </div>
          )}
          
          {/* Image Upload */}
          {(formData.content_type === 'image' || formData.content_type === 'both') && (
            <div>
              <label htmlFor="image" className="block text-sm font-bold text-gray-700 mb-2">
                Upload Image *
              </label>
              <input
                type="file"
                id="image"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-vmi-gold"
                required={formData.content_type !== 'text'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Max 10MB. Accepted formats: JPEG, PNG, GIF, WebP
              </p>
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-4">
                  <p className="text-sm font-bold text-gray-700 mb-2">Preview:</p>
                  <NextImage 
                    src={imagePreview} 
                    alt="Preview" 
                    width={400}
                    height={300}
                    className="max-w-full h-auto max-h-64 border-2 border-gray-300 rounded"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Form Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2 rounded font-semibold transition-colors ${
                submitting 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-vmi-red text-white hover:bg-vmi-dark-red'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Contribution'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setError(null);
                setSuccess(false);
              }}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded font-semibold hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}