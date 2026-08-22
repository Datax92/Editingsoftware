import React, { useState } from 'react';
import { WordService } from '../../../services/wordService';

interface WordTemplateModalProps {
  templateFile: File;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (generatedBlob: Blob) => void;
}

export const WordTemplateModal: React.FC<WordTemplateModalProps> = ({
  templateFile,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    clientName: '',
    date: new Date().toLocaleDateString(),
    amount: '',
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      const resultBlob = await WordService.generateDocumentFromTemplate(templateFile, formData);
      onSuccess(resultBlob);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to populate Word template.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider">Fill Word Template</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4 text-xs">
          <div>
            <label className="block text-muted-foreground font-medium mb-1">Client Name (&apos;{'{clientName}'}&apos;)</label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => handleChange('clientName', e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-muted-foreground font-medium mb-1">Date (&apos;{'{date}'}&apos;)</label>
            <input
              type="text"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-muted-foreground font-medium mb-1">Amount (&apos;{'{amount}'}&apos;)</label>
            <input
              type="text"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              placeholder="e.g. $1,500.00"
              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded border border-border font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isProcessing ? 'Generating...' : 'Generate Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};