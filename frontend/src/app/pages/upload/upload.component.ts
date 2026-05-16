import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  loading = false;

  constructor(private router: Router) {}

  async onFileSubmit(event: Event) {
    event.preventDefault();
    const fileInput = (document.getElementById('pdfFile') as HTMLInputElement);
    const file = fileInput?.files?.[0];

    if (!file) {
      alert('Please upload a PDF file.');
      return;
    }

    this.loading = true;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to process the PDF.');
      }

      const uploadResult = await uploadResponse.json();

      const jobsResponse = await fetch('/find-jobs', { method: 'POST' });
      if (!jobsResponse.ok) {
        throw new Error('Failed to fetch job recommendations.');
      }

      const jobsResult = await jobsResponse.json();

      localStorage.setItem('jobs', JSON.stringify(jobsResult.jobs));

      this.router.navigate(['/jobs']);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      this.loading = false;
    }
  }
}
