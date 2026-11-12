-- =====================================================================
-- 커플핏 DB 구조 개선 (5~9번만)
--   5. 식단 반응 전용 테이블 (diet_reactions)
--   6. 커플 설정 / 개인 설정 테이블 (couple_settings, user_settings)
--   7. 미션 주 시작일 칸 (missions.week_start)
--   8. 미션 주차별 결과 테이블 (mission_results)
--   9. 수정 시각 칸 (updated_at) + 자동 갱신
-- ---------------------------------------------------------------------
-- * 새 테이블/칸을 "추가"하고 기존 데이터를 "복사"만 합니다. 지우는 것은 없습니다.
-- * 접근 정책은 기존 테이블과 똑같이 둡니다 (보안 1~4번은 이 SQL에 포함되지 않음).
-- * 여러 번 실행해도 됩니다.
-- * 앱은 v5.7부터 이 구조를 자동으로 인식합니다. 실행 전에는 예전 방식으로 동작합니다.
-- * 실행 위치: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- [9] 수정 시각(updated_at): 값이 바뀔 때마다 자동으로 현재 시각이 들어감
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'attendance', 'step_logs', 'weight_logs', 'diet_logs', 'missions',
    'cheers', 'reward_box', 'penalties', 'couple_pins', 'food_wishlist'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- [7] 미션 주 시작일 (지금은 created_at 을 '월요일 0시' 표식으로 빌려 쓰는 중)
-- ---------------------------------------------------------------------
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS week_start date;

-- created_at 이 '월요일 0시(한국 시간)' 표식인 미션만 week_start 로 복사
UPDATE public.missions
   SET week_start = (created_at AT TIME ZONE 'Asia/Seoul')::date
 WHERE week_start IS NULL
   AND extract(isodow FROM created_at AT TIME ZONE 'Asia/Seoul') = 1
   AND (created_at AT TIME ZONE 'Asia/Seoul')::time = '00:00:00';

-- ---------------------------------------------------------------------
-- [8] 미션 주차별 결과 (전적 계산용. 벌칙을 지워도 전적이 유지됨)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mission_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL,
    title varchar(100) NOT NULL,
    week_start date NOT NULL,
    bf_progress int NOT NULL DEFAULT 0,
    gf_progress int NOT NULL DEFAULT 0,
    winner_role varchar(20) CHECK (winner_role IN ('boyfriend', 'girlfriend')),  -- NULL = 무승부
    penalty varchar(150),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mission_results_week_idx ON public.mission_results (week_start DESC);

-- 지금까지의 전적: 미션에서 나온 벌칙 기록을 결과로 복사 (표가 비어 있을 때 한 번만)
INSERT INTO public.mission_results (mission_id, title, week_start, winner_role, penalty, created_at)
SELECT NULL,
       left(p.from_mission, 100),
       date_trunc('week', p.created_at AT TIME ZONE 'Asia/Seoul')::date,
       CASE p.loser_role WHEN 'boyfriend' THEN 'girlfriend' ELSE 'boyfriend' END,
       left(p.title, 150),
       p.created_at
  FROM public.penalties p
 WHERE p.from_mission IS NOT NULL
   AND p.from_mission <> '직접 등록한 벌칙'
   AND p.loser_role IN ('boyfriend', 'girlfriend')
   AND NOT EXISTS (SELECT 1 FROM public.mission_results);

-- ---------------------------------------------------------------------
-- [5] 식단 반응 (하트/댓글). 식단을 지우면 반응도 함께 지워짐
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.diet_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    diet_id uuid NOT NULL REFERENCES public.diet_logs(id) ON DELETE CASCADE,
    user_role varchar(20) NOT NULL CHECK (user_role IN ('boyfriend', 'girlfriend')),
    kind varchar(10) NOT NULL CHECK (kind IN ('heart', 'comment')),
    body varchar(200),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (kind = 'heart' OR (body IS NOT NULL AND length(body) > 0))
);
-- 하트는 한 식단에 한 사람당 1개
CREATE UNIQUE INDEX IF NOT EXISTS diet_reactions_one_heart
    ON public.diet_reactions (diet_id, user_role) WHERE kind = 'heart';
