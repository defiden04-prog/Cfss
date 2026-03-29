-- Run this in your Supabase SQL Editor to create the necessary tables for the Solana DApp

-- 1. Referral Table: Stores user referral codes and earnings
CREATE TABLE IF NOT EXISTS public."Referral" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_wallet TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    total_earnings DOUBLE PRECISION DEFAULT 0,
    referral_count INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'bronze',
    tier_earnings JSONB DEFAULT '{"bronze": 0, "silver": 0, "gold": 0, "platinum": 0}',
    created_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. ReferralUsage Table: Tracks every scan where a referral was used
CREATE TABLE IF NOT EXISTS public."ReferralUsage" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_wallet TEXT NOT NULL,
    referral_code TEXT NOT NULL REFERENCES public."Referral"(referral_code),
    referrer_wallet TEXT NOT NULL,
    fee_paid DOUBLE PRECISION NOT NULL,
    referrer_earned DOUBLE PRECISION NOT NULL,
    tx_signature TEXT UNIQUE NOT NULL,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. ScanSchedule Table: Stores user preferences for auto-scanning
CREATE TABLE IF NOT EXISTS public."ScanSchedule" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT false,
    frequency TEXT DEFAULT 'weekly',
    notify_email TEXT,
    next_run TIMESTAMP WITH TIME ZONE,
    auto_claim_count INTEGER DEFAULT 0,
    total_auto_claimed DOUBLE PRECISION DEFAULT 0,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. ScanNotification Table: Stores history of scans and notifications
CREATE TABLE IF NOT EXISTS public."ScanNotification" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    type TEXT NOT NULL, -- 'claim_complete', 'scan_complete', 'info', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    sol_amount DOUBLE PRECISION DEFAULT 0,
    read BOOLEAN DEFAULT false,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS (Optional, but recommended. For now we assume open for testing)
ALTER TABLE public."Referral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReferralUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ScanSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ScanNotification" ENABLE ROW LEVEL SECURITY;

-- Create open policies for testing (Update these for production!)
CREATE POLICY "Allow all for testing" ON public."Referral" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for testing" ON public."ReferralUsage" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for testing" ON public."ScanSchedule" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for testing" ON public."ScanNotification" FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public."Referral";
ALTER PUBLICATION supabase_realtime ADD TABLE public."ReferralUsage";
ALTER PUBLICATION supabase_realtime ADD TABLE public."ScanSchedule";
ALTER PUBLICATION supabase_realtime ADD TABLE public."ScanNotification";
