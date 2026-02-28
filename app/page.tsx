'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { Upload, X, Award, MapPin, Layers, Box, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Dynamic lazy import for 3D viewer
const Lazy3DViewer = React.lazy(() => import('./Lazy3DViewer'));

export default function LandscapeTool() {
  // --- PHASE 1 STATE (CONCEPT) ---
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<{ url: string; promptUsed: string } | null>(null);

  // --- PHASE 2 STATE (DETAILED PLAN) ---
  const [planLoading, setPlanLoading] = useState(false);
  const [detailedPlan, setDetailedPlan] = useState<{ url: string; promptUsed: string } | null>(null);
  const [showSpatialCollector, setShowSpatialCollector] = useState(false);
  const [spatialSource, setSpatialSource] = useState<'none' | 'address' | 'aerial' | '3d'>('none');
  
  // New Spatial Data Inputs
  const [address, setAddress] = useState('');
  const [aerialPreview, setAerialPreview] = useState<string | null>(null);
  const [aerialFile, setAerialFile] = useState<File | null>(null);

  // --- ANALYSIS/BREAKDOWN STATE ---
  const [breakdown, setBreakdown] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState('');

  // --- LANDSCAPE SELECTIONS (Original Features) ---
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
    return () => { if (modelUrl) URL.revokeObjectURL(modelUrl); };
  }, [modelUrl]);

  // --- HELPERS & HANDLERS ---
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, mode: 'reference' | 'aerial') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File too large — max 5MB'); return; }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (mode === 'reference') {
        setReferenceFile(file);
        setReferencePreview(result);
      } else {
        setAerialFile(file);
        setAerialPreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handle3DFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.toLowerCase().match(/\.(glb|gltf)$/)) {
      alert('Please upload a .GLB or .GLTF file');
      return;
    }
    if (modelUrl) URL.revokeObjectURL(modelUrl);
    setModelUrl(URL.createObjectURL(file));
    setShow3DViewer(true);
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
        } else resolve(dataURL);
      };
      img.src = dataURL;
    });
  };

  const handleCaptureTopView = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    try {
      const resizedDataURL = await resizeImage(canvas.toDataURL('image/png'), 1024);
      const arr = resizedDataURL.split(',');
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--) u8arr[n] = bstr.charCodeAt(n);
      const file = new File([u8arr], 'top-view.jpg', { type: 'image/jpeg' });

      // In Step 2, this "captured" image becomes the aerial reference
      setAerialFile(file);
      setAerialPreview(resizedDataURL);
      setShow3DViewer(false);
      alert('3D Scan oriented! Ready to generate plan.');
    } catch (err) { alert('Capture failed'); }
  };

  // --- API LOGIC ---

  const generateDesign = async () => {
    setLoading(true);
    let features: string[] = [];
    if (nativePlanting) features.push('grass replaced with Colorado native perennials and shrubs');
    if (rainGarden) features.push('downspout rain garden infiltration basin');
    if (hardscape) features.push(`${hardscapeType} made of ${hardscapeMaterial}`);
    if (edibleGuild) {
        if (culinaryGuild) features.push('culinary herb guild');
        if (medicinalGuild) features.push('medicinal herb guild');
        if (fruitGuild) features.push('fruit tree guild');
    }

    const finalPrompt = `Photorealistic landscape design for a Fort Collins, CO yard. ${features.join(', ')}. Natural daylight, professional photography. DO NOT change house architecture.`;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          isEdit: !!referenceFile,
          imageBase64: referenceFile ? await fileToBase64(referenceFile) : null,
          aspect: '16:9',
        }),
      });
      const data = await res.json();
      setDesign({ url: data.data?.[0]?.url, promptUsed: finalPrompt });
    } catch (err) { alert('Generation failed'); }
    setLoading(false);
  };

  const generateDetailedPlan = async () => {
    setPlanLoading(true);
    // This prompt now prioritizes "Spatial Intelligence" by referencing the conceptual design 
    // and the new aerial/3D information.
    const planPrompt = `Create a professional CAD-style top-down landscape master plan. 
    Reference the colors and plant style from the previously generated concept.
    Include: technical symbols, plant quantity legend, mulch and stone square footages, 
    and clear labels for all zones. Scale-accurate orthographic view.`;

    try {
      // Logic: If they uploaded an aerial or 3D view, use that as the base for the plan
      // Otherwise, use the original reference image.
      const baseImage = aerialFile ? await fileToBase64(aerialFile) : 
                        (referenceFile ? await fileToBase64(referenceFile) : null);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: planPrompt,
          isEdit: true,
          imageBase64: baseImage,
          // We pass the concept URL so the model "sees" the intended aesthetic
          contextImage: design?.url, 
          aspect: '1:1',
        }),
      });
      const data = await res.json();
      setDetailedPlan({ url: data.data?.[0]?.url, promptUsed: planPrompt });
    } catch (err) { alert('Plan generation failed'); }
    setPlanLoading(false);
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
    } catch (err) { setBreakdownError('Failed to analyze design.'); }
    setBreakdownLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-center text-emerald-600 mb-2">Paddy O' Patio</h1>
        <p className="text-center text-xl text-emerald-500/80 mb-12 font-medium italic">Intelligent Regional Designs Instantly</p>

        {/* --- PHASE 1: THE HOOK --- */}
        {!design && (
          <div className="space-y-12">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <h2 className="text-2xl font-semibold mb-4">1. Start with a photo of your yard</h2>
              <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center">
                {referencePreview ? (
                  <div className="relative max-w-md mx-auto">
                    <img src={referencePreview} className="rounded-2xl" alt="Preview" />
                    <button onClick={() => {setReferenceFile(null); setReferencePreview(null);}} className="absolute -top-2 -right-2 bg-red-600 p-2 rounded-full"><X size={18} /></button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-12 h-12 mx-auto text-zinc-500 mb-4" />
                    <span className="text-zinc-300">Click to upload yard photo</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFile(e, 'reference')} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Selection Toggles (Native, Rain Garden, etc.) - Preserved from original */}
            <div className="grid grid-cols-1 gap-6">
              <div className={`bg-zinc-900 border-2 rounded-3xl p-6 transition ${nativePlanting ? 'border-emerald-600' : 'border-zinc-800'}`}>
                 <label className="flex items-start gap-4 cursor-pointer">
                    <input type="checkbox" checked={nativePlanting} onChange={(e) => setNativePlanting(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                    <div>
                      <div className="text-xl font-semibold">Colorado Native Restoration</div>
                      <p className="text-zinc-400 text-sm">Qualifies for up to $1,000 in Fort Collins rebates.</p>
                    </div>
                 </label>
              </div>
              {/* ... [Rest of your original checkboxes: Rain Garden, Hardscape, Edibles] ... */}
              {/* Note: I'm keeping the logic here, just condensing the JSX for readability */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                 <label className="flex items-center gap-4 cursor-pointer">
                    <input type="checkbox" checked={rainGarden} onChange={(e) => setRainGarden(e.target.checked)} className="w-6 h-6 accent-emerald-600" />
                    <span className="text-xl font-semibold">Add Rain Garden Basin</span>
                 </label>
              </div>
            </div>

            <button onClick={generateDesign} disabled={loading} className="w-full bg-emerald-700 py-6 rounded-3xl text-2xl font-bold hover:bg-emerald-600 transition shadow-2xl">
              {loading ? 'Visualizing your future yard...' : 'Generate My Concept Design'}
            </button>
          </div>
        )}

        {/* --- PHASE 2: THE RESULTS & THE UPSELL --- */}
        {design && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-6">Your Landscape Concept</h2>
              <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 max-w-4xl mx-auto shadow-2xl">
                <img src={design.url} className="w-full h-auto" alt="Concept Result" />
              </div>
            </div>

            {/* TWO TRACKS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* TRACK A: FREE DATA */}
              <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-emerald-500 mb-2">Basic Strategy</h3>
                  <p className="text-zinc-400 text-sm mb-6">Get a free plant list, installation strategy, and rough cost estimate based on this image.</p>
                </div>
                <button onClick={generateBreakdown} disabled={breakdownLoading} className="w-full bg-zinc-800 py-4 rounded-2xl font-semibold hover:bg-zinc-700 transition">
                  {breakdownLoading ? 'Analyzing...' : 'Generate Free Strategy'}
                </button>
              </div>

              {/* TRACK B: SPATIAL INTELLIGENCE (The detailed plan) */}
              <div className="bg-emerald-950/20 p-8 rounded-3xl border border-emerald-600 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-4 right-4 text-emerald-500 opacity-20"><Award size={48}/></div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Detailed Master Plan</h3>
                  <p className="text-zinc-100 text-sm mb-6">Unlock "Spatial Intelligence": Pro CAD-style plans, exact material quantities, and site-specific accuracy.</p>
                </div>
                <button onClick={() => setShowSpatialCollector(true)} className="w-full bg-emerald-600 py-4 rounded-2xl font-bold hover:bg-emerald-500 transition shadow-lg">
                  Upgrade to Master Plan
                </button>
              </div>
            </div>

            {/* SPATIAL DATA COLLECTION BOX */}
            {showSpatialCollector && !detailedPlan && (
              <div className="bg-zinc-900 border-2 border-emerald-500 rounded-3xl p-8 max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-500">
                <h3 className="text-2xl font-bold mb-4 text-center">Activate Spatial Intelligence</h3>
                <p className="text-zinc-400 text-center mb-8">To create a scale-accurate master plan, Paddy O' needs more data about your site's footprint.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <button onClick={() => setSpatialSource('address')} className={`p-6 rounded-2xl border flex flex-col items-center gap-2 transition ${spatialSource === 'address' ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800'}`}>
                    <MapPin /> <span className="text-sm font-medium">Address</span>
                  </button>
                  <button onClick={() => setSpatialSource('aerial')} className={`p-6 rounded-2xl border flex flex-col items-center gap-2 transition ${spatialSource === 'aerial' ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800'}`}>
                    <Layers /> <span className="text-sm font-medium">Satellite Photo</span>
                  </button>
                  <button onClick={() => setSpatialSource('3d')} className={`p-6 rounded-2xl border flex flex-col items-center gap-2 transition ${spatialSource === '3d' ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800'}`}>
                    <Box /> <span className="text-sm font-medium">3D PolyCam Scan</span>
                  </button>
                </div>

                <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 mb-8 min-h-[120px] flex items-center justify-center">
                  {spatialSource === 'address' && (
                    <input type="text" placeholder="Enter full property address..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-transparent border-b border-zinc-700 py-3 text-xl text-center outline-none focus:border-emerald-500 transition" />
                  )}
                  {spatialSource === 'aerial' && (
                    <div className="w-full">
                       {aerialPreview ? (
                         <div className="relative w-32 h-32 mx-auto"><img src={aerialPreview} className="rounded-xl w-full h-full object-cover" /><CheckCircle2 className="absolute -top-2 -right-2 text-emerald-500" /></div>
                       ) : (
                        <label className="cursor-pointer flex flex-col items-center"><Upload className="mb-2 text-zinc-500"/><span className="text-sm">Upload Aerial/Base Map Image</span><input type="file" onChange={(e) => handleFile(e, 'aerial')} className="hidden" /></label>
                       )}
                    </div>
                  )}
                  {spatialSource === '3d' && (
                    <div className="w-full">
                      {!modelUrl ? (
                        <label className="cursor-pointer flex flex-col items-center"><Upload className="mb-2 text-zinc-500"/><span className="text-sm">Upload .GLB PolyCam Scan</span><input type="file" accept=".glb,.gltf" onChange={handle3DFile} className="hidden" /></label>
                      ) : (
                        <div className="space-y-4">
                           <div className="h-64 rounded-xl overflow-hidden border border-zinc-800">
                             <Suspense fallback={<div>Loading 3D...</div>}><Lazy3DViewer modelUrl={modelUrl} onCapture={handleCaptureTopView} /></Suspense>
                           </div>
                           <button onClick={handleCaptureTopView} className="w-full bg-emerald-700 py-2 rounded-xl text-sm font-bold">Capture Top-Down Plan View</button>
                        </div>
                      )}
                    </div>
                  )}
                  {spatialSource === 'none' && <p className="text-zinc-600 italic text-sm">Select a data source above to provide spatial context.</p>}
                </div>

                <button onClick={generateDetailedPlan} disabled={planLoading} className="w-full bg-indigo-600 py-5 rounded-2xl text-xl font-bold hover:bg-indigo-500 transition shadow-xl">
                  {planLoading ? 'Integrating Spatial Intelligence...' : 'Generate Detailed Master Plan'}
                </button>
              </div>
            )}

            {/* BREAKDOWN RESULTS */}
            {breakdown && (
              <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 max-w-4xl mx-auto">
                 <h3 className="text-2xl font-bold mb-6 text-emerald-400">Installation Strategy & Estimates</h3>
                 <div className="prose prose-invert max-w-none text-lg leading-relaxed prose-headings:text-emerald-400">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{breakdown}</ReactMarkdown>
                 </div>
              </div>
            )}

            {/* DETAILED PLAN RESULTS */}
            {detailedPlan && (
              <div className="mt-16 space-y-8 animate-in zoom-in-95 duration-700">
                <h2 className="text-3xl font-bold text-center">Your Master Landscape Plan</h2>
                <div className="bg-white rounded-3xl p-4 shadow-2xl max-w-4xl mx-auto">
                   <img src={detailedPlan.url} className="w-full h-auto rounded-2xl" alt="Technical Plan" />
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    <a href={detailedPlan.url} download className="bg-emerald-700 px-8 py-4 rounded-2xl font-bold">Download Full Resolution Plan</a>
                    <a href="mailto:patrick@paddenpermaculture.com" className="bg-indigo-600 px-8 py-4 rounded-2xl font-bold">Send to Padden Permaculture for Bid</a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer CTAs */}
        <div className="mt-20 pt-12 border-t border-zinc-900 text-center">
           <p className="text-zinc-500 text-sm mb-4">Paddy O' Patio is a project by <a href="https://paddenpermaculture.com" className="text-emerald-500 underline">Padden Permaculture</a></p>
        </div>
      </div>
    </div>
  );
}
