/** Independent source resources. No shared session/router/save registration. */
import {captureChapter5JianningRouteConfiguration} from './game-chapter5-jianning-route-config.mjs';
import {createChapter5JianningRouteSourceModel} from './game-chapter5-jianning-route-source.mjs';
export async function loadChapter5JianningRoute({sourceBytes,localeBytes,validateEntry}={}){const sourceConfiguration=await captureChapter5JianningRouteConfiguration(sourceBytes,{locale:localeBytes,validateEntry});let source=null;return Object.freeze({id:'chapter5-jianning-route',sourceConfiguration,createSourceModel:()=>source??=createChapter5JianningRouteSourceModel({configuration:sourceConfiguration})});}
