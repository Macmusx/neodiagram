import {AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {NgClass} from "@angular/common";

export const ElementType = {
  square: 'square',
}

@Component({
  selector: 'app-diagram',
  standalone: true,
  imports: [
    NgClass
  ],
  templateUrl: './diagram.component.html',
  styleUrl: './diagram.component.scss'
})
export class DiagramComponent implements AfterViewInit, OnInit {
  @ViewChild('diagramCanvas') diagramCanvas: ElementRef<HTMLCanvasElement> | undefined;
  currentlySelectedNewElement: string | undefined;
  elementType = ElementType;
  originalMousePosition: { x: number | undefined, y: number | undefined } = {
    x: undefined,
    y: undefined
  }
  private elements: { x: number, y: number, width: number, height: number }[] = [];
  private topLeftCoordinatesMapping = {
    x: 0,
    y: 0
  }
  private drag: boolean = false;
  private zoomFactor = 4;
  private originalHeight: number | undefined;
  private mouseDown = false;

  get nativeElement(): HTMLCanvasElement {
    const nativeElement = this.diagramCanvas?.nativeElement;
    if (!nativeElement) throw new Error('Native element not found');
    return nativeElement;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.setCanvasResolution();
  }

  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    event.preventDefault();
  }

  @HostListener('body:wheel', ['$event'])
  onWheel(event: WheelEvent) {
    if (event.target !== this.nativeElement) return;
    if (event.deltaY > 0) {
      this.onZoomOut();
    } else {
      this.onZoomIn();
    }
  }

  ngOnInit() {
    const persistedElements = localStorage.getItem('elements');
    if (persistedElements) {
      this.elements = JSON.parse(persistedElements);
    }
  }

  ngAfterViewInit(): void {
    this.originalHeight = this.nativeElement.parentElement?.clientHeight;
    this.setCanvasResolution();
  }

  setCanvasResolution() {
    const parent = this.nativeElement.parentElement;

    if (parent) {
      this.nativeElement.width = parent.clientWidth * this.zoomFactor;
      this.nativeElement.height = (this.originalHeight || 1) * this.zoomFactor;
    }

    this.redrawCanvas();
  }

  onSelectItem(text: string) {
    this.currentlySelectedNewElement = text;
  }

  onSelectNothing() {
    this.currentlySelectedNewElement = undefined;
  }

  redrawCanvas() {
    const context = this.nativeElement.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, this.nativeElement.width, this.nativeElement.height);

    const gridOffsetX = this.topLeftCoordinatesMapping.x % 100;
    const gridOffsetY = this.topLeftCoordinatesMapping.y % 100;

    const pixelsX = Math.floor(Math.abs(this.topLeftCoordinatesMapping.x) / 100);
    const pixelsY = Math.floor(Math.abs(this.topLeftCoordinatesMapping.y) / 100);

    if (this.zoomFactor < 5) {
      for (let i = gridOffsetX, indexX = 0; i < this.nativeElement.width; i += 100, indexX++) {
        for (let j = gridOffsetY, indexY = 0; j < this.nativeElement.height; j += 100, indexY++) {
          context.fillStyle = ((indexX - pixelsX) + (indexY - pixelsY)) % 2 === 0 ? 'darkgray' : 'dimgray';
          context.fillRect(i, j, 12, 12);
        }
      }
    }

    this.elements.forEach(element => {
      context.fillStyle = 'blue';
      const x = element.x + this.topLeftCoordinatesMapping.x;
      const y = element.y + this.topLeftCoordinatesMapping.y;
      context?.fillRect(x, y, element.width, element.height);
    })
  }

  drawSquare(x: number, y: number) {
    const rectSize = 200; // Square size

    const context = this.nativeElement.getContext('2d');
    if (context) {
      context.fillStyle = 'blue';
      context.fillRect(x - this.nativeElement.offsetLeft - rectSize / 2, y - this.nativeElement.offsetTop - rectSize / 2, rectSize, rectSize);
      this.elements.push({
        x: x - this.nativeElement.offsetLeft - rectSize / 2 - this.topLeftCoordinatesMapping.x,
        y: y - this.nativeElement.offsetTop - rectSize / 2 - this.topLeftCoordinatesMapping.y,
        width: rectSize,
        height: rectSize
      });
    }
  }

  onCanvasClick(event: MouseEvent) {
    if (this.currentlySelectedNewElement) {
      const rect = this.nativeElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      switch (this.currentlySelectedNewElement) {
        case ElementType.square:
          this.drawSquare(x * this.zoomFactor, y * this.zoomFactor);
          break;
      }
    }

    this.onSave();
  }

  onCanvasMouseDown(event: MouseEvent) {
    this.mouseDown = true;
    this.originalMousePosition = {
      x: event.clientX,
      y: event.clientY
    }
  }

  onCanvasMouseMove(event: MouseEvent) {
    if (this.mouseDown) {
      this.nativeElement.style.cursor = 'grabbing';
      this.drag = true;
      const dx = event.clientX - (this.originalMousePosition.x || 0);
      const dy = event.clientY - (this.originalMousePosition.y || 0);
      this.originalMousePosition = {
        x: event.clientX,
        y: event.clientY
      }
      this.topLeftCoordinatesMapping = {
        x: this.topLeftCoordinatesMapping.x + dx * this.zoomFactor,
        y: this.topLeftCoordinatesMapping.y + dy * this.zoomFactor
      }
      this.redrawCanvas();
    }
  }

  onCanvasMouseUp(event: MouseEvent) {
    this.mouseDown = false;
    if (!this.drag) {
      this.onCanvasClick(event);
      return;
    }
    this.drag = false;
    this.nativeElement.style.cursor = 'default';
  }

  onMouseLeave() {
    this.drag = false;
    this.mouseDown = false;
    this.nativeElement.style.cursor = 'default';
  }

  onZoomIn() {
    if (this.zoomFactor < 0.7) return;
    this.zoomFactor -= 0.05;
    this.setCanvasResolution();
  }

  onZoomOut() {
    if (this.zoomFactor > 6) return;
    this.zoomFactor = this.zoomFactor + 0.05;
    this.setCanvasResolution();
  }

  private onSave() {
    localStorage.setItem('elements', JSON.stringify(this.elements));
  }
}
