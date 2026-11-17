-- A survey has no rating until the customer submits a response.
alter table public.surveys
  alter column rating drop not null;
