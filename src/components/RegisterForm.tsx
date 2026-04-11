import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loadModels, detectFaceWithDescriptor } from '@/lib/faceDetection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const RegisterForm = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const init = async () => {
      await loadModels();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLoading(false);
    };
    init();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const captureFace = async () => {
    if (!videoRef.current) return;
    setCapturing(true);

    try {
      const detection = await detectFaceWithDescriptor(videoRef.current);
      if (detection) {
        setDescriptor(Array.from(detection.descriptor));
        setCaptured(true);
        toast.success('Face captured successfully!');
      } else {
        toast.error('No face detected. Please try again.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to capture face.');
    }
    setCapturing(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name.');
      return;
    }
    if (!descriptor) {
      toast.error('Please capture your face first.');
      return;
    }

    try {
      const { error } = await supabase.from('registered_users').insert({
        name: name.trim(),
        email: email.trim() || null,
        face_descriptor: descriptor,
      });

      if (error) throw error;

      toast.success(`${name} registered successfully!`);
      setName('');
      setEmail('');
      setDescriptor(null);
      setCaptured(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to register user.');
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      {/* Camera */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative rounded-2xl overflow-hidden border-2 border-border bg-foreground/5 w-full">
          <video
            ref={videoRef}
            className="w-full rounded-2xl"
            style={{ transform: 'scaleX(-1)' }}
            playsInline
            muted
          />
          {captured && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center bg-success/20 backdrop-blur-sm"
            >
              <div className="bg-success text-success-foreground rounded-full p-4">
                <CheckCircle2 className="w-12 h-12" />
              </div>
            </motion.div>
          )}
        </div>
        <Button
          onClick={captureFace}
          disabled={loading || capturing || captured}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading models...</>
          ) : capturing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Capturing...</>
          ) : captured ? (
            <><CheckCircle2 className="w-4 h-4 mr-2" />Face Captured</>
          ) : (
            <><Camera className="w-4 h-4 mr-2" />Capture Face</>
          )}
        </Button>
        {captured && (
          <Button variant="outline" onClick={() => { setCaptured(false); setDescriptor(null); }}>
            Retake
          </Button>
        )}
      </div>

      {/* Form */}
      <div className="glass-card rounded-2xl p-6 space-y-6">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">User Details</h2>
          <p className="text-sm text-muted-foreground mt-1">Capture face and fill in details to register.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter email"
            />
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={!captured || !name.trim()} className="w-full" size="lg">
          <UserPlus className="w-4 h-4 mr-2" />
          Register User
        </Button>
      </div>
    </div>
  );
};

export default RegisterForm;
