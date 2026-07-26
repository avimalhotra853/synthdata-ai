'use client';

import { useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://synthdata-ai-backend.onrender.com';

export default function Home() {
  const [foreground, setForeground] = useState<File | null>(null);
  const [background, setBackground] = useState<File | null>(null);
  const [fgPreview, setFgPreview] = useState<string | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [count, setCount] = useState<number>(10);
  const [exportFormat, setExportFormat] = useState<string>('yolo');
  const [autoRemoveBg, setAutoRemoveBg] = useState<boolean>(false);
  const [addShadows, setAddShadows] = useState<boolean>(true);
  const [minScale, setMinScale] = useState<number>(0.2);
  const [maxScale, setMaxScale] = useState<number>(0.5);
  const [maxRotation, setMaxRotation] = useState<number>(30);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bboxData, setBboxData] = useState<{ x: number; y: number; w: number; h: number; imgW: number; imgH: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Dynamic guide format selector
  const [guideFormat, setGuideFormat] = useState<string>('yolo');

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleFileChange = (file: File | null, setFile: (f: File | null) => void, setPreview: (url: string | null) => void) => {
    setFile(file);
    if (file) setPreview(URL.createObjectURL(file));
    else setPreview(null);
  };

  const generatePreview = async () => {
    if (!foreground || !background) return;
    setPreviewLoading(true);

    try {
      const formData = new FormData();
      formData.append('foreground', foreground);
      formData.append('background', background);
      formData.append('auto_remove_bg', autoRemoveBg.toString());
      formData.append('add_shadows', addShadows.toString());
      formData.append('min_scale', minScale.toString());
      formData.append('max_scale', maxScale.toString());
      formData.append('max_rotation', maxRotation.toString());

      const res = await fetch(`${BACKEND_URL}/api/preview`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Preview failed');

      const x = parseFloat(res.headers.get('X-BBox-X') || '0');
      const y = parseFloat(res.headers.get('X-BBox-Y') || '0');
      const w = parseFloat(res.headers.get('X-BBox-W') || '0');
      const h = parseFloat(res.headers.get('X-BBox-H') || '0');
      const imgW = parseFloat(res.headers.get('X-Img-W') || '1');
      const imgH = parseFloat(res.headers.get('X-Img-H') || '1');

      setBboxData({ x, y, w, h, imgW, imgH });
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert('Error rendering preview. Note: Render free instances may take up to 50 seconds to wake up.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foreground || !background) {
      alert('Please select both a foreground cutout and a background image.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('count', count.toString());
      formData.append('export_format', exportFormat);
      formData.append('auto_remove_bg', autoRemoveBg.toString());
      formData.append('add_shadows', addShadows.toString());
      formData.append('min_scale', minScale.toString());
      formData.append('max_scale', maxScale.toString());
      formData.append('max_rotation', maxRotation.toString());
      formData.append('foreground', foreground);
      formData.append('background', background);

      const res = await fetch(`${BACKEND_URL}/api/generate`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dataset_${exportFormat}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Error generating dataset. Ensure your Render backend is active and accessible.');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('submitting');

    const apiKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: apiKey,
          name: contactName,
          email: contactEmail,
          message: contactMessage,
          subject: `New SynthData AI Inquiry from ${contactName}`
        }),
      });

      const result = await response.json();
      if (result.success) {
        setFormStatus('success');
        setContactName('');
        setContactEmail('');
        setContactMessage('');
      } else {
        setFormStatus('error');
      }
    } catch (error) {
      console.error(error);
      setFormStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200 font-mono antialiased flex flex-col justify-between">
      
      {/* Navigation Header */}
      <nav className="border-b border-slate-800/80 bg-[#0d121f]/80 backdrop-blur-md sticky top-0 z-50 py-1">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="font-bold text-slate-100 font-mono text-xl tracking-tight flex items-center space-x-3">
            <div className="bg-white p-2.5 rounded-xl flex items-center justify-center shadow-md border border-slate-200 overflow-hidden w-11 h-11">
              <img 
                src="/logo_cropped.png" 
                alt="SynthData AI Icon" 
                className="w-full h-full object-contain" 
              />
            </div>
            <span className="text-slate-100 font-semibold font-mono text-lg tracking-tight">
              synthdata ai
            </span>
          </div>

          <div className="text-xs font-mono text-slate-400 tracking-wider hidden sm:block">
            YOLO • COCO • PASCAL VOC • CSV
          </div>
        </div>
      </nav>

      <main className="max-w-7xl w-full mx-auto px-8 py-12 flex-1 space-y-12">
        
        {/* Main Title Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold font-mono text-slate-100 tracking-tight leading-tight">
            Production Synthetic Data Engine
          </h1>
          <p className="text-slate-400 text-sm font-mono leading-relaxed tracking-wide">
            Composite objects, apply realism physics, and export ready-to-train annotations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Controls Column */}
          <div className="lg:col-span-7 border border-slate-800 bg-[#0d121f] rounded-2xl p-8 space-y-8 shadow-xl">
            <form onSubmit={handleGenerate} className="space-y-8">
              
              {/* File Upload Box */}
              <div className="grid grid-cols-2 gap-6">
                <div className="border-2 border-dashed border-slate-800 bg-[#090d16] p-6 rounded-xl text-center relative hover:border-slate-600 transition">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files?.[0] || null, setForeground, setFgPreview)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <p className="text-xs font-mono font-semibold text-slate-200 mb-1">1. Foreground Object</p>
                  <p className="text-xs text-slate-400 truncate">{foreground ? foreground.name : 'PNG Cutout / Photo'}</p>
                </div>
                <div className="border-2 border-dashed border-slate-800 bg-[#090d16] p-6 rounded-xl text-center relative hover:border-slate-600 transition">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files?.[0] || null, setBackground, setBgPreview)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <p className="text-xs font-mono font-semibold text-slate-200 mb-1">2. Background Scene</p>
                  <p className="text-xs text-slate-400 truncate">{background ? background.name : 'JPEG / PNG Scene'}</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-6 bg-[#090d16] p-5 rounded-xl border border-slate-800 text-xs font-mono">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={autoRemoveBg} onChange={(e) => setAutoRemoveBg(e.target.checked)} className="w-4 h-4 rounded accent-slate-200" />
                  <span className="text-slate-300">Auto-Remove BG (rembg)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={addShadows} onChange={(e) => setAddShadows(e.target.checked)} className="w-4 h-4 rounded accent-slate-200" />
                  <span className="text-slate-300">Drop Shadow Realism</span>
                </label>
              </div>

              {/* Augmentations */}
              <div className="bg-[#090d16] p-6 rounded-xl border border-slate-800 space-y-6 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-slate-200 mb-2 font-medium">
                    <span>Object Scale Range</span>
                    <span className="text-emerald-400">{Math.round(minScale * 100)}% - {Math.round(maxScale * 100)}%</span>
                  </div>
                  <input type="range" min="0.1" max="0.9" step="0.05" value={maxScale} onChange={(e) => setMaxScale(parseFloat(e.target.value))} className="w-full h-2 bg-slate-800 rounded accent-slate-200 cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between text-slate-200 mb-2 font-medium">
                    <span>Max Rotation Angle</span>
                    <span className="text-emerald-400">±{maxRotation}°</span>
                  </div>
                  <input type="range" min="0" max="180" step="5" value={maxRotation} onChange={(e) => setMaxRotation(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded accent-slate-200 cursor-pointer" />
                </div>
              </div>

              {/* Format & Count */}
              <div className="grid grid-cols-2 gap-6 text-xs font-mono">
                <div>
                  <label className="block text-slate-300 mb-2 font-semibold">Export Annotation Format</label>
                  <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="w-full bg-[#090d16] border border-slate-800 rounded-lg p-3 text-slate-100 font-mono text-xs focus:border-slate-500 outline-none">
                    <option value="yolo">YOLOv8 (.txt)</option>
                    <option value="coco">COCO (.json)</option>
                    <option value="pascal">Pascal VOC (.xml)</option>
                    <option value="csv">CSV Index (.csv)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-2 font-semibold">Dataset Images Count</label>
                  <input type="number" min="1" max="100" value={count} onChange={(e) => setCount(parseInt(e.target.value))} className="w-full bg-[#090d16] border border-slate-800 rounded-lg p-3 text-slate-100 font-mono text-xs focus:border-slate-500 outline-none" />
                </div>
              </div>

              <div className="flex gap-4 pt-2 font-mono">
                <button type="button" onClick={generatePreview} disabled={!foreground || !background || previewLoading} className="w-1/3 py-4 border border-slate-700 hover:bg-slate-800 text-xs font-bold rounded-xl text-slate-200 transition disabled:opacity-50">
                  {previewLoading ? 'Rendering...' : 'Test Composite'}
                </button>
                <button type="submit" disabled={loading} className="w-2/3 py-4 bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs rounded-xl transition shadow-lg disabled:opacity-50">
                  {loading ? 'Processing Pipeline...' : 'Generate & Export Dataset Archive'}
                </button>
              </div>

            </form>
          </div>

          {/* Interactive Bounding Box Preview Canvas */}
          <div className="lg:col-span-5 border border-slate-800 bg-[#0d121f] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[480px] relative shadow-xl font-mono">
            <div className="w-full flex justify-between items-center mb-6 text-xs text-slate-400 border-b border-slate-800 pb-3">
              <span className="font-semibold text-slate-300">Interactive Annotation Preview</span>
              <span className="text-emerald-400 font-bold">Live Bounding Box</span>
            </div>

            {previewUrl && bboxData ? (
              <div className="relative flex items-center justify-center border border-slate-800 rounded-xl overflow-hidden shadow-2xl max-h-[520px]">
                <div className="relative inline-block">
                  <img src={previewUrl} alt="Preview Composite" className="block max-h-[520px] max-w-full w-auto h-auto object-contain" />
                  <div 
                    className="absolute border-2 border-emerald-400 bg-emerald-500/20 pointer-events-none z-10 transition-all duration-200"
                    style={{
                      left: `${(bboxData.x / (bboxData.imgW || 1)) * 100}%`,
                      top: `${(bboxData.y / (bboxData.imgH || 1)) * 100}%`,
                      width: `${(bboxData.w / (bboxData.imgW || 1)) * 100}%`,
                      height: `${(bboxData.h / (bboxData.imgH || 1)) * 100}%`
                    }}
                  >
                    <span className="absolute -top-6 left-0 bg-emerald-500 text-slate-950 text-[10px] font-mono px-1.5 py-0.5 font-bold rounded-t whitespace-nowrap shadow-md">
                      object (1.00)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 text-xs font-mono space-y-3 py-12">
                <p className="text-slate-300 font-medium">Upload foreground + background images</p>
                <p className="text-[11px] text-slate-500">Click "Test Composite" to preview live bounding box alignment</p>
              </div>
            )}
          </div>

        </div>

        {/* Dynamic Bounding Box Reference Guide */}
        <section className="border border-slate-800 bg-[#0d121f] rounded-2xl p-8 sm:p-10 space-y-8 shadow-xl font-mono">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight font-mono">Bounding Box Reference & Coordinate Guide</h2>
              <p className="text-slate-400 text-xs mt-1">Select a format below to learn how coordinates and annotations are calculated.</p>
            </div>
            
            <div className="flex items-center space-x-3 bg-[#090d16] border border-slate-800 p-2 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold pl-2">Select Format:</span>
              <select 
                value={guideFormat} 
                onChange={(e) => setGuideFormat(e.target.value)} 
                className="bg-slate-900 border border-slate-700 text-emerald-400 text-xs rounded-lg p-2 font-bold outline-none cursor-pointer"
              >
                <option value="yolo">YOLOv8 (.txt)</option>
                <option value="coco">COCO (.json)</option>
                <option value="pascal">Pascal VOC (.xml)</option>
                <option value="csv">CSV Index (.csv)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="bg-[#090d16] border border-slate-800 rounded-xl p-8 relative flex flex-col items-center justify-center min-h-[260px]">
              <div className="w-full max-w-[340px] h-[200px] border-2 border-dashed border-slate-700 rounded-xl relative flex items-center justify-center bg-slate-900/40">
                {guideFormat === 'yolo' && (
                  <>
                    <span className="absolute top-3 left-3 text-[11px] text-slate-500">(0,0) Normalized</span>
                    <span className="absolute bottom-3 right-3 text-[11px] text-slate-500">(1.0, 1.0) Max</span>
                    <div className="w-[150px] h-[100px] border-2 border-emerald-400 bg-emerald-500/15 rounded-lg relative flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="absolute -top-6 left-0 text-[11px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-t">
                        class_id: 0
                      </span>
                      <span className="absolute -bottom-6 text-[11px] text-emerald-400 whitespace-nowrap font-medium">
                        x_center, y_center, w, h
                      </span>
                    </div>
                  </>
                )}

                {guideFormat === 'coco' && (
                  <>
                    <span className="absolute top-3 left-3 text-[11px] text-slate-500">(0,0) Origin</span>
                    <div className="w-[150px] h-[100px] border-2 border-amber-400 bg-amber-500/15 rounded-lg relative">
                      <div className="w-2.5 h-2.5 bg-amber-400 absolute top-0 left-0" />
                      <span className="absolute -top-6 left-0 text-[11px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-t">
                        id: 1, category_id: 1
                      </span>
                      <span className="absolute -bottom-6 text-[11px] text-amber-400 whitespace-nowrap font-medium">
                        bbox: [x, y, width, height]
                      </span>
                    </div>
                  </>
                )}

                {guideFormat === 'pascal' && (
                  <>
                    <span className="absolute top-3 left-3 text-[11px] text-slate-500">Pixel Space</span>
                    <div className="w-[150px] h-[100px] border-2 border-sky-400 bg-sky-500/15 rounded-lg relative">
                      <div className="w-2 h-2 bg-sky-400 absolute top-0 left-0" />
                      <div className="w-2 h-2 bg-sky-400 absolute bottom-0 right-0" />
                      <span className="absolute -top-6 left-0 text-[11px] bg-sky-400 text-slate-950 font-bold px-1.5 py-0.5 rounded-t">
                        &lt;object&gt;
                      </span>
                      <span className="absolute -bottom-6 text-[11px] text-sky-400 whitespace-nowrap font-medium">
                        (xmin, ymin) to (xmax, ymax)
                      </span>
                    </div>
                  </>
                )}

                {guideFormat === 'csv' && (
                  <>
                    <span className="absolute top-3 left-3 text-[11px] text-slate-500">Tabular Format</span>
                    <div className="w-[150px] h-[100px] border-2 border-purple-400 bg-purple-500/15 rounded-lg relative flex items-center justify-center">
                      <span className="absolute -top-6 left-0 text-[11px] bg-purple-400 text-slate-950 font-bold px-1.5 py-0.5 rounded-t">
                        Row Index Entry
                      </span>
                      <span className="text-[10px] text-purple-300 text-center px-1 font-semibold">
                        filename, width, height, xmin, ymin...
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-6 text-xs font-mono">
              {guideFormat === 'yolo' && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-100 text-sm">1. YOLOv8 Format Mechanics</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Uses normalized bounding box coordinates between <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-200">0.0</code> and <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-200">1.0</code>.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-100 text-sm">2. Annotation File Output</h3>
                    <div className="bg-[#090d16] border border-slate-800 p-4 rounded-lg text-emerald-400 font-medium">
                      0 0.542100 0.481200 0.320000 0.250000
                    </div>
                  </div>
                </>
              )}

              {guideFormat === 'coco' && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-100 text-sm">1. COCO JSON Structure</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Bounding boxes are indexed inside a central <code className="text-amber-400">annotations.json</code> file using absolute pixel bounds <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-200">[x, y, width, height]</code>.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-100 text-sm">2. Annotation File Output</h3>
                    <div className="bg-[#090d16] border border-slate-800 p-4 rounded-lg text-amber-400 font-medium overflow-x-auto">
                      {`{\n  "id": 1, "image_id": 1, "category_id": 1,\n  "bbox": [120, 80, 240, 180], "area": 43200\n}`}
                    </div>
                  </div>
                </>
              )}

              {guideFormat === 'pascal' && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-100 text-sm">1. Pascal VOC XML Mechanics</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Generates an <code className="text-sky-400">.xml</code> file containing top-left <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-200">(xmin, ymin)</code> and bottom-right <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-200">(xmax, ymax)</code> bounds.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-100 text-sm">2. Annotation File Output</h3>
                    <div className="bg-[#090d16] border border-slate-800 p-4 rounded-lg text-sky-400 font-medium overflow-x-auto">
                      {`<bndbox>\n  <xmin>120</xmin> <ymin>80</ymin>\n  <xmax>360</xmax> <ymax>260</ymax>\n</bndbox>`}
                    </div>
                  </div>
                </>
              )}

              {guideFormat === 'csv' && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-100 text-sm">1. Tabular CSV Dataset Index</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Exports a single <code className="text-purple-400">annotations.csv</code> file mapping image filenames directly to bounding box pixel boundaries.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-100 text-sm">2. Annotation File Output</h3>
                    <div className="bg-[#090d16] border border-slate-800 p-4 rounded-lg text-purple-400 font-medium overflow-x-auto">
                      filename,width,height,class,xmin,ymin,xmax,ymax
                      synthetic_0001.jpg,640,480,object,120,80,360,260
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Contact & Join Us Section with Web3Forms */}
        <section className="border border-slate-800 bg-[#0d121f] rounded-2xl p-8 sm:p-10 space-y-8 shadow-xl font-mono max-w-7xl mx-auto w-full">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Get in Touch or Join</h2>
            <p className="text-slate-400 text-xs">
              Have feedback, need custom features, or want to contribute? Drop a message below.
            </p>
          </div>

          <form onSubmit={handleContactSubmit} className="max-w-2xl mx-auto space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Name Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Name</label>
                <input 
                  type="text" 
                  required 
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Jane Doe" 
                  className="w-full bg-[#090d16] border border-slate-800 rounded-lg p-3 text-slate-100 font-mono text-xs focus:border-slate-500 outline-none transition"
                />
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Email</label>
                <input 
                  type="email" 
                  required 
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="jane@example.com" 
                  className="w-full bg-[#090d16] border border-slate-800 rounded-lg p-3 text-slate-100 font-mono text-xs focus:border-slate-500 outline-none transition"
                />
              </div>

            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Message</label>
              <textarea 
                rows={4} 
                required 
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="How can we help you or how would you like to collaborate?" 
                className="w-full bg-[#090d16] border border-slate-800 rounded-lg p-3 text-slate-100 font-mono text-xs focus:border-slate-500 outline-none transition resize-none"
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={formStatus === 'submitting'}
              className="w-full py-3.5 bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs rounded-xl transition shadow-lg disabled:opacity-50"
            >
              {formStatus === 'submitting' ? 'Sending...' : 'Send Message'}
            </button>

            {/* Form Response Feedback */}
            {formStatus === 'success' && (
              <p className="text-emerald-400 text-xs text-center font-bold">
                ✓ Message sent successfully! We will get back to you soon.
              </p>
            )}
            {formStatus === 'error' && (
              <p className="text-rose-400 text-xs text-center font-bold">
                ✕ Failed to send message. Please check your Web3Forms access key.
              </p>
            )}
          </form>
        </section>

      </main>

      <footer className="border-t border-slate-800/80 bg-[#0d121f] py-6 px-8 text-xs text-slate-500 font-mono text-center">
        SynthData AI • Contact: avi.malhotra853@gmail.com
      </footer>
    </div>
  );
}