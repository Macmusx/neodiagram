import {AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {NgClass} from "@angular/common";

export const ElementType = {
  square: 'square',
}

export type DiagramElement = {
  x: number,
  y: number,
  width: number,
  height: number
}

export enum STATE {
  IDLE,
  DRAG
}

export class Diagram {
  originalMousePosition = {
    x: 0,
    y: 0
  }
  private zoomLevel = 4;
  private elements: DiagramElement[] = [];
  private topLeftCoordinatesMapping = {
    x: 0,
    y: 0
  }
  private state = STATE.IDLE;

  private _originalHeight: number | undefined;

  set originalHeight(originalHeight: number | undefined) {
    if (!originalHeight) throw new Error('Invalid original height');
    this._originalHeight = originalHeight;
    this.setCanvasResolution();
  }

  private _nativeElement: HTMLCanvasElement | undefined;

  get nativeElement() {
    if (!this._nativeElement) throw new Error('Element not found');
    return this._nativeElement;
  }

  set nativeElement(nativeElement: HTMLCanvasElement) {
    this._nativeElement = nativeElement
    if (this.elements.length) this.redraw()
  }

  get context() {
    const context = this.nativeElement.getContext('2d');
    if (!context) throw new Error('Context not found');
    return context
  }

  drawElement(element: DiagramElement) {
    const context = this.nativeElement.getContext('2d');
    const x = element.x + this.topLeftCoordinatesMapping.x;
    const y = element.y + this.topLeftCoordinatesMapping.y;
    if (context) {
      context.fillStyle = 'blue';
      context.fillRect(x, y, element.width, element.height);
    }
  }

  loadElements(elements: DiagramElement[]) {
    this.elements = elements;
    if (!this._nativeElement) return;
    this.redraw();
  }

  drawGrid() {
    const gridOffsetX = this.topLeftCoordinatesMapping.x % 100;
    const gridOffsetY = this.topLeftCoordinatesMapping.y % 100;

    const pixelsX = Math.floor(Math.abs(this.topLeftCoordinatesMapping.x) / 100);
    const pixelsY = Math.floor(Math.abs(this.topLeftCoordinatesMapping.y) / 100);

    if (this.zoomLevel < 5) {
      for (let i = gridOffsetX, indexX = 0; i < this.nativeElement.width; i += 100, indexX++) {
        for (let j = gridOffsetY, indexY = 0; j < this.nativeElement.height; j += 100, indexY++) {
          this.context.beginPath();
          const radius = ((indexX - pixelsX) + (indexY - pixelsY)) % 2 === 0 ? 8 : 6;
          this.context.arc(i, j, radius, 0, 2 * Math.PI);
          this.context.fillStyle = ((indexX - pixelsX) + (indexY - pixelsY)) % 2 === 0 ? 'darkgray' : 'darkgray';
          this.context.fill();
        }
      }
    }
  }

  redraw(attributes?: { setResolution?: boolean, drawGrid?: boolean }) {
    const setResolution = attributes?.setResolution ?? false;
    const drawGrid = attributes?.drawGrid ?? true;

    if (setResolution) this.setCanvasResolution();
    this.clear();
    if (drawGrid) this.drawGrid();
    this.drawElements();
  }

  onDragEnter(event: PointerEvent) {
    if (this.state === STATE.DRAG) return;
    this.state = STATE.DRAG;
    this.nativeElement.style.cursor = 'grabbing';
    this.originalMousePosition = {
      x: event.clientX,
      y: event.clientY
    }
  }

  onEnterIdleState() {
    if (this.state === STATE.IDLE) return;
    this.nativeElement.style.cursor = 'default';
    this.state = STATE.IDLE;
  }

  onMouseMove(event: MouseEvent) {
    switch (this.state) {
      case STATE.IDLE:
        return;
      case STATE.DRAG:
        const dx = event.clientX - (this.originalMousePosition.x || 0);
        const dy = event.clientY - (this.originalMousePosition.y || 0);
        this.originalMousePosition = {
          x: event.clientX,
          y: event.clientY
        }
        this.topLeftCoordinatesMapping = {
          x: this.topLeftCoordinatesMapping.x + dx * this.zoomLevel,
          y: this.topLeftCoordinatesMapping.y + dy * this.zoomLevel
        }
        this.redraw();
        break;
    }
  }

  private clear() {
    this.context.clearRect(0, 0, this.nativeElement.width, this.nativeElement.height);
  }

  private drawElements() {
    this.elements.forEach(element => this.drawElement(element));
  }

  private setCanvasResolution() {
    const parent = this.nativeElement.parentElement;

    if (parent) {
      this.nativeElement.width = parent.clientWidth * this.zoomLevel;
      this.nativeElement.height = (this._originalHeight || 1) * this.zoomLevel;
    }

    this.redraw();
  }
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
  currentlySelectedNewElement: string | undefined;
  elementType = ElementType;

  private _diagram = new Diagram();

  get diagram(): Diagram {
    if (!this._diagram) throw new Error('Diagram not found');
    return this._diagram;
  }

  @ViewChild('diagramCanvas') set diagram(diagramCanvas: ElementRef<HTMLCanvasElement>) {
    if (diagramCanvas) {
      this._diagram.nativeElement = diagramCanvas.nativeElement;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.diagram.redraw({setResolution: true});
  }

  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    event.preventDefault();
  }

  @HostListener('body:wheel', ['$event'])
  onWheel(event: WheelEvent) {
    if (event.target !== this._diagram?.nativeElement) return;
    if (event.deltaY > 0) {
      this.onZoomOut();
    } else {
      this.onZoomIn();
    }
  }

  ngOnInit() {
    const persistedElements = localStorage.getItem('elements');
    if (persistedElements) {
      const elements = JSON.parse(persistedElements);
      this.diagram.loadElements(elements);
    }
  }

  ngAfterViewInit(): void {
    this.diagram.originalHeight = this.diagram.nativeElement.parentElement?.clientHeight;
  }

  onSelectItem(text: string) {
    this.currentlySelectedNewElement = text;
  }

  onSelectNothing() {
    this.currentlySelectedNewElement = undefined;
  }

  // drawSquare(x: number, y: number) {
  //   const rectSize = 200; // Square size
  //
  //   const context = this.nativeElement.getContext('2d');
  //   if (context) {
  //     context.fillStyle = 'blue';
  //     context.fillRect(x - this.nativeElement.offsetLeft - rectSize / 2, y - this.nativeElement.offsetTop - rectSize / 2, rectSize, rectSize);
  //     this.elements.push({
  //       x: x - this.nativeElement.offsetLeft - rectSize / 2 - this.topLeftCoordinatesMapping.x,
  //       y: y - this.nativeElement.offsetTop - rectSize / 2 - this.topLeftCoordinatesMapping.y,
  //       width: rectSize,
  //       height: rectSize
  //     });
  //   }
  // }

  onCanvasClick(event: MouseEvent) {
    //   if (this.currentlySelectedNewElement) {
    //     const rect = this.nativeElement.getBoundingClientRect();
    //     const x = event.clientX - rect.left;
    //     const y = event.clientY - rect.top;
    //     switch (this.currentlySelectedNewElement) {
    //       case ElementType.square:
    //         this.drawSquare(x * this.zoomFactor, y * this.zoomFactor);
    //         break;
    //     }
    //   }
    //
    //   this.onSave();
  }

  onCanvasMouseDown(event: MouseEvent) {
    const pointerEvent = event as PointerEvent;
    if (event.ctrlKey) this.diagram.onDragEnter(pointerEvent);
  }

  onCanvasMouseMove(event: MouseEvent) {
    this.diagram.onMouseMove(event);
  }

  onCanvasMouseUp() {
    this.diagram.onEnterIdleState();
  }

  onMouseLeave() {
    this.diagram.onEnterIdleState();
  }

  onZoomIn() {
    // if (this.zoomFactor < 0.7) return;
    // this.zoomFactor -= 0.05;
    // this.setCanvasResolution();
  }

  onZoomOut() {
    // if (this.zoomFactor > 6) return;
    // this.zoomFactor = this.zoomFactor + 0.05;
    // this.setCanvasResolution();
  }

  onReset() {
    // localStorage.removeItem('elements');
    // this.elements = [];
    // this.redrawCanvas();
  }

  private onSave() {
    // localStorage.setItem('elements', JSON.stringify(this.elements));
  }
}
