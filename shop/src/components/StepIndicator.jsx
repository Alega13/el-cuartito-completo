import React from 'react';

const StepIndicator = ({ currentStep, steps }) => {
    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((step, index) => (
                <React.Fragment key={step}>
                    <div className="flex items-center">
                        <div className={`
                            text-sm font-medium uppercase tracking-wide
                            ${index + 1 === currentStep
                                ? 'text-orange-600 font-bold'
                                : index + 1 < currentStep
                                    ? 'text-gray-600'
                                    : 'text-gray-400'
                            }
                        `}>
                            {step}
                        </div>
                    </div>
                    {index < steps.length - 1 && (
                        <div className="text-gray-400 mx-2">›</div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

export default StepIndicator;
