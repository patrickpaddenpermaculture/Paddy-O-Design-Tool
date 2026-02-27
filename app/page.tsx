'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { Upload, X, Award, Map as MapIcon, Box, Home, ArrowRight, Download, Mail } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Dynamic lazy import for 3D viewer (prevents Vercel server bundling errors)
const Lazy3DViewer = React.lazy(() => import('./Lazy3DViewer'));

export default function LandscapeTool() {
  // --- EXISTING STATE ---
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<{ url: string; promptUsed: string } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [detailedPlan, setDetailedPlan] = useState<{ url: string; promptUsed: string } | null>(null);
  const [breakdown, setBreakdown] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState('');

  // --- NEW REFINEMENT STATE ---
  const [refinementMode, setRefinementMode] = useState<'3d' | 'map' | 'address' | null>(null);
  const [address, setAddress] = useState('');

  // --- CUSTOMIZATION STATE ---
  const [nativePlanting, setNativePlanting] = useState(true);
  const [rainGarden, setRainGarden] = useState(false);
  const [hardscape, setHardscape] = useState(false);
  const [hardscapeType, setHardscapeType] = useState<'walkway' | 'walkway-patio'>('walkway');
  const [hardscapeMaterial, setHardscapeMaterial] = useState<'stone' | 'pavers'>('pavers');
  const [edibleGuild, setEdibleGuild] = useState(false);
  const [culinaryGuild, setCulinaryGuild] = useState(false);
  const [medicinalGuild, setMedicinalGuild] = useState(false);
  const [fruitGuild, setFruitGuild] = useState(false);

  // --- 3D VIEWER STATE ---
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [show3DViewer, setShow3DViewer] = useState(false);

  useEffect(() => {
    return () => {
      if (modelUrl) URL.revokeObjectURL(modelUrl);
    };
  }, [modelUrl]);

  // --- HANDLERS (EXACTLY FROM YOUR CODE) ---

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

  const handle3DFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      alert('Please upload a .GLB or .GLTF file from PolyCam');
      return;
    }
    if (modelUrl) URL.revokeObjectURL(modelUrl);
    const url = URL.createObjectURL(file);
    setModelUrl(url);
    setShow3DViewer(true);
    // Don't clear existing reference yet, we'll replace it on capture
  };

  const resizeImage = (dataURL: string, maxDim: number = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = maxDim / Math.max(width, height);
          width *= ratio; height *= ratio;
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(dataURL);
        }
      };
      img.onerror = () => resolve(dataURL);
      img.src = dataURL;
    });
  };

  const handleCaptureTopView = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('3D viewer canvas not found');
      return;
    }
    try {
      const rawDataURL = canvas.toDataURL('image/png', 1.0);
      const resizedDataURL = await resizeImage(rawDataURL, 1024);
      const file = dataURLtoFile(resizedDataURL, 'top-view-from-scan.jpg');
      setReferenceFile(file);
      setReferencePreview(resizedDataURL);
      setShow3DViewer(false);
      alert('Top-down scan captured! Ready to generate your detailed plan.');
    } catch (err) {
      alert('Capture failed');
    }
  };

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
  };

  // --- API CALLS (PRESERVING YOUR SPECIFIC PROMPTS) ---

  const generateDesign = async () => {
    setLoading(true);
    setDesign(null);
    setDetailedPlan(null);
    setBreakdown('');
    
    let features: string[] = [];
    if (nativePlanting) features.push('grass completely removed and replaced with low-water Colorado native perennials, grasses, and shrubs (80%+ native coverage)');
    if (rainGarden) features.push('downspout routed into a beautiful infiltration basin / rain garden with native wetland plants');
    if (hardscape) {
      const hs = hardscapeType === 'walkway-patio' ? 'permeable walkway AND patio' : 'permeable walkway';
      const mat = hardscapeMaterial === 'stone' ? 'natural stone' : 'pavers';
      features.push(`${hs} made of ${mat}`);
    }
    if (edibleGuild) {
      const guilds: string[] = [];
      if (culinaryGuild) guilds.push('culinary herb and vegetable guild');
      if (medicinalGuild) guilds.push('medicinal herb guild');
      if (fruitGuild) guilds.push('fruit tree and berry bush guild');
      if (guilds.length > 0) features.push(guilds.join(', '));
    }
    const featureString = features.length ? `Include these specific features: ${features.join(', ')}. ` : '';

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
      const data = await res.json();
      setDesign({ url: data.data?.[0]?.url, promptUsed: finalPrompt });
    } catch (err) {
      alert('Design generation failed');
    } finally {
      setLoading(false);
    }
  };

  const generateDetailedPlan = async () => {
    setPlanLoading(true);
    const planPrompt = `Create a clean, professional top-down landscape plan (orthographic / bird's-eye view) based on this yard and the proposed design.
Use diagram/technical drawing style: light background, clear black outlines, labeled zones with text annotations, approximate square footages shown, material labels.
Preserve exact proportions of house, driveway, garage, sidewalks, fences from the reference.
Show only yard modifications with:
- Beds, paths, patios, rain garden basin, tree/shrub groupings clearly outlined
- Text labels including square footage, e.g. "Native Perennial Bed – 320 sq ft", "Permeable Paver Patio – 180 sq ft", "Rain Garden", "Fruit Tree Guild"
- Material notations: permeable pavers, natural stone, mulch, decomposed granite paths, etc.
- Simple symbols: circles/dots for trees/shrubs, patterns for mulch/perennials
- High readability, professional CAD-like aesthetic, not photorealistic.`;

    try {
      let base64Image = referenceFile ? await fileToBase64(referenceFile) : null;
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: planPrompt,
          isEdit: true,
          imageBase64: base64Image,
          n: 1,
          aspect: '1:1',
        }),
      });
      const data = await res.json();
      setDetailedPlan({ url: data.data?.[0]?.url, promptUsed: planPrompt });
    } catch (err) {
      alert('Plan generation failed');
    } finally {
      setPlanLoading(false);
    }
  };

  const generateBreakdown = async () => {
    const imageToAnalyze = detailedPlan?.url || design?.url;
    if (!imageToAnalyze) return;
    setBreakdownLoading(true);
    try {
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: imageToAnalyze, tier: 'Custom Landscape' }),
      });
      const data = await res.json();
      setBreakdown(data.breakdown || '');
    } catch (err) {
      setBreakdownError('Failed to generate breakdown');
    } finally {
      setBreakdownLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-emerald-600 mb-2">Paddy O' Patio</h1>
          <p className="text-2xl md:text-3xl text-zinc-300 mb-1">Fort Collins Landscape Design Tool</p>
          <p className="text-xl text-emerald-500/80 font-medium italic">Intelligent Regional Designs Instantly</p>
        </header>

        {/* STAGE 1: THE INPUTS */}
        {!design ? (
          <div className="space-y-12">
            {/* Photo Upload Section */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
              <h2 className="text-2xl font-semibold mb-4">1. Upload your yard photo</h2>
              <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center">
                {referencePreview ? (
                  <div className="relative max-w-md mx-auto">
                    <img src={referencePreview} className="rounded-2xl shadow-2xl" alt="Preview" />
                    <button onClick={clearReference} className="absolute -top-3 -right-3 bg-red-600 p-2 rounded-full hover:bg-red-700 transition"><X size={20}/></button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-16 h-16 mx-auto text-zinc-500 mb-4" />
                    <span className="text-xl text-zinc-300">Click to upload current yard view</span>
                    <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Customization Options (Your original checkboxes) */}
            <div className="space-y-8">
              <h2 className="text-3xl font-semibold text-center mb-8">2. Choose Your Design Elements</h2>
              
              {/* Native Planting */}
              <div className="bg-zinc-900 border border-emerald-700 rounded-3xl p-8 relative">
                <div className="absolute -top-3 -right-3 bg-emerald-600 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                  <Award size={16} /> UP TO $1,000 REBATE AVAILABLE
                </div>
                <label className="flex items-start gap-4 cursor-pointer">
                  <input type="checkbox" checked={nativePlanting} onChange={(e) => setNativePlanting(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                  <div>
                    <div className="text-2xl font-semibold">Replace grass with low-water Colorado natives</div>
                    <p className="text-zinc-400 mt-1">Remove all turf and plant native perennials, grasses & shrubs — qualifies for maximum rebate</p>
                  </div>
                </label>
              </div>

              {/* Rain Garden */}
              <div className="bg-zinc-900 border border-emerald-700 rounded-3xl p-8">
                <label className="flex items-start gap-4 cursor-pointer">
                  <input type="checkbox" checked={rainGarden} onChange={(e) => setRainGarden(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                  <div>
                    <div className="text-2xl font-semibold">Add a rain garden</div>
                    <p className="text-zinc-400 mt-1">Route downspouts into a decorative infiltration basin with native wetland plants</p>
                  </div>
                </label>
              </div>

              {/* Hardscape */}
              <div className="bg-zinc-900 border border-emerald-700 rounded-3xl p-8">
                <label className="flex items-start gap-4 cursor-pointer">
                  <input type="checkbox" checked={hardscape} onChange={(e) => setHardscape(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                  <div>
                    <div className="text-2xl font-semibold">Add permeable hardscape</div>
                    <p className="text-zinc-400 mt-1">Permeable materials reduce runoff and look great</p>
                    {hardscape && (
                      <div className="mt-6 space-y-4 pl-10">
                        <div>
                          <label className="block text-lg mb-2">Type</label>
                          <select value={hardscapeType} onChange={(e) => setHardscapeType(e.target.value as any)} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 w-full text-white">
                            <option value="walkway">Walkway only</option>
                            <option value="walkway-patio">Walkway + Patio</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-lg mb-2">Material</label>
                          <select value={hardscapeMaterial} onChange={(e) => setHardscapeMaterial(e.target.value as any)} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 w-full text-white">
                            <option value="pavers">Pavers</option>
                            <option value="stone">Natural stone</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Edible Guilds */}
              <div className="bg-zinc-900 border border-emerald-700 rounded-3xl p-8">
                <label className="flex items-start gap-4 cursor-pointer">
                  <input type="checkbox" checked={edibleGuild} onChange={(e) => setEdibleGuild(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                  <div>
                    <div className="text-2xl font-semibold">Incorporate edible / productive guilds</div>
                    <p className="text-zinc-400 mt-1">Food-producing plants (herbs, veggies, berries, fruit trees)</p>
                    {edibleGuild && (
                      <div className="mt-6 space-y-3 pl-10">
                        {['Culinary', 'Medicinal', 'Fruit Tree'].map((type, i) => (
                          <label key={i} className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={i === 0 ? culinaryGuild : i === 1 ? medicinalGuild : fruitGuild} 
                              onChange={(e) => i === 0 ? setCulinaryGuild(e.target.checked) : i === 1 ? setMedicinalGuild(e.target.checked) : setFruitGuild(e.target.checked)}
                              className="w-5 h-5 accent-emerald-600" 
                            />
                            {type} guild
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <button onClick={generateDesign} disabled={loading} className="w-full bg-emerald-700 hover:bg-emerald-600 py-6 rounded-3xl text-2xl font-bold transition-all shadow-xl disabled:bg-zinc-800">
              {loading ? 'Designing Your Space...' : 'Generate My Landscape Design'}
            </button>
          </div>
        ) : (
          /* STAGE 2: THE RESULTS & PROFESSIONAL TOOLS */
          <div className="space-y-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-6 text-emerald-500">Your Perspective Design Concept</h2>
              <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl max-w-4xl mx-auto">
                <img src={design.url} className="w-full aspect-video object-cover" alt="Concept" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Option 1: Suggestions and Analysis */}
              <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-emerald-500"><Award /> Strategy & Plants</h3>
                  <p className="text-zinc-400 mb-6">See installation suggestions, plant recommendations, and cost estimates for this design.</p>
                </div>
                <button onClick={generateBreakdown} disabled={breakdownLoading} className="w-full bg-emerald-700 py-4 rounded-xl font-bold hover:bg-emerald-600">
                  {breakdownLoading ? 'Analyzing...' : 'Get Full Breakdown'}
                </button>
              </div>

              {/* Option 2: Professional Scale Plan (The new "delayed" 3D/Map entry) */}
              <div className="bg-zinc-900 p-8 rounded-3xl border-2 border-indigo-600 shadow-indigo-900/20 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-indigo-400"><Box /> Detailed Design</h3>
                  <p className="text-zinc-400 mb-6">Convert this concept into a to-scale, accurate top-view landscape plan.</p>
                  
                  <div className="flex gap-2 mb-6">
                    <button onClick={() => setRefinementMode('3d')} className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold border ${refinementMode === '3d' ? 'bg-indigo-600 border-indigo-400' : 'bg-zinc-800 border-zinc-700'}`}>3D SCAN</button>
                    <button onClick={() => setRefinementMode('address')} className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold border ${refinementMode === 'address' ? 'bg-indigo-600 border-indigo-400' : 'bg-zinc-800 border-zinc-700'}`}>ADDRESS</button>
                    <button onClick={() => setRefinementMode('map')} className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold border ${refinementMode === 'map' ? 'bg-indigo-600 border-indigo-400' : 'bg-zinc-800 border-zinc-700'}`}>BASE MAP</button>
                  </div>

                  {/* 3D Entry - Moved from page 1 */}
                  {refinementMode === '3d' && (
                    <div className="mb-6 space-y-4">
                      <label className="block border-2 border-dashed border-zinc-700 rounded-xl p-4 cursor-pointer text-center">
                        <span className="text-zinc-400">Upload PolyCam .GLB</span>
                        <input type="file" accept=".glb,.gltf" onChange={handle3DFile} className="hidden" />
                      </label>
                      {show3DViewer && modelUrl && (
                        <div className="h-64 rounded-xl overflow-hidden border border-zinc-700">
                          <Suspense fallback={<div className="h-full flex items-center justify-center">Loading 3D...</div>}>
                            <Lazy3DViewer modelUrl={modelUrl} onCapture={handleCaptureTopView} />
                          </Suspense>
                        </div>
                      )}
                    </div>
                  )}

                  {refinementMode === 'address' && (
                    <div className="mb-6 flex gap-2">
                      <input type="text" placeholder="Enter Fort Collins address..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
                      <button className="bg-indigo-600 p-2 rounded-xl"><ArrowRight /></button>
                    </div>
                  )}

                  {refinementMode === 'map' && (
                    <div className="mb-6">
                      <label className="block border-2 border-dashed border-zinc-700 rounded-xl p-4 cursor-pointer text-center">
                        <span className="text-zinc-400">Upload Satellite Image</span>
                        <input type="file" accept="image/*" className="hidden" />
                      </label>
                    </div>
                  )}
                </div>

                <button onClick={generateDetailedPlan} disabled={planLoading} className="w-full bg-indigo-700 py-4 rounded-xl font-bold hover:bg-indigo-600 mt-4">
                  {planLoading ? 'Creating Blueprint...' : 'Generate Scale Plan'}
                </button>
              </div>
            </div>

            {/* Render Detailed Plan if generated */}
            {detailedPlan && (
              <div className="bg-white p-8 rounded-3xl border border-zinc-800 max-w-4xl mx-auto shadow-2xl">
                <h3 className="text-2xl font-bold mb-4 text-black text-center">Technical Site Plan</h3>
                <img src={detailedPlan.url} className="w-full h-auto rounded-lg" alt="Blueprint" />
              </div>
            )}

            {/* Render Breakdown if generated */}
            {breakdown && (
              <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 max-w-4xl mx-auto">
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{breakdown}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* YOUR ORIGINAL BOTTOM CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center py-12">
               <button onClick={() => setDesign(null)} className="flex-1 bg-zinc-800 py-4 rounded-2xl font-semibold max-w-xs">Start New Design</button>
               <a href="https://www.fortcollins.gov/Services/Utilities/Programs-and-Rebates/Water-Programs/XIP" target="_blank" className="flex-1 border border-emerald-700 py-4 rounded-2xl text-center font-semibold max-w-xs">Apply for Rebate →</a>
               <a href="mailto:patrick@paddenpermaculture.com" className="flex-1 bg-emerald-600 py-4 rounded-2xl text-center font-semibold text-white max-w-xs">Schedule Consultation</a>
            </div>
          </div>
        )}

        <footer className="text-center text-zinc-500 text-sm mt-20">
          Recommended installer: <a href="https://www.paddenpermaculture.com" className="text-emerald-500 underline">Padden Permaculture</a>
        </footer>
      </div>
    </div>
  );
}
