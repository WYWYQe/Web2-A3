// Admin routes.
// One form component serves both create and edit; the presence of :id decides
// which mode it runs in.
import { Routes } from '@angular/router';

import { EventsListPage } from './events-list/events-list';
import { EventFormPage } from './event-form/event-form';
import { CategoriesPage } from './categories/categories';

export const routes: Routes = [
  { path: '', component: EventsListPage },
  { path: 'add', component: EventFormPage },
  { path: 'edit/:id', component: EventFormPage },
  { path: 'categories', component: CategoriesPage },
  { path: '**', redirectTo: '' }
];
