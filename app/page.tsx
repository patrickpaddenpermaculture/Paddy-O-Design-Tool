'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { Upload, X, Award, MapPin, Layers, Box, CheckCircle2, ChevronRight, Info, ShieldCheck } from 'lucide-react';
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

  // --- PHASE 2 STATE (DETAILED PLAN & SPATIAL INTEL) ---
  const [planLoading, setPlanLoading] = useState(false);
  const [detailedPlan, setDetailedPlan] = useState<{ url: string; promptUsed: string } | null>(null);
  const [showSpatialCollector, setShowSpatialCollector] = useState(false);
  const [spatialSource, setSpatialSource] = useState<'none' | 'address' | 'aerial' | '3d'>('none');
  
  // Spatial Data Inputs
  const [address, setAddress] = useState('');
  const [aerialPreview, setAerialPreview] = useState<string | null>(null);
  const [aerialFile, setAerialFile] = useState<File | null>(null);

  // --- ANALYSIS/BREAKDOWN STATE ---
  const [breakdown, setBreakdown] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState('');

  // --- LANDSCAPE SELECTIONS ---
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

  // --- HELPERS ---
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
      alert('Please upload a .GLB or .GLTF file from PolyCam');
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
      const file = new File([u8arr], 'top-view-scan.jpg', { type: 'image/jpeg' });

      setAerialFile(file);
      setAerialPreview(resizedDataURL);
      setShow3DViewer(false);
      alert('Spatial layout captured! Ready to generate your master plan.');
    } catch (err) { alert('Capture failed'); }
  };

  // --- API CALLS ---
  const generateDesign = async () => {
    setLoading(true);
    let features: string[] = [];
    if (nativePlanting) features.push('low-water Colorado native perennials, grasses, and shrubs');
    if (rainGarden) features.push('downspout rain garden infiltration basin');
    if (hardscape) features.push(`${hardscapeType} made of ${hardscapeMaterial}`);
    if (edibleGuild) {
        if (culinaryGuild) features.push('culinary herb/veggie guild');
        if (medicinalGuild) features.push('medicinal herb guild');
        if (fruitGuild) features.push('fruit tree and berry guild');
    }

    const finalPrompt = `Photorealistic landscape design for a Fort Collins yard. ${features.join(', ')}. Natural daylight, professional photography. DO NOT change house architecture.`;

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
    } catch (err) { alert('Design generation failed'); }
    setLoading(false);
  };

  const generateDetailedPlan = async () => {
    setPlanLoading(true);
    const planPrompt = `Create a professional CAD-style top-down landscape master plan (orthographic). 
    Use the plant choices and aesthetic from the previous design. Include a detailed key, material quantities, 
    mulch sq ft, and technical landscape symbols. High readability.`;

    try {
      const baseImage = aerialFile ? await fileToBase64(aerialFile) : 
                        (referenceFile ? await fileToBase64(referenceFile) : null);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: planPrompt,
          isEdit: true,
          imageBase64: baseImage,
          contextUrl: design?.url,
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
    } catch (err) { setBreakdownError('Analysis failed.'); }
    setBreakdownLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-center text-emerald-600 mb-2">Paddy O' Patio</h1>
        <p className="text-center text-xl text-zinc-400 mb-12 italic">Intelligent Regional Designs Instantly</p>

        {/* --- PHASE 1: THE INPUT --- */}
        {!design && (
          <div className="space-y-12">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <h2 className="text-2xl font-semibold mb-4">1. Upload a photo of your yard</h2>
              <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center">
                {referencePreview ? (
                  <div className="relative max-w-md mx-auto">
                    <img src={referencePreview} className="rounded-2xl shadow-2xl" alt="Preview" />
                    <button onClick={() => {setReferenceFile(null); setReferencePreview(null);}} className="absolute -top-3 -right-3 bg-red-600 p-2 rounded-full hover:bg-red-700 transition shadow-lg"><X size={20} /></button>
                  </div>
                ) : (
                  <label className="cursor-pointer block group">
                    <Upload className="w-16 h-16 mx-auto text-zinc-500 mb-4 group-hover:text-emerald-500 transition-colors" />
                    <span className="text-xl text-zinc-300 group-hover:text-white transition-colors">Click to upload yard photo</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFile(e, 'reference')} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl font-semibold text-center mb-8">Customize Your Landscape</h2>
              
              <div className={`bg-zinc-900 border-2 rounded-3xl p-8 relative transition-all ${nativePlanting ? 'border-emerald-600 bg-emerald-950/10' : 'border-zinc-800'}`}>
                <div className="absolute -top-3 -right-3 bg-emerald-600 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1 shadow-lg">
                  <Award size={14} /> UP TO $1,000 REBATE
                </div>
                <label className="flex items-start gap-4 cursor-pointer">
                  <input type="checkbox" checked={nativePlanting} onChange={(e) => setNativePlanting(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                  <div>
                    <div className="text-2xl font-semibold">Colorado Native Restoration</div>
                    <p className="text-zinc-400 mt-1">Replace grass with low-water native perennials & shrubs.</p>
                  </div>
                </label>
              </div>

              <div className={`bg-zinc-900 border-2 rounded-3xl p-8 transition-all ${rainGarden ? 'border-emerald-600 bg-emerald-950/10' : 'border-zinc-800'}`}>
                <label className="flex items-start gap-4 cursor-pointer">
                  <input type="checkbox" checked={rainGarden} onChange={(e) => setRainGarden(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                  <div>
                    <div className="text-2xl font-semibold">Add a Rain Garden</div>
                    <p className="text-zinc-400 mt-1">Capture runoff in decorative infiltration basins.</p>
                  </div>
                </label>
              </div>

              <div className={`bg-zinc-900 border-2 rounded-3xl p-8 transition-all ${hardscape ? 'border-emerald-600 bg-emerald-950/10' : 'border-zinc-800'}`}>
                <label className="flex items-start gap-4 cursor-pointer">
                  <input type="checkbox" checked={hardscape} onChange={(e) => setHardscape(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                  <div>
                    <div className="text-2xl font-semibold">Permeable Hardscape</div>
                    <p className="text-zinc-400 mt-1">Add stone or paver walkways and patios.</p>
                  </div>
                </label>
                {hardscape && (
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pl-10">
                    <select value={hardscapeType} onChange={(e) => setHardscapeType(e.target.value as any)} className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white">
                      <option value="walkway">Walkway Only</option>
                      <option value="walkway-patio">Walkway + Patio</option>
                    </select>
                    <select value={hardscapeMaterial} onChange={(e) => setHardscapeMaterial(e.target.value as any)} className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white">
                      <option value="pavers">Permeable Pavers</option>
                      <option value="stone">Natural Stone</option>
                    </select>
                  </div>
                )}
              </div>

              <div className={`bg-zinc-900 border-2 rounded-3xl p-8 transition-all ${edibleGuild ? 'border-emerald-600 bg-emerald-950/10' : 'border-zinc-800'}`}>
                <label className="flex items-start gap-4 cursor-pointer">
                  <input type="checkbox" checked={edibleGuild} onChange={(e) => setEdibleGuild(e.target.checked)} className="mt-1 w-6 h-6 accent-emerald-600" />
                  <div>
                    <div className="text-2xl font-semibold">Edible & Productive Guilds</div>
                    <p className="text-zinc-400 mt-1">Integrate food-producing plant communities.</p>
                  </div>
                </label>
                {edibleGuild && (
                  <div className="mt-4 flex flex-wrap gap-4 pl-10">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={culinaryGuild} onChange={(e) => setCulinaryGuild(e.target.checked)} className="w-5 h-5 accent-emerald-600" /> Culinary</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={medicinalGuild} onChange={(e) => setMedicinalGuild(e.target.checked)} className="w-5 h-5 accent-emerald-600" /> Medicinal</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={fruitGuild} onChange={(e) => setFruitGuild(e.target.checked)} className="w-5 h-5 accent-emerald-600" /> Fruit Trees</label>
                  </div>
                )}
              </div>
            </div>

            <button onClick={generateDesign} disabled={loading} className="w-full bg-emerald-700 py-6 rounded-3xl text-2xl font-bold hover:bg-emerald-600 transition shadow-2xl disabled:bg-zinc-800">
              {loading ? 'Generating Concept...' : 'Visualize My Landscape Design'}
            </button>
          </div>
        )}

        {/* --- PHASE 2: THE RESULTS --- */}
        {design && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-6">Your Landscape Concept</h2>
              <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 max-w-4xl mx-auto shadow-2xl">
                <img src={design.url} className="w-full h-auto max-h-[600px] object-cover" alt="Concept" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-emerald-500 flex items-center gap-2 mb-2"><Info size={20}/> Basic Strategy (Free)</h3>
                  <p className="text-zinc-400 text-sm mb-6">Receive a custom plant list, installation strategy, and estimated costs based on this design.</p>
                </div>
                <button onClick={generateBreakdown} disabled={breakdownLoading} className="w-full bg-zinc-800 py-4 rounded-2xl font-bold hover:bg-zinc-700 transition">
                  {breakdownLoading ? 'Analyzing...' : 'Generate Free Strategy'}
                </button>
              </div>

              {/* UPGRADED SAAS/ENTERPRISE UPGRADE CARD */}
              <div className="bg-indigo-950/20 p-8 rounded-3xl border border-indigo-500/50 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="text-indigo-400" size={20}/> Precision Spatial Analysis
                    </h3>
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase tracking-widest px-2 py-1 rounded-md border border-indigo-500/30">
                      Utility Grade
                    </span>
                  </div>
                  <p className="text-zinc-300 text-sm mb-6 leading-relaxed">
                    Unlock scale-accurate orthographic drafting, technical symbol keys, and 
                    <strong> automated square-footage calculations</strong> required for municipal rebate compliance.
                  </p>
                </div>

                <button 
                  onClick={() => setShowSpatialCollector(true)} 
                  className="w-full bg-indigo-600 py-4 rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  Activate Spatial Intelligence <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {showSpatialCollector && !detailedPlan && (
              <div className="bg-zinc-900 border-2 border-indigo-500 rounded-3xl p-8 max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-500 shadow-2xl">
                <h3 className="text-2xl font-bold mb-2 text-center text-indigo-400">Spatial Intelligence Activation</h3>
                <p className="text-zinc-400 text-center mb-8 italic">Validating property dimensions for utility-compliant drafting.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <button onClick={() => setSpatialSource('address')} className={`p-6 rounded-2xl border flex flex-col items-center gap-2 transition ${spatialSource === 'address' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 text-zinc-400'}`}>
                    <MapPin /> <span className="font-semibold">Address</span>
                  </button>
                  <button onClick={() => setSpatialSource('aerial')} className={`p-6 rounded-2xl border flex flex-col items-center gap-2 transition ${spatialSource === 'aerial' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 text-zinc-400'}`}>
                    <Layers /> <span className="font-semibold">Aerial Photo</span>
                  </button>
                  <button onClick={() => setSpatialSource('3d')} className={`p-6 rounded-2xl border flex flex-col items-center gap-2 transition ${spatialSource === '3d' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 text-zinc-400'}`}>
                    <Box /> <span className="font-semibold">3D Scan (GLB)</span>
                  </button>
                </div>

                <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800 mb-8 flex flex-col items-center justify-center">
                  {spatialSource === 'address' && (
                    <input type="text" placeholder="Enter your full address..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-transparent border-b-2 border-zinc-700 py-4 text-2xl text-center outline-none focus:border-indigo-500 transition" />
                  )}
                  {spatialSource === 'aerial' && (
                    <div className="w-full">
                       {aerialPreview ? (
                         <div className="relative w-48 h-48 mx-auto"><img src={aerialPreview} className="rounded-2xl w-full h-full object-cover shadow-2xl" /><button onClick={() => setAerialPreview(null)} className="absolute -top-2 -right-2 bg-red-600 p-1 rounded-full"><X size={16}/></button></div>
                       ) : (
                        <label className="cursor-pointer flex flex-col items-center group"><Upload className="mb-4 text-zinc-500 group-hover:text-indigo-500"/><span className="text-lg">Upload satellite view or property map</span><input type="file" onChange={(e) => handleFile(e, 'aerial')} className="hidden" /></label>
                       )}
                    </div>
                  )}
                  {spatialSource === '3d' && (
                    <div className="w-full text-center">
                      {!modelUrl ? (
                        <label className="cursor-pointer flex flex-col items-center group"><Upload className="mb-4 text-zinc-500 group-hover:text-indigo-500"/><span className="text-lg">Upload .GLB from PolyCam</span><input type="file" accept=".glb,.gltf" onChange={handle3DFile} className="hidden" /></label>
                      ) : (
                        <div className="space-y-6">
                           <p className="text-sm text-zinc-400 flex items-center justify-center gap-2"><ChevronRight size={16}/> Orient to top-view and capture</p>
                           <div className="h-80 rounded-2xl overflow-hidden border border-zinc-800 shadow-inner">
                             <Suspense fallback={<div className="flex items-center justify-center h-full">Loading Viewer...</div>}><Lazy3DViewer modelUrl={modelUrl} onCapture={handleCaptureTopView} /></Suspense>
                           </div>
                           <button onClick={handleCaptureTopView} className="bg-indigo-700 px-8 py-3 rounded-xl font-bold shadow-lg">Capture Layout Snapshot</button>
                        </div>
                      )}
                    </div>
                  )}
                  {spatialSource === 'none' && <p className="text-zinc-600 italic">Select a source above to provide property dimensions.</p>}
                </div>

                <button onClick={generateDetailedPlan} disabled={planLoading} className="w-full bg-indigo-600 py-6 rounded-2xl text-2xl font-bold hover:bg-indigo-500 transition shadow-2xl disabled:bg-zinc-800">
                  {planLoading ? 'Generating Compliant Plan...' : 'Generate Detailed Master Plan'}
                </button>
              </div>
            )}

            {/* BREAKDOWN RESULTS */}
            {breakdown && (
              <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 max-w-4xl mx-auto shadow-2xl animate-in fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-zinc-800 pb-6 gap-4">
                  <div>
                    <h3 className="text-3xl font-bold text-emerald-400">Pro Installation Strategy</h3>
                    <p className="text-zinc-500 text-sm mt-1">Customized for Fort Collins, CO Arid Climate</p>
                  </div>
                  <div className="bg-emerald-600/10 border border-emerald-500/50 px-4 py-2 rounded-xl">
                    <span className="text-emerald-500 font-bold text-sm flex items-center gap-2">
                      <Award size={16} /> XIP REBATE ELIGIBLE
                    </span>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none text-lg leading-relaxed 
                  prose-headings:text-emerald-400 
                  prose-table:border-collapse 
                  prose-thead:bg-zinc-950 
                  prose-th:text-emerald-500 prose-th:p-4 prose-th:border prose-th:border-zinc-800
                  prose-td:p-4 prose-td:border prose-td:border-zinc-800 prose-td:text-zinc-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{breakdown}</ReactMarkdown>
                </div>

                <div className="mt-12 p-6 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-left">
                    <div className="bg-emerald-600 p-3 rounded-full">
                      <CheckCircle2 className="text-white" size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-white">Next Step: Soil Prep</p>
                      <p className="text-zinc-500 text-sm">Recommended for Northern Colorado clay soils.</p>
                    </div>
                  </div>
                  <button onClick={() => window.print()} className="text-zinc-400 hover:text-white text-sm underline underline-offset-4">
                    Save Strategy as PDF
                  </button>
                </div>
              </div>
            )}

            {detailedPlan && (
              <div className="mt-16 space-y-10 animate-in zoom-in-95 duration-700">
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-indigo-400 mb-2">Detailed Master Plan</h2>
                  <p className="text-zinc-400 italic">Orthographic Drafting • Utility Approved Proportions</p>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-4xl mx-auto">
                   <img src={detailedPlan.url} className="w-full h-auto rounded-xl" alt="Technical Master Plan" />
                </div>
                <div className="flex flex-col sm:flex-row justify-center gap-6 max-w-4xl mx-auto">
                    <a href={detailedPlan.url} download className="flex-1 bg-emerald-700 py-5 rounded-2xl font-bold text-center shadow-lg hover:bg-emerald-600 transition">Download Master Plan (PDF/JPG)</a>
                    <a href="mailto:patrick@paddenpermaculture.com?subject=Landscape Plan Inquiry" className="flex-1 bg-indigo-600 py-5 rounded-2xl font-bold text-center shadow-lg hover:bg-indigo-500 transition">Get Installation Quote →</a>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-24 pt-12 border-t border-zinc-900 flex flex-col items-center gap-4 opacity-50 text-center">
           <p className="text-zinc-500 text-sm">Paddy O' Patio © 2026 • Colorado Native Design Specialist</p>
           <a href="https://paddenpermaculture.com" className="text-emerald-500 underline text-sm">paddenpermaculture.com</a>
        </div>
      </div>
    </div>
  );
}
