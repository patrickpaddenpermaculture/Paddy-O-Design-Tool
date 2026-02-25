'use client';
import React, { useState } from 'react';
import { Upload, X, Check, Award, Map, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const XIP_LINK = 'https://www.fortcollins.gov/Services/Utilities/Programs-and-Rebates/Water-Programs/XIP';

export default function LandscapeTool() {
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<{ url: string; promptUsed: string } | null>(null);
  const [breakdown, setBreakdown] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState('');
  // New state for top-view detailed plan
  const [topViewUrl, setTopViewUrl] = useState<string | null>(null);
  const [topViewLoading, setTopViewLoading] = useState(false);
  const [topViewError, setTopViewError] = useState('');
  // Customization state
  const [nativePlanting, setNativePlanting] = useState(true);
  const [rainGarden, setRainGarden] = useState(false);
  const [hardscape, setHardscape] = useState(false);
  const [hardscapeType, setHardscapeType] = useState<'walkway' | 'walkway-patio'>('walkway');
  const [hardscapeMaterial, setHardscapeMaterial] = useState<'stone' | 'pavers'>('pavers');
  const [edibleGuild, setEdibleGuild] = useState(false);
  const [culinaryGuild, setCulinaryGuild] = useState(false);
  const [medicinalGuild, setMedicinalGuild] = useState(false);
  const [fruitGuild, setFruitGuild] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    setTopViewUrl(null);
    setTopViewError('');
    let features: string[] = [];
    if (nativePlanting) {
      features.push('grass completely removed and replaced with low-water Colorado native perennials, grasses, and shrubs (80%+ native coverage)');
    }
    if (rainGarden) {
      features.push('downspout routed into a beautiful infiltration basin / rain garden with native wetland plants');
    }
    if (hardscape) {
      const hs = hardscapeType === 'walkway-patio'
        ? 'permeable walkway AND patio'
        : 'permeable walkway';
      const mat = hardscapeMaterial === 'stone' ? 'natural stone' : 'pavers';
      features.push(`${hs} made of ${mat}`);
    }
    if (edibleGuild) {
      const guilds: string[] = [];
      if (culinaryGuild) guilds.push('culinary herb and vegetable guild');
      if (medicinalGuild) guilds.push('medicinal herb guild');
      if (fruitGuild) guilds.push('fruit tree and berry bush guild');
      if (guilds.length > 0) {
        features.push(guilds.join(', '));
      }
    }
    const featureString = features.length
      ? `Include these specific features: ${features.join(', ')}. `
      : '';
    const finalPrompt = `Photorealistic landscape design for a real Fort Collins, Colorado yard.
${featureString}
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
          tier: 'Custom Landscape',
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

  const generateTopView = async () => {
    if (!design) {
      alert('Generate the main design first.');
      return;
    }
    setTopViewLoading(true);
    setTopViewError('');
    setTopViewUrl(null);
    try {
      // For now: simulate delay + use placeholder
      await new Promise(resolve => setTimeout(resolve, 2500));
      // In real version → call your /api/topview endpoint
      setTopViewUrl('/top-view-placeholder.png'); // ← replace with real generated URL later
    } catch (err: any) {
      setTopViewError('Failed to generate top-view plan: ' + (err.message || 'Unknown error'));
    } finally {
      setTopViewLoading(false);
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
        <p className="text-center text-xl text-zinc-400 mb-6">
          Design Your Dream Landscape in Fort Collins and Unlock Up to $1,000 in City Rebates
        </p>

        {/* Clickable Rebate Program Link – prominent */}
        <div className="text-center mb-10">
          <a
            href={XIP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-semibold transition shadow-lg"
          >
            <Award size={20} />
            View Official Xeriscape Incentive Program Details →
          </a>
        </div>

        {/* Upload Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Upload your yard photo (optional)</h2>
          <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center">
            {referencePreview ? (
              <div className="relative max-w-md mx-auto">
                <img src={referencePreview} className="rounded-2xl" alt="Preview" />
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

        {/* Customize Features */}
        <div className="mb-12">
          <h2 className="text-3xl font-semibold text-center mb-8">Customize Your Landscape</h2>
          <div className="space-y-8">
            {/* Native Planting + Rebate Link */}
            <div className="bg-zinc-900 border border-emerald-700 rounded-3xl p-8 relative">
              <div className="absolute -top-3 -right-3 bg-emerald-600 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                <Award size={16} /> UP TO $1,000 REBATE AVAILABLE
              </div>
              <label className="flex items-start gap-4 cursor-pointer">
                <input type="checkbox" checked={nativePlanting} onChange={(e) => setNativePlanting(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                <div>
                  <div className="text-2xl font-semibold">Replace grass with low-water Colorado natives</div>
                  <p className="text-zinc-400 mt-1">
                    Remove all turf and plant native perennials, grasses & shrubs — qualifies for maximum rebate.{' '}
                    <a href={XIP_LINK} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                      Learn more about the XIP program →
                    </a>
                  </p>
                </div>
              </label>
            </div>

            {/* Rain Garden */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <label className="flex items-start gap-4 cursor-pointer">
                <input type="checkbox" checked={rainGarden} onChange={(e) => setRainGarden(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                <div>
                  <div className="text-2xl font-semibold">Add rain garden + downspout integration</div>
                  <p className="text-zinc-400 mt-1">Route roof runoff into a beautiful infiltration basin / rain garden with native wetland plants</p>
                </div>
              </label>
            </div>

            {/* Hardscape */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <label className="flex items-start gap-4 cursor-pointer">
                <input type="checkbox" checked={hardscape} onChange={(e) => setHardscape(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                <div className="flex-1">
                  <div className="text-2xl font-semibold">Add hardscape</div>
                  <p className="text-zinc-400 mt-1">Walkway and/or patio</p>

                  {hardscape && (
                    <div className="mt-6 space-y-6 pl-2 border-l-2 border-zinc-700">
                      <div>
                        <p className="text-sm text-zinc-400 mb-2">Choose layout</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setHardscapeType('walkway')}
                            className={`flex-1 py-3 rounded-2xl text-sm font-medium transition ${hardscapeType === 'walkway' ? 'bg-emerald-700 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                          >
                            Walkway
                          </button>
                          <button
                            onClick={() => setHardscapeType('walkway-patio')}
                            className={`flex-1 py-3 rounded-2xl text-sm font-medium transition ${hardscapeType === 'walkway-patio' ? 'bg-emerald-700 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                          >
                            Walkway & Patio
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-zinc-400 mb-2">Material</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setHardscapeMaterial('pavers')}
                            className={`flex-1 py-3 rounded-2xl text-sm font-medium transition ${hardscapeMaterial === 'pavers' ? 'bg-emerald-700 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                          >
                            Pavers
                          </button>
                          <button
                            onClick={() => setHardscapeMaterial('stone')}
                            className={`flex-1 py-3 rounded-2xl text-sm font-medium transition ${hardscapeMaterial === 'stone' ? 'bg-emerald-700 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                          >
                            Natural Stone
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Edible Guild */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <label className="flex items-start gap-4 cursor-pointer">
                <input type="checkbox" checked={edibleGuild} onChange={(e) => setEdibleGuild(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                <div className="flex-1">
                  <div className="text-2xl font-semibold">Add edible / permaculture guild</div>
                  <p className="text-zinc-400 mt-1">Integrate food-producing plants into the design</p>

                  {edibleGuild && (
                    <div className="mt-6 pl-2 border-l-2 border-zinc-700 space-y-4">
                      <p className="text-sm text-zinc-400 mb-2">Select all that apply:</p>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={culinaryGuild} onChange={(e) => setCulinaryGuild(e.target.checked)} className="w-5 h-5 accent-emerald-600" />
                          <span>Culinary Herbs & Vegetables</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={medicinalGuild} onChange={(e) => setMedicinalGuild(e.target.checked)} className="w-5 h-5 accent-emerald-600" />
                          <span>Medicinal Herbs</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={fruitGuild} onChange={(e) => setFruitGuild(e.target.checked)} className="w-5 h-5 accent-emerald-600" />
                          <span>Fruit Trees & Berries</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="text-center mb-16">
          <button
            onClick={generateDesign}
            disabled={loading}
            className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white text-2xl font-semibold px-16 py-6 rounded-3xl transition shadow-xl"
          >
            {loading ? 'Generating your custom design...' : 'Generate My Landscape Design'}
          </button>
        </div>

        {/* Result Section */}
        {design && (
          <div className="mt-12">
            <h2 className="text-3xl font-semibold text-center mb-8">Your Custom Design</h2>
            <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 max-w-4xl mx-auto">
              <img src={design.url} className="w-full h-96 object-cover" alt="Generated design" />
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={generateBreakdown}
                    disabled={breakdownLoading}
                    className="bg-emerald-800 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white py-5 rounded-2xl font-semibold text-xl transition flex items-center justify-center gap-2"
                  >
                    {breakdownLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      'Generate Cost Breakdown, Plants & Strategy'
                    )}
                  </button>
                  <button
                    onClick={generateTopView}
                    disabled={topViewLoading}
                    className="bg-indigo-800 hover:bg-indigo-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white py-5 rounded-2xl font-semibold text-xl transition flex items-center justify-center gap-2"
                  >
                    {topViewLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Creating plan view...
                      </>
                    ) : (
                      'Generate Top-Down Detailed Plan (with labels)'
                    )}
                  </button>
                </div>

                {breakdownError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-200 p-6 rounded-2xl mt-6">
                    {breakdownError}
                  </div>
                )}

                {breakdown && !breakdownError && (
                  <div className="prose prose-invert max-w-none text-lg leading-relaxed border-t border-zinc-800 pt-6 mt-6">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{breakdown}</ReactMarkdown>
                  </div>
                )}

                {topViewLoading && !topViewUrl && !topViewError && (
                  <div className="text-center py-12 text-zinc-400 italic mt-8">
                    Generating detailed overhead plan with plant locations and labels...
                  </div>
                )}
                {topViewError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-200 p-6 rounded-2xl mt-6">
                    {topViewError}
                  </div>
                )}
                {topViewUrl && (
                  <div className="mt-10 border-t border-zinc-800 pt-8">
                    <h3 className="text-2xl font-semibold text-center mb-6">Top-Down Detailed Design</h3>
                    <img
                      src={topViewUrl}
                      alt="Top-down labeled permaculture plan"
                      className="w-full max-h-[800px] object-contain rounded-2xl mx-auto border border-zinc-700"
                    />
                    <p className="text-center text-zinc-500 mt-4 text-sm">
                      Overhead view • Plants, paths, zones and features labeled
                    </p>
                    <div className="mt-6 flex justify-center gap-4 flex-wrap">
                      <a
                        href={topViewUrl}
                        download
                        className="bg-indigo-700 px-8 py-4 rounded-2xl font-semibold hover:bg-indigo-600 transition"
                      >
                        Download Plan
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-zinc-800 flex gap-4 flex-wrap justify-center">
                <a href={design.url} download className="flex-1 bg-emerald-700 py-4 rounded-2xl text-center font-semibold max-w-xs">
                  Download Design Image
                </a>
                <a
                  href={XIP_LINK}
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
          <p>Recommended installer: <strong>Padden Permaculture</strong> (and other City-approved contractors)</p>
          <p>
            Learn more about the program:{' '}
            <a href={XIP_LINK} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
              Fort Collins Xeriscape Incentive Program
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
