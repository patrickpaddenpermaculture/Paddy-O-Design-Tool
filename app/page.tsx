'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Download, Wand2, Trash2, X } from 'lucide-react';

interface Design {
  url: string;
  promptUsed: string;
}

export default function LandscapeMVP() {
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [budget, setBudget] = useState(15000);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [aspect, setAspect] = useState('16:9');

  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [breakdown, setBreakdown] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  // Load saved key
  useEffect(() => {
    const saved = localStorage.getItem('xaiKey');
    if (saved) setApiKey(saved);
    setPrompt('Spacious backyard in Fort Collins with Rocky Mountain views, native plants, flagstone patio, and fire pit');
  }, []);

  const saveKey = (key: string) => {
    localStorage.setItem('xaiKey', key);
  };

  const getBudgetStyle = (b: number) => {
    if (b <= 10000) return 'affordable budget-friendly xeriscape with native Colorado plants, gravel paths, basic mulch, simple flagstone';
    if (b <= 25000) return 'mid-range professional design with quality paver patio, small water feature or fire pit, drip irrigation, and layered planting';
    return 'premium luxury landscape with custom natural stone hardscaping, mature trees/shrubs, high-end gas fire feature, smart lighting, and full irrigation system';
  };

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

  const generateDesigns = async () => {
    if (!apiKey) return alert('Please enter your xAI API key');
    saveKey(apiKey);

    const budgetStyle = getBudgetStyle(budget);
    let finalPrompt = `${prompt}. ${budgetStyle}. Photorealistic professional landscape photography, golden hour lighting, Rocky Mountain views in background where possible, high detail, Fort Collins Colorado.`;

    setLoading(true);
    setDesigns([]);

    const isEdit = !!referenceFile;
    const endpoint = isEdit ? 'https://api.x.ai/v1/images/edits' : 'https://api.x.ai/v1/images/generations';

    let base64 = '';
    if (isEdit && referenceFile) {
      base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(referenceFile);
      });
    }

    const body: any = {
      prompt: isEdit 
        ? `Transform the uploaded yard photo into: ${finalPrompt}` 
        : finalPrompt,
      model: 'grok-imagine-image',
      response_format: 'url',
      n: 3,
      aspect_ratio: aspect,
    };

    if (isEdit) {
      body.image = { url: `data:image/jpeg;base64,${base64}` };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const newDesigns = data.data.map((d: any) => ({
        url: d.url,
        promptUsed: finalPrompt,
      }));

      setDesigns(newDesigns);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBreakdown = async (design: Design) => {
    setSelectedDesign(design);
    setBreakdown('');
    setBreakdownLoading(true);

    const system = `You are a licensed landscape architect and contractor in Fort Collins, Colorado. 
    You give honest, detailed, realistic quotes using current local material & labor prices (2026). 
    Always keep the grand total at or below the client's stated budget.`;

    const userMsg = `Design description: ${design.promptUsed}
Budget: $${budget.toLocaleString()}

Provide in clean Markdown:

## Cost Breakdown
• Item: $amount (brief explanation)
...

**Grand Total: $X,XXX** (must be ≤ $${budget})

## Installation Strategy
1. Phase name (duration)
...

Best time of year to start: ...
Local notes (permits, HOA, Colorado climate, etc.)`;

    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-4-0709',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.7,
        }),
      });

      const json = await res.json();
      setBreakdown(json.choices[0].message.content);
    } catch (err) {
      setBreakdown('Sorry, could not generate breakdown right now. Please try again.');
    } finally {
      setBreakdownLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-6xl font-bold text-center mb-2">🌲 Landscape AI</h1>
        <p className="text-center text-xl text-zinc-400 mb-12">Fort Collins • Powered by Grok Imagine</p>

        {/* API Key */}
        <div className="max-w-md mx-auto mb-12">
          <label className="block text-sm text-zinc-400 mb-2">xAI API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="xai-..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500"
          />
          <p className="text-xs text-zinc-500 mt-2">Saved only in your browser • Get key at console.grok.com</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Form */}
          <div className="space-y-8">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Describe your yard or dream design</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-3xl p-6 text-lg focus:outline-none focus:border-emerald-500 resize-none"
                placeholder="Backyard with mountain views, want a fire pit and native garden..."
              />
            </div>

            {/* Reference Photo */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Upload reference photo of your yard (optional but recommended)</label>
              <div className="border-2 border-dashed border-zinc-700 rounded-3xl p-8 text-center">
                {referencePreview ? (
                  <div className="relative inline-block">
                    <img src={referencePreview} alt="preview" className="max-h-48 rounded-2xl" />
                    <button onClick={clearReference} className="absolute -top-2 -right-2 bg-red-600 p-1 rounded-full">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-12 h-12 text-zinc-400 mb-3" />
                    <span className="text-zinc-400">Click or drag photo here</span>
                    <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Budget Slider */}
            <div>
              <div className="flex justify-between text-sm text-zinc-400 mb-2">
                <span>Budget</span>
                <span className="text-2xl font-semibold text-emerald-400">${budget.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={2000}
                max={50000}
                step={500}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>$2k</span>
                <span>$50k</span>
              </div>
            </div>

            {/* Aspect */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Aspect Ratio</label>
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4"
              >
                <option value="16:9">16:9 Wide (recommended)</option>
                <option value="1:1">1:1 Square</option>
                <option value="9:16">9:16 Vertical</option>
              </select>
            </div>

            <button
              onClick={generateDesigns}
              disabled={loading || !prompt.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 transition py-5 rounded-3xl font-semibold text-xl flex items-center justify-center gap-3"
            >
              {loading ? 'Generating beautiful designs...' : <><Wand2 /> Generate 3 Design Options</>}
            </button>
          </div>

          {/* Results */}
          <div>
            {designs.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-semibold">Your 3 Designs</h2>
                  <button onClick={() => setDesigns([])} className="text-zinc-400 hover:text-white flex items-center gap-2">
                    <Trash2 size={20} /> Clear
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {designs.map((design, i) => (
                    <div key={i} className="group relative bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-700 hover:border-emerald-500 transition cursor-pointer"
                         onClick={() => fetchBreakdown(design)}>
                      <img src={design.url} className="w-full aspect-video object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-6">
                        <div className="text-lg font-medium">View full breakdown →</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDesign && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex justify-between items-center z-10">
              <h2 className="text-2xl font-semibold">Design Details</h2>
              <button onClick={() => setSelectedDesign(null)}><X size={28} /></button>
            </div>

            <div className="p-8">
              <img src={selectedDesign.url} className="w-full rounded-2xl" />

              <div className="mt-10">
                <h3 className="text-3xl font-semibold mb-6 flex items-center gap-3">
                  💰 Price Breakdown &amp; Installation Plan
                </h3>

                {breakdownLoading ? (
                  <div className="text-center py-20 text-zinc-400">Crafting your detailed quote...</div>
                ) : (
                  <div className="prose prose-invert max-w-none text-lg leading-relaxed"
                       dangerouslySetInnerHTML={{ __html: breakdown.replace(/\n/g, '<br>') }} />
                )}
              </div>
            </div>

            <div className="p-8 border-t border-zinc-800 flex gap-4">
              <a href={selectedDesign.url} download className="flex-1 bg-white text-black py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-zinc-200">
                <Download /> Download High-Res Image
              </a>
              <button onClick={() => setSelectedDesign(null)} className="flex-1 border border-zinc-700 py-4 rounded-2xl font-semibold hover:bg-zinc-800">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
