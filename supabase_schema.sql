-- ========================================================
-- 커플 다이어트 & 운동 메이트 (Couple Fit) - Supabase DB Schema
-- ========================================================

-- 1. 커플 방 테이블
CREATE TABLE IF NOT EXISTS public.couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code VARCHAR(12) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 프로필 테이블
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    nickname VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    theme_color VARCHAR(20) DEFAULT '#FFB5A7',
    avatar_emoji VARCHAR(10) DEFAULT '🐰',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 운동 출석 체크 테이블
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
    user_role VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    workout_type VARCHAR(100) DEFAULT '일반 운동',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_role, date)
);

-- 4. 걸음 수 및 걷기 기록 테이블
CREATE TABLE IF NOT EXISTS public.step_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
    user_role VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    step_count INT DEFAULT 0,
    distance_km NUMERIC(5,2) DEFAULT 0,
    walking_minutes INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_role, date)
);

-- 5. 체중 기록장 (실제 몸무게 및 변화량)
CREATE TABLE IF NOT EXISTS public.weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
    user_role VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL,
    baseline_weight NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_role, date)
);

-- 6. 식단 사진 일기 테이블
CREATE TABLE IF NOT EXISTS public.diet_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
    user_role VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    photo_url TEXT,
    memo VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 주간 미션 대결 테이블
CREATE TABLE IF NOT EXISTS public.missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL,
    target_count INT NOT NULL DEFAULT 5,
    unit VARCHAR(20) DEFAULT '회',
    user1_progress INT DEFAULT 0,
    user2_progress INT DEFAULT 0,
    penalty_reward VARCHAR(100) DEFAULT '진 사람이 주말에 디저트 사기 🍰',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. 칭찬 및 응원 메시지 테이블
CREATE TABLE IF NOT EXISTS public.cheers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
    sender_role VARCHAR(20) NOT NULL,
    sender_name VARCHAR(50) NOT NULL,
    message VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. 보상 상자 / 데이트 쿠폰 테이블
CREATE TABLE IF NOT EXISTS public.reward_box (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL,
    required_hearts INT NOT NULL,
    is_unlocked BOOLEAN DEFAULT false,
    is_used BOOLEAN DEFAULT false,
    used_at DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. 커플 벌칙 수행 및 관리 테이블
CREATE TABLE IF NOT EXISTS public.penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    loser_role VARCHAR(20) NOT NULL,
    loser_name VARCHAR(50) NOT NULL,
    target_name VARCHAR(50) NOT NULL,
    from_mission VARCHAR(100),
    is_completed BOOLEAN DEFAULT false,
    completed_at DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- RLS (보안 정책) 활성화 및 커플 앱 읽기/쓰기 권한 허용
-- ========================================================
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_box ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to couples" ON public.couples;
DROP POLICY IF EXISTS "Allow all access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all access to attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow all access to step_logs" ON public.step_logs;
DROP POLICY IF EXISTS "Allow all access to weight_logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Allow all access to diet_logs" ON public.diet_logs;
DROP POLICY IF EXISTS "Allow all access to missions" ON public.missions;
DROP POLICY IF EXISTS "Allow all access to cheers" ON public.cheers;
DROP POLICY IF EXISTS "Allow all access to reward_box" ON public.reward_box;
DROP POLICY IF EXISTS "Allow all access to penalties" ON public.penalties;

CREATE POLICY "Allow all access to couples" ON public.couples FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to step_logs" ON public.step_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to weight_logs" ON public.weight_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to diet_logs" ON public.diet_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to missions" ON public.missions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cheers" ON public.cheers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to reward_box" ON public.reward_box FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to penalties" ON public.penalties FOR ALL USING (true) WITH CHECK (true);

-- 실시간 (Realtime) 동기화 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.step_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weight_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.diet_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cheers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_box;
ALTER PUBLICATION supabase_realtime ADD TABLE public.penalties;
