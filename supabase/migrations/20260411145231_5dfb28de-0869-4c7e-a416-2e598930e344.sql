
CREATE TABLE public.registered_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  face_descriptor JSONB NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.registered_users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'present'
);

ALTER TABLE public.registered_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read registered users" ON public.registered_users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert registered users" ON public.registered_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete registered users" ON public.registered_users FOR DELETE USING (true);

CREATE POLICY "Anyone can read attendance" ON public.attendance_records FOR SELECT USING (true);
CREATE POLICY "Anyone can insert attendance" ON public.attendance_records FOR INSERT WITH CHECK (true);
