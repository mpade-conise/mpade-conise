// src/components/upload/useUploadState.js
import { useState } from 'react';

export const initialUploadState = {
  // Step 1: Content Type
  contentType: 'video', // 'photo' | 'carousel' | 'video' | 'reel' | 'story' | 'live' | 'audio' | 'marketplace'
  
  // Step 2 & 3: Media Files & Edits
  mediaFiles: [], // Array of File objects or preview URLs
  selectedMediaIndex: 0,
  edits: {
    crop: { x: 0, y: 0, aspect: 1 },
    filter: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    trim: { start: 0, end: 0 },
    volume: 100,
    playbackSpeed: 1,
  },

  // Step 4: AI Assistant Inputs/Outputs
  aiSuggestions: {
    caption: '',
    hashtags: [],
    suggestedMusic: null,
    seoKeywords: [],
  },

  // Step 5: Metadata (Caption, Hashtags, Location, Tagged Users)
  caption: '',
  hashtags: [],
  location: null,
  taggedUsers: [],
  coAuthors: [],

  // Step 6: Audience & Privacy
  audience: 'public', // 'public' | 'friends' | 'subscribers' | 'private'
  commentsMode: 'allow', // 'allow' | 'disable' | 'followers'
  allowDownloads: true,
  hideLikes: false,

  // Step 7: Monetization
  isPaidContent: false,
  priceCoins: 0,
  enableTips: true,
  affiliateLinks: [],

  // Step 8: Advanced Settings
  compressQuality: 'original', // 'original' | 'ai_compressed'
  scheduleTime: null, // ISO Date string or null for instant publish
  isDraft: false,

  // Step 9: Analytics & Submission
  predictionScore: null,
  isUploading: false,
  uploadProgress: 0,
};

export function useUploadState() {
  const [formData, setFormData] = useState(initialUploadState);
  const [currentStep, setCurrentStep] = useState(1);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateEdits = (editField, value) => {
    setFormData((prev) => ({
      ...prev,
      edits: { ...prev.edits, [editField]: value },
    }));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 9));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return {
    formData,
    currentStep,
    setCurrentStep,
    updateField,
    updateEdits,
    nextStep,
    prevStep,
  };
}
