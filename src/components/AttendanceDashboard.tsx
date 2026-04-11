import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AttendanceRecord {
  id: string;
  user_name: string;
  marked_at: string;
  status: string;
}

interface RegisteredUser {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
}

const AttendanceDashboard = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [{ data: att }, { data: usr }] = await Promise.all([
      supabase.from('attendance_records').select('*').order('marked_at', { ascending: false }).limit(50),
      supabase.from('registered_users').select('id, name, email, created_at'),
    ]);
    setRecords(att || []);
    setUsers(usr || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Real-time subscription
    const channel = supabase
      .channel('attendance-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_records' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.marked_at.startsWith(today));

  const stats = [
    { label: 'Registered Users', value: users.length, icon: Users, color: 'text-primary' },
    { label: 'Present Today', value: todayRecords.length, icon: CheckCircle2, color: 'text-success' },
    { label: 'Total Records', value: records.length, icon: Clock, color: 'text-accent' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-xl p-5"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-secondary ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Today's Attendance */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-lg font-bold text-foreground">Today's Attendance</h2>
          </div>
        </div>
        {todayRecords.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No attendance records for today yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {todayRecords.map((record, i) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-heading font-bold text-primary text-sm">
                      {record.user_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{record.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.marked_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <span className="status-badge-success">Present</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Registered Users */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-lg font-bold text-foreground">Registered Users</h2>
          </div>
        </div>
        {users.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No users registered yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="font-heading font-bold text-accent text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email || 'No email'}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceDashboard;
