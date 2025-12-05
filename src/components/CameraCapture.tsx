import { useState, useRef, useCallback } from 'react';
import { Camera, X, RotateCw, Check, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  label?: string;
  disabled?: boolean;
  allowMultiple?: boolean;
}

export default function CameraCapture({ onCapture, label = 'Take Photo', disabled = false, allowMultiple = false }: CameraCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast.error('Unable to access camera. Please check permissions.');
      console.error('Camera error:', error);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const handleOpen = () => {
    setIsOpen(true);
    setCapturedImage(null);
    startCamera();
  };

  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      const file = dataURLtoFile(capturedImage, `photo_${Date.now()}.jpg`);
      onCapture(file);
      handleClose();
      toast.success('Photo captured successfully!');
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    stopCamera();
    setTimeout(() => startCamera(), 100);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      let validFiles = 0;
      let invalidFiles = 0;

      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          onCapture(file);
          validFiles++;
        } else {
          invalidFiles++;
        }
      });

      if (validFiles > 0) {
        toast.success(`${validFiles} image${validFiles > 1 ? 's' : ''} uploaded successfully!`);
      }
      if (invalidFiles > 0) {
        toast.error(`${invalidFiles} file${invalidFiles > 1 ? 's' : ''} skipped (not image${invalidFiles > 1 ? 's' : ''})`);
      }
    }
    // Reset input value to allow uploading the same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleOpen}
          variant="outline"
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
          disabled={disabled}
        >
          <Camera className="w-4 h-4 mr-2" />
          {label}
        </Button>
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
          disabled={disabled}
          title={allowMultiple ? "Upload multiple images" : "Upload image"}
        >
          <Upload className="w-4 h-4" />
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={allowMultiple}
        onChange={handleFileUpload}
        className="hidden"
      />

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capture Photo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {!capturedImage ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-2">
              {!capturedImage ? (
                <>
                  <Button
                    onClick={capturePhoto}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture
                  </Button>
                  <Button
                    onClick={switchCamera}
                    variant="outline"
                    className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={confirmPhoto}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Use Photo
                  </Button>
                  <Button
                    onClick={retakePhoto}
                    variant="outline"
                    className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}