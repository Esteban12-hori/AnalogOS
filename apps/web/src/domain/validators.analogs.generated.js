/* eslint-disable */
// GENERADO por scripts/build-validators.mjs desde contracts/*.schema.json. No editar a mano.
import * as __dep0 from 'ajv/dist/runtime/ucs2length.js'
import * as __dep1 from 'ajv-formats/dist/formats.js'
const __interop = (m) => (typeof m.default === 'function' ? m.default : m.default?.default ?? m)
export const validateReferenceAnalogs = validate20;
const schema31 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://analogos.cl/schemas/reference-analog.schema.json","title":"AnalogOS · análogos de referencia (◆, por calcular)","description":"Catálogo de análogos emblemáticos del mundo (config/reference_analogs.json). No tienen similitud, confianza ni ranking: el esquema no ofrece dónde ponerlos (additionalProperties: false). Cada análogo exige ubicación aproximada o región y al menos una fuente citada; lo que no tenga fuente no se publica (docs/UX_REDESIGN.md §3.5, §7.2).","type":"object","additionalProperties":false,"required":["schema","analogs"],"properties":{"schema":{"const":"reference-analogs/1"},"analogs":{"type":"array","maxItems":24,"items":{"$ref":"#/$defs/analog"}}},"$defs":{"analog":{"type":"object","additionalProperties":false,"required":["id","name","country","status","location","sources"],"properties":{"id":{"type":"string","pattern":"^[a-z0-9-]+$","maxLength":64},"name":{"type":"string","minLength":2,"maxLength":80},"country":{"type":"string","minLength":2,"maxLength":60},"status":{"description":"Un análogo de referencia nunca se puntúa en este snapshot.","const":"por_calcular"},"location":{"oneOf":[{"$ref":"#/$defs/approximatePoint"},{"$ref":"#/$defs/region"}]},"summary":{"type":"string","maxLength":280},"sources":{"type":"array","minItems":1,"maxItems":4,"items":{"$ref":"#/$defs/source"}}}},"approximatePoint":{"description":"Punto citado por la fuente con su radio de incertidumbre: se dibuja como «zona aproximada», nunca como pin exacto.","type":"object","additionalProperties":false,"required":["kind","lon","lat","radius_km"],"properties":{"kind":{"const":"approximate_point"},"lon":{"type":"number","minimum":-180,"maximum":180},"lat":{"type":"number","minimum":-90,"maximum":90},"radius_km":{"type":"number","exclusiveMinimum":0,"maximum":500}}},"region":{"description":"Región extensa (por ejemplo, un desierto completo) como caja [oeste, sur, este, norte] en grados WGS84.","type":"object","additionalProperties":false,"required":["kind","bbox"],"properties":{"kind":{"const":"region"},"bbox":{"type":"array","prefixItems":[{"type":"number","minimum":-180,"maximum":180},{"type":"number","minimum":-90,"maximum":90},{"type":"number","minimum":-180,"maximum":180},{"type":"number","minimum":-90,"maximum":90}],"minItems":4,"maxItems":4}}},"source":{"type":"object","additionalProperties":false,"required":["title","url"],"properties":{"title":{"type":"string","minLength":3,"maxLength":200},"url":{"type":"string","format":"uri","pattern":"^https://"},"publisher":{"type":"string","maxLength":120}}}}};
const schema32 = {"type":"object","additionalProperties":false,"required":["id","name","country","status","location","sources"],"properties":{"id":{"type":"string","pattern":"^[a-z0-9-]+$","maxLength":64},"name":{"type":"string","minLength":2,"maxLength":80},"country":{"type":"string","minLength":2,"maxLength":60},"status":{"description":"Un análogo de referencia nunca se puntúa en este snapshot.","const":"por_calcular"},"location":{"oneOf":[{"$ref":"#/$defs/approximatePoint"},{"$ref":"#/$defs/region"}]},"summary":{"type":"string","maxLength":280},"sources":{"type":"array","minItems":1,"maxItems":4,"items":{"$ref":"#/$defs/source"}}}};
const schema33 = {"description":"Punto citado por la fuente con su radio de incertidumbre: se dibuja como «zona aproximada», nunca como pin exacto.","type":"object","additionalProperties":false,"required":["kind","lon","lat","radius_km"],"properties":{"kind":{"const":"approximate_point"},"lon":{"type":"number","minimum":-180,"maximum":180},"lat":{"type":"number","minimum":-90,"maximum":90},"radius_km":{"type":"number","exclusiveMinimum":0,"maximum":500}}};
const schema34 = {"description":"Región extensa (por ejemplo, un desierto completo) como caja [oeste, sur, este, norte] en grados WGS84.","type":"object","additionalProperties":false,"required":["kind","bbox"],"properties":{"kind":{"const":"region"},"bbox":{"type":"array","prefixItems":[{"type":"number","minimum":-180,"maximum":180},{"type":"number","minimum":-90,"maximum":90},{"type":"number","minimum":-180,"maximum":180},{"type":"number","minimum":-90,"maximum":90}],"minItems":4,"maxItems":4}}};
const schema35 = {"type":"object","additionalProperties":false,"required":["title","url"],"properties":{"title":{"type":"string","minLength":3,"maxLength":200},"url":{"type":"string","format":"uri","pattern":"^https://"},"publisher":{"type":"string","maxLength":120}}};
const func1 = __interop(__dep0);
const pattern4 = new RegExp("^[a-z0-9-]+$", "u");
const pattern5 = new RegExp("^https://", "u");
const formats0 = __dep1.fullFormats.uri;

