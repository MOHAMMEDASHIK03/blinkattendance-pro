import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { loadModels, detectFaceWithDescriptor, getEyeAspectRatio, compareFaces, BLINK_THRESHOLD, MATCH_THRESHOLD } from '@/lib/faceDetection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Status = 'loading' | 'ready' | 'detecting' | 'blink_detected' | 'matched' | 'not_found';

const CameraFeed = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Loading face detection models...');
  const [matchedUser, setMatchedUser] = useState<string | null>(null);
  const [eyesClosed, setEyesClosed] = useState(false);
  const blinkCountRef = useRef(0);
  const wasClosedRef = useRef(false);
  const processingRef = useRef(false);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const init = async () => {
      try {
        await loadModels();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('ready');
        setMessage('Position your face and blink to mark attendance');
      } catch (err) {
        setMessage('Camera access denied or models failed to load');
        console.error(err);
      }
    };

    init();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const detectLoop = useCallback(async () => {
    if (!videoRef.current || processingRef.current || status === 'loading') {
      animationRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    if (status === 'matched' || status === 'not_found') {
      animationRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    processingRef.current = true;

    try {
      const detection = await detectFaceWithDescriptor(videoRef.current);

      if (detection) {
        const ear = getEyeAspectRatio(detection.landmarks);
        const isClosed = ear < BLINK_THRESHOLD;
        setEyesClosed(isClosed);

        if (isClosed && !wasClosedRef.current) {
          wasClosedRef.current = true;
        } else if (!isClosed && wasClosedRef.current) {
          wasClosedRef.current = false;
          blinkCountRef.current += 1;

          if (blinkCountRef.current >= 2) {
            setStatus('blink_detected');
            setMessage('Blink detected! Checking identity...');

            // Match face
            const { data: users } = await supabase
              .from('registered_users')
              .select('*');

            if (users && users.length > 0) {
              let bestMatch: { name: string; id: string; distance: number } | null = null;

              for (const user of users) {
                const descriptor = user.face_descriptor as number[];
                const dist = compareFaces(detection.descriptor, descriptor);
                if (dist < MATCH_THRESHOLD && (!bestMatch || dist < bestMatch.distance)) {
                  bestMatch = { name: user.name, id: user.id, distance: dist };
                }
              }

              if (bestMatch) {
                // Check if already marked today
                const today = new Date().toISOString().split('T')[0];
                const { data: existing } = await supabase
                  .from('attendance_records')
                  .select('*')
                  .eq('user_id', bestMatch.id)
                  .gte('marked_at', today + 'T00:00:00')
                  .lte('marked_at', today + 'T23:59:59');

                if (existing && existing.length > 0) {
                  setStatus('matched');
                  setMatchedUser(bestMatch.name);
                  setMessage(`${bestMatch.name}, attendance already marked today!`);
                  toast.info(`${bestMatch.name}, you're already marked for today!`);
                } else {
                  await supabase.from('attendance_records').insert({
                    user_id: bestMatch.id,
                    user_name: bestMatch.name,
                    status: 'present',
                  });
                  setStatus('matched');
                  setMatchedUser(bestMatch.name);
                  setMessage(`✓ Attendance marked for ${bestMatch.name}!`);
                  toast.success(`Attendance marked for ${bestMatch.name}!`);
                }
              } else {
                setStatus('not_found');
                setMessage('Face not recognized. Please register first.');
                toast.error('User not registered. Please go to Register page.');
              }
            } else {
              setStatus('not_found');
              setMessage('No users registered yet. Please register first.');
              toast.error('No users in database. Please register first.');
            }

            // Reset after 4 seconds
            setTimeout(() => {
              setStatus('ready');
              setMessage('Position your face and blink to mark attendance');
              setMatchedUser(null);
              blinkCountRef.current = 0;
            }, 4000);
          }
        }

        setStatus(prev => (prev === 'loading' ? 'ready' : prev));
      }
    } catch (err) {
      console.error('Detection error:', err);
    }

    processingRef.current = false;
    animationRef.current = requestAnimationFrame(detectLoop);
  }, [status]);

  useEffect(() => {
    if (status !== 'loading') {
      animationRef.current = requestAnimationFrame(detectLoop);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [detectLoop, status]);

  const statusIcon = {
    loading: <Loader2 className="w-5 h-5 animate-spin" />,
    ready: <Eye className="w-5 h-5" />,
    detecting: <Eye className="w-5 h-5" />,
    blink_detected: <EyeOff className="w-5 h-5" />,
    matched: <CheckCircle2 className="w-5 h-5" />,
    not_found: <XCircle className="w-5 h-5" />,
  };

  const statusColor = {
    loading: 'bg-muted text-muted-foreground',
    ready: 'bg-primary/10 text-primary',
    detecting: 'bg-primary/10 text-primary',
    blink_detected: 'bg-accent/10 text-accent',
    matched: 'bg-success/10 text-success',
    not_found: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-border bg-foreground/5">
        <video
          ref={videoRef}
          className="w-full max-w-lg rounded-2xl mirror"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Scan line animation */}
        {status === 'ready' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
          </div>
        )}

        {/* Blink indicator */}
        <AnimatePresence>
          {eyesClosed && status === 'ready' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-4 right-4"
            >
              <div className="bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                Eyes closed
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status overlay for results */}
        <AnimatePresence>
          {(status === 'matched' || status === 'not_found') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`rounded-2xl p-8 text-center ${
                  status === 'matched' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                }`}
              >
                {status === 'matched' ? (
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-3" />
                ) : (
                  <XCircle className="w-16 h-16 mx-auto mb-3" />
                )}
                <p className="text-lg font-heading font-bold">
                  {status === 'matched' ? `Welcome, ${matchedUser}!` : 'Not Recognized'}
                </p>
                <p className="text-sm mt-1 opacity-90">
                  {status === 'matched' ? 'Attendance marked' : 'Please register first'}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      <motion.div
        layout
        className={`flex items-center gap-3 px-5 py-3 rounded-xl ${statusColor[status]}`}
      >
        {statusIcon[status]}
        <span className="text-sm font-medium">{message}</span>
      </motion.div>

      {status === 'ready' && (
        <p className="text-muted-foreground text-sm text-center max-w-md">
          Blink your eyes <strong>twice</strong> to mark attendance. Make sure your face is clearly visible.
        </p>
      )}
    </div>
  );
};

export default CameraFeed;
