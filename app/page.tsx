
'use client';

import React, { useState } from 'react';
import { Upload, X, Check, Download, ArrowRight } from 'lucide-react';

interface Package {
  id: string;
  name: string;
  rebate: string;
  costRange: string;
  desc: string;
  promptKeywords: string;
}

const rebatePackages: Package[] = [
  {
    id: 'starter',
    name: 'Starter Rebate',
    rebate: 'Up to $750',
    costRange: '$3,000 – $6,000',
    desc: 'Great first step – basic xeriscape, rock mulch, some natives',
    promptKeywords: 'basic xeriscape, rock mulch, drought-tolerant plants, minimal changes, qualifies for standard rebate',
  },
  {
    id: 'full',
    name: 'Full Rebate Max',
    rebate: 'Up to $750',
    costRange: '$5,000 – $9,000',
    desc: 'Good coverage with drip irrigation and pathways',
    promptKeywords: 'full xeriscape with drip irrigation, permeable pathways, attractive layered planting, strong rebate qualifier',
  },
  {
    id: 'native',
    name: 'Native Bonus Max ⭐',
    rebate: 'Up to $1,000',
    costRange: '$6,000 – $12,000',
    desc: '80%+ Colorado native plants – maximum rebate',
    promptKeywords: 'maximum native Colorado plants, high pollinator friendly, 80% native coverage, qualifies for native bonus rebate',
  },
  {
    id: 'budget',
    name: 'Budget Smart',
    rebate: 'Up to $600',
    costRange: 'Under $5,000',
    desc: 'Best value – low-cost materials, still rebate eligible',
    promptKeywords: 'budget-friendly xeriscape, low-cost materials, gravel and native grasses, still qualifies for rebate',
  },
];

export default function LandscapeTool() {
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package>(rebatePackages[2]); // default Native Bonus
  const [loading, setLoading] = useState(false);
  const [designs, setDesigns] = useState<{ url: string; promptUsed: string }[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<{ url: string; promptUsed: string } | null>(null);
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

    const finalPrompt = `Photorealistic landscape design for a real Fort Collins, Colorado front or back yard. 
    ONLY change the yard/grass/plants/soil/landscape features. 
    DO NOT change the house, roof, windows, garage, driveway, sidewalks, or any architecture. 
    Design style: ${selectedPackage.promptKeywords}. 
    Professional, natural daylight, high detail.`;

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

      if (!res.ok) throw new Error('Failed to generate');

      const data = await res.json();
      const newDesigns = data.data.map((d: any) => ({
        url: d.url,
        promptUsed: finalPrompt,
      }));

      setDesigns(newDesigns);
    } catch (err) {
      alert('Generation failed. Please try again.');
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

  const viewBreakdown = async (design: { url: string; promptUsed: string }) => {
    setSelectedDesign(design);
    setBreakdown('');
    setBreakdownLoading(true);

    try {
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: design.url,
          packageName: selectedPackage.name,
        }),
      });

      const data = await res.json();
      setBreakdown(data.breakdown || 'Could not generate breakdown at this time.');
    } catch (err) {
      setBreakdown('Sorry, the breakdown service is temporarily unavailable.');
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

        {/* Upload */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Step 1: Upload your yard photo</h2>
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
                <p className="text-sm text-zinc-500 mt-2">Front or back yard works best</p>
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Rebate Packages */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">Step 2: Choose your rebate goal</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rebatePackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`bg-zinc-900 border-2 rounded-3xl p-6 text-left transition-all hover:scale-105 ${
                  selectedPackage.id === pkg.id ? 'border-emerald-600 bg-emerald-950/30' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="text-emerald-400 font-bold text-xl mb-1">{pkg.rebate}</div>
                <div className="font-semibold text-xl mb-2">{pkg.name}</div>
                <div className="text-sm text-zinc-400 mb-4">{pkg.costRange}</div>
                <p className="text-zinc-300 text-sm leading-snug">{pkg.desc}</p>
                {selectedPackage.id === pkg.id && <Check className="mt-4 text-emerald-500" size={28} />}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="text-center mb-16">
          <button
            onClick={generateImages}
            disabled={loading}
            className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-800 text-white text-2xl font-semibold px-16 py-6 rounded-3xl transition shadow-xl"
          >
            {loading ? 'Generating rebate-ready designs...' : `Generate My ${selectedPackage.name} Designs`}
          </button>
        </div>

        {/* Generated Designs */}
        {designs.length > 0 && (
          <div>
            <h2 className="text-3xl font-semibold text-center mb-10">Your Rebate-Ready Designs</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {designs.map((design, i) => (
                <div key={i} className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800">
                  <img src={design.url} className="w-full h-72 object-cover" />
                  <div className="p-6">
                    <button
                      onClick={() => viewBreakdown(design)}
                      className="w-full bg-emerald-700 hover:bg-emerald-600 py-4 rounded-2xl font-semibold text-lg mb-4"
                    >
                      View Full Breakdown & Estimate
                    </button>
                    <a
                      href={design.url}
                      download
                      className="block text-center text-emerald-400 hover:text-emerald-300"
                    >
                      Download High-Res Image
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rebate Info Footer */}
        <div className="mt-20 text-center text-sm text-zinc-500">
          <a
            href="https://www.fortcollins.gov/Services/Utilities/Programs-and-Rebates/Water-Programs/XIP"
            target="_blank"
            className="text-emerald-400 hover:underline"
          >
            Apply for the official Xeriscape Incentive Program (XIP) →
          </a>
          <p className="mt-6">Recommended local installers: Padden Permaculture and other City-listed contractors</p>
        </div>
      </div>

      {/* Breakdown Modal */}
      {selectedDesign && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 overflow-auto">
          <div className="bg-zinc-900 max-w-4xl w-full rounded-3xl max-h-[95vh] overflow-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex justify-between">
              <h3 className="text-2xl font-semibold">Full Project Breakdown</h3>
              <button onClick={() => setSelectedDesign(null)} className="text-zinc-400">✕</button>
            </div>

            <div className="p-8">
              <img src={selectedDesign.url} className="w-full rounded-2xl mb-8" />

              {breakdownLoading ? (
                <div className="text-center py-20">Analyzing design and creating detailed estimate...</div>
              ) : (
                <div className="prose prose-invert max-w-none text-lg" dangerouslySetInnerHTML={{ __html: breakdown }} />
              )}
            </div>

            <div className="p-8 border-t border-zinc-800 flex gap-4">
              <a
                href="https://www.fortcollins.gov/Services/Utilities/Programs-and-Rebates/Water-Programs/XIP"
                target="_blank"
                className="flex-1 bg-emerald-700 py-4 rounded-2xl text-center font-semibold"
              >
                Apply for Rebate Now →
              </a>
              <button onClick={() => setSelectedDesign(null)} className="flex-1 border border-zinc-700 py-4 rounded-2xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
