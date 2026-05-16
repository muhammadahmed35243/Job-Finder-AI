import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { JobsComponent } from './pages/jobs/jobs.component';
import { UploadComponent } from './pages/upload/upload.component';
import { AboutComponent } from './pages/about/about.component';
import { ContactComponent } from './pages/contact/contact.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'jobs', component: JobsComponent },
  { path: 'upload', component: UploadComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent }
];
