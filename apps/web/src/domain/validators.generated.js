/* eslint-disable */
// GENERADO por scripts/build-validators.mjs desde contracts/*.schema.json. No editar a mano.
import * as __dep0 from 'ajv/dist/runtime/ucs2length.js'
import * as __dep1 from 'ajv-formats/dist/formats.js'
const __interop = (m) => (typeof m.default === 'function' ? m.default : m.default?.default ?? m)
export const validateCandidate = validate20;
const schema31 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://analogos.cl/schemas/candidate-site.schema.json","title":"AnalogOS Candidate Site","type":"object","additionalProperties":false,"required":["site_id","name","profile_id","profile_version","data_snapshot_version","pipeline_version","geometry","area_km2","status","similarity","confidence","feasibility","stability","score_breakdown","warnings","limitations","field_checks","evidence"],"properties":{"site_id":{"type":"string","pattern":"^cl-[a-z0-9-]+$"},"name":{"type":"string","minLength":1},"profile_id":{"type":"string"},"profile_version":{"type":"string"},"data_snapshot_version":{"type":"string"},"pipeline_version":{"type":"string"},"geometry":{"$ref":"#/$defs/polygonGeometry"},"area_km2":{"type":"number","exclusiveMinimum":0},"status":{"enum":["fixture","candidate","insufficient_data","excluded"]},"similarity":{"type":["number","null"],"minimum":0,"maximum":100},"confidence":{"type":"number","minimum":0,"maximum":100},"feasibility":{"enum":["unknown","requires_review","potentially_feasible","excluded"]},"stability":{"type":["number","null"],"minimum":0,"maximum":100},"score_breakdown":{"type":"array","items":{"$ref":"#/$defs/scoreItem"}},"warnings":{"type":"array","items":{"type":"string"}},"limitations":{"type":"array","minItems":1,"items":{"type":"string"}},"field_checks":{"type":"array","minItems":1,"items":{"type":"string"}},"evidence":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["evidence_id","dataset_id","claim","source_url"],"properties":{"evidence_id":{"type":"string"},"dataset_id":{"type":"string"},"claim":{"type":"string"},"source_url":{"type":"string","format":"uri"}}}}},"$defs":{"polygonGeometry":{"type":"object","additionalProperties":false,"required":["type","coordinates"],"properties":{"type":{"enum":["Polygon","MultiPolygon"]},"coordinates":{"type":"array","minItems":1}}},"scoreItem":{"type":"object","additionalProperties":false,"required":["criterion_id","raw_value","unit","normalized_similarity","weight","contribution","quality","dataset_id","status","explanation"],"properties":{"criterion_id":{"type":"string"},"raw_value":{"type":["number","string","null"]},"unit":{"type":"string"},"normalized_similarity":{"type":["number","null"],"minimum":0,"maximum":1},"weight":{"type":"number","minimum":0,"maximum":1},"contribution":{"type":["number","null"]},"quality":{"type":"number","minimum":0,"maximum":1},"dataset_id":{"type":"string"},"status":{"enum":["valid","missing","needs_calibration","excluded"]},"explanation":{"type":"string"}}}}};
const schema32 = {"type":"object","additionalProperties":false,"required":["type","coordinates"],"properties":{"type":{"enum":["Polygon","MultiPolygon"]},"coordinates":{"type":"array","minItems":1}}};
const schema33 = {"type":"object","additionalProperties":false,"required":["criterion_id","raw_value","unit","normalized_similarity","weight","contribution","quality","dataset_id","status","explanation"],"properties":{"criterion_id":{"type":"string"},"raw_value":{"type":["number","string","null"]},"unit":{"type":"string"},"normalized_similarity":{"type":["number","null"],"minimum":0,"maximum":1},"weight":{"type":"number","minimum":0,"maximum":1},"contribution":{"type":["number","null"]},"quality":{"type":"number","minimum":0,"maximum":1},"dataset_id":{"type":"string"},"status":{"enum":["valid","missing","needs_calibration","excluded"]},"explanation":{"type":"string"}}};
const func1 = Object.prototype.hasOwnProperty;
const func2 = __interop(__dep0);
const pattern4 = new RegExp("^cl-[a-z0-9-]+$", "u");
const formats0 = __dep1.fullFormats.uri;

