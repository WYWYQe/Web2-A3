// Registration page.
// Reactive Forms instead of ngModel so the validation rules live in one place
// in the TypeScript and can be reported to the user as a list.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CharityApi } from '../core/charity-api';
import { EventRec } from '../core/models';

@Component({
  selector: 'app-registration',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registration.html'
})
export class RegistrationPage implements OnInit {
  private api = inject(CharityApi);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  eventId = Number(this.route.snapshot.paramMap.get('id'));

  event = signal<EventRec | null>(null);
  submitting = signal(false);
  errorMessage = signal('');
  confirmed = signal<{ id: number; tickets: number; name: string } | null>(null);

  // True once the event has taken place: the form is replaced by a notice.
  get registrationClosed(): boolean {
    return this.event()?.event_status === 'past';
  }

  form = this.fb.group({
    user_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    user_email: ['', [Validators.required, Validators.email]],
    contact_phone: ['', [Validators.pattern(/^[\d\s()+-]{6,30}$/)]],
    tickets: [1, [Validators.required, Validators.min(1), Validators.max(20)]]
  });

  ngOnInit(): void {
    if (!this.eventId) {
      this.errorMessage.set('No event was selected. Please open an event first.');
      return;
    }
    this.api.getEvent(this.eventId).subscribe({
      next: (e) => this.event.set(e),
      error: (err: Error) => this.errorMessage.set('This event could not be loaded: ' + err.message)
    });
  }

  // Human readable list of what is wrong, used by both the alert and the page.
  problems(): string[] {
    const c = this.form.controls;
    const list: string[] = [];
    if (c.user_name.invalid) {
      list.push('Full name is required (2 to 100 characters).');
    }
    if (c.user_email.invalid) {
      list.push('A valid email address is required.');
    }
    if (c.contact_phone.invalid) {
      list.push('Phone number contains invalid characters.');
    }
    if (c.tickets.invalid) {
      list.push('Number of tickets must be between 1 and 20.');
    }
    return list;
  }

  totalPrice(): number {
    const e = this.event();
    if (!e) return 0;
    return Number(e.ticket_price) * Number(this.form.controls.tickets.value || 0);
  }

  // 'HH:MM:SS' -> 'HH:MM' (a local method, so no pipe has to be imported).
  formatTime(value: string | null): string {
    if (!value) return '';
    return String(value).slice(0, 5);
  }

  submit(): void {
    // Validate locally first, so an obviously invalid submission never reaches
    // the API, and tell the user exactly which fields are wrong.
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const list = this.problems();
      this.errorMessage.set(list.join(' '));
      alert('Please fix the following:\n- ' + list.join('\n- '));
      return;
    }

    const values = this.form.getRawValue();
    this.submitting.set(true);

    this.api.createRegistration({
      event_id: this.eventId,
      user_name: (values.user_name || '').trim(),
      user_email: (values.user_email || '').trim(),
      contact_phone: values.contact_phone ? values.contact_phone : null,
      tickets: Number(values.tickets)
    }).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.confirmed.set({
          id: result.registration_id,
          tickets: result.tickets,
          name: (values.user_name || '').trim()
        });
      },
      error: (err: Error) => {
        this.submitting.set(false);
        // 409 "already registered" and 400 validation messages arrive here.
        this.errorMessage.set(err.message);
        alert(err.message);
      }
    });
  }
}
