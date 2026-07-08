-- Events-Trigger auch auf DELETE erweitern
drop trigger if exists notify_events_push on public.events;
create trigger notify_events_push
after insert or update or delete on public.events
for each row execute function public.notify_familyhub_push();
