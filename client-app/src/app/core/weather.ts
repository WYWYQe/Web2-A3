// Weather service (external API).
//
// The event details page shows the forecast for the day of the event.
// Coordinates come from the events table (latitude / longitude), which were
// added for this feature.
//
// Open-Meteo is free and needs no key, and it allows browser calls (CORS).
// It only publishes about 7 days ahead by default, so an event further away than
// that simply has no forecast yet - the page says so instead of failing.
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

export interface OpenMeteoDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

export interface ForecastDay {
  date: string;
  code: number;
  text: string;
  max: number;
  min: number;
}

// The WMO weather codes that Open-Meteo returns, translated to plain English.
const WEATHER_TEXT: { [code: number]: string } = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

export function weatherText(code: number): string {
  return WEATHER_TEXT[code] || 'Unknown conditions';
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private http = inject(HttpClient);

  // One request per location per session: revisiting an event does not hit the
  // external API again.
  private cache: { [key: string]: Observable<OpenMeteoDaily> } = {};

  getDaily(latitude: number, longitude: number): Observable<OpenMeteoDaily> {
    const key = latitude + ',' + longitude;

    if (!this.cache[key]) {
      const url = 'https://api.open-meteo.com/v1/forecast'
        + '?latitude=' + latitude
        + '&longitude=' + longitude
        + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
        + '&timezone=Australia%2FSydney';

      this.cache[key] = this.http.get<{ daily: OpenMeteoDaily }>(url).pipe(
        map((response) => response.daily),
        shareReplay(1),
        catchError((err: HttpErrorResponse) =>
          throwError(() => new Error('weather service unavailable (HTTP ' + err.status + ')'))
        )
      );
    }

    return this.cache[key];
  }
}
