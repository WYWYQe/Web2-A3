// One event card.
// Used by both the home page and the search page, so an event looks the same
// wherever it is listed and this markup exists in one place only.
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EventRec } from '../core/models';

@Component({
  selector: 'app-event-card',
  imports: [RouterLink],
  templateUrl: './event-card.html'
})
export class EventCard {
  event = input.required<EventRec>();

  // 'YYYY-MM-DD' -> 'Wed, 14 Oct 2026'.
  // The trailing time keeps the date in local time instead of UTC.
  formatDate(value: string): string {
    if (!value) return '';
    const date = new Date(value + 'T00:00:00');
    return date.toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  formatPrice(value: number): string {
    const price = Number(value);
    if (!price) return 'Free entry';
    return '$' + price.toFixed(2);
  }
}
