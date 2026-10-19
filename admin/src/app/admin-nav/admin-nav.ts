// Admin navigation.
// Mounted once in app.html: every routed page then shows the same menu without
// repeating the markup in each page template.
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-nav.html'
})
export class AdminNav {}
