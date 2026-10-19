// Admin API service.
//
// Same error-handling approach as the client app: the API answers failures as
// { error: "message" }, so the important 409 messages
// ("Event 1 cannot be deleted because it has 3 registration(s).")
// arrive in components as err.message and can be shown to the user unchanged.
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { API_BASE } from './api-base';
import { Category, EventRec, Organisation } from './models';

export interface EventListResponse {
  count: number;
  events: EventRec[];
}

export interface CategoryListResponse {
  count: number;
  categories: Category[];
}

export interface OrganisationListResponse {
  count: number;
  organisations: Organisation[];
}

export interface CategoryInput {
  category_name: string;
  description: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);
  private base = API_BASE;

  private fail(err: HttpErrorResponse) {
    const message = (err.error && err.error.error)
      ? String(err.error.error)
      : ('Request failed (HTTP ' + err.status + ')');
    return throwError(() => new Error(message));
  }

  // ------------------------------------------------------------------
  // Events
  // ------------------------------------------------------------------

  // includeSuspended=1 lets the admin see every event, including the ones
  // hidden from the public site.
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

  // includeSuspended=1 so the edit form can open an event that the public
  // site hides.
  getEvent(id: number): Observable<EventRec> {
    return this.http
      .get<EventRec>(this.base + '/events/' + id + '?includeSuspended=1')
      .pipe(catchError((err) => this.fail(err)));
  }

  createEvent(payload: Partial<EventRec>): Observable<EventRec> {
    return this.http
      .post<EventRec>(this.base + '/events', payload)
      .pipe(catchError((err) => this.fail(err)));
  }

  updateEvent(id: number, payload: Partial<EventRec>): Observable<EventRec> {
    return this.http
      .put<EventRec>(this.base + '/events/' + id, payload)
      .pipe(catchError((err) => this.fail(err)));
  }

  // 204 on success, 409 when the event still has registrations.
  deleteEvent(id: number): Observable<void> {
    return this.http
      .delete<void>(this.base + '/events/' + id)
      .pipe(catchError((err) => this.fail(err)));
  }

  // ------------------------------------------------------------------
  // Categories
  // ------------------------------------------------------------------

  getCategories(): Observable<CategoryListResponse> {
    return this.http
      .get<CategoryListResponse>(this.base + '/categories')
      .pipe(catchError((err) => this.fail(err)));
  }

  createCategory(payload: CategoryInput): Observable<Category> {
    return this.http
      .post<Category>(this.base + '/categories', payload)
      .pipe(catchError((err) => this.fail(err)));
  }

  updateCategory(id: number, payload: Partial<CategoryInput>): Observable<Category> {
    return this.http
      .put<Category>(this.base + '/categories/' + id, payload)
      .pipe(catchError((err) => this.fail(err)));
  }

  // 204 on success, 409 when events still use this category.
  deleteCategory(id: number): Observable<void> {
    return this.http
      .delete<void>(this.base + '/categories/' + id)
      .pipe(catchError((err) => this.fail(err)));
  }

  // ------------------------------------------------------------------
  // Organisations (used to fill the dropdown on the event form)
  // ------------------------------------------------------------------

  getOrganisations(): Observable<OrganisationListResponse> {
    return this.http
      .get<OrganisationListResponse>(this.base + '/organisations')
      .pipe(catchError((err) => this.fail(err)));
  }
}
