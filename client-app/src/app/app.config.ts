// Application providers.
// provideRouter  : turns on routing (the menu and the router outlet need it).
// provideHttpClient : required before HttpClient can be injected anywhere.
// Keep this list minimal so it works on any Angular v20+ project.
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient()
  ]
};