CREATE INDEX IF NOT EXISTS diet_reactions_diet_idx ON public.diet_reactions (diet_id);

-- 기존 반응 복사: cheers 의 '::diet:<식단ID>::내용' → diet_reactions
-- (cheers 쪽 원본은 지우지 않습니다. 새 버전 앱이 확인 후 정리합니다)
INSERT INTO public.diet_reactions (id, diet_id, user_role, kind, body, created_at)
SELECT c.id,
       d.id,
       c.sender_role,
       CASE WHEN r.body = '❤️' THEN 'heart' ELSE 'comment' END,
       CASE WHEN r.body = '❤️' THEN NULL ELSE left(r.body, 200) END,
       c.created_at
  FROM public.cheers c
 CROSS JOIN LATERAL (
       SELECT substring(c.message FROM '^::diet:([0-9a-fA-F-]{36})::') AS diet_id_text,
              substring(c.message FROM '^::diet:[^:]+::(.*)$')          AS body
       ) r
  JOIN public.diet_logs d ON d.id::text = lower(r.diet_id_text)
 WHERE c.message LIKE '::diet:%'
   AND c.sender_role IN ('boyfriend', 'girlfriend')
   AND r.body IS NOT NULL AND r.body <> ''
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- [6] 커플 공용 설정 (이름·사귄 날짜·걸음 목표). 항상 1줄만 존재
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.couple_settings (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    bf_name varchar(20) NOT NULL DEFAULT '오동원',
    gf_name varchar(20) NOT NULL DEFAULT '김해솔',
    dday_date date NOT NULL DEFAULT '2026-06-13',
    step_goal int NOT NULL DEFAULT 8000 CHECK (step_goal BETWEEN 1000 AND 50000),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 처음 만들 때만: 지금 couple_pins 의 cfg_ 줄에 있는 값을 가져와 1줄 생성
INSERT INTO public.couple_settings (id, bf_name, gf_name, dday_date, step_goal)
SELECT true,
       COALESCE((SELECT left(pin, 20) FROM public.couple_pins WHERE user_role = 'cfg_bf_name'), '오동원'),
       COALESCE((SELECT left(pin, 20) FROM public.couple_pins WHERE user_role = 'cfg_gf_name'), '김해솔'),
       COALESCE((SELECT pin::date FROM public.couple_pins
                  WHERE user_role = 'cfg_dday' AND pin ~ '^\d{4}-\d{2}-\d{2}$'), DATE '2026-06-13'),
       COALESCE((SELECT pin::int FROM public.couple_pins
                  WHERE user_role = 'cfg_step_goal' AND pin ~ '^\d{4,5}$'
                    AND pin::int BETWEEN 1000 AND 50000), 8000)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.couple_settings;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.couple_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 개인 설정 (목표 체중). 폰을 바꿔도 유지됨
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_role varchar(20) PRIMARY KEY CHECK (user_role IN ('boyfriend', 'girlfriend')),
    goal_weight_kg numeric(5,2) CHECK (goal_weight_kg BETWEEN 20 AND 300),
    updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.user_settings;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 새 테이블의 접근 정책: 기존 테이블과 동일하게 "전체 허용"
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mission_results', 'diet_reactions', 'couple_settings', 'user_settings']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all access to %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Allow all access to %s" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated', t);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- 실시간 동기화 대상에 새 테이블 추가
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mission_results', 'diet_reactions', 'couple_settings']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$$;

COMMIT;

-- API가 새 테이블/칸을 바로 인식하도록 알림
NOTIFY pgrst, 'reload schema';

-- 확인용 (따로 실행): 4줄이 나오면 성공
-- SELECT table_name FROM information_schema.tables
--  WHERE table_schema = 'public'
--    AND table_name IN ('mission_results', 'diet_reactions', 'couple_settings', 'user_settings');
