// Admin: category management.
// Categories cannot be deleted while events still use them - the API returns
// 409 and the reason is shown to the user.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AdminApi } from '../core/charity-api';
import { Category } from '../core/models';

@Component({
  selector: 'app-categories',
  imports: [ReactiveFormsModule],
  templateUrl: './categories.html'
})
export class CategoriesPage implements OnInit {
  private api = inject(AdminApi);
  private fb = inject(FormBuilder);

  categories = signal<Category[]>([]);
  loading = signal(true);
  saving = signal(false);
  message = signal('');
  messageType = signal<'success' | 'error' | ''>('');

  form = this.fb.group({
    category_name: ['', [Validators.required, Validators.maxLength(60)]],
    description: ['', [Validators.maxLength(255)]]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getCategories().subscribe({
      next: (r) => {
        this.categories.set(r.categories);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.show('Could not load categories: ' + err.message, 'error');
      }
    });
  }

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      alert('A category name is required (up to 60 characters).');
      return;
    }

    const v = this.form.getRawValue();
    this.saving.set(true);

    this.api.createCategory({
      category_name: (v.category_name || '').trim(),
      description: v.description ? v.description.trim() : null
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset({ category_name: '', description: '' });
        this.show('Category added.', 'success');
        this.load();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.show('Could not add the category: ' + err.message, 'error');
      }
    });
  }

  remove(category: Category): void {
    const ok = confirm('Delete the category "' + category.category_name + '"?');
    if (!ok) return;

    this.api.deleteCategory(category.category_id).subscribe({
      next: () => {
        this.show('Category deleted.', 'success');
        this.load();
      },
      // 409 -> "Category 4 cannot be deleted because 3 event(s) use it."
      error: (err: Error) => this.show('Delete failed: ' + err.message, 'error')
    });
  }

  show(text: string, type: 'success' | 'error'): void {
    this.message.set(text);
    this.messageType.set(type);
  }
}
