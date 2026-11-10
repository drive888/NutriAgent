import test from 'node:test';import assert from 'node:assert/strict';
import { parseLabelLines, parseLabelBoxes, mapImageClasses } from '../tools/recognition-macos/parse.js';
test('OCR rows select actual amounts not NRV percentages',()=>{const r=parseLabelLines(['Nutrition per 100 g','Energy 418.4 kJ 5%','Protein 3 g 6%','Fat 2 g 3%','Carbohydrate 12 g 4%','Sodium 200 mg 10%']);assert.equal(r.basis,'per100g');assert.equal(r.nutrients.energy.value,418.4);assert.equal(r.nutrients.sodium.value,200)});
test('ambiguous basis stays unconfirmed and missing stays null',()=>{const r=parseLabelLines(['Protein 6%']);assert.equal(r.basis,null);assert.equal(r.nutrients.proteins,null)});
test('native classifier mapping permits unknown and preserves actual confidence',()=>{assert.deepEqual(mapImageClasses([{identifier:'dog',confidence:.9}]),[]);assert.equal(mapImageClasses([{identifier:'bread',confidence:.7}])[0].confidence,.7)});
test('OCR geometry selects per100 column, not perServing or NRV',()=>{
 const boxes=[{text:'per 100 g',x:.64,y:.9},{text:'Protein',x:.15,y:.5},{text:'(g)',x:.5,y:.5},{text:'6.3',x:.64,y:.5},{text:'0.9',x:.8,y:.5},{text:'2',x:.94,y:.5}];
 assert.equal(parseLabelBoxes(boxes).nutrients.proteins.value,6.3);
 assert.equal(parseLabelBoxes(boxes.filter(b=>b.text!=='(g)')).nutrients.proteins,null);
});
