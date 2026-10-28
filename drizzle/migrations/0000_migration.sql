CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  channel text NOT NULL,
  tier text DEFAULT 'Micro',
  existing_customer boolean DEFAULT true,
  owner_name text, phone text, cnic_number text, cnic_dob text, cnic_father_name text,
  cnic_address text, cnic_address_confidence text, cnic_scanned boolean DEFAULT false,
  business_name text, business_address text, category text, gps_lat double precision, gps_lng double precision,
  shop_photo boolean DEFAULT false,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  risk_band text, queue_reason text, decision_note text, decided_by text,
  declared_name text, name_match_score double precision, name_override boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.checks (
  id bigserial PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  name text NOT NULL, mode text NOT NULL, status text NOT NULL, message text, reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.checks TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.checks_id_seq TO service_role;
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.fbr_atl (
  cnic text PRIMARY KEY, active boolean NOT NULL, snapshot_date text NOT NULL
);
GRANT ALL ON public.fbr_atl TO service_role;
ALTER TABLE public.fbr_atl ENABLE ROW LEVEL SECURITY;

INSERT INTO public.fbr_atl VALUES
('35202-1234567-1', true, '2026-10-26'),
('35202-7654321-9', true, '2026-10-26'),
('42101-9999999-7', false, '2026-10-26'),
('61101-4455667-3', true, '2026-10-26'),
('35201-1122334-5', false, '2026-10-26');

INSERT INTO public.cases (reference, channel, tier, existing_customer, owner_name, cnic_number, business_name, products, status, risk_band, queue_reason) VALUES
('MO-261022-100011','field-agent','Small',true,'Hassan Yousuf','35201-5566778-2','Lahore Mobile Mart','["Android POS"]','queued','Medium risk','Android POS always routes to review — not a straight-through product.'),
('MO-261023-100022','branch','Registered',true,'Saeed Ahmed','35202-3344556-7','Saeed Electronics (Pvt) Ltd','["Android POS","E-commerce gateway"]','queued','Medium risk','E-commerce gateway always routes to review — not a straight-through product.'),
('MO-261024-100033','self-service','Micro',true,'Nasir Chaudhry','35202-7788990-4','Chaudhry Fabrics','["Raast QR"]','queued','High risk','AML / PEP / Sanctions did not pass (Hit — needs review) — needs manual review.'),
('MO-261025-100044','field-agent','Micro',false,'Ayesha Khan','42101-1231234-1','Khan Pharmacy','["Raast QR","Soundbox"]','queued','Low risk','New-to-bank customer — straight-through rule only covers existing customers.'),
('MO-261026-100055','self-service','Small',true,'Bilal Aslam','61101-9988776-5','Bilal General Store','["SoftPOS"]','queued','Medium risk','SoftPOS always routes to review — not a straight-through product.');