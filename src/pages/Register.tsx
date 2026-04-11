import { motion } from 'framer-motion';
import RegisterForm from '@/components/RegisterForm';
import Navbar from '@/components/Navbar';

const Register = () => {
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
            Register New User
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Capture your face and register to use blink-based attendance.
          </p>
        </motion.div>
        <RegisterForm />
      </main>
    </div>
  );
};

export default Register;
