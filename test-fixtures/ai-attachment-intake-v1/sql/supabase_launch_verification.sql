-- Easy Harness launch verification checks.
-- Run this in Supabase Dashboard > SQL Editor against the production/staging project you intend to use.
-- It does not expose secrets and does not mutate data.

-- 1) Applied migrations.
select *
from supabase_migrations.schema_migrations
order by version;

-- 2) RLS status for public app tables.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname in (
    'profiles',
    'requests',
    'request_messages',
    'quotes',
    'orders',
    'order_messages',
    'storage_objects',
    'attachments',
    'payments',
    'payment_events',
    'shipping_rate_quotes',
    'shipments',
    'tracking_events',
    'notifications',
    'notification_deliveries',
    'audit_logs',
    'integration_events',
    'service_countries'
  )
order by c.relname;

-- 3) Policy inventory for app tables and request attachment storage bucket.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where (schemaname = 'public')
  or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- 4) Private request attachment bucket config.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
from storage.buckets
where id = 'request-attachments';

-- 5) Recent storage objects in the private request attachment bucket.
select
  bucket_id,
  name,
  owner,
  metadata,
  created_at,
  updated_at
from storage.objects
where bucket_id = 'request-attachments'
order by created_at desc
limit 20;

-- 6) Recent app-level attachment links.
select
  a.id,
  a.name,
  a.mime_type,
  a.size_bytes,
  a.request_id,
  a.order_id,
  so.bucket,
  so.object_path,
  so.status as storage_status,
  a.created_at
from public.attachments a
left join public.storage_objects so on so.id = a.storage_object_id
order by a.created_at desc
limit 20;

-- 7) Recent AI request results. For the newest test request, inspect source fields:
-- image_count_sent_to_model, qwen_file_extract_count, cad_metadata_count,
-- parser_needed_count, attachment_observation_count.
select
  request_number,
  title,
  status,
  check_status,
  files_count,
  check_result -> 'source' as ai_source,
  check_result -> 'attachment_observations' as attachment_observations,
  updated_at
from public.requests
order by updated_at desc
limit 10;

-- 8) Latest request messages with attachment blocks.
select
  r.request_number,
  rm.author_role,
  rm.body,
  rm.blocks,
  rm.created_at
from public.request_messages rm
join public.requests r on r.id = rm.request_id
order by rm.created_at desc
limit 20;

