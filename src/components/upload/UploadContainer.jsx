// src/components/upload/UploadContainer.jsx
import React from 'react';
import { useUploadState } from './useUploadState';
import Module01_ContentType from './Module01_ContentType';
import Module02_MediaPicker from './Module02_MediaPicker';
import Module03_MediaEditor from './Module03_MediaEditor';
import Module04_AIAssistant from './Module04_AIAssistant';
import Module05_CaptionHashtags from './Module05_CaptionHashtags';
import Module06_AudiencePrivacy from './Module06_AudiencePrivacy';
import Module07_Monetization from './Module07_Monetization';
import Module08_AdvancedSettings from './Module08_AdvancedSettings';
import Module09_PublishPrediction from './Module09_PublishPrediction';

const UploadContainer = ({ onClose, onComplete }) => {
  const {
    formData,
    currentStep,
    setCurrentStep,
    updateField,
    updateEdits,
    nextStep,
    prevStep,
  } = useUploadState();

  const renderModule = () => {
    switch (currentStep) {
      case 1:
        return (
          <Module01_ContentType
            selectedType={formData.contentType}
            onSelect={(type) => updateField('contentType', type)}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <Module02_MediaPicker
            mediaFiles={formData.mediaFiles}
            updateField={updateField}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <Module03_MediaEditor
            mediaFiles={formData.mediaFiles}
            edits={formData.edits}
            updateEdits={updateEdits}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 4:
        return (
          <Module04_AIAssistant
            formData={formData}
            updateField={updateField}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 5:
        return (
          <Module05_CaptionHashtags
            formData={formData}
            updateField={updateField}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 6:
        return (
          <Module06_AudiencePrivacy
            formData={formData}
            updateField={updateField}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 7:
        return (
          <Module07_Monetization
            formData={formData}
            updateField={updateField}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 8:
        return (
          <Module08_AdvancedSettings
            formData={formData}
            updateField={updateField}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 9:
        return (
          <Module09_PublishPrediction
            formData={formData}
            updateField={updateField}
            onPrev={prevStep}
            onComplete={onComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg h-[85vh] bg-zinc-950/90 rounded-[35px] shadow-[0_0_35px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col">
        
        {/* Top Stepper Indicator Bar */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <div className="flex gap-1 w-full max-w-[200px]">
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                onClick={() => setCurrentStep(index + 1)}
                className={`h-1 flex-1 rounded-full cursor-pointer transition-all ${
                  currentStep === index + 1
                    ? 'bg-[#fe2c55] shadow-[0_0_8px_#fe2c55]'
                    : index + 1 < currentStep
                    ? 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]'
                    : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>

          <span className="text-[10px] font-mono text-cyan-400 font-bold ml-2">
            0{currentStep}/09
          </span>
        </div>

        {/* Dynamic Module Content */}
        <div className="flex-1 overflow-hidden relative">{renderModule()}</div>
      </div>
    </div>
  );
};

export default UploadContainer;
