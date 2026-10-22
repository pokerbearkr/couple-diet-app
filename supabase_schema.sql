-- ========================================================
-- 커플 다이어트 & 운동 메이트 (Couple Diet App) - Supabase DB Schema
-- ========================================================

-- 1. 커플 방 테이블 (초대 코드로 2명을 하나로 연결)
CREATE TABLE IF NOT EXISTS public.couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code VARCHAR(12) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 프로필 테이블 (남자친구 / 여자친구)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    nickname VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'boyfriend' or 'girlfriend'
    theme_color VARCHAR(20) DEFAULT '#FFB5A7',
    avatar_emoji VARCHAR(10) DEFAULT '🐰',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 운동 출석 체크 테이블 (양쪽 모두 완료 시 하트)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    workout_type VARCHAR(100) DEFAULT '일반 운동',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, date)
);

-- 4. 걸음 수 및 걷기 기록 테이블
CREATE TABLE IF NOT EXISTS public.step_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    step_count INT DEFAULT 0,
    distance_km NUMERIC(5,2) DEFAULT 0,
    walking_minutes INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, date)
);

-- 5. 체중 기록장 (실제 몸무게는 본인만 접근, 상대방에게는 변화량 delta만 공유)
CREATE TABLE IF NOT EXISTS public.weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL,       -- 실제 체중 (본인만 확인)
    baseline_weight NUMERIC(5,2) NOT NULL, -- 시작 기준 체중
    delta_kg NUMERIC(5,2) GENERATED ALWAYS AS (weight_kg - baseline_weight) STORED, -- 변화량 (상대방 공유용)
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, date)
);

-- 6. 식단 사진 일기 테이블 (칼로리 없이 사진 + 한줄 메모)
CREATE TABLE IF NOT EXISTS public.diet_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('아침', '점심', '저녁', '간식', '야식')),
    photo_url TEXT,
    memo VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 주간 미션 대결 테이블
CREATE TABLE IF NOT EXISTS public.missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    target_count INT NOT NULL DEFAULT 5,
    unit VARCHAR(20) DEFAULT '회',
    user1_progress INT DEFAULT 0,
    user2_progress INT DEFAULT 0,
    penalty_reward VARCHAR(100) DEFAULT '진 사람이 주말에 커피 사기 ☕',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    winner VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. 칭찬 및 응원 메시지 테이블
CREATE TABLE IF NOT EXISTS public.cheers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id REFERENCES public.couples(id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL,
    sender_name VARCHAR(50) NOT NULL,
    message VARCHAR(200) NOT NULL,
    emoji VARCHAR(20) DEFAULT '💖',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. 보상 상자 / 데이트 쿠폰 테이블 (하트 목표 달성 시 열림)
CREATE TABLE IF NOT EXISTS public.reward_box (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    required_hearts INT NOT NULL, -- 필요 하트 개수
    is_unlocked BOOLEAN DEFAULT false,
    is_used BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 기본 보상 상자 쿠폰 샘플 데이터
-- (Supabase 설정 시 각 커플 생성 후 트리거 또는 앱에서 자동 등록)
