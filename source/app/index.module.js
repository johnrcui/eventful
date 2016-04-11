/* global moment:false */

import { config } from './index.config';
import { routerConfig } from './index.route';
import { runBlock } from './index.run';
import { MainController } from './main/main.controller';
import { NavbarDirective } from './components/navbar/navbar.directive';

angular
.module('eventful', ['ngResource', 'ui.router', 'ngMaterial', 'toastr'])
.constant('moment', moment)
.config(config)
.config(routerConfig)
.run(runBlock)
.controller('MainController', MainController)
.directive('evflNavbar', NavbarDirective);
