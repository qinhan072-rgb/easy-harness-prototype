-- Private request attachment bucket and client upload policies.
-- Object paths are scoped by the uploader id:
--   <auth.uid()>/requests/<request-number>/<attachment-id>-<filename>

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'request-attachments',
  'request-attachments',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists request_attachments_upload_own_folder on storage.objects;
create policy request_attachments_upload_own_folder
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'request-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists request_attachments_read_own_or_staff on storage.objects;
create policy request_attachments_read_own_or_staff
on storage.objects for select
to authenticated
using (
  bucket_id = 'request-attachments'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_staff_or_admin()
  )
);

drop policy if exists request_attachments_update_own_folder on storage.objects;
create policy request_attachments_update_own_folder
on storage.objects for update
to authenticated
using (
  bucket_id = 'request-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'request-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists storage_objects_customer_insert_own_path on public.storage_objects;
create policy storage_objects_customer_insert_own_path
on public.storage_objects for insert
to authenticated
with check (
  bucket = 'request-attachments'
  and split_part(object_path, '/', 1) = auth.uid()::text
);

drop policy if exists storage_objects_customer_update_own_path on public.storage_objects;
create policy storage_objects_customer_update_own_path
on public.storage_objects for update
to authenticated
using (
  bucket = 'request-attachments'
  and split_part(object_path, '/', 1) = auth.uid()::text
)
with check (
  bucket = 'request-attachments'
  and split_part(object_path, '/', 1) = auth.uid()::text
);
