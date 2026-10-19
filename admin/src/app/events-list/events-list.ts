// Admin: event list (Read) with per-row delete.
// A delete can be refused with 409 when the event still has registrations. The
// server's explanation is then shown to the user verbatim, because a silently
// ignored failure would look like the button did nothing at all.
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminApi } from '../core/charity-api';
import { EventRec } from '../core/models';

@Component({
  selector: 'app-events-list',
  imports: [RouterLink],
  templateUrl: './events-list.html'
})
export class EventsListPage implements OnInit {
  private api = inject(AdminApi);

  events = signal<EventRec[]>([]);
  loading = signal(true);
  message = signal('');
  messageType = signal<'success' | 'error' | ''>('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    // includeSuspended=1: the admin must see every event, including the ones
    // that are hidden from the public site.
    this.api.getEvents({ includeSuspended: 1 }).subscribe({
      next: (result) => {
        this.events.set(result.events);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.show('Could not load events: ' + err.message, 'error');
      }
    });
  }

  remove(event: EventRec): void {
    const ok = confirm('Delete "' + event.event_name + '" (id ' + event.event_id + ')?');
    if (!ok) return;

    this.api.deleteEvent(event.event_id).subscribe({
      next: () => {
        this.show('Event ' + event.event_id + ' was deleted.', 'success');
        this.load();
      },
      // 409 -> "Event 1 cannot be deleted because it has 3 registration(s)."
      error: (err: Error) => this.show('Delete failed: ' + err.message, 'error')
    });
  }

  show(text: string, type: 'success' | 'error'): void {
    this.message.set(text);
    this.messageType.set(type);
  }

  formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value + 'T00:00:00');
    return date.toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  formatPrice(value: number): string {
    const price = Number(value);
    if (!price) return 'Free';
    return '$' + price.toFixed(2);
  }
}
