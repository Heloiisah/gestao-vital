import { Component, Input } from '@angular/core';

@Component({
  standalone: true,
  imports: [],
  selector: 'app-page-skeleton',
  styleUrl: './page-skeleton.scss',
  templateUrl: './page-skeleton.html',
})
export class PageSkeleton {
  @Input() variant: 'dashboard' | 'table' | 'forecast' = 'dashboard';
}
