// Home page.
// Two independent API calls are started together and awaited together, so the
// page waits for the slower request instead of waiting for both in sequence.
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { CharityApi } from '../core/charity-api';
import { EventRec } from '../core/models';
import { EventCard } from '../shared/event-card';

@Component({
  selector: 'app-home',
  imports: [EventCard],
  templateUrl: './home.html'
})
export class HomePage implements OnInit {
  private api = inject(CharityApi);

  upcoming = signal<EventRec[]>([]);
  past = signal<EventRec[]>([]);
  loading = signal(true);
  message = signal('');
  messageType = signal<'success' | 'error' | ''>('');

  ngOnInit(): void {
    forkJoin({
      upcoming: this.api.getEvents({ status: 'upcoming' }),
      past: this.api.getEvents({ status: 'past' })
    }).subscribe({
      next: (result) => {
        this.upcoming.set(result.upcoming.events);
        // Most recent past event first.
        this.past.set(result.past.events.slice().reverse());
        this.loading.set(false);
        this.message.set(
          result.upcoming.count + ' upcoming event' +
          (result.upcoming.count === 1 ? '' : 's') +
          ' found. Pick one to see the full details.'
        );
        this.messageType.set('success');
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.message.set(
          'Sorry, the events could not be loaded: ' + err.message +
          ' - please make sure the API server is running on port 3000.'
        );
        this.messageType.set('error');
      }
    });
  }
}
