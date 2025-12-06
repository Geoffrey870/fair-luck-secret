-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  wallet_address text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create raffle status enum
CREATE TYPE public.raffle_status AS ENUM ('active', 'completed', 'cancelled');

-- Create raffles table
CREATE TABLE public.raffles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  prize_amount numeric NOT NULL,
  entry_fee numeric NOT NULL,
  max_entries integer NOT NULL,
  expire_at timestamptz NOT NULL,
  status public.raffle_status DEFAULT 'active' NOT NULL,
  winner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Raffles are viewable by everyone"
  ON public.raffles FOR SELECT
  USING (true);

CREATE POLICY "Users can create raffles"
  ON public.raffles FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own raffles"
  ON public.raffles FOR UPDATE
  USING (auth.uid() = creator_id);

-- Create raffle_entries table
CREATE TABLE public.raffle_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id uuid REFERENCES public.raffles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  encrypted_amount text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(raffle_id, user_id)
);

ALTER TABLE public.raffle_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view entries for raffles"
  ON public.raffle_entries FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own entries"
  ON public.raffle_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_raffles_updated_at
  BEFORE UPDATE ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_raffles_status ON public.raffles(status);
CREATE INDEX idx_raffles_creator ON public.raffles(creator_id);
CREATE INDEX idx_raffles_expire ON public.raffles(expire_at);
CREATE INDEX idx_entries_raffle ON public.raffle_entries(raffle_id);
CREATE INDEX idx_entries_user ON public.raffle_entries(user_id);