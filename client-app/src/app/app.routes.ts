// Route table.
// The event identifier travels as a route parameter, which is cleaner than a
// query string: /event/3 and /register/3.
import { Routes } from '@angular/router';

import { HomePage } from './home/home';
import { SearchPage } from './search/search';
import { EventDetailPage } from './event-detail/event-detail';
import { RegistrationPage } from './registration/registration';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'search', component: SearchPage },
  { path: 'event/:id', component: EventDetailPage },
  { path: 'register/:id', component: RegistrationPage },
  { path: '**', redirectTo: '' }
];
