'use client';

import React, { useState, Suspense } from 'react';
import { 
  Upload, X, Award, Map as MapIcon, Box, Home, 
  ArrowRight, Download, Mail, Search, Check, FileText, Camera, RefreshCw 
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- COMPONENTS ---
const Lazy3DViewer = React.lazy(() => import('./Lazy3DViewer'));

export default function LandscapeTool() {
  // --- 1. STATE MANAGEMENT ---
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [isStreetViewSelected, setIsStreetViewSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<{ url: string; promptUsed: string } | null>(null);
  
  // Phase 2 State
  const [topViewPreview, setTopViewPreview] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [detailedPlan, setDetailedPlan] = useState<{ url: string; promptUsed: string } | null>(null);
  
  // Maps/Address Logic State
  const [address, setAddress] = useState('');
  const [mapViews, setMapViews] = useState<{ sat: string; street: string } | null>(null);

  // --- 2. RESTORED ORIGINAL DESIGN TOGGLES ---
  const [nativePlanting, setNativePlanting] = useState(true);
  const [rainGarden, setRainGarden] = useState(false);
  const [hardscape, setHardscape] = useState(false);
  const [hardscapeType, setHardscapeType] = useState<'walkway' | 'walkway-patio'>('walkway');
  const [hardscapeMaterial, setHardscapeMaterial] = useState<'stone' | 'pavers'>('pavers');
  const [edibleGuild, setEdibleGuild] = useState(false);

  // --- 3. CORE FUNCTIONS ---
  const fetchMapViews = () => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!address) {
      alert("Please enter an address first.");
      return;
    }
    if (!key) {
      alert("API Key Missing: Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to Vercel Environment Variables.");
      return;
    }

    const encoded = encodeURIComponent(address);
    const streetUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x600&location=${encoded}&fov=90&key=${key}`;
    const satUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encoded}&zoom=20&size=800x800&maptype=satellite&scale=2&key=${key}`;

    setMapViews({ sat: satUrl, street: streetUrl });
    
    // AUTO-SELECT: This makes the search actually DO something visible
    setReferencePreview(streetUrl);
    setIsStreetViewSelected(true);
  };

  const generateDesign = async () => {
    if (!referencePreview) return;
    setLoading(true);
    
    let features = [];
    if (nativePlanting) features.push("Colorado native xeriscape perennials");
    if (rainGarden) features.push("rock-lined rain garden");
    if (hardscape) features.push(`a ${hardscapeMaterial} ${hardscapeType}`);
    if (edibleGuild) features.push("edible food forest elements");

    const prompt = `Professional landscape architectural render. Replace lawn with ${features.join(', ')}. High-end, 8k, summer lighting.`;

    try {
      // If it's a Google URL, we send the URL. If it's a file, we strip the base64 header.
      const imageData = referencePreview.startsWith('http') 
        ? referencePreview 
        : referencePreview.split(',')[1];

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          images: [imageData],
          aspect: '16:9',
        }),
      });
      const data = await res.json();
      setDesign({ url: data.data?.[0]?.url || data.url, promptUsed: prompt });
    } catch (err) {
      alert('Design generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Paddy O' Patio Design Package", 20, 20);
    if (design) doc.addImage(design.url, 'JPEG', 15, 30, 180, 100);
    doc.save("Padden-Design-Package.pdf");
  };

  // --- 4. THE UI RENDER ---
  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-16 text-center">
          <h1 className="text-7xl font-serif font-bold text-emerald-600 mb-2">Paddy O' Patio</h1>
          <p className="text-xl text-zinc-500 font-light tracking-widest uppercase">Intelligent Regional Designs Instantly</p>
        </header>

        {!design ? (
          <div className="space-y-12 animate-in fade-in duration-1000">
            
            {/* --- INPUT CHOICE SECTION --- */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* BOX 1: UPLOAD */}
              <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${referencePreview && !isStreetViewSelected ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/40'}`}>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Camera className="text-emerald-500"/> 1. Upload Yard Photo</h2>
                {referencePreview && !isStreetViewSelected ? (
                  <div className="relative">
                    <img src={referencePreview} className="rounded-3xl max-h-64 mx-auto border border-zinc-700 shadow-2xl" />
                    <button onClick={() => setReferencePreview(null)} className="absolute -top-3 -right-3 bg-red-600 p-2 rounded-full"><X size={20}/></button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-zinc-700 rounded-3xl p-16 block text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group">
                    <Upload className="mx-auto mb-4 text-zinc-600 group-hover:text-emerald-500" size={48} />
                    <span className="text-zinc-400 font-medium">Click to upload current yard view</span>
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

              {/* BOX 2: STREET VIEW */}
              <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${isStreetViewSelected ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/40'}`}>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><MapIcon className="text-blue-500"/> 1. Use Street View</h2>
                <div className="flex gap-2 mb-6">
                  <input 
                    type="text" 
                    placeholder="Enter your address..." 
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <button onClick={fetchMapViews} className="bg-emerald-600 px-6 rounded-2xl hover:bg-emerald-500 transition-all"><Search/></button>
                </div>
                {isStreetViewSelected && referencePreview && (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xl animate-in zoom-in-95">
                    <img src={referencePreview} className="w-full h-40 object-cover" alt="Street View" />
                    <div className="absolute top-2 right-2 bg-emerald-600 px-3 py-1 rounded-full text-xs font-bold">ACTIVE VIEW</div>
                  </div>
                )}
              </div>
            </div>

            {/* --- DESIGN ELEMENTS --- */}
            <div className="bg-zinc-900/80 p-10 rounded-[2.5rem] border border-zinc-800 shadow-2xl">
              <h2 className="text-3xl font-bold mb-10 text-center">2. Choose Your Design Elements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <div onClick={() => setNativePlanting(!nativePlanting)} className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${nativePlanting ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-xl">Native Planting</h3>
                    {nativePlanting && <Check className="text-emerald-500" />}
                  </div>
                  <p className="text-sm text-zinc-500">XIP-approved species for Northern Colorado.</p>
                </div>

                <div onClick={() => setRainGarden(!rainGarden)} className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${rainGarden ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-xl">Rain Garden</h3>
                    {rainGarden && <Check className="text-emerald-500" />}
                  </div>
                  <p className="text-sm text-zinc-500">Beautiful water-harvesting infiltration zones.</p>
                </div>

                <div className={`p-6 rounded-3xl border-2 transition-all ${hardscape ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800'}`}>
                  <div className="flex justify-between items-start mb-4 cursor-pointer" onClick={() => setHardscape(!hardscape)}>
                    <h3 className="font-black text-xl">Hardscape</h3>
                    {hardscape && <Check className="text-emerald-500" />}
                  </div>
                  {hardscape && (
                    <div className="space-y-4">
                      <select className="w-full bg-zinc-800 p-3 rounded-xl text-sm" value={hardscapeType} onChange={(e) => setHardscapeType(e.target.value as any)}>
                        <option value="walkway">Walking Path</option>
                        <option value="walkway-patio">Path + Patio</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={generateDesign} 
              disabled={loading || !referencePreview} 
              className="w-full bg-emerald-600 hover:bg-emerald-500 py-8 rounded-[2rem] text-3xl font-black transition-all shadow-2xl disabled:opacity-50"
            >
              {loading ? 'DREAMING UP YOUR YARD...' : 'GENERATE MY CONCEPT'}
            </button>
          </div>
        ) : (
          /* --- RESULTS --- */
          <div className="space-y-16 animate-in slide-in-from-bottom-10">
             <div className="text-center">
              <h2 className="text-4xl font-bold mb-8">Concept Render</h2>
              <img src={design.url} className="rounded-[3rem] shadow-2xl max-w-5xl mx-auto mb-12 border-8 border-zinc-900" />
              <div className="flex justify-center gap-6">
                <button onClick={generatePDF} className="bg-white text-black px-12 py-6 rounded-2xl font-black text-xl flex items-center gap-3">
                  <Download size={24}/> SAVE DESIGN PACKAGE
                </button>
                <button onClick={() => setDesign(null)} className="bg-zinc-800 px-12 py-6 rounded-2xl font-bold text-xl hover:bg-zinc-700 transition">
                  NEW PROJECT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}