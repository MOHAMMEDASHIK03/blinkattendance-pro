import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AttendanceDashboard from '@/components/AttendanceDashboard';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin');

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        navigate('/admin');
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    checkAdmin();
  }, [navigate]);

  if (loading || !authorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-heading text-4xl font-bold text-foreground mb-3">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Monitor attendance records and manage registered users.
          </p>
        </motion.div>
        <AttendanceDashboard />
      </main>
    </div>
  );
};

export default Dashboard;
