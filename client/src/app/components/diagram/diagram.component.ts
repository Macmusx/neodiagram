import {AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {JsonPipe, NgClass} from "@angular/common";

export enum ElementType {
  SQUARE = 'square'
}

export type DiagramElement = {
  x: number,
  y: number,
  width: number,
  height: number,
  selected: boolean,
  radius?: number
}

export enum STATE {
  IDLE = 'idle',
  DRAG = 'drag',
  ITEM_SELECTED = 'item-selected',
  CREATE_DESIGNED_ELEMENT = 'create-designed-element',
  SELECT_READY = 'select-ready'
}

export enum MODE {
  MOVE = 'move',
  SELECT = 'select',
  SQUARE = 'square'
}

export class Diagram {
  originalMousePosition = {
    x: 0,
    y: 0
  }
  selectedElement: ElementType | null = null;
  currentlyCreatingElement: DiagramElement | undefined;
  selectedMode: MODE = MODE.MOVE;
  currentlySelectedElement: DiagramElement | undefined;
  state = STATE.IDLE;
  private zoomLevel = 4;
  private elements: DiagramElement[] = [];
  private topLeftCoordinatesMapping = {
    x: 0,
    y: 0
  }

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
      let r = x + element.width;
      let b = y + element.height;
      const radius = element.radius || 0;

      context.beginPath();
      context.strokeStyle = "blue";
      context.fillStyle = "blue";
      context.lineWidth = 4;
      context.moveTo(x + radius, y);
      context.lineTo(r - radius, y);
      context.quadraticCurveTo(r, y, r, y + radius);
      context.lineTo(r, y + element.height - radius);
      context.quadraticCurveTo(r, b, r - radius, b);
      context.lineTo(x + radius, b);
      context.quadraticCurveTo(x, b, x, b - radius);
      context.lineTo(x, y + radius);
      context.quadraticCurveTo(x, y, x + radius, y);
      context.stroke();
      context.fill();

      if (element.selected) {
        // make small squares on the corners

        context.fillStyle = 'red';
        context.fillRect(x - 12.5, y - 12.5, 25, 25);
        context.fillRect(x + element.width - 12.5, y - 12.5, 25, 25);
        context.fillRect(x - 12.5, y + element.height - 12.5, 25, 25);
        context.fillRect(x + element.width - 12.5, y + element.height - 12.5, 25, 25);

        // make border

        context.strokeStyle = 'red';
        context.lineWidth = 4;
        context.strokeRect(x, y, element.width, element.height);
      }
    }
  }

  updateSelectedElement(values: any) {
    if (!this.currentlySelectedElement) return;

    if (values.borderRadius) {
      this.currentlySelectedElement.radius = values.borderRadius;
      this.redraw();

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
      case STATE.CREATE_DESIGNED_ELEMENT:
        this.currentlyCreatingElement = {
          x: this.originalMousePosition.x,
          y: this.originalMousePosition.y,
          width: event.layerX * this.zoomLevel - (this.originalMousePosition.x || 0) - this.topLeftCoordinatesMapping.x,
          height: event.layerY * this.zoomLevel - (this.originalMousePosition.y || 0) - this.topLeftCoordinatesMapping.y,
          selected: false
        }
        this.redraw();
    }
  }

  onMouseDown(pointerEvent: PointerEvent) {
    switch (this.state) {
      case STATE.IDLE:
        return this.onDragEnter(pointerEvent);
      case STATE.ITEM_SELECTED:
        return this.onEnterCreateDesignedElementState(pointerEvent);
      case STATE.SELECT_READY:
        this.onSelectElement(pointerEvent)
    }
  }

  onSelectItem(elementType: ElementType | null) {
    this.selectedElement = elementType;
    if (!elementType) {
      this.state = STATE.IDLE;
      return;
    }
    this.state = STATE.ITEM_SELECTED;
  }

  onMouseUp() {
    switch (this.state) {
      case STATE.DRAG:
        this.onEnterIdleState();
        break;
      case STATE.ITEM_SELECTED:
        break;
      case STATE.CREATE_DESIGNED_ELEMENT:
        this.state = STATE.ITEM_SELECTED;
        if (!this.currentlyCreatingElement) break;

        if (this.currentlyCreatingElement.width < 0) {
          this.currentlyCreatingElement.width = -this.currentlyCreatingElement.width;
          this.currentlyCreatingElement.x = this.currentlyCreatingElement.x - this.currentlyCreatingElement.width;
        }

        if (this.currentlyCreatingElement.height < 0) {
          this.currentlyCreatingElement.height = -this.currentlyCreatingElement.height;
          this.currentlyCreatingElement.y = this.currentlyCreatingElement.y - this.currentlyCreatingElement.height;
        }

        this.elements.push(this.currentlyCreatingElement);
        this.onElementSelected(this.currentlyCreatingElement);

        this.state = STATE.SELECT_READY;
        this.selectedMode = MODE.SELECT;

        this.currentlyCreatingElement = undefined;

        break;
    }
  }

  onSelectMode(mode: MODE) {
    if (this.selectedMode === mode) return;
    this.selectedMode = mode;
    switch (mode) {
      case MODE.MOVE:
        this.state = STATE.IDLE;
        break;
      case MODE.SELECT:
        this.state = STATE.SELECT_READY;
        break;
      case MODE.SQUARE:
        this.onSelectItem(ElementType.SQUARE);
        break;
    }
  }

  getSelectedMode(): MODE {
    return this.selectedMode;
  }

  private onEnterCreateDesignedElementState(event: PointerEvent) {
    this.state = STATE.CREATE_DESIGNED_ELEMENT;
    this.originalMousePosition = {
      x: event.layerX * this.zoomLevel - this.topLeftCoordinatesMapping.x,
      y: event.layerY * this.zoomLevel - this.topLeftCoordinatesMapping.y
    }
  }

  private clear() {
    this.context.clearRect(0, 0, this.nativeElement.width, this.nativeElement.height);
  }

  private drawElements() {
    this.elements.forEach(element => this.drawElement(element));
    if (this.currentlyCreatingElement) this.drawElement(this.currentlyCreatingElement);
  }

  private setCanvasResolution() {
    const parent = this.nativeElement.parentElement;

    if (parent) {
      this.nativeElement.width = parent.clientWidth * this.zoomLevel;
      this.nativeElement.height = (this._originalHeight || 1) * this.zoomLevel;
    }

    this.redraw();
  }

  private onSelectElement(event: PointerEvent) {
    this.onDeselectSelectedElement();
    const x = event.layerX * this.zoomLevel - this.topLeftCoordinatesMapping.x;
    const y = event.layerY * this.zoomLevel - this.topLeftCoordinatesMapping.y;

    const element = this.elements.find(element =>
      element.x < x && element.x + element.width > x
      &&
      element.y < y && element.y + element.height > y
    );
    if (element) this.onElementSelected(element);
    if (!element) this.redraw();
  }


  private onDeselectSelectedElement() {
    if (this.currentlySelectedElement) {
      this.currentlySelectedElement.selected = false;
      this.currentlySelectedElement = undefined;
    }
  }

  private onElementSelected(element: DiagramElement) {
    this.onDeselectSelectedElement();
    element.selected = true;
    this.currentlySelectedElement = element;
    // this.state = STATE.ITEM_SELECTED;
    this.redraw();
  }
}

@Component({
  selector: 'app-diagram',
  standalone: true,
  imports: [
    NgClass,
    JsonPipe
  ],
  templateUrl: './diagram.component.html',
  styleUrl: './diagram.component.scss'
})
export class DiagramComponent implements AfterViewInit, OnInit {
  protected readonly MODE = MODE;

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

  ngAfterViewInit(): void {
    this.diagram.originalHeight = this.diagram.nativeElement.parentElement?.clientHeight;
  }

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
    this.diagram.onMouseDown(pointerEvent);
  }

  onCanvasMouseMove(event: MouseEvent) {
    this.diagram.onMouseMove(event);
  }

  onCanvasMouseUp() {
    this.diagram.onMouseUp();
  }

  onMouseLeave() {
    // TODO rethink
    // this.diagram.onEnterIdleState();
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

  onSelectMode(mode: MODE) {
    this.diagram.onSelectMode(mode);
  }

  updateSelectedElementBorderRadius(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.diagram.updateSelectedElement({borderRadius: parseInt(value, 10)});
  }
}