function validate21(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate21.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.id === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.name === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.country === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "country"},message:"must have required property '"+"country"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.status === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.location === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "location"},message:"must have required property '"+"location"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.sources === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "sources"},message:"must have required property '"+"sources"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
for(const key0 in data){
if(!(((((((key0 === "id") || (key0 === "name")) || (key0 === "country")) || (key0 === "status")) || (key0 === "location")) || (key0 === "summary")) || (key0 === "sources"))){
const err6 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.id !== undefined){
let data0 = data.id;
if(typeof data0 === "string"){
if(func1(data0) > 64){
const err7 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(!pattern4.test(data0)){
const err8 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/pattern",keyword:"pattern",params:{pattern: "^[a-z0-9-]+$"},message:"must match pattern \""+"^[a-z0-9-]+$"+"\""};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
else {
const err9 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.name !== undefined){
let data1 = data.name;
if(typeof data1 === "string"){
if(func1(data1) > 80){
const err10 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/maxLength",keyword:"maxLength",params:{limit: 80},message:"must NOT have more than 80 characters"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(func1(data1) < 2){
const err11 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/minLength",keyword:"minLength",params:{limit: 2},message:"must NOT have fewer than 2 characters"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
else {
const err12 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.country !== undefined){
let data2 = data.country;
if(typeof data2 === "string"){
if(func1(data2) > 60){
const err13 = {instancePath:instancePath+"/country",schemaPath:"#/properties/country/maxLength",keyword:"maxLength",params:{limit: 60},message:"must NOT have more than 60 characters"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(func1(data2) < 2){
const err14 = {instancePath:instancePath+"/country",schemaPath:"#/properties/country/minLength",keyword:"minLength",params:{limit: 2},message:"must NOT have fewer than 2 characters"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
else {
const err15 = {instancePath:instancePath+"/country",schemaPath:"#/properties/country/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.status !== undefined){
if("por_calcular" !== data.status){
const err16 = {instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "por_calcular"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data.location !== undefined){
let data4 = data.location;
const _errs10 = errors;
let valid1 = false;
let passing0 = null;
const _errs11 = errors;
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.kind === undefined){
const err17 = {instancePath:instancePath+"/location",schemaPath:"#/$defs/approximatePoint/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(data4.lon === undefined){
const err18 = {instancePath:instancePath+"/location",schemaPath:"#/$defs/approximatePoint/required",keyword:"required",params:{missingProperty: "lon"},message:"must have required property '"+"lon"+"'"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
if(data4.lat === undefined){
const err19 = {instancePath:instancePath+"/location",schemaPath:"#/$defs/approximatePoint/required",keyword:"required",params:{missingProperty: "lat"},message:"must have required property '"+"lat"+"'"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if(data4.radius_km === undefined){
const err20 = {instancePath:instancePath+"/location",schemaPath:"#/$defs/approximatePoint/required",keyword:"required",params:{missingProperty: "radius_km"},message:"must have required property '"+"radius_km"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
for(const key1 in data4){
if(!((((key1 === "kind") || (key1 === "lon")) || (key1 === "lat")) || (key1 === "radius_km"))){
const err21 = {instancePath:instancePath+"/location",schemaPath:"#/$defs/approximatePoint/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data4.kind !== undefined){
if("approximate_point" !== data4.kind){
const err22 = {instancePath:instancePath+"/location/kind",schemaPath:"#/$defs/approximatePoint/properties/kind/const",keyword:"const",params:{allowedValue: "approximate_point"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data4.lon !== undefined){
let data6 = data4.lon;
if(typeof data6 == "number"){
if(data6 > 180 || isNaN(data6)){
const err23 = {instancePath:instancePath+"/location/lon",schemaPath:"#/$defs/approximatePoint/properties/lon/maximum",keyword:"maximum",params:{comparison: "<=", limit: 180},message:"must be <= 180"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data6 < -180 || isNaN(data6)){
const err24 = {instancePath:instancePath+"/location/lon",schemaPath:"#/$defs/approximatePoint/properties/lon/minimum",keyword:"minimum",params:{comparison: ">=", limit: -180},message:"must be >= -180"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
else {
const err25 = {instancePath:instancePath+"/location/lon",schemaPath:"#/$defs/approximatePoint/properties/lon/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
if(data4.lat !== undefined){
let data7 = data4.lat;
if(typeof data7 == "number"){
if(data7 > 90 || isNaN(data7)){
const err26 = {instancePath:instancePath+"/location/lat",schemaPath:"#/$defs/approximatePoint/properties/lat/maximum",keyword:"maximum",params:{comparison: "<=", limit: 90},message:"must be <= 90"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data7 < -90 || isNaN(data7)){
const err27 = {instancePath:instancePath+"/location/lat",schemaPath:"#/$defs/approximatePoint/properties/lat/minimum",keyword:"minimum",params:{comparison: ">=", limit: -90},message:"must be >= -90"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
else {
const err28 = {instancePath:instancePath+"/location/lat",schemaPath:"#/$defs/approximatePoint/properties/lat/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data4.radius_km !== undefined){
let data8 = data4.radius_km;
if(typeof data8 == "number"){
if(data8 > 500 || isNaN(data8)){
const err29 = {instancePath:instancePath+"/location/radius_km",schemaPath:"#/$defs/approximatePoint/properties/radius_km/maximum",keyword:"maximum",params:{comparison: "<=", limit: 500},message:"must be <= 500"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data8 <= 0 || isNaN(data8)){
const err30 = {instancePath:instancePath+"/location/radius_km",schemaPath:"#/$defs/approximatePoint/properties/radius_km/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
else {
const err31 = {instancePath:instancePath+"/location/radius_km",schemaPath:"#/$defs/approximatePoint/properties/radius_km/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
}
else {
const err32 = {instancePath:instancePath+"/location",schemaPath:"#/$defs/approximatePoint/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
var _valid0 = _errs11 === errors;
if(_valid0){
valid1 = true;
passing0 = 0;
var props0 = true;
}
const _errs22 = errors;
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.kind === undefined){
const err33 = {instancePath:instancePath+"/location",schemaPath:"#/$defs/region/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if(data4.bbox === undefined){
const err34 = {instancePath:instancePath+"/location",schemaPath:"#/$defs/region/required",keyword:"required",params:{missingProperty: "bbox"},message:"must have required property '"+"bbox"+"'"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
for(const key2 in data4){
if(!((key2 === "kind") || (key2 === "bbox"))){
const err35 = {instancePath:instancePath+"/location",schemaPath:"#/$defs/region/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data4.kind !== undefined){
if("region" !== data4.kind){
const err36 = {instancePath:instancePath+"/location/kind",schemaPath:"#/$defs/region/properties/kind/const",keyword:"const",params:{allowedValue: "region"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data4.bbox !== undefined){
let data10 = data4.bbox;
if(Array.isArray(data10)){
if(data10.length > 4){
const err37 = {instancePath:instancePath+"/location/bbox",schemaPath:"#/$defs/region/properties/bbox/maxItems",keyword:"maxItems",params:{limit: 4},message:"must NOT have more than 4 items"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(data10.length < 4){
const err38 = {instancePath:instancePath+"/location/bbox",schemaPath:"#/$defs/region/properties/bbox/minItems",keyword:"minItems",params:{limit: 4},message:"must NOT have fewer than 4 items"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
const len0 = data10.length;
if(len0 > 0){
let data11 = data10[0];
if(typeof data11 == "number"){
if(data11 > 180 || isNaN(data11)){
const err39 = {instancePath:instancePath+"/location/bbox/0",schemaPath:"#/$defs/region/properties/bbox/prefixItems/0/maximum",keyword:"maximum",params:{comparison: "<=", limit: 180},message:"must be <= 180"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(data11 < -180 || isNaN(data11)){
const err40 = {instancePath:instancePath+"/location/bbox/0",schemaPath:"#/$defs/region/properties/bbox/prefixItems/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: -180},message:"must be >= -180"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
else {
const err41 = {instancePath:instancePath+"/location/bbox/0",schemaPath:"#/$defs/region/properties/bbox/prefixItems/0/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
if(len0 > 1){
let data12 = data10[1];
if(typeof data12 == "number"){
if(data12 > 90 || isNaN(data12)){
const err42 = {instancePath:instancePath+"/location/bbox/1",schemaPath:"#/$defs/region/properties/bbox/prefixItems/1/maximum",keyword:"maximum",params:{comparison: "<=", limit: 90},message:"must be <= 90"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
if(data12 < -90 || isNaN(data12)){
const err43 = {instancePath:instancePath+"/location/bbox/1",schemaPath:"#/$defs/region/properties/bbox/prefixItems/1/minimum",keyword:"minimum",params:{comparison: ">=", limit: -90},message:"must be >= -90"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
else {
const err44 = {instancePath:instancePath+"/location/bbox/1",schemaPath:"#/$defs/region/properties/bbox/prefixItems/1/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(len0 > 2){
let data13 = data10[2];
if(typeof data13 == "number"){
if(data13 > 180 || isNaN(data13)){
const err45 = {instancePath:instancePath+"/location/bbox/2",schemaPath:"#/$defs/region/properties/bbox/prefixItems/2/maximum",keyword:"maximum",params:{comparison: "<=", limit: 180},message:"must be <= 180"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
if(data13 < -180 || isNaN(data13)){
const err46 = {instancePath:instancePath+"/location/bbox/2",schemaPath:"#/$defs/region/properties/bbox/prefixItems/2/minimum",keyword:"minimum",params:{comparison: ">=", limit: -180},message:"must be >= -180"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
else {
const err47 = {instancePath:instancePath+"/location/bbox/2",schemaPath:"#/$defs/region/properties/bbox/prefixItems/2/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
if(len0 > 3){
let data14 = data10[3];
if(typeof data14 == "number"){
if(data14 > 90 || isNaN(data14)){
const err48 = {instancePath:instancePath+"/location/bbox/3",schemaPath:"#/$defs/region/properties/bbox/prefixItems/3/maximum",keyword:"maximum",params:{comparison: "<=", limit: 90},message:"must be <= 90"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
if(data14 < -90 || isNaN(data14)){
const err49 = {instancePath:instancePath+"/location/bbox/3",schemaPath:"#/$defs/region/properties/bbox/prefixItems/3/minimum",keyword:"minimum",params:{comparison: ">=", limit: -90},message:"must be >= -90"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
else {
const err50 = {instancePath:instancePath+"/location/bbox/3",schemaPath:"#/$defs/region/properties/bbox/prefixItems/3/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
}
else {
const err51 = {instancePath:instancePath+"/location/bbox",schemaPath:"#/$defs/region/properties/bbox/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
}
else {
const err52 = {instancePath:instancePath+"/location",schemaPath:"#/$defs/region/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
var _valid0 = _errs22 === errors;
if(_valid0 && valid1){
valid1 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid1 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
}
if(!valid1){
const err53 = {instancePath:instancePath+"/location",schemaPath:"#/properties/location/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
else {
errors = _errs10;
if(vErrors !== null){
if(_errs10){
vErrors.length = _errs10;
}
else {
vErrors = null;
}
}
}
}
if(data.summary !== undefined){
let data15 = data.summary;
if(typeof data15 === "string"){
if(func1(data15) > 280){
const err54 = {instancePath:instancePath+"/summary",schemaPath:"#/properties/summary/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
else {
const err55 = {instancePath:instancePath+"/summary",schemaPath:"#/properties/summary/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
if(data.sources !== undefined){
let data16 = data.sources;
if(Array.isArray(data16)){
if(data16.length > 4){
const err56 = {instancePath:instancePath+"/sources",schemaPath:"#/properties/sources/maxItems",keyword:"maxItems",params:{limit: 4},message:"must NOT have more than 4 items"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(data16.length < 1){
const err57 = {instancePath:instancePath+"/sources",schemaPath:"#/properties/sources/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
const len1 = data16.length;
for(let i0=0; i0<len1; i0++){
let data17 = data16[i0];
if(data17 && typeof data17 == "object" && !Array.isArray(data17)){
if(data17.title === undefined){
const err58 = {instancePath:instancePath+"/sources/" + i0,schemaPath:"#/$defs/source/required",keyword:"required",params:{missingProperty: "title"},message:"must have required property '"+"title"+"'"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
if(data17.url === undefined){
const err59 = {instancePath:instancePath+"/sources/" + i0,schemaPath:"#/$defs/source/required",keyword:"required",params:{missingProperty: "url"},message:"must have required property '"+"url"+"'"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
for(const key3 in data17){
if(!(((key3 === "title") || (key3 === "url")) || (key3 === "publisher"))){
const err60 = {instancePath:instancePath+"/sources/" + i0,schemaPath:"#/$defs/source/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
if(data17.title !== undefined){
let data18 = data17.title;
if(typeof data18 === "string"){
if(func1(data18) > 200){
const err61 = {instancePath:instancePath+"/sources/" + i0+"/title",schemaPath:"#/$defs/source/properties/title/maxLength",keyword:"maxLength",params:{limit: 200},message:"must NOT have more than 200 characters"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
if(func1(data18) < 3){
const err62 = {instancePath:instancePath+"/sources/" + i0+"/title",schemaPath:"#/$defs/source/properties/title/minLength",keyword:"minLength",params:{limit: 3},message:"must NOT have fewer than 3 characters"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
}
else {
const err63 = {instancePath:instancePath+"/sources/" + i0+"/title",schemaPath:"#/$defs/source/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
}
if(data17.url !== undefined){
let data19 = data17.url;
if(typeof data19 === "string"){
if(!pattern5.test(data19)){
const err64 = {instancePath:instancePath+"/sources/" + i0+"/url",schemaPath:"#/$defs/source/properties/url/pattern",keyword:"pattern",params:{pattern: "^https://"},message:"must match pattern \""+"^https://"+"\""};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
if(!(formats0(data19))){
const err65 = {instancePath:instancePath+"/sources/" + i0+"/url",schemaPath:"#/$defs/source/properties/url/format",keyword:"format",params:{format: "uri"},message:"must match format \""+"uri"+"\""};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
}
else {
const err66 = {instancePath:instancePath+"/sources/" + i0+"/url",schemaPath:"#/$defs/source/properties/url/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
}
if(data17.publisher !== undefined){
let data20 = data17.publisher;
if(typeof data20 === "string"){
if(func1(data20) > 120){
const err67 = {instancePath:instancePath+"/sources/" + i0+"/publisher",schemaPath:"#/$defs/source/properties/publisher/maxLength",keyword:"maxLength",params:{limit: 120},message:"must NOT have more than 120 characters"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
}
else {
const err68 = {instancePath:instancePath+"/sources/" + i0+"/publisher",schemaPath:"#/$defs/source/properties/publisher/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
}
}
else {
const err69 = {instancePath:instancePath+"/sources/" + i0,schemaPath:"#/$defs/source/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
}
}
else {
const err70 = {instancePath:instancePath+"/sources",schemaPath:"#/properties/sources/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
}
}
else {
const err71 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
validate21.errors = vErrors;
return errors === 0;
}
validate21.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate20(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://analogos.cl/schemas/reference-analog.schema.json" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate20.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.schema === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schema"},message:"must have required property '"+"schema"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.analogs === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "analogs"},message:"must have required property '"+"analogs"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "schema") || (key0 === "analogs"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.schema !== undefined){
if("reference-analogs/1" !== data.schema){
const err3 = {instancePath:instancePath+"/schema",schemaPath:"#/properties/schema/const",keyword:"const",params:{allowedValue: "reference-analogs/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.analogs !== undefined){
let data1 = data.analogs;
if(Array.isArray(data1)){
if(data1.length > 24){
const err4 = {instancePath:instancePath+"/analogs",schemaPath:"#/properties/analogs/maxItems",keyword:"maxItems",params:{limit: 24},message:"must NOT have more than 24 items"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
if(!(validate21(data1[i0], {instancePath:instancePath+"/analogs/" + i0,parentData:data1,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
errors = vErrors.length;
}
}
}
else {
const err5 = {instancePath:instancePath+"/analogs",schemaPath:"#/properties/analogs/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
}
else {
const err6 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
validate20.errors = vErrors;
return errors === 0;
}
validate20.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

