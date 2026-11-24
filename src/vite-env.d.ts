/// <reference types="vite/client" />

declare module 'virtual:public-catalogue' {
  type Walk = import('./domain/catalogue').Walk;
  type WalkImage = import('./domain/catalogue').WalkImage;
  export const walks: Omit<Walk, 'evidence_notes' | 'practical_notes'>[];
  export const images: WalkImage[];
}
