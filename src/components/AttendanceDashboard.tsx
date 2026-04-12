import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, Clock, Calendar, Trash2, LogOut, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AttendanceRecord {
  id: string;
  user_name: string;
  marked_at: string;
  status: string;
  user_id: string | null;
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
  const navigate = useNavigate();

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
    const channel = supabase
      .channel('attendance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName}?`)) return;
    const { error } = await supabase.from('registered_users').delete().eq('id', userId);
    if (error) {
      toast.error('Failed to remove user');
    } else {
      toast.success(`${userName} removed`);
      fetchData();
    }
  };

  const handleClearAllAttendance = async () => {
    if (!confirm('Clear ALL attendance records? This cannot be undone.')) return;
    // Delete via edge function or use admin delete — for now we need a migration to allow delete
    const { error } = await supabase.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      toast.error('Failed to clear records: ' + error.message);
    } else {
      toast.success('All attendance records cleared');
      fetchData();
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
    if (error) {
      toast.error('Failed to delete record');
    } else {
      toast.success('Record deleted');
      fetchData();
    }
  };

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
      {/* Admin actions bar */}
      <div className="flex items-center justify-between">
        <Button variant="destructive" size="sm" onClick={handleClearAllAttendance} className="gap-2">
          <Trash2 className="w-4 h-4" />
          Clear All Attendance
        </Button>
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

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
                <div className="flex items-center gap-2">
                  <span className="status-badge-success">Present</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord(record.id)} className="text-destructive hover:text-destructive">
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id, user.name)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceDashboard;
