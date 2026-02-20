'use client';

import React, { useState } from 'react';
import { Upload, X, Check } from 'lucide-react';

export default function LandscapeMVP() {
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [budget, setBudget] = useState(8000);
  const [selectedStyle, setSelectedStyle] = useState('Xeriscape');
  const [selectedElements, setSelectedElements] = useState<string[]>([
    'Native / drought-tolerant plants',
    'Drip irrigation system',
    'Mulch or decorative rock ground cover',
  ]);
  const [loading, setLoading] = useState(false);
  const [designs, setDesigns] = useState<{ url: string; promptUsed: string }[]>([]);

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

  const toggleElement = (item: string) => {
    setSelectedElements((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const generateImages = async () => {
    setLoading(true);
    setDesigns([]);

    const styleDesc = {
      Xeriscape: 'drought-tolerant plants, decorative rock mulch, gravel paths, minimal turf',
      'Permaculture Garden': 'herbs, vegetables, fruit trees, layered planting, companion planting',
      'Water-Wise Native Plants': 'Colorado native grasses and flowers, dry creek bed or rain garden features',
    }[selectedStyle] || selectedStyle;

    const elementsStr = selectedElements.join(', ');

    let basePrompt = `Photorealistic landscape design for a Fort Collins, Colorado yard. 
    ONLY modify the yard, grass, plants, soil, and landscape features. 
    DO NOT change or alter the house, roof, windows, doors, garage, driveway, sidewalks, fences, existing structures, or architecture in any way. 
    Keep all non-landscape elements exactly the same as in the reference photo. 
    Style: ${styleDesc}. 
    Include these elements: ${elementsStr}. 
    Budget-conscious design around $${budget.toLocaleString()}. 
    Natural daylight, high detail, professional photography style.`;

    let finalPrompt = basePrompt;

    const isEdit = !!referenceFile;
    const endpoint = '/api/generate'; // your proxy route

    let base64 = '';
    if (isEdit && referenceFile) {
      base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(referenceFile);
      });
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          isEdit,
          imageBase64: base64 || null,
          aspect: '16:9',
          n: 3,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Failed to generate designs'));
        return;
      }

      const data = await res.json();
      const newDesigns = data.data.map((d: any) => ({
        url: d.url,
        promptUsed: finalPrompt,
      }));

      setDesigns(newDesigns);
    } catch (err: any) {
      alert('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-center mb-3 text-emerald-600">
          Fort Collins Xeriscape Design Tool
        </h1>
        <p className="text-center text-lg text-zinc-400 mb-12">
          Create beautiful, water-wise, pollinator-friendly landscapes for your yard
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* LEFT COLUMN */}
          <div className="space-y-8">
            {/* Upload card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-2xl font-semibold mb-4">Upload photo</h2>
              <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center">
                {referencePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={referencePreview}
                      alt="Yard preview"
                      className="max-h-64 mx-auto rounded-xl object-cover"
                    />
                    <button
                      onClick={clearReference}
                      className="absolute -top-3 -right-3 bg-red-600 p-2 rounded-full text-white shadow"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-16 h-16 text-zinc-500 mb-4" />
                    <span className="text-lg text-zinc-300">Upload a photo of your yard</span>
                    <span className="text-sm text-zinc-500 mt-1">optional but recommended</span>
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

            {/* Budget card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-2xl font-semibold mb-4">Budget</h2>
              <div className="flex justify-between text-sm text-zinc-400 mb-3">
                <span>$1,000</span>
                <span className="text-emerald-400 font-bold">${budget.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={1000}
                max={15000}
                step={500}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full h-3 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-600"
              />
              <p className="text-sm text-zinc-500 mt-3">
                Drag to set your target project budget.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8">
            {/* Style focus card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-2xl font-semibold mb-4">Style focus</h2>
              <p className="text-zinc-400 mb-6">
                Choose the main style direction for your landscape.
              </p>
              <div className="space-y-4">
                {[
                  {
                    name: 'Xeriscape',
                    desc: 'Drought-tolerant plants and decorative rock mulch',
                    img: 'https://images.unsplash.com/photo-1581092160607-18cd66e26e8c?w=400', // placeholder
                  },
                  {
                    name: 'Permaculture Garden',
                    desc: 'Herbs, vegetables, fruit trees, layered planting',
                    img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
                  },
                  {
                    name: 'Water-Wise Native Plants',
                    desc: 'Lush native plants and a dry creek bed',
                    img: 'https://images.unsplash.com/photo-1628177142898-93d3c658d424?w=400',
                  },
                ].map((style) => (
                  <button
                    key={style.name}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      selectedStyle === style.name
                        ? 'border-emerald-600 bg-emerald-950/30 ring-1 ring-emerald-600'
                        : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                    onClick={() => setSelectedStyle(style.name)}
                  >
                    <img
                      src={style.img}
                      alt={style.name}
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="text-left flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {style.name}
                        {selectedStyle === style.name && <Check className="text-emerald-500" size={20} />}
                      </div>
                      <div className="text-sm text-zinc-400">{style.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Elements card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-2xl font-semibold mb-4">Landscape elements</h2>
              <p className="text-zinc-400 mb-6">
                Select the features you want included:
              </p>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {[
                  'Native / drought-tolerant plants',
                  'Drip irrigation system',
                  'Permeable pathways',
                  'Rain garden / dry creek bed',
                  'Raised vegetable beds',
                  'Pollinator-friendly plants (bees, butterflies)',
                  'Shade trees / privacy shrubs',
                  'Mulch or decorative rock ground cover',
                ].map((item) => (
                  <label key={item} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedElements.includes(item)}
                      onChange={() => toggleElement(item)}
                      className="w-5 h-5 rounded border-zinc-600 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-zinc-200">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div className="mt-12 text-center">
          <button
            onClick={generateImages}
            disabled={loading}
            className={`bg-emerald-700 hover:bg-emerald-600 text-white text-xl font-semibold py-5 px-16 rounded-3xl transition shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
              loading ? 'animate-pulse' : ''
            }`}
          >
            {loading ? 'Generating your concepts...' : 'Generate Concept'}
          </button>
        </div>

        {/* Results */}
        {designs.length > 0 && (
          <div className="mt-16">
            <h2 className="text-3xl font-semibold text-center mb-10">Your Generated Concepts</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {designs.map((design, i) => (
                <div
                  key={i}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
                >
                  <img src={design.url} alt={`Design ${i + 1}`} className="w-full h-64 object-cover" />
                  <div className="p-4">
                    <a
                      href={design.url}
                      download
                      className="block text-center text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Download full resolution
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