function validate20(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://analogos.cl/schemas/candidate-site.schema.json" */;
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
if(data.site_id === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "site_id"},message:"must have required property '"+"site_id"+"'"};
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
if(data.profile_id === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "profile_id"},message:"must have required property '"+"profile_id"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.profile_version === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "profile_version"},message:"must have required property '"+"profile_version"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.data_snapshot_version === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "data_snapshot_version"},message:"must have required property '"+"data_snapshot_version"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.pipeline_version === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "pipeline_version"},message:"must have required property '"+"pipeline_version"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.geometry === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "geometry"},message:"must have required property '"+"geometry"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.area_km2 === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "area_km2"},message:"must have required property '"+"area_km2"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.status === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.similarity === undefined){
const err9 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "similarity"},message:"must have required property '"+"similarity"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data.confidence === undefined){
const err10 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "confidence"},message:"must have required property '"+"confidence"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data.feasibility === undefined){
const err11 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "feasibility"},message:"must have required property '"+"feasibility"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data.stability === undefined){
const err12 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "stability"},message:"must have required property '"+"stability"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data.score_breakdown === undefined){
const err13 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "score_breakdown"},message:"must have required property '"+"score_breakdown"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data.warnings === undefined){
const err14 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "warnings"},message:"must have required property '"+"warnings"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data.limitations === undefined){
const err15 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "limitations"},message:"must have required property '"+"limitations"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data.field_checks === undefined){
const err16 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "field_checks"},message:"must have required property '"+"field_checks"+"'"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if(data.evidence === undefined){
const err17 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "evidence"},message:"must have required property '"+"evidence"+"'"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema31.properties, key0))){
const err18 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.site_id !== undefined){
let data0 = data.site_id;
if(typeof data0 === "string"){
if(!pattern4.test(data0)){
const err19 = {instancePath:instancePath+"/site_id",schemaPath:"#/properties/site_id/pattern",keyword:"pattern",params:{pattern: "^cl-[a-z0-9-]+$"},message:"must match pattern \""+"^cl-[a-z0-9-]+$"+"\""};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
else {
const err20 = {instancePath:instancePath+"/site_id",schemaPath:"#/properties/site_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data.name !== undefined){
let data1 = data.name;
if(typeof data1 === "string"){
if(func2(data1) < 1){
const err21 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
else {
const err22 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data.profile_id !== undefined){
if(typeof data.profile_id !== "string"){
const err23 = {instancePath:instancePath+"/profile_id",schemaPath:"#/properties/profile_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data.profile_version !== undefined){
if(typeof data.profile_version !== "string"){
const err24 = {instancePath:instancePath+"/profile_version",schemaPath:"#/properties/profile_version/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data.data_snapshot_version !== undefined){
if(typeof data.data_snapshot_version !== "string"){
const err25 = {instancePath:instancePath+"/data_snapshot_version",schemaPath:"#/properties/data_snapshot_version/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
if(data.pipeline_version !== undefined){
if(typeof data.pipeline_version !== "string"){
const err26 = {instancePath:instancePath+"/pipeline_version",schemaPath:"#/properties/pipeline_version/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data.geometry !== undefined){
let data6 = data.geometry;
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.type === undefined){
const err27 = {instancePath:instancePath+"/geometry",schemaPath:"#/$defs/polygonGeometry/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if(data6.coordinates === undefined){
const err28 = {instancePath:instancePath+"/geometry",schemaPath:"#/$defs/polygonGeometry/required",keyword:"required",params:{missingProperty: "coordinates"},message:"must have required property '"+"coordinates"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
for(const key1 in data6){
if(!((key1 === "type") || (key1 === "coordinates"))){
const err29 = {instancePath:instancePath+"/geometry",schemaPath:"#/$defs/polygonGeometry/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data6.type !== undefined){
let data7 = data6.type;
if(!((data7 === "Polygon") || (data7 === "MultiPolygon"))){
const err30 = {instancePath:instancePath+"/geometry/type",schemaPath:"#/$defs/polygonGeometry/properties/type/enum",keyword:"enum",params:{allowedValues: schema32.properties.type.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data6.coordinates !== undefined){
let data8 = data6.coordinates;
if(Array.isArray(data8)){
if(data8.length < 1){
const err31 = {instancePath:instancePath+"/geometry/coordinates",schemaPath:"#/$defs/polygonGeometry/properties/coordinates/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
else {
const err32 = {instancePath:instancePath+"/geometry/coordinates",schemaPath:"#/$defs/polygonGeometry/properties/coordinates/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
}
else {
const err33 = {instancePath:instancePath+"/geometry",schemaPath:"#/$defs/polygonGeometry/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
if(data.area_km2 !== undefined){
let data9 = data.area_km2;
if(typeof data9 == "number"){
if(data9 <= 0 || isNaN(data9)){
const err34 = {instancePath:instancePath+"/area_km2",schemaPath:"#/properties/area_km2/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
else {
const err35 = {instancePath:instancePath+"/area_km2",schemaPath:"#/properties/area_km2/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data.status !== undefined){
let data10 = data.status;
if(!((((data10 === "fixture") || (data10 === "candidate")) || (data10 === "insufficient_data")) || (data10 === "excluded"))){
const err36 = {instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema31.properties.status.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data.similarity !== undefined){
let data11 = data.similarity;
if((!(typeof data11 == "number")) && (data11 !== null)){
const err37 = {instancePath:instancePath+"/similarity",schemaPath:"#/properties/similarity/type",keyword:"type",params:{type: schema31.properties.similarity.type},message:"must be number,null"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(typeof data11 == "number"){
if(data11 > 100 || isNaN(data11)){
const err38 = {instancePath:instancePath+"/similarity",schemaPath:"#/properties/similarity/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100},message:"must be <= 100"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data11 < 0 || isNaN(data11)){
const err39 = {instancePath:instancePath+"/similarity",schemaPath:"#/properties/similarity/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
}
if(data.confidence !== undefined){
let data12 = data.confidence;
if(typeof data12 == "number"){
if(data12 > 100 || isNaN(data12)){
const err40 = {instancePath:instancePath+"/confidence",schemaPath:"#/properties/confidence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100},message:"must be <= 100"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data12 < 0 || isNaN(data12)){
const err41 = {instancePath:instancePath+"/confidence",schemaPath:"#/properties/confidence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
else {
const err42 = {instancePath:instancePath+"/confidence",schemaPath:"#/properties/confidence/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
if(data.feasibility !== undefined){
let data13 = data.feasibility;
if(!((((data13 === "unknown") || (data13 === "requires_review")) || (data13 === "potentially_feasible")) || (data13 === "excluded"))){
const err43 = {instancePath:instancePath+"/feasibility",schemaPath:"#/properties/feasibility/enum",keyword:"enum",params:{allowedValues: schema31.properties.feasibility.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
if(data.stability !== undefined){
let data14 = data.stability;
if((!(typeof data14 == "number")) && (data14 !== null)){
const err44 = {instancePath:instancePath+"/stability",schemaPath:"#/properties/stability/type",keyword:"type",params:{type: schema31.properties.stability.type},message:"must be number,null"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(typeof data14 == "number"){
if(data14 > 100 || isNaN(data14)){
const err45 = {instancePath:instancePath+"/stability",schemaPath:"#/properties/stability/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100},message:"must be <= 100"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
if(data14 < 0 || isNaN(data14)){
const err46 = {instancePath:instancePath+"/stability",schemaPath:"#/properties/stability/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
}
if(data.score_breakdown !== undefined){
let data15 = data.score_breakdown;
if(Array.isArray(data15)){
const len0 = data15.length;
for(let i0=0; i0<len0; i0++){
let data16 = data15[i0];
if(data16 && typeof data16 == "object" && !Array.isArray(data16)){
if(data16.criterion_id === undefined){
const err47 = {instancePath:instancePath+"/score_breakdown/" + i0,schemaPath:"#/$defs/scoreItem/required",keyword:"required",params:{missingProperty: "criterion_id"},message:"must have required property '"+"criterion_id"+"'"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
if(data16.raw_value === undefined){
const err48 = {instancePath:instancePath+"/score_breakdown/" + i0,schemaPath:"#/$defs/scoreItem/required",keyword:"required",params:{missingProperty: "raw_value"},message:"must have required property '"+"raw_value"+"'"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
if(data16.unit === undefined){
const err49 = {instancePath:instancePath+"/score_breakdown/" + i0,schemaPath:"#/$defs/scoreItem/required",keyword:"required",params:{missingProperty: "unit"},message:"must have required property '"+"unit"+"'"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
if(data16.normalized_similarity === undefined){
const err50 = {instancePath:instancePath+"/score_breakdown/" + i0,schemaPath:"#/$defs/scoreItem/required",keyword:"required",params:{missingProperty: "normalized_similarity"},message:"must have required property '"+"normalized_similarity"+"'"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
if(data16.weight === undefined){
const err51 = {instancePath:instancePath+"/score_breakdown/" + i0,schemaPath:"#/$defs/scoreItem/required",keyword:"required",params:{missingProperty: "weight"},message:"must have required property '"+"weight"+"'"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
if(data16.contribution === undefined){
const err52 = {instancePath:instancePath+"/score_breakdown/" + i0,schemaPath:"#/$defs/scoreItem/required",keyword:"required",params:{missingProperty: "contribution"},message:"must have required property '"+"contribution"+"'"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if(data16.quality === undefined){
const err53 = {instancePath:instancePath+"/score_breakdown/" + i0,schemaPath:"#/$defs/scoreItem/required",keyword:"required",params:{missingProperty: "quality"},message:"must have required property '"+"quality"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(data16.dataset_id === undefined){
const err54 = {instancePath:instancePath+"/score_breakdown/" + i0,schemaPath:"#/$defs/scoreItem/required",keyword:"required",params:{missingProperty: "dataset_id"},message:"must have required property '"+"dataset_id"+"'"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
if(data16.status === undefined){
const err55 = {instancePath:instancePath+"/score_breakdown/" + i0,schemaPath:"#/$defs/scoreItem/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
if(data16.explanation === undefined){
const err56 = {instancePath:instancePath+"/score_breakdown/" + i0,schemaPath:"#/$defs/scoreItem/required",keyword:"required",params:{missingProperty: "explanation"},message:"must have required property '"+"explanation"+"'"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
for(const key2 in data16){
if(!(func1.call(schema33.properties, key2))){
const err57 = {instancePath:instancePath+"/score_breakdown/" + i0,schemaPath:"#/$defs/scoreItem/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
if(data16.criterion_id !== undefined){
if(typeof data16.criterion_id !== "string"){
const err58 = {instancePath:instancePath+"/score_breakdown/" + i0+"/criterion_id",schemaPath:"#/$defs/scoreItem/properties/criterion_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
if(data16.raw_value !== undefined){
let data18 = data16.raw_value;
if(((!(typeof data18 == "number")) && (typeof data18 !== "string")) && (data18 !== null)){
const err59 = {instancePath:instancePath+"/score_breakdown/" + i0+"/raw_value",schemaPath:"#/$defs/scoreItem/properties/raw_value/type",keyword:"type",params:{type: schema33.properties.raw_value.type},message:"must be number,string,null"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
}
if(data16.unit !== undefined){
if(typeof data16.unit !== "string"){
const err60 = {instancePath:instancePath+"/score_breakdown/" + i0+"/unit",schemaPath:"#/$defs/scoreItem/properties/unit/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
if(data16.normalized_similarity !== undefined){
let data20 = data16.normalized_similarity;
if((!(typeof data20 == "number")) && (data20 !== null)){
const err61 = {instancePath:instancePath+"/score_breakdown/" + i0+"/normalized_similarity",schemaPath:"#/$defs/scoreItem/properties/normalized_similarity/type",keyword:"type",params:{type: schema33.properties.normalized_similarity.type},message:"must be number,null"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
if(typeof data20 == "number"){
if(data20 > 1 || isNaN(data20)){
const err62 = {instancePath:instancePath+"/score_breakdown/" + i0+"/normalized_similarity",schemaPath:"#/$defs/scoreItem/properties/normalized_similarity/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1},message:"must be <= 1"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
if(data20 < 0 || isNaN(data20)){
const err63 = {instancePath:instancePath+"/score_breakdown/" + i0+"/normalized_similarity",schemaPath:"#/$defs/scoreItem/properties/normalized_similarity/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
}
}
if(data16.weight !== undefined){
let data21 = data16.weight;
if(typeof data21 == "number"){
if(data21 > 1 || isNaN(data21)){
const err64 = {instancePath:instancePath+"/score_breakdown/" + i0+"/weight",schemaPath:"#/$defs/scoreItem/properties/weight/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1},message:"must be <= 1"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
if(data21 < 0 || isNaN(data21)){
const err65 = {instancePath:instancePath+"/score_breakdown/" + i0+"/weight",schemaPath:"#/$defs/scoreItem/properties/weight/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
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
const err66 = {instancePath:instancePath+"/score_breakdown/" + i0+"/weight",schemaPath:"#/$defs/scoreItem/properties/weight/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
}
if(data16.contribution !== undefined){
let data22 = data16.contribution;
if((!(typeof data22 == "number")) && (data22 !== null)){
const err67 = {instancePath:instancePath+"/score_breakdown/" + i0+"/contribution",schemaPath:"#/$defs/scoreItem/properties/contribution/type",keyword:"type",params:{type: schema33.properties.contribution.type},message:"must be number,null"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
}
if(data16.quality !== undefined){
let data23 = data16.quality;
if(typeof data23 == "number"){
if(data23 > 1 || isNaN(data23)){
const err68 = {instancePath:instancePath+"/score_breakdown/" + i0+"/quality",schemaPath:"#/$defs/scoreItem/properties/quality/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1},message:"must be <= 1"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
if(data23 < 0 || isNaN(data23)){
const err69 = {instancePath:instancePath+"/score_breakdown/" + i0+"/quality",schemaPath:"#/$defs/scoreItem/properties/quality/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
}
else {
const err70 = {instancePath:instancePath+"/score_breakdown/" + i0+"/quality",schemaPath:"#/$defs/scoreItem/properties/quality/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
}
if(data16.dataset_id !== undefined){
if(typeof data16.dataset_id !== "string"){
const err71 = {instancePath:instancePath+"/score_breakdown/" + i0+"/dataset_id",schemaPath:"#/$defs/scoreItem/properties/dataset_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
}
if(data16.status !== undefined){
let data25 = data16.status;
if(!((((data25 === "valid") || (data25 === "missing")) || (data25 === "needs_calibration")) || (data25 === "excluded"))){
const err72 = {instancePath:instancePath+"/score_breakdown/" + i0+"/status",schemaPath:"#/$defs/scoreItem/properties/status/enum",keyword:"enum",params:{allowedValues: schema33.properties.status.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
}
if(data16.explanation !== undefined){
if(typeof data16.explanation !== "string"){
const err73 = {instancePath:instancePath+"/score_breakdown/" + i0+"/explanation",schemaPath:"#/$defs/scoreItem/properties/explanation/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
}
}
else {
const err74 = {instancePath:instancePath+"/score_breakdown/" + i0,schemaPath:"#/$defs/scoreItem/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
}
}
else {
const err75 = {instancePath:instancePath+"/score_breakdown",schemaPath:"#/properties/score_breakdown/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
}
if(data.warnings !== undefined){
let data27 = data.warnings;
if(Array.isArray(data27)){
const len1 = data27.length;
for(let i1=0; i1<len1; i1++){
if(typeof data27[i1] !== "string"){
const err76 = {instancePath:instancePath+"/warnings/" + i1,schemaPath:"#/properties/warnings/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
}
}
else {
const err77 = {instancePath:instancePath+"/warnings",schemaPath:"#/properties/warnings/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
}
if(data.limitations !== undefined){
let data29 = data.limitations;
if(Array.isArray(data29)){
if(data29.length < 1){
const err78 = {instancePath:instancePath+"/limitations",schemaPath:"#/properties/limitations/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
const len2 = data29.length;
for(let i2=0; i2<len2; i2++){
if(typeof data29[i2] !== "string"){
const err79 = {instancePath:instancePath+"/limitations/" + i2,schemaPath:"#/properties/limitations/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
}
}
else {
const err80 = {instancePath:instancePath+"/limitations",schemaPath:"#/properties/limitations/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
}
if(data.field_checks !== undefined){
let data31 = data.field_checks;
if(Array.isArray(data31)){
if(data31.length < 1){
const err81 = {instancePath:instancePath+"/field_checks",schemaPath:"#/properties/field_checks/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
const len3 = data31.length;
for(let i3=0; i3<len3; i3++){
if(typeof data31[i3] !== "string"){
const err82 = {instancePath:instancePath+"/field_checks/" + i3,schemaPath:"#/properties/field_checks/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
}
}
else {
const err83 = {instancePath:instancePath+"/field_checks",schemaPath:"#/properties/field_checks/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
}
if(data.evidence !== undefined){
let data33 = data.evidence;
if(Array.isArray(data33)){
const len4 = data33.length;
for(let i4=0; i4<len4; i4++){
let data34 = data33[i4];
if(data34 && typeof data34 == "object" && !Array.isArray(data34)){
if(data34.evidence_id === undefined){
const err84 = {instancePath:instancePath+"/evidence/" + i4,schemaPath:"#/properties/evidence/items/required",keyword:"required",params:{missingProperty: "evidence_id"},message:"must have required property '"+"evidence_id"+"'"};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
if(data34.dataset_id === undefined){
const err85 = {instancePath:instancePath+"/evidence/" + i4,schemaPath:"#/properties/evidence/items/required",keyword:"required",params:{missingProperty: "dataset_id"},message:"must have required property '"+"dataset_id"+"'"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
if(data34.claim === undefined){
const err86 = {instancePath:instancePath+"/evidence/" + i4,schemaPath:"#/properties/evidence/items/required",keyword:"required",params:{missingProperty: "claim"},message:"must have required property '"+"claim"+"'"};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
if(data34.source_url === undefined){
const err87 = {instancePath:instancePath+"/evidence/" + i4,schemaPath:"#/properties/evidence/items/required",keyword:"required",params:{missingProperty: "source_url"},message:"must have required property '"+"source_url"+"'"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
for(const key3 in data34){
if(!((((key3 === "evidence_id") || (key3 === "dataset_id")) || (key3 === "claim")) || (key3 === "source_url"))){
const err88 = {instancePath:instancePath+"/evidence/" + i4,schemaPath:"#/properties/evidence/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
}
if(data34.evidence_id !== undefined){
if(typeof data34.evidence_id !== "string"){
const err89 = {instancePath:instancePath+"/evidence/" + i4+"/evidence_id",schemaPath:"#/properties/evidence/items/properties/evidence_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
}
if(data34.dataset_id !== undefined){
if(typeof data34.dataset_id !== "string"){
const err90 = {instancePath:instancePath+"/evidence/" + i4+"/dataset_id",schemaPath:"#/properties/evidence/items/properties/dataset_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
}
if(data34.claim !== undefined){
if(typeof data34.claim !== "string"){
const err91 = {instancePath:instancePath+"/evidence/" + i4+"/claim",schemaPath:"#/properties/evidence/items/properties/claim/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
}
if(data34.source_url !== undefined){
let data38 = data34.source_url;
if(typeof data38 === "string"){
if(!(formats0(data38))){
const err92 = {instancePath:instancePath+"/evidence/" + i4+"/source_url",schemaPath:"#/properties/evidence/items/properties/source_url/format",keyword:"format",params:{format: "uri"},message:"must match format \""+"uri"+"\""};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
}
else {
const err93 = {instancePath:instancePath+"/evidence/" + i4+"/source_url",schemaPath:"#/properties/evidence/items/properties/source_url/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
}
}
else {
const err94 = {instancePath:instancePath+"/evidence/" + i4,schemaPath:"#/properties/evidence/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
}
}
else {
const err95 = {instancePath:instancePath+"/evidence",schemaPath:"#/properties/evidence/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err95];
}
else {
vErrors.push(err95);
}
errors++;
}
}
}
else {
const err96 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err96];
}
else {
vErrors.push(err96);
}
errors++;
}
validate20.errors = vErrors;
return errors === 0;
}
validate20.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateManifest = validate21;
const schema34 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://analogos.cl/schemas/data-manifest.schema.json","title":"AnalogOS Data Manifest","type":"object","additionalProperties":false,"required":["snapshot_version","created_at","pipeline_version","datasets"],"properties":{"snapshot_version":{"type":"string"},"created_at":{"type":"string","format":"date-time"},"pipeline_version":{"type":"string"},"datasets":{"type":"array","minItems":1,"items":{"type":"object","additionalProperties":false,"required":["dataset_id","provider","product","collection_version","landing_url","access_url","downloaded_at","time_start","time_end","spatial_resolution","temporal_resolution","crs","units","license","checksum","nodata","quality_notes","transformations"],"properties":{"dataset_id":{"type":"string"},"provider":{"type":"string"},"product":{"type":"string"},"collection_version":{"type":"string"},"landing_url":{"type":"string","format":"uri"},"access_url":{"type":"string","format":"uri"},"downloaded_at":{"type":"string","format":"date-time"},"time_start":{"type":["string","null"],"format":"date-time"},"time_end":{"type":["string","null"],"format":"date-time"},"spatial_resolution":{"type":"string"},"temporal_resolution":{"type":"string"},"crs":{"type":"string"},"units":{"type":"string"},"license":{"type":"string"},"checksum":{"type":"string"},"nodata":{"type":["string","number","null"]},"quality_notes":{"type":"array","items":{"type":"string"}},"transformations":{"type":"array","items":{"type":"string"}}}}}}};
const formats2 = __dep1.fullFormats["date-time"];

function validate21(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://analogos.cl/schemas/data-manifest.schema.json" */;
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
if(data.snapshot_version === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "snapshot_version"},message:"must have required property '"+"snapshot_version"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.created_at === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "created_at"},message:"must have required property '"+"created_at"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.pipeline_version === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "pipeline_version"},message:"must have required property '"+"pipeline_version"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.datasets === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "datasets"},message:"must have required property '"+"datasets"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "snapshot_version") || (key0 === "created_at")) || (key0 === "pipeline_version")) || (key0 === "datasets"))){
const err4 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.snapshot_version !== undefined){
if(typeof data.snapshot_version !== "string"){
const err5 = {instancePath:instancePath+"/snapshot_version",schemaPath:"#/properties/snapshot_version/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.created_at !== undefined){
let data1 = data.created_at;
if(typeof data1 === "string"){
if(!(formats2.validate(data1))){
const err6 = {instancePath:instancePath+"/created_at",schemaPath:"#/properties/created_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
else {
const err7 = {instancePath:instancePath+"/created_at",schemaPath:"#/properties/created_at/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.pipeline_version !== undefined){
if(typeof data.pipeline_version !== "string"){
const err8 = {instancePath:instancePath+"/pipeline_version",schemaPath:"#/properties/pipeline_version/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.datasets !== undefined){
let data3 = data.datasets;
if(Array.isArray(data3)){
if(data3.length < 1){
const err9 = {instancePath:instancePath+"/datasets",schemaPath:"#/properties/datasets/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
let data4 = data3[i0];
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.dataset_id === undefined){
const err10 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "dataset_id"},message:"must have required property '"+"dataset_id"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data4.provider === undefined){
const err11 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "provider"},message:"must have required property '"+"provider"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data4.product === undefined){
const err12 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "product"},message:"must have required property '"+"product"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data4.collection_version === undefined){
const err13 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "collection_version"},message:"must have required property '"+"collection_version"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data4.landing_url === undefined){
const err14 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "landing_url"},message:"must have required property '"+"landing_url"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data4.access_url === undefined){
const err15 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "access_url"},message:"must have required property '"+"access_url"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data4.downloaded_at === undefined){
const err16 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "downloaded_at"},message:"must have required property '"+"downloaded_at"+"'"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if(data4.time_start === undefined){
const err17 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "time_start"},message:"must have required property '"+"time_start"+"'"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(data4.time_end === undefined){
const err18 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "time_end"},message:"must have required property '"+"time_end"+"'"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
if(data4.spatial_resolution === undefined){
const err19 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "spatial_resolution"},message:"must have required property '"+"spatial_resolution"+"'"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if(data4.temporal_resolution === undefined){
const err20 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "temporal_resolution"},message:"must have required property '"+"temporal_resolution"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data4.crs === undefined){
const err21 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "crs"},message:"must have required property '"+"crs"+"'"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(data4.units === undefined){
const err22 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "units"},message:"must have required property '"+"units"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data4.license === undefined){
const err23 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "license"},message:"must have required property '"+"license"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data4.checksum === undefined){
const err24 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "checksum"},message:"must have required property '"+"checksum"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data4.nodata === undefined){
const err25 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "nodata"},message:"must have required property '"+"nodata"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data4.quality_notes === undefined){
const err26 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "quality_notes"},message:"must have required property '"+"quality_notes"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data4.transformations === undefined){
const err27 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/required",keyword:"required",params:{missingProperty: "transformations"},message:"must have required property '"+"transformations"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
for(const key1 in data4){
if(!(func1.call(schema34.properties.datasets.items.properties, key1))){
const err28 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data4.dataset_id !== undefined){
if(typeof data4.dataset_id !== "string"){
const err29 = {instancePath:instancePath+"/datasets/" + i0+"/dataset_id",schemaPath:"#/properties/datasets/items/properties/dataset_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data4.provider !== undefined){
if(typeof data4.provider !== "string"){
const err30 = {instancePath:instancePath+"/datasets/" + i0+"/provider",schemaPath:"#/properties/datasets/items/properties/provider/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data4.product !== undefined){
if(typeof data4.product !== "string"){
const err31 = {instancePath:instancePath+"/datasets/" + i0+"/product",schemaPath:"#/properties/datasets/items/properties/product/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data4.collection_version !== undefined){
if(typeof data4.collection_version !== "string"){
const err32 = {instancePath:instancePath+"/datasets/" + i0+"/collection_version",schemaPath:"#/properties/datasets/items/properties/collection_version/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data4.landing_url !== undefined){
let data9 = data4.landing_url;
if(typeof data9 === "string"){
if(!(formats0(data9))){
const err33 = {instancePath:instancePath+"/datasets/" + i0+"/landing_url",schemaPath:"#/properties/datasets/items/properties/landing_url/format",keyword:"format",params:{format: "uri"},message:"must match format \""+"uri"+"\""};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
else {
const err34 = {instancePath:instancePath+"/datasets/" + i0+"/landing_url",schemaPath:"#/properties/datasets/items/properties/landing_url/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data4.access_url !== undefined){
let data10 = data4.access_url;
if(typeof data10 === "string"){
if(!(formats0(data10))){
const err35 = {instancePath:instancePath+"/datasets/" + i0+"/access_url",schemaPath:"#/properties/datasets/items/properties/access_url/format",keyword:"format",params:{format: "uri"},message:"must match format \""+"uri"+"\""};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
else {
const err36 = {instancePath:instancePath+"/datasets/" + i0+"/access_url",schemaPath:"#/properties/datasets/items/properties/access_url/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data4.downloaded_at !== undefined){
let data11 = data4.downloaded_at;
if(typeof data11 === "string"){
if(!(formats2.validate(data11))){
const err37 = {instancePath:instancePath+"/datasets/" + i0+"/downloaded_at",schemaPath:"#/properties/datasets/items/properties/downloaded_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
else {
const err38 = {instancePath:instancePath+"/datasets/" + i0+"/downloaded_at",schemaPath:"#/properties/datasets/items/properties/downloaded_at/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data4.time_start !== undefined){
let data12 = data4.time_start;
if((typeof data12 !== "string") && (data12 !== null)){
const err39 = {instancePath:instancePath+"/datasets/" + i0+"/time_start",schemaPath:"#/properties/datasets/items/properties/time_start/type",keyword:"type",params:{type: schema34.properties.datasets.items.properties.time_start.type},message:"must be string,null"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(typeof data12 === "string"){
if(!(formats2.validate(data12))){
const err40 = {instancePath:instancePath+"/datasets/" + i0+"/time_start",schemaPath:"#/properties/datasets/items/properties/time_start/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
}
if(data4.time_end !== undefined){
let data13 = data4.time_end;
if((typeof data13 !== "string") && (data13 !== null)){
const err41 = {instancePath:instancePath+"/datasets/" + i0+"/time_end",schemaPath:"#/properties/datasets/items/properties/time_end/type",keyword:"type",params:{type: schema34.properties.datasets.items.properties.time_end.type},message:"must be string,null"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(typeof data13 === "string"){
if(!(formats2.validate(data13))){
const err42 = {instancePath:instancePath+"/datasets/" + i0+"/time_end",schemaPath:"#/properties/datasets/items/properties/time_end/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
}
if(data4.spatial_resolution !== undefined){
if(typeof data4.spatial_resolution !== "string"){
const err43 = {instancePath:instancePath+"/datasets/" + i0+"/spatial_resolution",schemaPath:"#/properties/datasets/items/properties/spatial_resolution/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
if(data4.temporal_resolution !== undefined){
if(typeof data4.temporal_resolution !== "string"){
const err44 = {instancePath:instancePath+"/datasets/" + i0+"/temporal_resolution",schemaPath:"#/properties/datasets/items/properties/temporal_resolution/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(data4.crs !== undefined){
if(typeof data4.crs !== "string"){
const err45 = {instancePath:instancePath+"/datasets/" + i0+"/crs",schemaPath:"#/properties/datasets/items/properties/crs/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
if(data4.units !== undefined){
if(typeof data4.units !== "string"){
const err46 = {instancePath:instancePath+"/datasets/" + i0+"/units",schemaPath:"#/properties/datasets/items/properties/units/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
if(data4.license !== undefined){
if(typeof data4.license !== "string"){
const err47 = {instancePath:instancePath+"/datasets/" + i0+"/license",schemaPath:"#/properties/datasets/items/properties/license/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
if(data4.checksum !== undefined){
if(typeof data4.checksum !== "string"){
const err48 = {instancePath:instancePath+"/datasets/" + i0+"/checksum",schemaPath:"#/properties/datasets/items/properties/checksum/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data4.nodata !== undefined){
let data20 = data4.nodata;
if(((typeof data20 !== "string") && (!(typeof data20 == "number"))) && (data20 !== null)){
const err49 = {instancePath:instancePath+"/datasets/" + i0+"/nodata",schemaPath:"#/properties/datasets/items/properties/nodata/type",keyword:"type",params:{type: schema34.properties.datasets.items.properties.nodata.type},message:"must be string,number,null"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
if(data4.quality_notes !== undefined){
let data21 = data4.quality_notes;
if(Array.isArray(data21)){
const len1 = data21.length;
for(let i1=0; i1<len1; i1++){
if(typeof data21[i1] !== "string"){
const err50 = {instancePath:instancePath+"/datasets/" + i0+"/quality_notes/" + i1,schemaPath:"#/properties/datasets/items/properties/quality_notes/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
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
const err51 = {instancePath:instancePath+"/datasets/" + i0+"/quality_notes",schemaPath:"#/properties/datasets/items/properties/quality_notes/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
if(data4.transformations !== undefined){
let data23 = data4.transformations;
if(Array.isArray(data23)){
const len2 = data23.length;
for(let i2=0; i2<len2; i2++){
if(typeof data23[i2] !== "string"){
const err52 = {instancePath:instancePath+"/datasets/" + i0+"/transformations/" + i2,schemaPath:"#/properties/datasets/items/properties/transformations/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
}
else {
const err53 = {instancePath:instancePath+"/datasets/" + i0+"/transformations",schemaPath:"#/properties/datasets/items/properties/transformations/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
}
else {
const err54 = {instancePath:instancePath+"/datasets/" + i0,schemaPath:"#/properties/datasets/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
}
else {
const err55 = {instancePath:instancePath+"/datasets",schemaPath:"#/properties/datasets/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
}
else {
const err56 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
validate21.errors = vErrors;
return errors === 0;
}
validate21.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateProfile = validate22;
const schema35 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://analogos.cl/schemas/mission-profile.schema.json","title":"AnalogOS Mission Profile","type":"object","additionalProperties":false,"required":["id","version","name","purpose","status","planetary_reference","aggregation","criteria","hard_constraints","limitations"],"properties":{"id":{"type":"string","pattern":"^[a-z0-9-]+$"},"version":{"type":"string"},"name":{"type":"string","minLength":3},"purpose":{"type":"string","minLength":10},"status":{"enum":["needs_calibration","validated","deprecated"]},"planetary_reference":{"type":"object","additionalProperties":false,"required":["dataset_id","body","notes"],"properties":{"dataset_id":{"type":"string"},"body":{"enum":["mars","moon"]},"notes":{"type":"string"}}},"aggregation":{"type":"object","additionalProperties":false,"required":["method","epsilon","minimum_valid_weight"],"properties":{"method":{"const":"weighted_geometric_mean"},"epsilon":{"type":"number","exclusiveMinimum":0,"maximum":0.1},"minimum_valid_weight":{"type":"number","minimum":0.5,"maximum":1}}},"criteria":{"type":"array","minItems":1,"items":{"type":"object","additionalProperties":false,"required":["id","label","weight","unit","method","status"],"properties":{"id":{"type":"string","pattern":"^[a-z0-9_]+$"},"label":{"type":"string"},"weight":{"type":"number","minimum":0,"maximum":1},"unit":{"type":"string"},"method":{"enum":["reference_distribution_distance","bounded_preference","categorical_compatibility","hard_constraint"]},"status":{"enum":["needs_calibration","needs_expert_review","optional","validated"]}}}},"hard_constraints":{"type":"array","items":{"type":"string"},"uniqueItems":true},"limitations":{"type":"array","minItems":1,"items":{"type":"string"}}}};
const pattern5 = new RegExp("^[a-z0-9-]+$", "u");
const pattern6 = new RegExp("^[a-z0-9_]+$", "u");

function validate22(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://analogos.cl/schemas/mission-profile.schema.json" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate22.evaluated;
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
if(data.version === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "version"},message:"must have required property '"+"version"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.name === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.purpose === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "purpose"},message:"must have required property '"+"purpose"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.status === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.planetary_reference === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "planetary_reference"},message:"must have required property '"+"planetary_reference"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.aggregation === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "aggregation"},message:"must have required property '"+"aggregation"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.criteria === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "criteria"},message:"must have required property '"+"criteria"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.hard_constraints === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "hard_constraints"},message:"must have required property '"+"hard_constraints"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.limitations === undefined){
const err9 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "limitations"},message:"must have required property '"+"limitations"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema35.properties, key0))){
const err10 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.id !== undefined){
let data0 = data.id;
if(typeof data0 === "string"){
if(!pattern5.test(data0)){
const err11 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/pattern",keyword:"pattern",params:{pattern: "^[a-z0-9-]+$"},message:"must match pattern \""+"^[a-z0-9-]+$"+"\""};
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
const err12 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.version !== undefined){
if(typeof data.version !== "string"){
const err13 = {instancePath:instancePath+"/version",schemaPath:"#/properties/version/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.name !== undefined){
let data2 = data.name;
if(typeof data2 === "string"){
if(func2(data2) < 3){
const err14 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/minLength",keyword:"minLength",params:{limit: 3},message:"must NOT have fewer than 3 characters"};
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
const err15 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.purpose !== undefined){
let data3 = data.purpose;
if(typeof data3 === "string"){
if(func2(data3) < 10){
const err16 = {instancePath:instancePath+"/purpose",schemaPath:"#/properties/purpose/minLength",keyword:"minLength",params:{limit: 10},message:"must NOT have fewer than 10 characters"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
else {
const err17 = {instancePath:instancePath+"/purpose",schemaPath:"#/properties/purpose/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data.status !== undefined){
let data4 = data.status;
if(!(((data4 === "needs_calibration") || (data4 === "validated")) || (data4 === "deprecated"))){
const err18 = {instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema35.properties.status.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.planetary_reference !== undefined){
let data5 = data.planetary_reference;
if(data5 && typeof data5 == "object" && !Array.isArray(data5)){
if(data5.dataset_id === undefined){
const err19 = {instancePath:instancePath+"/planetary_reference",schemaPath:"#/properties/planetary_reference/required",keyword:"required",params:{missingProperty: "dataset_id"},message:"must have required property '"+"dataset_id"+"'"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if(data5.body === undefined){
const err20 = {instancePath:instancePath+"/planetary_reference",schemaPath:"#/properties/planetary_reference/required",keyword:"required",params:{missingProperty: "body"},message:"must have required property '"+"body"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data5.notes === undefined){
const err21 = {instancePath:instancePath+"/planetary_reference",schemaPath:"#/properties/planetary_reference/required",keyword:"required",params:{missingProperty: "notes"},message:"must have required property '"+"notes"+"'"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
for(const key1 in data5){
if(!(((key1 === "dataset_id") || (key1 === "body")) || (key1 === "notes"))){
const err22 = {instancePath:instancePath+"/planetary_reference",schemaPath:"#/properties/planetary_reference/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data5.dataset_id !== undefined){
if(typeof data5.dataset_id !== "string"){
const err23 = {instancePath:instancePath+"/planetary_reference/dataset_id",schemaPath:"#/properties/planetary_reference/properties/dataset_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data5.body !== undefined){
let data7 = data5.body;
if(!((data7 === "mars") || (data7 === "moon"))){
const err24 = {instancePath:instancePath+"/planetary_reference/body",schemaPath:"#/properties/planetary_reference/properties/body/enum",keyword:"enum",params:{allowedValues: schema35.properties.planetary_reference.properties.body.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data5.notes !== undefined){
if(typeof data5.notes !== "string"){
const err25 = {instancePath:instancePath+"/planetary_reference/notes",schemaPath:"#/properties/planetary_reference/properties/notes/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
}
else {
const err26 = {instancePath:instancePath+"/planetary_reference",schemaPath:"#/properties/planetary_reference/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data.aggregation !== undefined){
let data9 = data.aggregation;
if(data9 && typeof data9 == "object" && !Array.isArray(data9)){
if(data9.method === undefined){
const err27 = {instancePath:instancePath+"/aggregation",schemaPath:"#/properties/aggregation/required",keyword:"required",params:{missingProperty: "method"},message:"must have required property '"+"method"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if(data9.epsilon === undefined){
const err28 = {instancePath:instancePath+"/aggregation",schemaPath:"#/properties/aggregation/required",keyword:"required",params:{missingProperty: "epsilon"},message:"must have required property '"+"epsilon"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data9.minimum_valid_weight === undefined){
const err29 = {instancePath:instancePath+"/aggregation",schemaPath:"#/properties/aggregation/required",keyword:"required",params:{missingProperty: "minimum_valid_weight"},message:"must have required property '"+"minimum_valid_weight"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
for(const key2 in data9){
if(!(((key2 === "method") || (key2 === "epsilon")) || (key2 === "minimum_valid_weight"))){
const err30 = {instancePath:instancePath+"/aggregation",schemaPath:"#/properties/aggregation/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data9.method !== undefined){
if("weighted_geometric_mean" !== data9.method){
const err31 = {instancePath:instancePath+"/aggregation/method",schemaPath:"#/properties/aggregation/properties/method/const",keyword:"const",params:{allowedValue: "weighted_geometric_mean"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data9.epsilon !== undefined){
let data11 = data9.epsilon;
if(typeof data11 == "number"){
if(data11 > 0.1 || isNaN(data11)){
const err32 = {instancePath:instancePath+"/aggregation/epsilon",schemaPath:"#/properties/aggregation/properties/epsilon/maximum",keyword:"maximum",params:{comparison: "<=", limit: 0.1},message:"must be <= 0.1"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data11 <= 0 || isNaN(data11)){
const err33 = {instancePath:instancePath+"/aggregation/epsilon",schemaPath:"#/properties/aggregation/properties/epsilon/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
else {
const err34 = {instancePath:instancePath+"/aggregation/epsilon",schemaPath:"#/properties/aggregation/properties/epsilon/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data9.minimum_valid_weight !== undefined){
let data12 = data9.minimum_valid_weight;
if(typeof data12 == "number"){
if(data12 > 1 || isNaN(data12)){
const err35 = {instancePath:instancePath+"/aggregation/minimum_valid_weight",schemaPath:"#/properties/aggregation/properties/minimum_valid_weight/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1},message:"must be <= 1"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if(data12 < 0.5 || isNaN(data12)){
const err36 = {instancePath:instancePath+"/aggregation/minimum_valid_weight",schemaPath:"#/properties/aggregation/properties/minimum_valid_weight/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0.5},message:"must be >= 0.5"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
else {
const err37 = {instancePath:instancePath+"/aggregation/minimum_valid_weight",schemaPath:"#/properties/aggregation/properties/minimum_valid_weight/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
}
else {
const err38 = {instancePath:instancePath+"/aggregation",schemaPath:"#/properties/aggregation/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data.criteria !== undefined){
let data13 = data.criteria;
if(Array.isArray(data13)){
if(data13.length < 1){
const err39 = {instancePath:instancePath+"/criteria",schemaPath:"#/properties/criteria/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
const len0 = data13.length;
for(let i0=0; i0<len0; i0++){
let data14 = data13[i0];
if(data14 && typeof data14 == "object" && !Array.isArray(data14)){
if(data14.id === undefined){
const err40 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data14.label === undefined){
const err41 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/required",keyword:"required",params:{missingProperty: "label"},message:"must have required property '"+"label"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data14.weight === undefined){
const err42 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/required",keyword:"required",params:{missingProperty: "weight"},message:"must have required property '"+"weight"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
if(data14.unit === undefined){
const err43 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/required",keyword:"required",params:{missingProperty: "unit"},message:"must have required property '"+"unit"+"'"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if(data14.method === undefined){
const err44 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/required",keyword:"required",params:{missingProperty: "method"},message:"must have required property '"+"method"+"'"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(data14.status === undefined){
const err45 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
for(const key3 in data14){
if(!((((((key3 === "id") || (key3 === "label")) || (key3 === "weight")) || (key3 === "unit")) || (key3 === "method")) || (key3 === "status"))){
const err46 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
if(data14.id !== undefined){
let data15 = data14.id;
if(typeof data15 === "string"){
if(!pattern6.test(data15)){
const err47 = {instancePath:instancePath+"/criteria/" + i0+"/id",schemaPath:"#/properties/criteria/items/properties/id/pattern",keyword:"pattern",params:{pattern: "^[a-z0-9_]+$"},message:"must match pattern \""+"^[a-z0-9_]+$"+"\""};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
else {
const err48 = {instancePath:instancePath+"/criteria/" + i0+"/id",schemaPath:"#/properties/criteria/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data14.label !== undefined){
if(typeof data14.label !== "string"){
const err49 = {instancePath:instancePath+"/criteria/" + i0+"/label",schemaPath:"#/properties/criteria/items/properties/label/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
if(data14.weight !== undefined){
let data17 = data14.weight;
if(typeof data17 == "number"){
if(data17 > 1 || isNaN(data17)){
const err50 = {instancePath:instancePath+"/criteria/" + i0+"/weight",schemaPath:"#/properties/criteria/items/properties/weight/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1},message:"must be <= 1"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
if(data17 < 0 || isNaN(data17)){
const err51 = {instancePath:instancePath+"/criteria/" + i0+"/weight",schemaPath:"#/properties/criteria/items/properties/weight/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
else {
const err52 = {instancePath:instancePath+"/criteria/" + i0+"/weight",schemaPath:"#/properties/criteria/items/properties/weight/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
if(data14.unit !== undefined){
if(typeof data14.unit !== "string"){
const err53 = {instancePath:instancePath+"/criteria/" + i0+"/unit",schemaPath:"#/properties/criteria/items/properties/unit/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
if(data14.method !== undefined){
let data19 = data14.method;
if(!((((data19 === "reference_distribution_distance") || (data19 === "bounded_preference")) || (data19 === "categorical_compatibility")) || (data19 === "hard_constraint"))){
const err54 = {instancePath:instancePath+"/criteria/" + i0+"/method",schemaPath:"#/properties/criteria/items/properties/method/enum",keyword:"enum",params:{allowedValues: schema35.properties.criteria.items.properties.method.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
if(data14.status !== undefined){
let data20 = data14.status;
if(!((((data20 === "needs_calibration") || (data20 === "needs_expert_review")) || (data20 === "optional")) || (data20 === "validated"))){
const err55 = {instancePath:instancePath+"/criteria/" + i0+"/status",schemaPath:"#/properties/criteria/items/properties/status/enum",keyword:"enum",params:{allowedValues: schema35.properties.criteria.items.properties.status.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
}
else {
const err56 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
}
}
else {
const err57 = {instancePath:instancePath+"/criteria",schemaPath:"#/properties/criteria/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
if(data.hard_constraints !== undefined){
let data21 = data.hard_constraints;
if(Array.isArray(data21)){
const len1 = data21.length;
for(let i1=0; i1<len1; i1++){
if(typeof data21[i1] !== "string"){
const err58 = {instancePath:instancePath+"/hard_constraints/" + i1,schemaPath:"#/properties/hard_constraints/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
let i2 = data21.length;
let j0;
if(i2 > 1){
const indices0 = {};
for(;i2--;){
let item0 = data21[i2];
if(typeof item0 !== "string"){
continue;
}
if(typeof indices0[item0] == "number"){
j0 = indices0[item0];
const err59 = {instancePath:instancePath+"/hard_constraints",schemaPath:"#/properties/hard_constraints/uniqueItems",keyword:"uniqueItems",params:{i: i2, j: j0},message:"must NOT have duplicate items (items ## "+j0+" and "+i2+" are identical)"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
break;
}
indices0[item0] = i2;
}
}
}
else {
const err60 = {instancePath:instancePath+"/hard_constraints",schemaPath:"#/properties/hard_constraints/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
if(data.limitations !== undefined){
let data23 = data.limitations;
if(Array.isArray(data23)){
if(data23.length < 1){
const err61 = {instancePath:instancePath+"/limitations",schemaPath:"#/properties/limitations/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
const len2 = data23.length;
for(let i3=0; i3<len2; i3++){
if(typeof data23[i3] !== "string"){
const err62 = {instancePath:instancePath+"/limitations/" + i3,schemaPath:"#/properties/limitations/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
}
}
else {
const err63 = {instancePath:instancePath+"/limitations",schemaPath:"#/properties/limitations/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
}
}
else {
const err64 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
validate22.errors = vErrors;
return errors === 0;
}
validate22.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};
