'use client';
import React, { useState } from 'react';
import { Upload, X, Check } from 'lucide-react';

const tiers = [
  {
    id: 'base',
    name: 'Standard Xeriscape',
    emoji: '🌿',
    rebate: 'Up to $750',
    cost: '$3,000 – $8,000 (est.)',
    desc: 'Plants, mulch, minimal hardscape — qualifies for base rebate',
    prompt:
      'xeriscape with Colorado-friendly plants, rock/gravel mulch, no turf, drip irrigation, functional and low-maintenance, moderate plant density',
  },
  {
    id: 'native',
    name: 'Native Plant Bonus',
    emoji: '🌸',
    rebate: 'Up to $1,000',
    cost: '$4,000 – $12,000 (est.)',
    desc: 'Heavy use of Colorado natives (80%+) for extra rebate bonus',
    prompt:
      'xeriscape featuring at least 80% Colorado native perennials, grasses, shrubs; layered planting, rock mulch, permeable paths, no grass, high ecological value and beauty',
  },
];

export default function LandscapeTool() {
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [selectedTier, setSelectedTier] = useState(tiers[0]); // default to Standard/Base
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<{ url: string; promptUsed: string } | null>(null);
  const [breakdown, setBreakdown] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large — maximum 5MB');
      return;
    }

    setReferenceFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setReferencePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearReference = () => {
    setReferenceFile(null);
    setReferencePreview(null);
  };

  const generateDesign = async () => {
    setLoading(true);
    setDesign(null);
    setBreakdown('');
    setBreakdownError('');
    setBreakdownLoading(false);

    const tierPrompt = selectedTier.prompt;
    const finalPrompt = `Photorealistic landscape design for a real Fort Collins, Colorado yard using this exact style: ${tierPrompt}.
ONLY modify the yard/grass/plants/soil/landscape features.
DO NOT change house, roof, windows, garage, driveway, sidewalks, fences, or any architecture.
Natural daylight, high detail, professional photography style.`;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          isEdit: !!referenceFile,
          imageBase64: referenceFile ? await fileToBase64(referenceFile) : null,
          n: 1,
          aspect: '16:9',
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => 'No response');
        throw new Error(`Image generation failed: ${res.status} - ${errText}`);
      }

      const data = await res.json();
      const imageUrl = data.data?.[0]?.url;
      if (!imageUrl) throw new Error('No image URL returned');

      setDesign({ url: imageUrl, promptUsed: finalPrompt });
    } catch (err: any) {
      alert('Design generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const generateBreakdown = async () => {
    if (!design) {
      alert('No design image generated yet. Please generate a design first.');
      return;
    }

    setBreakdownLoading(true);
    setBreakdown('');
    setBreakdownError('');

    try {
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: design.url,
          tier: selectedTier.name,
        }),
      });

      if (!res.ok) {
        let errorDetail = '';
        try {
          const errJson = await res.json();
          errorDetail = errJson.error || `HTTP ${res.status}`;
        } catch {
          errorDetail = (await res.text()) || '(no details)';
        }
        throw new Error(`Breakdown request failed: ${errorDetail}`);
      }

      const data = await res.json();
      if (data.breakdown) {
        setBreakdown(data.breakdown);
      } else {
        setBreakdownError('Breakdown was generated but returned empty content.');
      }
    } catch (err: any) {
      console.error('Breakdown error:', err);
      setBreakdownError(
        err.message.includes('Model not found') || err.message.includes('invalid argument')
          ? 'Vision analysis is temporarily unavailable. Try again later or check xAI status.'
          : 'Failed to generate breakdown: ' + (err.message || 'Unknown error')
      );
    } finally {
      setBreakdownLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-serif font-bold text-center text-emerald-600 mb-3">
          Fort Collins Landscape Design Tool
        </h1>
        <p className="text-center text-xl text-zinc-400 mb-12">
          Visualize your xeriscape conversion and see potential rebate eligibility
        </p>

        {/* Upload Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Upload your yard photo (optional)</h2>
          <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center">
            {referencePreview ? (
              <div className="relative max-w-md mx-auto">
                <img
                  src={referencePreview}
                  className="rounded-2xl"
                  alt="Preview of your uploaded yard photo"
                />
                <button
                  onClick={clearReference}
                  className="absolute top-4 right-4 bg-red-600 p-2 rounded-full"
                >
                  <X size={24} />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <Upload className="w-16 h-16 mx-auto text-zinc-500 mb-4" />
                <span className="text-xl text-zinc-300">
                  Click or drag a photo of your yard
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Tier Selection */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Choose your project style
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier)}
                className={`bg-zinc-900 border-2 rounded-3xl p-8 text-left transition-all hover:scale-105 ${
                  selectedTier.id === tier.id
                    ? 'border-emerald-600 bg-emerald-950/30'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="text-5xl mb-4">{tier.emoji}</div>
                <div className="text-2xl font-bold mb-1">{tier.name}</div>
                <div className="text-emerald-400 font-semibold text-lg">{tier.rebate}</div>
                <div className="text-sm text-zinc-400 mt-1">{tier.cost}</div>
                <p className="mt-4 text-zinc-300 text-sm">{tier.desc}</p>
                {selectedTier.id === tier.id && (
                  <Check className="mt-6 text-emerald-500" size={32} />
                )}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-zinc-500 mt-8">
            Rebates from Fort Collins Utilities XIP: $0.75 per sq ft base (max $750), plus
            $0.25 per sq ft native plant bonus (total max $1,000). Pre-approval required
            before installation.{' '}
            <a
              href="https://www.fortcollins.gov/Services/Utilities/Programs-and-Rebates/Water-Programs/XIP"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:underline"
            >
              View official program details →
            </a>
          </p>
        </div>

        {/* Generate Button */}
        <div className="text-center mb-16">
          <button
            onClick={generateDesign}
            disabled={loading}
            className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white text-2xl font-semibold px-16 py-6 rounded-3xl transition shadow-xl"
          >
            {loading ? 'Generating your design...' : `Generate ${selectedTier.name} Design`}
          </button>
        </div>

        {/* Result Section */}
        {design && (
          <div className="mt-12">
            <h2 className="text-3xl font-semibold text-center mb-8">
              Your {selectedTier.name} Design
            </h2>
            <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 max-w-4xl mx-auto">
              <img
                src={design.url}
                className="w-full h-96 object-cover"
                alt={`Generated ${selectedTier.name} xeriscape design for your Fort Collins yard`}
              />
              <div className="p-8 space-y-6">
                <button
                  onClick={generateBreakdown}
                  disabled={breakdownLoading}
                  className="w-full bg-emerald-800 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white py-5 rounded-2xl font-semibold text-xl transition"
                >
                  {breakdownLoading
                    ? 'Analyzing image and creating estimate...'
                    : 'Generate Cost Breakdown, Installation Strategy & Plant List'}
                </button>

                {breakdownError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-200 p-6 rounded-2xl">
                    {breakdownError}
                  </div>
                )}

                {breakdown && !breakdownError && (
                  <div className="prose prose-invert max-w-none text-lg leading-relaxed whitespace-pre-wrap border-t border-zinc-800 pt-6">
                    {breakdown}
                  </div>
                )}

                {breakdownLoading && !breakdown && !breakdownError && (
                  <div className="text-center py-8 text-zinc-400 italic">
                    Analyzing your design...
                    <br />
                    Creating estimate with sod cutter for grass removal + shredded cedar
                    mulch, plus native plant recommendations...
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-zinc-800 flex gap-4 flex-wrap justify-center">
                <a
                  href={design.url}
                  download
                  className="flex-1 bg-emerald-700 py-4 rounded-2xl text-center font-semibold max-w-xs"
                >
                  Download Design Image
                </a>
                <a
                  href="https://www.fortcollins.gov/Services/Utilities/Programs-and-Rebates/Water-Programs/XIP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 border border-emerald-700 py-4 rounded-2xl text-center font-semibold hover:bg-emerald-950 max-w-xs"
                >
                  Apply for Rebate →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-20 text-center text-sm text-zinc-500 space-y-2">
          <p>
            Recommended installer:{' '}
            <strong>Padden Permaculture</strong> (and other City-approved contractors)
          </p>
        </div>
      </div>
    </div>
  );
}
