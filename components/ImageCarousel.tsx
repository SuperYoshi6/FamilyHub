import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageCarouselProps {
    images?: string[];
    fallbackImage?: string; // Legacy support
    className?: string;
    aspectRatioClass?: string; // e.g. "h-48"
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images = [], fallbackImage, className = "", aspectRatioClass = "h-48" }) => {
    const allImages = [...images];
    if (fallbackImage && !allImages.includes(fallbackImage)) {
        allImages.unshift(fallbackImage);
    }

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    if (allImages.length === 0) return null;

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % allImages.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };

    return (
        <div className={`relative w-full overflow-hidden group ${aspectRatioClass} ${className}`}>
            <img 
                src={allImages[currentIndex]} 
                alt={`Slide ${currentIndex + 1}`} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
            />
            
            {allImages.length > 1 && (
                <>
                    <button 
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button 
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronRight size={20} />
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                        {allImages.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                            />
                        ))}
                    </div>
                </>
            )}

            {isFullscreen && (
                <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-fade-in" onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
                        className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-full transition-colors z-[1001]"
                    >
                        <X size={28} />
                    </button>
                    
                    <img 
                        src={allImages[currentIndex]} 
                        alt={`Slide Full ${currentIndex + 1}`} 
                        className="max-w-[95vw] max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {allImages.length > 1 && (
                        <>
                            <button 
                                onClick={prevImage}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors z-[1001]"
                            >
                                <ChevronLeft size={32} />
                            </button>
                            <button 
                                onClick={nextImage}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors z-[1001]"
                            >
                                <ChevronRight size={32} />
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImageCarousel;
