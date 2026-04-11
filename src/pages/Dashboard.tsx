import { motion } from 'framer-motion';
import AttendanceDashboard from '@/components/AttendanceDashboard';
import Navbar from '@/components/Navbar';

const Dashboard = () => {
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
