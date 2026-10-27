import fs from 'node:fs/promises';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';
const p=await PresentationFile.importPptx(await FileBlob.load('/Users/thinleydema/Desktop/Crop_disease/output/Yoesar-Prototype-Presentation-Final-v2.pptx'));
await fs.mkdir('/Users/thinleydema/Desktop/Crop_disease/.presentation-build/rendered',{recursive:true});
for (let i=0;i<p.slides.items.length;i++) {
 const b=await p.export({slide:p.slides.items[i],format:'png',scale:.5});
 await fs.writeFile(`/Users/thinleydema/Desktop/Crop_disease/.presentation-build/rendered/slide-${String(i+1).padStart(2,'0')}.png`,new Uint8Array(await b.arrayBuffer()));
}
console.log(p.slides.items.length);
