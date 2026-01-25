import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FilterGroup = ({ title, items, selected, onToggle, isOpenDefault = false }) => {
    const [isOpen, setIsOpen] = useState(isOpenDefault);

    return (
        <div className="border-b border-black/5 py-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-widest hover:text-accent transition-colors mb-2"
            >
                <span>{title}</span>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-1 pt-2">
                            {items.map(item => (
                                <button
                                    key={item}
                                    onClick={() => onToggle(item)}
                                    className={`flex items-center gap-3 w-full text-left py-1.5 px-2 rounded-md transition-all text-sm group ${selected.includes(item)
                                        ? 'bg-accent/5 text-accent font-medium'
                                        : 'text-black/60 hover:bg-black/5 hover:text-black'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected.includes(item)
                                        ? 'bg-accent border-accent text-white'
                                        : 'border-black/20 group-hover:border-black/40'
                                        }`}>
                                        {selected.includes(item) && <Check size={10} strokeWidth={4} />}
                                    </div>
                                    <span className="truncate">{item}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const FilterSidebar = ({
    filters,
    selectedFilters,
    onFilterChange,
    onClearFilters,
    showMobile,
    onCloseMobile
}) => {
    // Desktop View
    const desktopContent = (
        <div className="hidden md:block w-64 shrink-0 pr-8 sticky top-32 h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-sm uppercase tracking-widest">Filters</h3>
                {(selectedFilters.genre.length > 0 || selectedFilters.label.length > 0 || selectedFilters.year.length > 0 || selectedFilters.condition.length > 0) && (
                    <button
                        onClick={onClearFilters}
                        className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                        <X size={12} /> Clear
                    </button>
                )}
            </div>

            <FilterGroup
                title="Genre"
                items={filters.genres}
                selected={selectedFilters.genre}
                onToggle={(val) => onFilterChange('genre', val)}
                isOpenDefault={true}
            />

            <FilterGroup
                title="Format"
                items={['LP', '12"', '7"']}
                selected={selectedFilters.format || []} // Use format instead of condition for now as it's more requested
                onToggle={(val) => onFilterChange('format', val)}
                isOpenDefault={true}
            />

            <FilterGroup
                title="Label"
                items={filters.labels}
                selected={selectedFilters.label}
                onToggle={(val) => onFilterChange('label', val)}
            />

            <FilterGroup
                title="Condition"
                items={['New', 'Mint', 'Near Mint', 'VG+', 'VG', 'Good']}
                selected={selectedFilters.condition}
                onToggle={(val) => onFilterChange('condition', val)}
            />

            <FilterGroup
                title="Release Year"
                items={filters.years}
                selected={selectedFilters.year}
                onToggle={(val) => onFilterChange('year', val)}
            />
        </div>
    );

    // Mobile Drawer
    const mobileContent = (
        <AnimatePresence>
            {showMobile && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCloseMobile}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 w-80 bg-background z-[70] shadow-2xl p-6 overflow-y-auto md:hidden border-l border-black/5"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-bold text-lg uppercase tracking-widest">Filters</h3>
                            <button onClick={onCloseMobile} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <FilterGroup
                                title="Genre"
                                items={filters.genres}
                                selected={selectedFilters.genre}
                                onToggle={(val) => onFilterChange('genre', val)}
                                isOpenDefault={true}
                            />
                            <FilterGroup
                                title="Label"
                                items={filters.labels}
                                selected={selectedFilters.label}
                                onToggle={(val) => onFilterChange('label', val)}
                            />
                            <FilterGroup
                                title="Condition"
                                items={['New', 'Mint', 'Near Mint', 'VG+', 'VG', 'Good']}
                                selected={selectedFilters.condition}
                                onToggle={(val) => onFilterChange('condition', val)}
                            />
                            <FilterGroup
                                title="Release Year"
                                items={filters.years}
                                selected={selectedFilters.year}
                                onToggle={(val) => onFilterChange('year', val)}
                            />
                        </div>

                        <div className="mt-8 pt-6 border-t border-black/5">
                            <button
                                onClick={onClearFilters}
                                className="w-full py-3 bg-black/5 text-black font-bold uppercase tracking-widest rounded-lg hover:bg-black/10 transition-colors mb-3"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={onCloseMobile}
                                className="w-full py-3 bg-accent text-white font-bold uppercase tracking-widest rounded-lg hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
                            >
                                Show Results
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return (
        <>
            {desktopContent}
            {mobileContent}
        </>
    );
};

export default FilterSidebar;
