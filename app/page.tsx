'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { 
  Upload, X, Award, Map as MapIcon, Box, Home, 
  ArrowRight, Download, Mail, Search, Check, FileText, Camera, RefreshCw 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Lazy load the heavy 3D component to keep the page snappy
const Lazy3DViewer = React.lazy(() => import('./Lazy3DViewer'));

export default function LandscapeTool() {
  // --- CORE STATE ---
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [isStreetViewSelected, setIsStreetViewSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<{ url: string; promptUsed: string } | null>(null);
  
  // Phase 2: Blueprint State
  const [topViewPreview, setTopViewPreview] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [detailedPlan, setDetailedPlan] = useState<{ url: string; promptUsed: string } | null>(null);
  
  // Analysis State
  const [breakdown, setBreakdown] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  // Maps & Address
  const [address, setAddress] = useState('');
  const [mapViews, setMapViews] = useState<{ sat: string; street: string } | null>(null);

  // Design Toggles (The "Logic" for the AI)
  const [nativePlanting, setNativePlanting] = useState(true);
  const [rainGarden, setRainGarden] = useState(false);
  const [hardscape, setHardscape] = useState(false);
  const [hardscapeType, setHardscapeType] = useState<'walkway' | 'walkway-patio'>('walkway');
  const [hardscapeMaterial, setHardscapeMaterial] = useState<'stone' | 'pavers'>('pavers');
  const [edibleGuild, setEdibleGuild] = useState(false);

  // 3D/Model State
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [show3DViewer, setShow3DViewer] = useState(false);

  // --- HELPERS ---
  const fileToBase64 = (fileOrUrl: File | string): Promise<string> => {
    return new Promise((resolve) => {
      if (typeof fileOrUrl === 'string') {
        resolve(fileOrUrl.split(',')[1] || fileOrUrl);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(fileOrUrl);
    });
  };

  const fetchMapViews = () => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!address || !key) return;
    const encoded = encodeURIComponent(address);
    setMapViews({
      sat: `https://maps.googleapis.com/maps/api/staticmap?center=${encoded}&zoom=20&size=800x800&maptype=satellite&scale=2&key=${key}`,
      street: `https://maps.googleapis.com/maps/api/streetview?size=800x600&location=${encoded}&fov=90&key=${key}`
    });
  };

  // --- API ACTIONS ---

  // PHASE 1: Perspective Vision
  const generateDesign = async () => {
    if (!referencePreview) return;
    setLoading(true);
    
    let features = [];
    if (nativePlanting) features.push('Colorado native xeric perennials (Coneflower, Penstemon)');
    if (rainGarden) features.push('a rock-lined infiltration rain garden');
    if (hardscape) features.push(`a ${hardscapeMaterial} ${hardscapeType}`);
    if (edibleGuild) features.push('permaculture edible guilds with fruit trees');

    const prompt = `Professional landscape architecture photo. Replace existing yard with ${features.join(', ')}. Preserve the house structure and windows exactly. High-end, sustainable, summer lighting.`;

    try {
      const b64 = await fileToBase64(referencePreview);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, images: [b64], aspect: '16:9' }),
      });
      const data = await res.json();
      setDesign({ url: data.data?.[0]?.url || data.url, promptUsed: prompt });
    } catch (err) {
      alert('Vision generation failed. Check API logs.');
    } finally {
      setLoading(false);
    }
  };

  // PHASE 2: Technical Merge (Magic Merge)
  const generateMagicPlan = async () => {
    if (!design || !topViewPreview) return;
    setPlanLoading(true);
    
    const prompt = `High-contrast 2D technical landscape site plan. Background: White. Style: CAD Drawing. 
    Use the color palette from the DESIGN image and the spatial layout from the TOP-VIEW image. 
    Label planting zones, mulch areas, and water harvesting features clearly.`;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          images: [await fileToBase64(design.url), await fileToBase64(topViewPreview)],
          aspect: '1:1',
        }),
      });
      const data = await res.json();
      setDetailedPlan({ url: data.data?.[0]?.url || data.url, promptUsed: prompt });
    } catch (err) {
      alert('Technical plan failed.');
    } finally {
      setPlanLoading(false);
    }
  };

  // PDF Export Logic
  const generatePDF = () => {
    if (!design) return;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text("Paddy O' Patio: Design Report", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Location: ${address || 'Custom Upload'}`, 20, 30);

    doc.addImage(design.url, 'JPEG', 20, 40, 170, 95);
    
    if (detailedPlan) {
      doc.addPage();
      doc.setTextColor(79, 70, 229);
      doc.text("Technical Site Blueprint", 20, 20);
      doc.addImage(detailedPlan.url, 'JPEG', 20, 30, 170, 170);
    }
    
    doc.save("Paddy-O-Landscape-Package.pdf");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-10 px-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-12 text-center">
          <h1 className="text-6xl font-serif font-bold text-emerald-600 mb-2">Paddy O' Patio</h1>
          <p className="text-xl text-zinc-400">Fort Collins Sustainable Design Engine</p>
        </header>

        {!design ? (
          <div className="space-y-12 animate-in fade-in duration-700">
            {/* --- STEP 1: DUAL INPUTS --- */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* UPLOAD BOX */}
              <div className={`p-8 rounded-3xl border-2 transition-all ${referencePreview && !isStreetViewSelected ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/40'}`}>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Camera className="text-emerald-500"/> Option 1: Upload</h2>
                {referencePreview && !isStreetViewSelected ? (
                  <div className="relative group">
                    <img src={referencePreview} className="rounded-xl max-h-56 mx-auto border border-zinc-700" alt="Preview" />
                    <button onClick={() => setReferencePreview(null)} className="absolute top-2 right-2 bg-red-600 p-2 rounded-full shadow-xl"><X size={16}/></button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 block text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition">
                    <Upload className="mx-auto mb-4 text-zinc-600" size={40} />
                    <span className="text-zinc-400 font-medium">Upload yard photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const r = new FileReader();
                        r.onload = (ev) => { setReferencePreview(ev.target?.result as string); setIsStreetViewSelected(false); };
                        r.readAsDataURL(f);
                      }
                    }} />
                  </label>
                )}
              </div>

              {/* STREET VIEW BOX */}
              <div className={`p-8 rounded-3xl border-2 transition-all ${isStreetViewSelected ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/40'}`}>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><MapIcon className="text-blue-500"/> Option 2: Street View</h2>
                <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="Enter street address..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500" value={address} onChange={(e) => setAddress(e.target.value)} />
                  <button onClick={fetchMapViews} className="bg-emerald-600 px-6 rounded-xl hover:bg-emerald-500 transition"><Search/></button>
                </div>
                {mapViews && (
                  <div className="relative cursor-pointer group overflow-hidden rounded-xl border border-zinc-700" onClick={() => { setReferencePreview(mapViews.street); setIsStreetViewSelected(true); }}>
                    <img src={mapViews.street} className="w-full h-40 object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <span className="bg-emerald-600 px-4 py-2 rounded-full text-sm font-bold">Use This Photo</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* --- STEP 2: TOGGLES --- */}
            <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-2xl">
              <h2 className="text-2xl font-bold mb-8 text-center underline decoration-emerald-500 decoration-4 underline-offset-8">Design Toggles</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Native Plants', state: nativePlanting, set: setNativePlanting, sub: 'XIP Rebate' },
                  { label: 'Rain Garden', state: rainGarden, set: setRainGarden, sub: 'Water Capture' },
                  { label: 'Hardscape', state: hardscape, set: setHardscape, sub: 'Patio/Walk' },
                  { label: 'Food Forest', state: edibleGuild, set: setEdibleGuild, sub: 'Edible' }
                ].map((item) => (
                  <button key={item.label} onClick={() => item.set(!item.state)} className={`p-4 rounded-2xl border-2 transition-all text-left ${item.state ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                    <p className="font-bold text-lg">{item.label}</p>
                    <p className="text-xs text-zinc-500">{item.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={generateDesign} disabled={loading || !referencePreview} className="w-full bg-emerald-600 hover:bg-emerald-500 py-6 rounded-3xl text-3xl font-black transition shadow-[0_0_40px_rgba(16,185,129,0.2)] disabled:opacity-50">
              {loading ? <span className="flex items-center justify-center gap-4"><RefreshCw className="animate-spin"/> Crafting Your Vision...</span> : 'Generate Design Concept'}
            </button>
          </div>
        ) : (
          /* --- RESULTS VIEW --- */
          <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-1000">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-1 rounded-full text-sm font-bold mb-4 uppercase tracking-widest">
                <Award size={16}/> Phase 1: Perspective Vision
              </div>
              <h2 className="text-4xl font-bold mb-8">Concept Render</h2>
              <img src={design.url} className="rounded-[2rem] shadow-[0_0_60px_rgba(0,0,0,0.6)] border-8 border-zinc-900 max-w-5xl mx-auto mb-8" />
            </div>

            {/* PHASE 2: BLUEPRINT MERGE */}
            <div className="bg-indigo-950/20 border-2 border-indigo-500/30 rounded-[2.5rem] p-10 max-w-5xl mx-auto shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10"><MapIcon size={120}/></div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-indigo-600 p-3 rounded-2xl"><MapIcon className="text-white" size={32}/></div>
                <h2 className="text-3xl font-bold text-indigo-400">Phase 2: Technical Blueprint</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-12 mb-10">
                <div className="space-y-6">
                  <p className="text-zinc-300 text-lg leading-relaxed">To create a scale-accurate plan, we need a bird's-eye view. We'll use your address to pull satellite data.</p>
                  <button onClick={fetchMapViews} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-bold transition shadow-lg flex items-center justify-center gap-2">
                    <Search size={20}/> Fetch Satellite Layer
                  </button>
                  <label className="block w-full bg-zinc-900 border border-zinc-800 py-4 rounded-2xl font-bold text-center cursor-pointer hover:bg-zinc-800 transition">
                    Upload Property Map
                    <input type="file" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if(f){ const r=new FileReader(); r.onload=(ev)=>setTopViewPreview(ev.target?.result as string); r.readAsDataURL(f); }
                    }} />
                  </label>
                </div>
                <div className="bg-black/60 rounded-3xl h-64 flex items-center justify-center border-2 border-dashed border-indigo-500/20 overflow-hidden relative group">
                  {topViewPreview || mapViews?.sat ? (
                    <img src={topViewPreview || mapViews?.sat} className="w-full h-full object-cover" onClick={() => setTopViewPreview(topViewPreview || mapViews!.sat)} />
                  ) : (
                    <p className="text-zinc-600 italic">No satellite data selected...</p>
                  )}
                </div>
              </div>

              <button onClick={generateMagicPlan} disabled={planLoading || (!topViewPreview && !mapViews?.sat)} className="w-full bg-indigo-500 hover:bg-indigo-400 py-5 rounded-2xl text-2xl font-black transition shadow-xl disabled:opacity-50">
                {planLoading ? 'Synthesizing Blueprint...' : 'Generate 2D Site Plan'}
              </button>
            </div>

            {/* BLUEPRINT RESULT */}
            {detailedPlan && (
              <div className="bg-white p-12 rounded-[3rem] text-black shadow-2xl animate-in zoom-in duration-500">
                <h3 className="text-3xl font-black mb-8 text-center uppercase tracking-tighter italic">Technical Blueprint</h3>
                <img src={detailedPlan.url} className="w-full rounded-2xl border-4 border-zinc-100 mb-8" />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-zinc-50 p-4 rounded-xl"><p className="text-xs text-zinc-400">Scale</p><p className="font-bold">1/4" = 1'</p></div>
                  <div className="bg-zinc-50 p-4 rounded-xl"><p className="text-xs text-zinc-400">Region</p><p className="font-bold">Zone 5b</p></div>
                  <div className="bg-zinc-50 p-4 rounded-xl"><p className="text-xs text-zinc-400">Style</p><p className="font-bold">Permaculture</p></div>
                </div>
              </div>
            )}

            {/* FOOTER ACTIONS */}
            <div className="flex flex-col sm:flex-row justify-center gap-6 pt-10">
              <button onClick={generatePDF} className="bg-white text-black px-12 py-5 rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition shadow-2xl">
                <Download size={24}/> Download Design Package
              </button>
              <button onClick={() => {setDesign(null); setDetailedPlan(null);}} className="bg-zinc-800 px-12 py-5 rounded-2xl font-bold hover:bg-zinc-700 transition border border-zinc-700">
                Start New Project
              </button>
            </div>
          </div>
        )}

        <footer className="mt-24 text-center text-zinc-600 border-t border-zinc-900 pt-10">
          <p className="mb-2 uppercase tracking-widest text-xs font-bold">Paddy O' Patio Design Engine v2.0</p>
          <p>Created for Padden Permaculture • Fort Collins, Colorado</p>
        </footer>
      </div>
    </div>
  );
}