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
    prompt: 'mostly plants and mulch, very minimal hardscaping, simple gravel areas, heavy use of Colorado native grasses and perennials, budget-conscious xeriscape',
  },
  {
    id: 'mid',
    name: 'Mid-Range',
    emoji: '🪨',
    rebate: 'Up to $750',
    cost: '$5,000 – $9,000',
    desc: 'Plants + permeable pathway — nice balance',
    prompt: 'plants plus a permeable pathway, some rock mulch, good plant coverage, clean and functional xeriscape with drip irrigation',
  },
  {
    id: 'premium',
    name: 'Premium Outdoor Living',
    emoji: '🔥',
    rebate: 'Up to $1,000',
    cost: '$9,000 – $15,000',
    desc: 'Plants + pathway + outdoor living area (seating + fire feature)',
    prompt: 'plants plus permeable pathway plus outdoor living area with seating and fire feature, beautiful and functional xeriscape with layered natives',
  },
];

export default function LandscapeTool() {
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [selectedTier, setSelectedTier] = useState(tiers[1]); // default Mid-Range
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<{ url: string; promptUsed: string } | null>(null);
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

  const generateDesign = async () => {
    setLoading(true);
    setDesign(null);
    setBreakdown('');
    setBreakdownLoading(true);

    const tierPrompt = selectedTier.prompt;

    const finalPrompt = `Photorealistic landscape design for a real Fort Collins, Colorado yard using this exact style: ${tierPrompt}. 
    ONLY modify the yard/grass/plants/soil/landscape features. 
    DO NOT change house, roof, windows, garage, driveway, sidewalks, fences, or any architecture. 
    Natural daylight, high detail, professional photography style.`;

    try {
      // Generate ONE image
      const imgRes = await fetch('/api/generate', {
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

      if (!imgRes.ok) {
        const err = await imgRes.text();
        throw new Error(`Image generation failed: ${err}`);
      }

      const imgData = await imgRes.json();
      const imageUrl = imgData.data[0].url;

      const newDesign = { url: imageUrl, promptUsed: finalPrompt };
      setDesign(newDesign);

      // Immediately generate breakdown
      const bdRes = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          tier: selectedTier.name,
        }),
      });

      if (bdRes.ok) {
        const bd = await bdRes.json();
        setBreakdown(bd.breakdown || 'Breakdown generated.');
      } else {
        setBreakdown('Could not generate cost & plant breakdown at this time.');
      }
    } catch (err: any) {
      alert('Generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
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
          Fort Collins Xeriscape Rebate Designer
        </h1>
        <p className="text-center text-xl text-zinc-400 mb-12">
          See what your yard could look like and qualify for up to $1,000 from the City
        </p>

        {/* Upload */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Upload your yard photo (optional)</h2>
          <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center">
            {referencePreview ? (
              <div className="relative max-w-md mx-auto">
                <img src={referencePreview} className="rounded-2xl" alt="Yard preview" />
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
            onClick={generateDesign}
            disabled={loading}
            className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-800 text-white text-2xl font-semibold px-16 py-6 rounded-3xl transition shadow-xl"
          >
            {loading ? 'Generating your design...' : `Generate ${selectedTier.name} Design`}
          </button>
        </div>

        {/* Result Section */}
        {design && (
          <div className="mt-12">
            <h2 className="text-3xl font-semibold text-center mb-8">{selectedTier.name} Design</h2>
            
            <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 max-w-4xl mx-auto">
              <img src={design.url} className="w-full h-96 object-cover" alt="Generated landscape design" />
              
              <div className="p-8">
                {breakdownLoading ? (
                  <div className="text-center py-12 text-xl">Analyzing design and creating your cost + plant estimate...</div>
                ) : (
                  <div className="prose prose-invert max-w-none text-lg leading-relaxed whitespace-pre-wrap">
                    {breakdown || 'No breakdown available yet.'}
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-zinc-800 flex gap-4 flex-wrap justify-center">
                <a href={design.url} download className="flex-1 bg-emerald-700 py-4 rounded-2xl text-center font-semibold max-w-xs">
                  Download Design Image
                </a>
                <a 
                  href="https://www.fortcollins.gov/Services/Utilities/Programs-and-Rebates/Water-Programs/XIP" 
                  target="_blank"
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
          <p>Recommended installer: <strong>Padden Permaculture</strong> (and other City-approved contractors)</p>
        </div>
      </div>
    </div>
  );
}
