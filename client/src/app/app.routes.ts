import {Routes} from '@angular/router';
import {DiagramComponent} from "./components/diagram/diagram.component";

export const routes: Routes = [
  {
    path: 'diagram/:diagramId',
    component: DiagramComponent
  }
];
