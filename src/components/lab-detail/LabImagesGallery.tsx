import { useState } from 'react';
import { ZoomIn, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface LabImagesGalleryProps {
  images: string[];
  testName: string;
}

export default function LabImagesGallery({ images, testName }: LabImagesGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const nextImage = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">
          Lab Report Images
          <span className="text-sm font-normal text-slate-400 ml-2">({images.length})</span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((url, index) => (
            <button
              key={index}
              onClick={() => openLightbox(index)}
              className="group relative aspect-square rounded-lg overflow-hidden border-2 border-slate-800 hover:border-teal-500/50 transition-all hover:shadow-lg hover:shadow-teal-500/10"
            >
              <img
                src={url}
                alt={`${testName} report ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="p-3 rounded-full bg-teal-500/20 backdrop-blur-sm border border-teal-500/30">
                    <ZoomIn className="w-6 h-6 text-teal-400" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={selectedIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-7xl bg-slate-950/95 border-slate-800 p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>

            {selectedIndex !== null && (
              <>
                <img
                  src={images[selectedIndex]}
                  alt={`${testName} report ${selectedIndex + 1}`}
                  className="w-full h-auto max-h-[85vh] object-contain"
                />

                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full w-12 h-12"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full w-12 h-12"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/80 backdrop-blur-sm rounded-full border border-slate-700">
                      <p className="text-sm text-slate-300">
                        {selectedIndex + 1} / {images.length}
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}