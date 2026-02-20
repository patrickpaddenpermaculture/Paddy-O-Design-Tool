
'use client';

import React, { useState } from 'react';
import { Upload, X, Check, Download } from 'lucide-react';

const tiers = [
  {
    id: 'budget',
    name: 'Budget-Friendly',
    emoji: '🌱',
    rebate: 'Up to $600',
    cost: '$2,500 – $5,000',
    desc: 'Mostly plants & mulch — maximum plants, minimal hardscape',
    prompt: 'mostly plants and mulch, very minimal hardscaping, simple gravel areas, heavy use of Colorado native grasses and perennials',
  },
  {
    id: 'mid',
    name: 'Mid-Range',
    emoji: '🪨',
    rebate: 'Up to $750',
    cost: '$5,000 – $9,000',
    desc: 'Plants + permeable pathway — nice balance',
    prompt: 'plants plus a permeable pathway, some rock mulch, good plant coverage, clean and functional',
  },
  {
    id: 'premium',
    name: 'Premium Outdoor Living',
    emoji: '🔥',
    rebate: 'Up to $1,000',
    cost: '$9,000 – $15,000',
    desc: 'Plants + pathway + outdoor living area (seating + fire feature)',
    prompt: 'plants plus permeable pathway plus outdoor living area with seating and fire feature, beautiful and functional',
  },
];

export default function LandscapeTool() {
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [selectedTier, setSelectedTier] = useState(tiers[1]); // default Mid-Range
  const [loading, setLoading] = useState(false);
  const [designs, setDesigns] = useState<any[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [breakdown, setBreakdown] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setReferencePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearReference = () => {
    setReferenceFile(null);
    setReferencePreview(null);
  };

  const generateImages = async () => {
    setLoading(true);
    setDesigns([]);

    const variety = `Create THREE distinctly different variations of this exact tier:
1. Soft and natural planting style
2. More structured / organized planting style
3. Wildflower meadow inspired style

Only change the yard area. Never alter the house, driveway, garage, roof, windows or any architecture.`;

    const finalPrompt = `${variety} ${selectedTier.prompt}. Photorealistic, natural daylight, Fort Collins Colorado front or back yard, high detail.`;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          isEdit: !!referenceFile,
          imageBase64: referenceFile ? await fileToBase64(referenceFile) : null,
          n: 3,
          aspect: '16:9',
        }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();

      setDesigns(data.data.map((d: any) => ({
        url: d.url,
        promptUsed: finalPrompt,
        tier: selectedTier.name,
      })));
    } catch (err) {
      alert('Failed to generate designs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
  };

  const viewBreakdown = async (design: any) => {
    setSelectedDesign(design);
    setBreakdown('');
    setBreakdownLoading(true);

    try {
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: design.url,
          tier: design.tier,
        }),
      });

      const data = await res.json();
      setBreakdown(data.breakdown || 'Could not generate breakdown.');
    } catch (err) {
      setBreakdown('Sorry, the breakdown is temporarily unavailable.');
    } finally {
      setBreakdownLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-serif font-bold text-center text-emerald-600 mb-3">
          Fort Collins Xeriscape Rebate Designer
        </h1>
        <p className="text-center text-xl text-zinc-400 mb-12">
          See what your yard could look like and qualify for up to $1,000 from the City
        </p>

        {/* Upload Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Upload your yard photo</h2>
          <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center">
            {referencePreview ? (
              <div className="relative max-w-md mx-auto">
                <img src={referencePreview} className="rounded-2xl" />
                <button onClick={clearReference} className="absolute top-4 right-4 bg-red-600 p-2 rounded-full">
                  <X size={24} />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <Upload className="w-16 h-16 mx-auto text-zinc-500 mb-4" />
                <span className="text-xl text-zinc-300">Click or drag a photo of your yard</span>
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Tier Selection */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">Choose your project level</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier)}
                className={`bg-zinc-900 border-2 rounded-3xl p-8 text-left transition-all hover:scale-105 ${
                  selectedTier.id === tier.id ? 'border-emerald-600 bg-emerald-950/30' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="text-5xl mb-4">{tier.emoji}</div>
                <div className="text-2xl font-bold mb-1">{tier.name}</div>
                <div className="text-emerald-400 font-semibold text-lg">{tier.rebate}</div>
                <div className="text-sm text-zinc-400 mt-1">{tier.cost}</div>
                <p className="mt-4 text-zinc-300 text-sm">{tier.desc}</p>
                {selectedTier.id === tier.id && <Check className="mt-6 text-emerald-500" size={32} />}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="text-center mb-16">
          <button
            onClick={generateImages}
            disabled={loading}
            className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-800 text-white text-2xl font-semibold px-16 py-6 rounded-3xl transition"
          >
            {loading ? 'Generating your 3 designs...' : `Generate ${selectedTier.name} Designs`}
          </button>
        </div>

        {/* Generated Designs */}
        {designs.length > 0 && (
          <div>
            <h2 className="text-3xl font-semibold text-center mb-10">Your 3 Designs</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {designs.map((design, i) => (
                <div key={i} className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800">
                  <img src={design.url} className="w-full h-72 object-cover" />
                  <div className="p-6 space-y-4">
                    <button
                      onClick={() => viewBreakdown(design)}
                      className="w-full bg-emerald-700 hover:bg-emerald-600 py-4 rounded-2xl font-semibold"
                    >
                      View Full Breakdown & Estimate
                    </button>
                    <a href={design.url} download className="block text-center text-emerald-400 hover:text-emerald-300">
                      Download Image
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-20 text-center text-sm text-zinc-500 space-y-2">
          <a href="https://www.fortcollins.gov/Services/Utilities/Programs-and-Rebates/Water-Programs/XIP" target="_blank" className="text-emerald-400 hover:underline block">
            Apply for the Official Xeriscape Incentive Program →
          </a>
          <p>Recommended installer: <strong>Padden Permaculture</strong> (and other City-approved contractors)</p>
        </div>
      </div>

      {/* Breakdown Modal */}
      {selectedDesign && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 max-w-4xl w-full rounded-3xl max-h-[95vh] overflow-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex justify-between items-center">
              <h3 className="text-2xl font-semibold">Full Project Breakdown — {selectedDesign.tier}</h3>
              <button onClick={() => setSelectedDesign(null)} className="text-3xl text-zinc-400">×</button>
            </div>

            <div className="p-8">
              <img src={selectedDesign.url} className="w-full rounded-2xl mb-8" />

              {breakdownLoading ? (
                <div className="text-center py-20 text-xl">Analyzing image + creating detailed estimate and plant list...</div>
              ) : (
                <div className="prose prose-invert max-w-none text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: breakdown.replace(/\n/g, '<br><br>') }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
