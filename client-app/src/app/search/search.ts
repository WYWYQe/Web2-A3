// Search page.
// The filter fields use ngModel with plain properties because they are just
// form state; the results are a signal because the template renders them.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CharityApi } from '../core/charity-api';
import { Category, EventRec } from '../core/models';
import { EventCard } from '../shared/event-card';

@Component({
  selector: 'app-search',
  imports: [FormsModule, EventCard],
  templateUrl: './search.html'
})
export class SearchPage implements OnInit {
  private api = inject(CharityApi);

  categories = signal<Category[]>([]);
  cities = signal<string[]>([]);
  results = signal<EventRec[]>([]);
  loading = signal(false);
  message = signal('');
  messageType = signal<'success' | 'error' | ''>('');

  // Filter state (two-way bound with ngModel).
  categoryId = '';
  city = '';
  dateFrom = '';
  dateTo = '';

  ngOnInit(): void {
    this.api.getCategories().subscribe({
      next: (r) => this.categories.set(r.categories),
      error: () => this.categories.set([])
    });

    this.api.getLocations().subscribe({
      next: (r) => this.cities.set(r.locations),
      error: () => this.cities.set([])
    });

    this.search();
  }

  search(): void {
    this.loading.set(true);
    this.api.getEvents({
      categoryId: this.categoryId,
      city: this.city,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo
    }).subscribe({
      next: (r) => {
        this.results.set(r.events);
        this.loading.set(false);
        this.message.set(r.count + ' event' + (r.count === 1 ? '' : 's') + ' found.');
        this.messageType.set(r.count > 0 ? 'success' : 'error');
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.message.set('Search failed: ' + err.message);
        this.messageType.set('error');
      }
    });
  }

  reset(): void {
    this.categoryId = '';
    this.city = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.search();
  }
}
