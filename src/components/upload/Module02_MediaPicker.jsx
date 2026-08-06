// src/components/upload/Module02_MediaPicker.jsx
import React, { useRef } from 'react';
import { Upload, Film, Image as ImageIcon, Trash2, Plus } from 'lucide-react';

const Module02_MediaPicker = ({ mediaFiles, updateField, onNext, onPrev }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newMediaItems = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      name: file.name,
    }));

    updateField('mediaFiles', [...mediaFiles, ...newMediaItems]);
  };

  const removeFile = (index) => {
    const updated = mediaFiles.filter((_, i) => i !== index);
    updateField('mediaFiles', updated);
  };

  return (
    <div className="flex flex-col h-full w-full justify-between p-6">
      <div className="mb-4">
        <h2 className="text-xl font-black tracking-wide text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
          UPLOAD MEDIA
        </h2>
        <p className="text-xs text-cyan-200/60 mt-1">
          Select or drag media files to get started
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*,video/*,audio/*"
        className="hidden"
      />

      {/* Main Drag/Drop Zone */}
      {mediaFiles.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-zinc-950/60 p-8 cursor-pointer hover:bg-zinc-900/60 transition-all duration-300 group"
        >
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-all duration-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <Upload size={32} />
          </div>
          <p className="text-sm font-bold text-cyan-100 mt-4 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
            Drag & Drop Media Here
          </p>
          <span className="text-[10px] text-zinc-500 mt-1">
            Supports MP4, MOV, PNG, JPG, MP3 (Up to 4GB)
          </span>
        </div>
      ) : (
        /* Preview Grid */
        <div className="flex-1 overflow-y-auto hide-scrollbar grid grid-cols-2 sm:grid-cols-3 gap-3 p-2">
          {mediaFiles.map((item, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 group"
            >
              {item.type === 'video' ? (
                <video
                  src={item.url}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Overlay Badges */}
              <div className="absolute top-2 left-2 p-1 rounded-full bg-black/50 backdrop-blur-md text-cyan-400">
                {item.type === 'video' ? <Film size={12} /> : <ImageIcon size={12} />}
              </div>

              <button
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-[#fe2c55]/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {/* Add More Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-2xl bg-zinc-900/40 flex flex-col items-center justify-center text-cyan-400 hover:bg-zinc-900 transition-all border-none"
          >
            <Plus size={24} />
            <span className="text-[10px] font-bold mt-1">Add More</span>
          </button>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={onPrev}
          className="w-1/3 py-4 rounded-full font-bold text-xs uppercase tracking-wider text-zinc-400 bg-zinc-900 hover:bg-zinc-800 transition-all border-none"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={mediaFiles.length === 0}
          className="w-2/3 py-4 rounded-full font-black text-xs uppercase tracking-widest text-white bg-[#fe2c55] shadow-[0_0_15px_rgba(254,44,85,0.6)] disabled:opacity-40 disabled:shadow-none hover:shadow-[0_0_25px_rgba(254,44,85,0.9)] active:scale-95 transition-all"
        >
          Next: Editor →
        </button>
      </div>
    </div>
  );
};

export default Module02_MediaPicker;
