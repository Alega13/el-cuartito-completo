import React from 'react';
import { Check } from 'lucide-react';

const StepIndicator = ({ currentStep, steps }) => {
    return (
        <div className="flex items-center justify-center mb-16 pt-8">
            <div className="flex items-start">
                {steps.map((step, index) => {
                    const stepNum = index + 1;
                    const isPast = stepNum < currentStep;
                    const isCurrent = stepNum === currentStep;
                    const isFuture = stepNum > currentStep;

                    return (
                        <React.Fragment key={step}>
                            {/* Step Item */}
                            <div className="flex flex-col items-center relative w-16">
                                {/* Circle */}
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium z-10 transition-colors
                                    ${(isPast || isCurrent) 
                                        ? 'bg-[#1a1a1a] text-white border-2 border-[#1a1a1a]' 
                                        : 'bg-white text-gray-300 border-2 border-gray-200'
                                    }
                                `}>
                                    {isPast ? <Check size={14} strokeWidth={3} /> : stepNum}
                                </div>
                                {/* Label */}
                                <span className={`
                                    absolute top-10 text-[10px] uppercase tracking-widest whitespace-nowrap
                                    ${(isPast || isCurrent) ? 'text-[#1a1a1a] font-bold' : 'text-gray-300 font-medium'}
                                `}>
                                    {step}
                                </span>
                            </div>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div className="w-12 sm:w-24 h-px bg-gray-200 mt-4 mx-2" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default StepIndicator;
