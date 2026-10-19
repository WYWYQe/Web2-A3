// Admin root component.
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminNav } from './admin-nav/admin-nav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AdminNav],
  templateUrl: './app.html'
})
export class App {}
