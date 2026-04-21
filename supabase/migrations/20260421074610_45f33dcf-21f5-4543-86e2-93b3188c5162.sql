-- Add sort_order column
ALTER TABLE public.gallery_items 
ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Backfill: assign sort_order based on created_at DESC (newest = 0)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 AS rn
  FROM public.gallery_items
)
UPDATE public.gallery_items g
SET sort_order = o.rn
FROM ordered o
WHERE g.id = o.id;

-- Index for fast sorting
CREATE INDEX idx_gallery_items_sort_order ON public.gallery_items(sort_order);

-- Add UPDATE policy for admins
CREATE POLICY "Admins can update gallery items"
ON public.gallery_items
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));