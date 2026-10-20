import { weatherIntensity } from './model.ts';
export function rainMotion(code:number) {
 const intensity=weatherIntensity(code);
 return {intensity,...({light:{far:24,near:16,seconds:1.85,length:23,ripples:3},moderate:{far:42,near:28,seconds:1.28,length:30,ripples:5},heavy:{far:62,near:42,seconds:.93,length:37,ripples:8}}[intensity])};
}
