// One service for every API call.
//
// Why a service: components should not know about URLs or error shapes. They
// call a method and get either data or a readable Error. Because the API always
// answers errors as { error: "message" }, the 409 messages from the server
// ("already registered", "cannot be deleted") arrive here as err.message and can
// be shown to the user unchanged.
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { API_BASE } from './api-base';
import { Category, EventRec, NewRegistration, Registration } from './models';

export interface EventListResponse {
  count: number;
  events: EventRec[];
}

export interface RegistrationListResponse {
  count: number;
  registrations: Registration[];
}

@Injectable({ providedIn: 'root' })
export class CharityApi {
  private http = inject(HttpClient);
  private base = API_BASE;

  // Turn an HTTP failure into a plain Error that carries the API message.
  private fail(err: HttpErrorResponse) {
    const message = (err.error && err.error.error)
      ? String(err.error.error)
      : ('Request failed (HTTP ' + err.status + ')');
    return throwError(() => new Error(message));
  }

  // GET /api/events with optional filters (status, city, categoryId, date range).
  getEvents(filters: { [key: string]: string | number } = {}): Observable<EventListResponse> {
    const query = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        query.append(key, String(value));
      }
    });
    const qs = query.toString();
    return this.http
      .get<EventListResponse>(this.base + '/events' + (qs ? '?' + qs : ''))
      .pipe(catchError((err) => this.fail(err)));
  }

  // GET /api/events/:id
  getEvent(id: number): Observable<EventRec> {
    return this.http
      .get<EventRec>(this.base + '/events/' + id)
      .pipe(catchError((err) => this.fail(err)));
  }

  // GET /api/events/:id/registrations
  // The API already returns the newest registration first, so the component
  // must NOT sort again - the ordering is part of the API contract.
  getRegistrations(eventId: number): Observable<RegistrationListResponse> {
    return this.http
      .get<RegistrationListResponse>(this.base + '/events/' + eventId + '/registrations')
      .pipe(catchError((err) => this.fail(err)));
  }

  // GET /api/categories - fills the search page filter.
  getCategories(): Observable<{ count: number; categories: Category[] }> {
    return this.http
      .get<{ count: number; categories: Category[] }>(this.base + '/categories')
      .pipe(catchError((err) => this.fail(err)));
  }

  // GET /api/locations - fills the city filter.
  getLocations(): Observable<{ count: number; locations: string[] }> {
    return this.http
      .get<{ count: number; locations: string[] }>(this.base + '/locations')
      .pipe(catchError((err) => this.fail(err)));
  }

  // POST /api/registrations - 201 on success, 409 if this email already
  // registered for this event, 400 for invalid fields.
  createRegistration(
    payload: NewRegistration
  ): Observable<{ message: string; registration_id: number; tickets: number }> {
    return this.http
      .post<{ message: string; registration_id: number; tickets: number }>(
        this.base + '/registrations',
        payload
      )
      .pipe(catchError((err) => this.fail(err)));
  }
}
