import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent {
  teamMembers = [
    { name: 'Sajjad Amjad', role: 'AI Developer' },
    { name: 'Talha Hasnain', role: 'Web Developer' },
    { name: 'Muhammad Ahmed', role: 'Web Developer' }
  ];
}
