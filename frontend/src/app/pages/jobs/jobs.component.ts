import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Job {
  title: string;
  company: string;
  location: string;
  postedAt?: string;
  workFromHome: boolean;
  applyLink: string;
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.css']
})
export class JobsComponent implements OnInit {
  jobs: Job[] = [];
  currentIndex = 0;

  ngOnInit() {
    const jobsData = localStorage.getItem('jobs');
    if (jobsData) {
      this.jobs = JSON.parse(jobsData);
    }
  }

  get currentJob(): Job | null {
    return this.jobs[this.currentIndex] || null;
  }

  navigate(direction: 'next' | 'prev') {
    if (direction === 'next' && this.currentIndex < this.jobs.length - 1) {
      this.currentIndex++;
    } else if (direction === 'prev' && this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  goToJob(index: number) {
    this.currentIndex = index;
  }

  isDotActive(index: number): boolean {
    return this.currentIndex === index;
  }
}
