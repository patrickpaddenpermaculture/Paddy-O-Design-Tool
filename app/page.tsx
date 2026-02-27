'use client';
import React, { useState, useEffect } from 'react';
import { Upload, X, Award } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ── 3D support imports ─────────────────────────────────────────────
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Grid } from '@react-three/drei';

export default function LandscapeTool() {
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<{ url: string; promptUsed: string } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [detailedPlan, setDetailedPlan] = useState<{ url: string; promptUsed: string } | null>(null);
  const [breakdown, setBreakdown] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState('');

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

  // 3D viewer state
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [show3DViewer, setShow3DViewer] = useState(false);

  useEffect(() => {
    return () => {
      if (modelUrl) URL.revokeObjectURL(modelUrl);
    };
  }, [modelUrl]);

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

    setReferenceFile(null);
    setReferencePreview(null);
  };

  const handleCaptureTopView = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('3D viewer canvas not found — try re-uploading');
      return;
    }

    const dataURL = canvas.toDataURL('image/png', 1.0);
    const file = dataURLtoFile(dataURL, 'top-view-from-scan.png');

    setReferenceFile(file);
    setReferencePreview(dataURL);
    setShow3DViewer(false);

    alert('Top-down view captured! You can now generate your design.');
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

  const generateDesign = async () => {
    setLoading(true);
    setDesign(null);
    setDetailedPlan(null);
    setBreakdown('');
    setBreakdownError('');

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
      if (!res.ok) throw new Error(`Image generation failed: ${res.status}`);
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

  const generateDetailedPlan = async () => {
    if (!design) {
      alert('Please generate the perspective concept first.');
      return;
    }
    setPlanLoading(true);

    const planPrompt = `Create a clean, professional top-down landscape plan (orthographic / bird's-eye view) based on this yard and the proposed design.
Use diagram/technical drawing style: light background, clear black outlines, labeled zones with text annotations, approximate square footages shown, material labels.
Preserve exact proportions of house, driveway, garage, sidewalks, fences from the reference.
Show only yard modifications with:
- Beds, paths, patios, rain garden basin, tree/shrub groupings clearly outlined
- Text labels including square footage, e.g. "Native Perennial Bed – 320 sq ft", "Permeable Paver Patio – 180 sq ft", "Rain Garden", "Fruit Tree Guild"
- Material notations: permeable pavers, natural stone, mulch, decomposed granite paths, etc.
- Simple symbols: circles/dots for trees/shrubs, patterns for mulch/perennials
- High readability, professional CAD-like aesthetic, not photorealistic.
Aspect ratio 1:1 or 4:3 for plan layout.`;

    try {
      let base64Image = referenceFile ? await fileToBase64(referenceFile) : null;
      if (!base64Image && design) {
        const blob = await fetch(design.url).then(r => r.blob());
        const file = new File([blob], 'concept.jpg', { type: 'image/jpeg' });
        base64Image = await fileToBase64(file);
      }

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
      if (!res.ok) throw new Error(`Plan generation failed: ${res.status}`);
      const data = await res.json();
      const imageUrl = data.data?.[0]?.url;
      if (!imageUrl) throw new Error('No plan image returned');
      setDetailedPlan({ url: imageUrl, promptUsed: planPrompt });
    } catch (err: any) {
      alert('Detailed plan generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setPlanLoading(false);
    }
  };

  const generateBreakdown = async () => {
    const imageToAnalyze = detailedPlan?.url || design?.url;
    if (!imageToAnalyze) {
      alert('No design generated yet.');
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
          imageUrl: imageToAnalyze,
          tier: 'Custom Landscape',
        }),
      });
      if (!res.ok) throw new Error(`Breakdown failed: ${res.status}`);
      const data = await res.json();
      setBreakdown(data.breakdown || '');
    } catch (err: any) {
      setBreakdownError('Failed to generate breakdown: ' + (err.message || 'Unknown error'));
    } finally {
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

  function Model({ url }: { url: string }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} dispose={null} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-center text-emerald-600 mb-2">
          Paddy O' Patio
        </h1>
        <p className="text-center text-2xl md:text-3xl text-zinc-300 mb-1">
          Fort Collins Landscape Design Tool
        </p>
        <p className="text-center text-xl text-emerald-500/80 mb-12 font-medium italic">
          Intelligent Regional Designs Instantly
        </p>

        {/* Photo Upload */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Upload your yard photo (optional)</h2>
          <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center">
            {referencePreview ? (
              <div className="relative max-w-md mx-auto">
                <img src={referencePreview} className="rounded-2xl" alt="Yard preview" />
                <button
                  onClick={clearReference}
                  className="absolute top-4 right-4 bg-red-600 p-2 rounded-full hover:bg-red-700 transition"
                >
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

        {/* 3D Scan Upload */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Or upload 3D scan (PolyCam .GLB file)</h2>
          <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center">
            <label className="cursor-pointer block">
              <Upload className="w-16 h-16 mx-auto text-zinc-500 mb-4" />
              <span className="text-xl text-zinc-300">Click to upload .GLB or .GLTF</span>
              <input
                type="file"
                accept=".glb,.gltf"
                onChange={handle3DFile}
                className="hidden"
              />
            </label>
          </div>

          {show3DViewer && modelUrl && (
            <div className="mt-6">
              <div className="text-sm text-zinc-400 mb-3">
                Orbit / zoom to a clean top-down view → then capture
              </div>
              <div className="border border-zinc-700 rounded-2xl overflow-hidden" style={{ height: '400px' }}>
                <Canvas
                  gl={{ preserveDrawingBuffer: true }}
                  camera={{ position: [0, 15, 25], fov: 45 }}
                  style={{ background: '#111' }}
                >
                  <ambientLight intensity={0.6} />
                  <directionalLight position={[10, 20, 5]} intensity={1.2} castShadow />
                  <Model url={modelUrl} />
                  <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
                  <Grid args={[200, 200]} position={[0, -0.01, 0]} />
                  <Environment preset="sunset" />
                </Canvas>
              </div>

              <button
                onClick={handleCaptureTopView}
                className="mt-4 w-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-4 rounded-2xl transition"
              >
                Capture Top-Down View & Use as Reference Photo
              </button>
            </div>
          )}
        </div>

        {/* Customize Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-semibold text-center mb-8">Customize Your Landscape</h2>
          <div className="space-y-8">
            {/* Native Planting */}
            <div className="bg-zinc-900 border border-emerald-700 rounded-3xl p-8 relative">
              <div className="absolute -top-3 -right-3 bg-emerald-600 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                <Award size={16} /> UP TO $1,000 REBATE AVAILABLE
              </div>
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nativePlanting}
                  onChange={(e) => setNativePlanting(e.target.checked)}
                  className="mt-1 w-6 h-6 accent-emerald-600"
                />
                <div>
                  <div className="text-2xl font-semibold">Replace grass with low-water Colorado natives</div>
                  <p className="text-zinc-400 mt-1">
                    Remove all turf and plant native perennials, grasses & shrubs — qualifies for maximum rebate
                  </p>
                </div>
              </label>
            </div>

            {/* Rain Garden */}
            <div className="bg-zinc-900 border border-emerald-700 rounded-3xl p-8">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rainGarden}
                  onChange={(e) => setRainGarden(e.target.checked)}
                  className="mt-1 w-6 h-6 accent-emerald-600"
                />
                <div>
                  <div className="text-2xl font-semibold">Add a rain garden</div>
                  <p className="text-zinc-400 mt-1">
                    Route downspouts into a decorative infiltration basin with native wetland plants — captures runoff & qualifies for water-wise credits
                  </p>
                </div>
              </label>
            </div>

            {/* Hardscape */}
            <div className="bg-zinc-900 border border-emerald-700 rounded-3xl p-8">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hardscape}
                  onChange={(e) => setHardscape(e.target.checked)}
                  className="mt-1 w-6 h-6 accent-emerald-600"
                />
                <div>
                  <div className="text-2xl font-semibold">Add permeable hardscape</div>
                  <p className="text-zinc-400 mt-1">Permeable materials reduce runoff and look great</p>
                  {hardscape && (
                    <div className="mt-6 space-y-4 pl-10">
                      <div>
                        <label className="block text-lg mb-2">Type</label>
                        <select
                          value={hardscapeType}
                          onChange={(e) => setHardscapeType(e.target.value as 'walkway' | 'walkway-patio')}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 w-full text-white"
                        >
                          <option value="walkway">Walkway only</option>
                          <option value="walkway-patio">Walkway + Patio</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-lg mb-2">Material</label>
                        <select
                          value={hardscapeMaterial}
                          onChange={(e) => setHardscapeMaterial(e.target.value as 'stone' | 'pavers')}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 w-full text-white"
                        >
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
                <input
                  type="checkbox"
                  checked={edibleGuild}
                  onChange={(e) => setEdibleGuild(e.target.checked)}
                  className="mt-1 w-6 h-6 accent-emerald-600"
                />
                <div>
                  <div className="text-2xl font-semibold">Incorporate edible / productive guilds</div>
                  <p className="text-zinc-400 mt-1">
                    Food-producing plants integrated into the design (herbs, veggies, berries, fruit trees)
                  </p>
                  {edibleGuild && (
                    <div className="mt-6 space-y-3 pl-10">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={culinaryGuild}
                          onChange={(e) => setCulinaryGuild(e.target.checked)}
                          className="w-5 h-5 accent-emerald-600"
                        />
                        Culinary herbs & vegetables
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={medicinalGuild}
                          onChange={(e) => setMedicinalGuild(e.target.checked)}
                          className="w-5 h-5 accent-emerald-600"
                        />
                        Medicinal herbs
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fruitGuild}
                          onChange={(e) => setFruitGuild(e.target.checked)}
                          className="w-5 h-5 accent-emerald-600"
                        />
                        Fruit tree + berry bush guild
                      </label>
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
            className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-800 text-white text-2xl font-semibold px-16 py-6 rounded-3xl transition shadow-xl"
          >
            {loading ? 'Generating...' : 'Generate My Landscape Design'}
          </button>
        </div>

        {/* Results */}
        {design && (
          <div className="mt-12">
            <h2 className="text-3xl font-semibold text-center mb-8">Your Custom Design</h2>

            {/* Perspective Concept */}
            <div className="mb-12">
              <h3 className="text-2xl font-medium text-center mb-4">Perspective Concept View</h3>
              <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 max-w-4xl mx-auto">
                <img src={design.url} className="w-full h-96 object-cover" alt="Generated concept" />
              </div>
            </div>

            {/* Next Step Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center">
                <h4 className="text-xl font-semibold mb-4">Next: Detailed Plan</h4>
                <p className="text-zinc-400 mb-6 text-sm">
                  Top-down view with labels, approximate square footages, materials, and zones
                </p>
                <button
                  onClick={generateDetailedPlan}
                  disabled={planLoading}
                  className="bg-indigo-700 hover:bg-indigo-600 disabled:bg-zinc-800 text-white font-semibold px-10 py-4 rounded-2xl transition w-full"
                >
                  {planLoading ? 'Generating Plan...' : 'Generate Detailed Plan'}
                </button>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center">
                <h4 className="text-xl font-semibold mb-4">Next: Full Breakdown</h4>
                <p className="text-zinc-400 mb-6 text-sm">
                  Cost estimate, installation steps, plant list, maintenance & rebate info
                </p>
                <button
                  onClick={generateBreakdown}
                  disabled={breakdownLoading}
                  className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-800 text-white font-semibold px-10 py-4 rounded-2xl transition w-full"
                >
                  {breakdownLoading ? 'Analyzing...' : 'Generate Cost Breakdown, Strategy & Plant List'}
                </button>
              </div>
            </div>

            {/* Detailed Plan */}
            {detailedPlan && (
              <div className="mb-12">
                <h3 className="text-2xl font-medium text-center mb-4">Detailed Top-Down Plan</h3>
                <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 max-w-4xl mx-auto">
                  <img src={detailedPlan.url} className="w-full h-auto object-contain max-h-[700px]" alt="Detailed plan" />
                </div>
              </div>
            )}

            {/* Breakdown */}
            {(breakdown || breakdownLoading || breakdownError) && (
              <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 max-w-4xl mx-auto p-8 space-y-6">
                {breakdownError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-200 p-6 rounded-2xl">
                    {breakdownError}
                  </div>
                )}
                {breakdown && !breakdownError && (
                  <div className="prose prose-invert max-w-none text-lg leading-relaxed prose-headings:text-emerald-400 prose-table:border-zinc-700 prose-td:p-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{breakdown}</ReactMarkdown>
                  </div>
                )}
                {breakdownLoading && !breakdown && !breakdownError && (
                  <div className="text-center py-8 text-zinc-400 italic">Analyzing your design...</div>
                )}
              </div>
            )}

            {/* Bottom CTAs */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={(detailedPlan || design).url}
                download
                className="flex-1 bg-emerald-700 py-4 rounded-2xl text-center font-semibold hover:bg-emerald-600 transition max-w-xs"
              >
                Download {detailedPlan ? 'Detailed Plan' : 'Concept Image'}
              </a>
              <a
                href="https://www.fortcollins.gov/Services/Utilities/Programs-and-Rebates/Water-Programs/XIP"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 border border-emerald-700 py-4 rounded-2xl text-center font-semibold hover:bg-emerald-950 transition max-w-xs"
              >
                Apply for Rebate →
              </a>
              <a
                href="mailto:patrick@paddenpermaculture.com?subject=Schedule%20In-Person%20Detailed%20Design%20Presentation&body=Hi%20Patrick%2C%0A%0AI%20generated%20a%20landscape%20design%20using%20the%20Paddy%20O'%20Patio%20tool%20and%20would%20like%20to%20schedule%20an%20in-person%20presentation.%20My%20name%20is%20...%0APhone%3A%20...%0A%0AThanks!"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl text-center font-semibold text-white transition max-w-xs"
              >
                Schedule a Paddy O' Pro Consultation
              </a>
            </div>
          </div>
        )}

        <div className="mt-20 text-center text-sm text-zinc-500">
          Recommended installer:{' '}
          <a
            href="https://www.paddenpermaculture.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 hover:text-emerald-400 underline font-medium transition"
          >
            Padden Permaculture
          </a>
        </div>
      </div>
    </div>
  );
}
