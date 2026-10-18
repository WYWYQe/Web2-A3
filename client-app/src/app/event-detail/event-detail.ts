// Event details page.
// Loads the event and its registrations in one shot. The registrations are
// rendered exactly in the order the API returned them (newest first). The
// ordering belongs to the API, so this page must not sort again: otherwise two
// views of the same data could disagree about which registration is the latest.
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { CharityApi } from '../core/charity-api';
import { EventRec, Registration } from '../core/models';
import { ForecastDay, WeatherService, weatherText } from '../core/weather';

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink],
  templateUrl: './event-detail.html'
})
export class EventDetailPage implements OnInit {
  private api = inject(CharityApi);
  private route = inject(ActivatedRoute);

  eventId = Number(this.route.snapshot.paramMap.get('id'));

  event = signal<EventRec | null>(null);
  registrations = signal<Registration[]>([]);
  loading = signal(true);
  regLoading = signal(true);
  error = signal('');

  // Weather forecast for the event day (Open-Meteo, external API).
  private weather = inject(WeatherService);
  forecast = signal<ForecastDay | null>(null);
  forecastMessage = signal('');
  forecastLoading = signal(false);

  // Total tickets sold for this event, derived from the registrations.
  totalTickets = computed(() =>
    this.registrations().reduce((sum, r) => sum + Number(r.tickets || 0), 0)
  );

  ngOnInit(): void {
    if (!this.eventId) {
      this.error.set('No event was selected. Please open an event from the home page.');
      this.loading.set(false);
      this.regLoading.set(false);
      return;
    }

    forkJoin({
      event: this.api.getEvent(this.eventId),
      registrations: this.api.getRegistrations(this.eventId)
    }).subscribe({
      next: (result) => {
        this.event.set(result.event);
        this.registrations.set(result.registrations.registrations);
        this.loading.set(false);
        this.regLoading.set(false);
        this.loadForecast(result.event);
      },
      error: (err: Error) => {
        this.error.set('This event could not be loaded: ' + err.message);
        this.loading.set(false);
        this.regLoading.set(false);
      }
    });
  }

  // Forecast for the day of the event.
  // Open-Meteo only publishes about 16 days ahead, so an event further away
  // than that simply has no forecast yet - we explain that instead of failing.
  private loadForecast(event: EventRec): void {
    const lat = event.latitude;
    const lon = event.longitude;

    if (lat === null || lat === undefined || lon === null || lon === undefined) {
      this.forecastMessage.set('No coordinates are recorded for this event, so no forecast is available.');
      return;
    }

    // A finished event has no forecast to show; saying "not available yet"
    // would be confusing.
    const today = new Date().toISOString().slice(0, 10);
    if (event.event_date < today) {
      this.forecastMessage.set('This event has already taken place, so no forecast is shown.');
      return;
    }

    this.forecastLoading.set(true);

    this.weather.getDaily(Number(lat), Number(lon)).subscribe({
      next: (daily) => {
        this.forecastLoading.set(false);

        const index = daily.time.indexOf(event.event_date);
        if (index < 0) {
          this.forecastMessage.set(
            'No forecast for ' + event.event_date +
            ' yet - Open-Meteo only forecasts about 16 days ahead.'
          );
          return;
        }

        this.forecast.set({
          date: daily.time[index],
          code: daily.weather_code[index],
          text: weatherText(daily.weather_code[index]),
          max: daily.temperature_2m_max[index],
          min: daily.temperature_2m_min[index]
        });
      },
      error: (err: Error) => {
        this.forecastLoading.set(false);
        this.forecastMessage.set('The forecast could not be loaded: ' + err.message);
      }
    });
  }

  formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value + 'T00:00:00');
    return date.toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  // 'HH:MM:SS' -> 'HH:MM'
  formatTime(value: string | null): string {
    if (!value) return '';
    return String(value).slice(0, 5);
  }

  formatPrice(value: number): string {
    const price = Number(value);
    if (!price) return 'Free entry';
    return '$' + price.toFixed(2);
  }

  formatDateTime(value: string): string {
    if (!value) return '-';
    const date = new Date(String(value).replace(' ', 'T'));
    return date.toLocaleString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
