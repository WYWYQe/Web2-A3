// Shared navigation.
// Mounted once in app.html, so every routed page shows the same menu.
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.html'
})
export class Nav {}
