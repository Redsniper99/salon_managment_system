-- Split Payment Support Migration
-- Adds payment_breakdown column to invoices table to support multiple payment methods per transaction

-- Add payment_breakdown column
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS payment_breakdown JSONB DEFAULT '[]'::jsonb;

-- Migrate existing data: convert single payment_method to payment_breakdown format
UPDATE public.invoices
SET payment_breakdown = jsonb_build_array(
  jsonb_build_object(
    'method', payment_method,
    'amount', total
  )
)
WHERE payment_breakdown = '[]'::jsonb;

-- Add check constraint to ensure payment_breakdown is a valid array
ALTER TABLE public.invoices
ADD CONSTRAINT payment_breakdown_valid 
CHECK (
  payment_breakdown IS NULL OR 
  jsonb_typeof(payment_breakdown) = 'array'
);

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.payment_breakdown IS 
'JSONB array storing payment method breakdown. Format: [{"method": "Cash", "amount": 3000}, {"method": "Card", "amount": 2000}]';
