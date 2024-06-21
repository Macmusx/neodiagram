import { Component, ElementRef, ViewChild, viewChild } from '@angular/core';

export enum 

@Component({
  selector: 'app-diagram',
  standalone: true,
  imports: [],
  templateUrl: './diagram.component.html',
  styleUrl: './diagram.component.scss'
})
export class DiagramComponent {

  private canvasElem = viewChild.required<ElementRef>('diagramCanvas');

  get canvas(): HTMLCanvasElement {
    return this.canvasElem().nativeElement
  }

  currentlyHeldItem: ;

  addSquare() {
    const ctx = this.canvas.getContext('2d');
    ctx?.beginPath();
    ctx?.rect(20, 20, 150, 100);
    ctx?.stroke();
  }
}
