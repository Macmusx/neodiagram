import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {Diagram}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DiagramComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'client';
}
