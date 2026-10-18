// Root component.
// Holds the shared navigation and the router outlet only. Mounting the menu in
// this one place means every routed page shows it without repeating the markup.
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Nav } from './nav/nav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Nav],
  templateUrl: './app.html'
})
export class App {}
