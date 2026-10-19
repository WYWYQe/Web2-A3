// Admin: create and edit one event.
// A single component serves both modes: with /edit/:id it loads and updates an
// existing event, with /add it creates a new one.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminApi } from '../core/charity-api';
import { Category, EventRec, Organisation } from '../core/models';

@Component({
  selector: 'app-event-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './event-form.html'
})
export class EventFormPage implements OnInit {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  eventId = Number(this.route.snapshot.paramMap.get('id')) || 0;
  isEdit = this.eventId > 0;

  categories = signal<Category[]>([]);
  organisations = signal<Organisation[]>([]);
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');

  form = this.fb.group({
    event_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    event_date: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
    start_time: [''],
    end_time: [''],
    venue: [''],
    address: [''],
    city: [''],
    category_id: [null as number | null, [Validators.required]],
    org_id: [null as number | null, [Validators.required]],
    ticket_price: [0, [Validators.min(0)]],
    goal_amount: [0, [Validators.min(0)]],
    summary: [''],
    description: [''],
    purpose: [''],
    image_url: [''],
    latitude: [null as number | null],
    longitude: [null as number | null]
  });

  ngOnInit(): void {
    this.api.getCategories().subscribe({
      next: (r) => this.categories.set(r.categories),
      error: (err: Error) => this.errorMessage.set('Could not load categories: ' + err.message)
    });

    this.api.getOrganisations().subscribe({
      next: (r) => this.organisations.set(r.organisations),
      error: (err: Error) => this.errorMessage.set('Could not load organisations: ' + err.message)
    });

    if (this.isEdit) {
      this.loading.set(true);
      this.api.getEvent(this.eventId).subscribe({
        next: (e) => {
          this.form.patchValue({
            event_name: e.event_name,
            event_date: e.event_date,
            start_time: e.start_time ? e.start_time.slice(0, 5) : '',
            end_time: e.end_time ? e.end_time.slice(0, 5) : '',
            venue: e.venue ?? '',
            address: e.address ?? '',
            city: e.city ?? '',
            category_id: e.category_id,
            org_id: e.org_id,
            ticket_price: Number(e.ticket_price),
            goal_amount: Number(e.goal_amount),
            summary: e.summary ?? '',
            description: e.description ?? '',
            purpose: e.purpose ?? '',
            image_url: e.image_url ?? '',
            latitude: e.latitude ?? null,
            longitude: e.longitude ?? null
          });
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.errorMessage.set('Could not load the event: ' + err.message);
        }
      });
    }
  }

  problems(): string[] {
    const c = this.form.controls;
    const list: string[] = [];
    if (c.event_name.invalid) list.push('Event name is required (3 to 150 characters).');
    if (c.event_date.invalid) list.push('Date is required and must be a real date.');
    if (c.category_id.invalid) list.push('Choose a category.');
    if (c.org_id.invalid) list.push('Choose an organisation.');
    if (c.ticket_price.invalid) list.push('Ticket price must be zero or greater.');
    if (c.goal_amount.invalid) list.push('Goal amount must be zero or greater.');
    return list;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const list = this.problems();
      this.errorMessage.set(list.join(' '));
      alert('Please fix the following:\n- ' + list.join('\n- '));
      return;
    }

    const v = this.form.getRawValue();
    const toNumberOrNull = (value: number | null): number | null =>
      (value === null || value === undefined || String(value).trim() === '') ? null : Number(value);

    const payload = {
      event_name: (v.event_name || '').trim(),
      event_date: v.event_date,
      start_time: v.start_time || null,
      end_time: v.end_time || null,
      venue: v.venue || null,
      address: v.address || null,
      city: v.city || null,
      category_id: Number(v.category_id),
      org_id: Number(v.org_id),
      ticket_price: Number(v.ticket_price || 0),
      goal_amount: Number(v.goal_amount || 0),
      summary: v.summary || null,
      description: v.description || null,
      purpose: v.purpose || null,
      image_url: v.image_url || null,
      latitude: toNumberOrNull(v.latitude),
      longitude: toNumberOrNull(v.longitude)
    };

    this.saving.set(true);

    const request = this.isEdit
      ? this.api.updateEvent(this.eventId, payload as Partial<EventRec>)
      : this.api.createEvent(payload as Partial<EventRec>);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/']);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.errorMessage.set(err.message);
        alert(err.message);
      }
    });
  }
}
