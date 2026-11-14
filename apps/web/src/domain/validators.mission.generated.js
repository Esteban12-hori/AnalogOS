/* eslint-disable */
// GENERADO por scripts/build-validators.mjs desde contracts/*.schema.json. No editar a mano.
import * as __dep0 from 'ajv/dist/runtime/ucs2length.js'
import * as __dep1 from 'ajv/dist/runtime/equal.js'
const __interop = (m) => (typeof m.default === 'function' ? m.default : m.default?.default ?? m)
export const validateMissionInterpretation = validate20;
const schema31 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://analogos.cl/schemas/mission-interpretation.schema.json","title":"AnalogOS · interpretación de una misión (mission-interpretation/1)","description":"Lo que la IA (lktron) o el matcher DEMO por palabras clave devuelven al interpretar el texto de una misión: niveles 0–3 por criterio, supuestos y lo pedido sin datos. No hay campo para porcentajes, confianza ni ranking: los calcula el motor determinista del cliente (ADR-009, ADR-010, docs/UX_REDESIGN.md §5.2). Reglas que el esquema no puede expresar (ids sin repetir, filtro de números escritos) las comprueba el cliente.","type":"object","additionalProperties":false,"required":["schema","engine","model","prompt_version","base_profile","status","mission_summary","criteria","assumptions","unsupported"],"properties":{"schema":{"const":"mission-interpretation/1"},"engine":{"description":"lktron = IA opcional (ADR-010); demo = coincidencia por palabras clave, sin red, rotulada «DEMO · sin IA».","enum":["lktron","demo"]},"model":{"type":"string","minLength":1,"maxLength":120},"prompt_version":{"type":"string","pattern":"^[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$"},"base_profile":{"type":"object","additionalProperties":false,"required":["id","version"],"properties":{"id":{"type":"string","pattern":"^[a-z0-9-]+$"},"version":{"type":"string","minLength":1,"maxLength":40}}},"status":{"enum":["ok","no_terrain_criteria"]},"mission_summary":{"$ref":"#/$defs/plainText"},"criteria":{"type":"array","maxItems":7,"items":{"type":"object","additionalProperties":false,"required":["id","level","rationale"],"properties":{"id":{"$ref":"#/$defs/criterionId"},"level":{"description":"Clave 3 · Importante 2 · Menor 1 · Excluir 0. El peso es nivel ÷ suma de niveles y lo calcula el cliente.","enum":[0,1,2,3]},"rationale":{"$ref":"#/$defs/plainText"}}}},"assumptions":{"type":"array","maxItems":8,"items":{"$ref":"#/$defs/plainText"}},"unsupported":{"type":"array","maxItems":8,"items":{"type":"object","additionalProperties":false,"required":["phrase","reason"],"properties":{"phrase":{"type":"string","minLength":1,"maxLength":120,"pattern":"^[^0-9%]*$"},"reason":{"enum":["not_measured","out_of_scope","ambiguous"]}}}}},"$defs":{"criterionId":{"enum":["slope","terrain_roughness","local_relief","bare_ground_fraction","aridity_context","surface_temperature_variability","geologic_relevance"]},"plainText":{"description":"Texto de la IA: sin dígitos ni %, 280 caracteres como máximo.","type":"string","minLength":1,"maxLength":280,"pattern":"^[^0-9%]*$"}}};
const schema32 = {"description":"Texto de la IA: sin dígitos ni %, 280 caracteres como máximo.","type":"string","minLength":1,"maxLength":280,"pattern":"^[^0-9%]*$"};
const schema33 = {"enum":["slope","terrain_roughness","local_relief","bare_ground_fraction","aridity_context","surface_temperature_variability","geologic_relevance"]};
const func1 = Object.prototype.hasOwnProperty;
const func2 = __interop(__dep0);
const pattern4 = new RegExp("^[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$", "u");
const pattern5 = new RegExp("^[a-z0-9-]+$", "u");
const pattern6 = new RegExp("^[^0-9%]*$", "u");

function validate20(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://analogos.cl/schemas/mission-interpretation.schema.json" */;
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
if(data.engine === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "engine"},message:"must have required property '"+"engine"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.model === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "model"},message:"must have required property '"+"model"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.prompt_version === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "prompt_version"},message:"must have required property '"+"prompt_version"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.base_profile === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "base_profile"},message:"must have required property '"+"base_profile"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.status === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.mission_summary === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "mission_summary"},message:"must have required property '"+"mission_summary"+"'"};
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
if(data.assumptions === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "assumptions"},message:"must have required property '"+"assumptions"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.unsupported === undefined){
const err9 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "unsupported"},message:"must have required property '"+"unsupported"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema31.properties, key0))){
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
if(data.schema !== undefined){
if("mission-interpretation/1" !== data.schema){
const err11 = {instancePath:instancePath+"/schema",schemaPath:"#/properties/schema/const",keyword:"const",params:{allowedValue: "mission-interpretation/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.engine !== undefined){
let data1 = data.engine;
if(!((data1 === "lktron") || (data1 === "demo"))){
const err12 = {instancePath:instancePath+"/engine",schemaPath:"#/properties/engine/enum",keyword:"enum",params:{allowedValues: schema31.properties.engine.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.model !== undefined){
let data2 = data.model;
if(typeof data2 === "string"){
if(func2(data2) > 120){
const err13 = {instancePath:instancePath+"/model",schemaPath:"#/properties/model/maxLength",keyword:"maxLength",params:{limit: 120},message:"must NOT have more than 120 characters"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(func2(data2) < 1){
const err14 = {instancePath:instancePath+"/model",schemaPath:"#/properties/model/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
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
const err15 = {instancePath:instancePath+"/model",schemaPath:"#/properties/model/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.prompt_version !== undefined){
let data3 = data.prompt_version;
if(typeof data3 === "string"){
if(!pattern4.test(data3)){
const err16 = {instancePath:instancePath+"/prompt_version",schemaPath:"#/properties/prompt_version/pattern",keyword:"pattern",params:{pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$"},message:"must match pattern \""+"^[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$"+"\""};
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
const err17 = {instancePath:instancePath+"/prompt_version",schemaPath:"#/properties/prompt_version/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data.base_profile !== undefined){
let data4 = data.base_profile;
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.id === undefined){
const err18 = {instancePath:instancePath+"/base_profile",schemaPath:"#/properties/base_profile/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
if(data4.version === undefined){
const err19 = {instancePath:instancePath+"/base_profile",schemaPath:"#/properties/base_profile/required",keyword:"required",params:{missingProperty: "version"},message:"must have required property '"+"version"+"'"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
for(const key1 in data4){
if(!((key1 === "id") || (key1 === "version"))){
const err20 = {instancePath:instancePath+"/base_profile",schemaPath:"#/properties/base_profile/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data4.id !== undefined){
let data5 = data4.id;
if(typeof data5 === "string"){
if(!pattern5.test(data5)){
const err21 = {instancePath:instancePath+"/base_profile/id",schemaPath:"#/properties/base_profile/properties/id/pattern",keyword:"pattern",params:{pattern: "^[a-z0-9-]+$"},message:"must match pattern \""+"^[a-z0-9-]+$"+"\""};
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
const err22 = {instancePath:instancePath+"/base_profile/id",schemaPath:"#/properties/base_profile/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data4.version !== undefined){
let data6 = data4.version;
if(typeof data6 === "string"){
if(func2(data6) > 40){
const err23 = {instancePath:instancePath+"/base_profile/version",schemaPath:"#/properties/base_profile/properties/version/maxLength",keyword:"maxLength",params:{limit: 40},message:"must NOT have more than 40 characters"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(func2(data6) < 1){
const err24 = {instancePath:instancePath+"/base_profile/version",schemaPath:"#/properties/base_profile/properties/version/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
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
const err25 = {instancePath:instancePath+"/base_profile/version",schemaPath:"#/properties/base_profile/properties/version/type",keyword:"type",params:{type: "string"},message:"must be string"};
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
const err26 = {instancePath:instancePath+"/base_profile",schemaPath:"#/properties/base_profile/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data.status !== undefined){
let data7 = data.status;
if(!((data7 === "ok") || (data7 === "no_terrain_criteria"))){
const err27 = {instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema31.properties.status.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
if(data.mission_summary !== undefined){
let data8 = data.mission_summary;
if(typeof data8 === "string"){
if(func2(data8) > 280){
const err28 = {instancePath:instancePath+"/mission_summary",schemaPath:"#/$defs/plainText/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(func2(data8) < 1){
const err29 = {instancePath:instancePath+"/mission_summary",schemaPath:"#/$defs/plainText/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(!pattern6.test(data8)){
const err30 = {instancePath:instancePath+"/mission_summary",schemaPath:"#/$defs/plainText/pattern",keyword:"pattern",params:{pattern: "^[^0-9%]*$"},message:"must match pattern \""+"^[^0-9%]*$"+"\""};
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
const err31 = {instancePath:instancePath+"/mission_summary",schemaPath:"#/$defs/plainText/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data.criteria !== undefined){
let data9 = data.criteria;
if(Array.isArray(data9)){
if(data9.length > 7){
const err32 = {instancePath:instancePath+"/criteria",schemaPath:"#/properties/criteria/maxItems",keyword:"maxItems",params:{limit: 7},message:"must NOT have more than 7 items"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
const len0 = data9.length;
for(let i0=0; i0<len0; i0++){
let data10 = data9[i0];
if(data10 && typeof data10 == "object" && !Array.isArray(data10)){
if(data10.id === undefined){
const err33 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if(data10.level === undefined){
const err34 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/required",keyword:"required",params:{missingProperty: "level"},message:"must have required property '"+"level"+"'"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
if(data10.rationale === undefined){
const err35 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/required",keyword:"required",params:{missingProperty: "rationale"},message:"must have required property '"+"rationale"+"'"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
for(const key2 in data10){
if(!(((key2 === "id") || (key2 === "level")) || (key2 === "rationale"))){
const err36 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data10.id !== undefined){
let data11 = data10.id;
if(!(((((((data11 === "slope") || (data11 === "terrain_roughness")) || (data11 === "local_relief")) || (data11 === "bare_ground_fraction")) || (data11 === "aridity_context")) || (data11 === "surface_temperature_variability")) || (data11 === "geologic_relevance"))){
const err37 = {instancePath:instancePath+"/criteria/" + i0+"/id",schemaPath:"#/$defs/criterionId/enum",keyword:"enum",params:{allowedValues: schema33.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
if(data10.level !== undefined){
let data12 = data10.level;
if(!((((data12 === 0) || (data12 === 1)) || (data12 === 2)) || (data12 === 3))){
const err38 = {instancePath:instancePath+"/criteria/" + i0+"/level",schemaPath:"#/properties/criteria/items/properties/level/enum",keyword:"enum",params:{allowedValues: schema31.properties.criteria.items.properties.level.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data10.rationale !== undefined){
let data13 = data10.rationale;
if(typeof data13 === "string"){
if(func2(data13) > 280){
const err39 = {instancePath:instancePath+"/criteria/" + i0+"/rationale",schemaPath:"#/$defs/plainText/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(func2(data13) < 1){
const err40 = {instancePath:instancePath+"/criteria/" + i0+"/rationale",schemaPath:"#/$defs/plainText/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(!pattern6.test(data13)){
const err41 = {instancePath:instancePath+"/criteria/" + i0+"/rationale",schemaPath:"#/$defs/plainText/pattern",keyword:"pattern",params:{pattern: "^[^0-9%]*$"},message:"must match pattern \""+"^[^0-9%]*$"+"\""};
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
const err42 = {instancePath:instancePath+"/criteria/" + i0+"/rationale",schemaPath:"#/$defs/plainText/type",keyword:"type",params:{type: "string"},message:"must be string"};
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
else {
const err43 = {instancePath:instancePath+"/criteria/" + i0,schemaPath:"#/properties/criteria/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
}
else {
const err44 = {instancePath:instancePath+"/criteria",schemaPath:"#/properties/criteria/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(data.assumptions !== undefined){
let data14 = data.assumptions;
if(Array.isArray(data14)){
if(data14.length > 8){
const err45 = {instancePath:instancePath+"/assumptions",schemaPath:"#/properties/assumptions/maxItems",keyword:"maxItems",params:{limit: 8},message:"must NOT have more than 8 items"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
const len1 = data14.length;
for(let i1=0; i1<len1; i1++){
let data15 = data14[i1];
if(typeof data15 === "string"){
if(func2(data15) > 280){
const err46 = {instancePath:instancePath+"/assumptions/" + i1,schemaPath:"#/$defs/plainText/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
if(func2(data15) < 1){
const err47 = {instancePath:instancePath+"/assumptions/" + i1,schemaPath:"#/$defs/plainText/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
if(!pattern6.test(data15)){
const err48 = {instancePath:instancePath+"/assumptions/" + i1,schemaPath:"#/$defs/plainText/pattern",keyword:"pattern",params:{pattern: "^[^0-9%]*$"},message:"must match pattern \""+"^[^0-9%]*$"+"\""};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
else {
const err49 = {instancePath:instancePath+"/assumptions/" + i1,schemaPath:"#/$defs/plainText/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
}
else {
const err50 = {instancePath:instancePath+"/assumptions",schemaPath:"#/properties/assumptions/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
if(data.unsupported !== undefined){
let data16 = data.unsupported;
if(Array.isArray(data16)){
if(data16.length > 8){
const err51 = {instancePath:instancePath+"/unsupported",schemaPath:"#/properties/unsupported/maxItems",keyword:"maxItems",params:{limit: 8},message:"must NOT have more than 8 items"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
const len2 = data16.length;
for(let i2=0; i2<len2; i2++){
let data17 = data16[i2];
if(data17 && typeof data17 == "object" && !Array.isArray(data17)){
if(data17.phrase === undefined){
const err52 = {instancePath:instancePath+"/unsupported/" + i2,schemaPath:"#/properties/unsupported/items/required",keyword:"required",params:{missingProperty: "phrase"},message:"must have required property '"+"phrase"+"'"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if(data17.reason === undefined){
const err53 = {instancePath:instancePath+"/unsupported/" + i2,schemaPath:"#/properties/unsupported/items/required",keyword:"required",params:{missingProperty: "reason"},message:"must have required property '"+"reason"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
for(const key3 in data17){
if(!((key3 === "phrase") || (key3 === "reason"))){
const err54 = {instancePath:instancePath+"/unsupported/" + i2,schemaPath:"#/properties/unsupported/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
if(data17.phrase !== undefined){
let data18 = data17.phrase;
if(typeof data18 === "string"){
if(func2(data18) > 120){
const err55 = {instancePath:instancePath+"/unsupported/" + i2+"/phrase",schemaPath:"#/properties/unsupported/items/properties/phrase/maxLength",keyword:"maxLength",params:{limit: 120},message:"must NOT have more than 120 characters"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
if(func2(data18) < 1){
const err56 = {instancePath:instancePath+"/unsupported/" + i2+"/phrase",schemaPath:"#/properties/unsupported/items/properties/phrase/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(!pattern6.test(data18)){
const err57 = {instancePath:instancePath+"/unsupported/" + i2+"/phrase",schemaPath:"#/properties/unsupported/items/properties/phrase/pattern",keyword:"pattern",params:{pattern: "^[^0-9%]*$"},message:"must match pattern \""+"^[^0-9%]*$"+"\""};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
else {
const err58 = {instancePath:instancePath+"/unsupported/" + i2+"/phrase",schemaPath:"#/properties/unsupported/items/properties/phrase/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
if(data17.reason !== undefined){
let data19 = data17.reason;
if(!(((data19 === "not_measured") || (data19 === "out_of_scope")) || (data19 === "ambiguous"))){
const err59 = {instancePath:instancePath+"/unsupported/" + i2+"/reason",schemaPath:"#/properties/unsupported/items/properties/reason/enum",keyword:"enum",params:{allowedValues: schema31.properties.unsupported.items.properties.reason.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
}
}
else {
const err60 = {instancePath:instancePath+"/unsupported/" + i2,schemaPath:"#/properties/unsupported/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
}
else {
const err61 = {instancePath:instancePath+"/unsupported",schemaPath:"#/properties/unsupported/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
}
else {
const err62 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
validate20.errors = vErrors;
return errors === 0;
}
validate20.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateEvidencePacket = validate21;
const schema36 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://analogos.cl/schemas/evidence-packet.schema.json","title":"AnalogOS · paquete de evidencia (evidence-packet/1)","description":"Única fuente de la que la IA puede citar (docs/UX_REDESIGN.md §5.3). Lo arma el cliente con cifras ya formateadas por el motor determinista; la IA solo puede referirse a ellas con marcadores {{id}}. La huella es FNV-1a de 64 bits sobre la forma canónica del paquete.","type":"object","additionalProperties":false,"required":["schema","packet_hash","snapshot","profile","mission_summary","sites","facts","fact_kinds","checks","unsupported"],"properties":{"schema":{"const":"evidence-packet/1"},"packet_hash":{"type":"string","pattern":"^fnv1a64:[0-9a-f]{16}$"},"snapshot":{"type":"string","pattern":"^[a-z0-9.-]+$","maxLength":80},"profile":{"type":"object","additionalProperties":false,"required":["id","origin","status","weights"],"properties":{"id":{"type":"string","pattern":"^(mission:[0-9a-f]{8,16}|[a-z0-9-]+)$"},"origin":{"enum":["snapshot","preset","mission"]},"status":{"enum":["needs_calibration","validated"]},"weights":{"type":"object","propertyNames":{"$ref":"#/$defs/criterionId"},"additionalProperties":{"type":"number","minimum":0,"maximum":1}}}},"mission_summary":{"oneOf":[{"type":"null"},{"type":"string","minLength":1,"maxLength":280,"pattern":"^[^0-9%]*$"}]},"sites":{"type":"array","minItems":1,"maxItems":12,"uniqueItems":true,"items":{"$ref":"#/$defs/siteId"}},"facts":{"description":"Hecho citable → texto ya formateado (es-CL) por el cliente. Las cifras viven solo aquí.","type":"object","propertyNames":{"$ref":"#/$defs/factId"},"additionalProperties":{"type":"string","minLength":1,"maxLength":80}},"fact_kinds":{"type":"array","maxItems":64,"items":{"oneOf":[{"type":"object","additionalProperties":false,"required":["kind","site_id","criterion_id"],"properties":{"kind":{"enum":["limiting_factor","best_of_n","saturates_rule"]},"site_id":{"$ref":"#/$defs/siteId"},"criterion_id":{"$ref":"#/$defs/criterionId"}}},{"type":"object","additionalProperties":false,"required":["kind","criterion_id"],"properties":{"kind":{"const":"no_discrimination"},"criterion_id":{"$ref":"#/$defs/criterionId"}}},{"type":"object","additionalProperties":false,"required":["kind","criterion_id","site_ids"],"properties":{"kind":{"const":"shared_regional_value"},"criterion_id":{"$ref":"#/$defs/criterionId"},"site_ids":{"type":"array","minItems":2,"uniqueItems":true,"items":{"$ref":"#/$defs/siteId"}}}},{"type":"object","additionalProperties":false,"required":["kind","site_id","criterion_id","direction"],"properties":{"kind":{"const":"direction_vs_mars"},"site_id":{"$ref":"#/$defs/siteId"},"criterion_id":{"enum":["slope","terrain_roughness","local_relief"]},"direction":{"enum":["more_demanding","less_demanding","similar"]}}}]}},"checks":{"description":"Verificaciones de terreno del snapshot (field_checks), citables por la IA para ordenar la checklist.","type":"object","propertyNames":{"pattern":"^check:cl-[a-z0-9-]+:[0-9]{1,2}$"},"additionalProperties":{"type":"string","minLength":1,"maxLength":400}},"unsupported":{"type":"array","maxItems":8,"items":{"type":"object","additionalProperties":false,"required":["phrase","reason"],"properties":{"phrase":{"type":"string","minLength":1,"maxLength":120},"reason":{"enum":["not_measured","out_of_scope","ambiguous"]}}}}},"$defs":{"siteId":{"type":"string","pattern":"^cl-[a-z0-9-]+$"},"criterionId":{"enum":["slope","terrain_roughness","local_relief","bare_ground_fraction","aridity_context","surface_temperature_variability","geologic_relevance"]},"factId":{"description":"site:<id>:<criterio>:(raw|sim|ratio|vs_mars) · site:<id>:(similarity|confidence|stability|feasibility|rank) · mars:<criterio> · coverage:<id> · rank:gap:<a>:<b> · sens:<clave>","type":"string","pattern":"^(site:cl-[a-z0-9-]+:([a-z_]+:(raw|sim|ratio|vs_mars)|similarity|confidence|stability|feasibility|rank)|mars:[a-z_]+|coverage:cl-[a-z0-9-]+|rank:gap:[0-9]{1,2}:[0-9]{1,2}|sens:[a-z_]+)$"}}};
const schema37 = {"enum":["slope","terrain_roughness","local_relief","bare_ground_fraction","aridity_context","surface_temperature_variability","geologic_relevance"]};
const schema38 = {"type":"string","pattern":"^cl-[a-z0-9-]+$"};
const schema39 = {"description":"site:<id>:<criterio>:(raw|sim|ratio|vs_mars) · site:<id>:(similarity|confidence|stability|feasibility|rank) · mars:<criterio> · coverage:<id> · rank:gap:<a>:<b> · sens:<clave>","type":"string","pattern":"^(site:cl-[a-z0-9-]+:([a-z_]+:(raw|sim|ratio|vs_mars)|similarity|confidence|stability|feasibility|rank)|mars:[a-z_]+|coverage:cl-[a-z0-9-]+|rank:gap:[0-9]{1,2}:[0-9]{1,2}|sens:[a-z_]+)$"};
const func0 = __interop(__dep1);
const pattern10 = new RegExp("^fnv1a64:[0-9a-f]{16}$", "u");
const pattern11 = new RegExp("^[a-z0-9.-]+$", "u");
const pattern12 = new RegExp("^(mission:[0-9a-f]{8,16}|[a-z0-9-]+)$", "u");
const pattern14 = new RegExp("^cl-[a-z0-9-]+$", "u");
const pattern15 = new RegExp("^(site:cl-[a-z0-9-]+:([a-z_]+:(raw|sim|ratio|vs_mars)|similarity|confidence|stability|feasibility|rank)|mars:[a-z_]+|coverage:cl-[a-z0-9-]+|rank:gap:[0-9]{1,2}:[0-9]{1,2}|sens:[a-z_]+)$", "u");
const pattern19 = new RegExp("^check:cl-[a-z0-9-]+:[0-9]{1,2}$", "u");

function validate21(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://analogos.cl/schemas/evidence-packet.schema.json" */;
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
if(data.packet_hash === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "packet_hash"},message:"must have required property '"+"packet_hash"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.snapshot === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "snapshot"},message:"must have required property '"+"snapshot"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.profile === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "profile"},message:"must have required property '"+"profile"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.mission_summary === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "mission_summary"},message:"must have required property '"+"mission_summary"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.sites === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "sites"},message:"must have required property '"+"sites"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.facts === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "facts"},message:"must have required property '"+"facts"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.fact_kinds === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "fact_kinds"},message:"must have required property '"+"fact_kinds"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.checks === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "checks"},message:"must have required property '"+"checks"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.unsupported === undefined){
const err9 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "unsupported"},message:"must have required property '"+"unsupported"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema36.properties, key0))){
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
if(data.schema !== undefined){
if("evidence-packet/1" !== data.schema){
const err11 = {instancePath:instancePath+"/schema",schemaPath:"#/properties/schema/const",keyword:"const",params:{allowedValue: "evidence-packet/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.packet_hash !== undefined){
let data1 = data.packet_hash;
if(typeof data1 === "string"){
if(!pattern10.test(data1)){
const err12 = {instancePath:instancePath+"/packet_hash",schemaPath:"#/properties/packet_hash/pattern",keyword:"pattern",params:{pattern: "^fnv1a64:[0-9a-f]{16}$"},message:"must match pattern \""+"^fnv1a64:[0-9a-f]{16}$"+"\""};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/packet_hash",schemaPath:"#/properties/packet_hash/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.snapshot !== undefined){
let data2 = data.snapshot;
if(typeof data2 === "string"){
if(func2(data2) > 80){
const err14 = {instancePath:instancePath+"/snapshot",schemaPath:"#/properties/snapshot/maxLength",keyword:"maxLength",params:{limit: 80},message:"must NOT have more than 80 characters"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(!pattern11.test(data2)){
const err15 = {instancePath:instancePath+"/snapshot",schemaPath:"#/properties/snapshot/pattern",keyword:"pattern",params:{pattern: "^[a-z0-9.-]+$"},message:"must match pattern \""+"^[a-z0-9.-]+$"+"\""};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
else {
const err16 = {instancePath:instancePath+"/snapshot",schemaPath:"#/properties/snapshot/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data.profile !== undefined){
let data3 = data.profile;
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.id === undefined){
const err17 = {instancePath:instancePath+"/profile",schemaPath:"#/properties/profile/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(data3.origin === undefined){
const err18 = {instancePath:instancePath+"/profile",schemaPath:"#/properties/profile/required",keyword:"required",params:{missingProperty: "origin"},message:"must have required property '"+"origin"+"'"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
if(data3.status === undefined){
const err19 = {instancePath:instancePath+"/profile",schemaPath:"#/properties/profile/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if(data3.weights === undefined){
const err20 = {instancePath:instancePath+"/profile",schemaPath:"#/properties/profile/required",keyword:"required",params:{missingProperty: "weights"},message:"must have required property '"+"weights"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
for(const key1 in data3){
if(!((((key1 === "id") || (key1 === "origin")) || (key1 === "status")) || (key1 === "weights"))){
const err21 = {instancePath:instancePath+"/profile",schemaPath:"#/properties/profile/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data3.id !== undefined){
let data4 = data3.id;
if(typeof data4 === "string"){
if(!pattern12.test(data4)){
const err22 = {instancePath:instancePath+"/profile/id",schemaPath:"#/properties/profile/properties/id/pattern",keyword:"pattern",params:{pattern: "^(mission:[0-9a-f]{8,16}|[a-z0-9-]+)$"},message:"must match pattern \""+"^(mission:[0-9a-f]{8,16}|[a-z0-9-]+)$"+"\""};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
else {
const err23 = {instancePath:instancePath+"/profile/id",schemaPath:"#/properties/profile/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data3.origin !== undefined){
let data5 = data3.origin;
if(!(((data5 === "snapshot") || (data5 === "preset")) || (data5 === "mission"))){
const err24 = {instancePath:instancePath+"/profile/origin",schemaPath:"#/properties/profile/properties/origin/enum",keyword:"enum",params:{allowedValues: schema36.properties.profile.properties.origin.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data3.status !== undefined){
let data6 = data3.status;
if(!((data6 === "needs_calibration") || (data6 === "validated"))){
const err25 = {instancePath:instancePath+"/profile/status",schemaPath:"#/properties/profile/properties/status/enum",keyword:"enum",params:{allowedValues: schema36.properties.profile.properties.status.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
if(data3.weights !== undefined){
let data7 = data3.weights;
if(data7 && typeof data7 == "object" && !Array.isArray(data7)){
for(const key2 in data7){
const _errs16 = errors;
if(!(((((((key2 === "slope") || (key2 === "terrain_roughness")) || (key2 === "local_relief")) || (key2 === "bare_ground_fraction")) || (key2 === "aridity_context")) || (key2 === "surface_temperature_variability")) || (key2 === "geologic_relevance"))){
const err26 = {instancePath:instancePath+"/profile/weights",schemaPath:"#/$defs/criterionId/enum",keyword:"enum",params:{allowedValues: schema37.enum},message:"must be equal to one of the allowed values",propertyName:key2};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
var valid2 = _errs16 === errors;
if(!valid2){
const err27 = {instancePath:instancePath+"/profile/weights",schemaPath:"#/properties/profile/properties/weights/propertyNames",keyword:"propertyNames",params:{propertyName: key2},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
for(const key3 in data7){
let data8 = data7[key3];
if(typeof data8 == "number"){
if(data8 > 1 || isNaN(data8)){
const err28 = {instancePath:instancePath+"/profile/weights/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/profile/properties/weights/additionalProperties/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1},message:"must be <= 1"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data8 < 0 || isNaN(data8)){
const err29 = {instancePath:instancePath+"/profile/weights/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/profile/properties/weights/additionalProperties/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
else {
const err30 = {instancePath:instancePath+"/profile/weights/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/profile/properties/weights/additionalProperties/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
}
else {
const err31 = {instancePath:instancePath+"/profile/weights",schemaPath:"#/properties/profile/properties/weights/type",keyword:"type",params:{type: "object"},message:"must be object"};
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
const err32 = {instancePath:instancePath+"/profile",schemaPath:"#/properties/profile/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data.mission_summary !== undefined){
let data9 = data.mission_summary;
const _errs22 = errors;
let valid5 = false;
let passing0 = null;
const _errs23 = errors;
if(data9 !== null){
const err33 = {instancePath:instancePath+"/mission_summary",schemaPath:"#/properties/mission_summary/oneOf/0/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
var _valid0 = _errs23 === errors;
if(_valid0){
valid5 = true;
passing0 = 0;
}
const _errs25 = errors;
if(typeof data9 === "string"){
if(func2(data9) > 280){
const err34 = {instancePath:instancePath+"/mission_summary",schemaPath:"#/properties/mission_summary/oneOf/1/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
if(func2(data9) < 1){
const err35 = {instancePath:instancePath+"/mission_summary",schemaPath:"#/properties/mission_summary/oneOf/1/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if(!pattern6.test(data9)){
const err36 = {instancePath:instancePath+"/mission_summary",schemaPath:"#/properties/mission_summary/oneOf/1/pattern",keyword:"pattern",params:{pattern: "^[^0-9%]*$"},message:"must match pattern \""+"^[^0-9%]*$"+"\""};
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
const err37 = {instancePath:instancePath+"/mission_summary",schemaPath:"#/properties/mission_summary/oneOf/1/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
var _valid0 = _errs25 === errors;
if(_valid0 && valid5){
valid5 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid5 = true;
passing0 = 1;
}
}
if(!valid5){
const err38 = {instancePath:instancePath+"/mission_summary",schemaPath:"#/properties/mission_summary/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
else {
errors = _errs22;
if(vErrors !== null){
if(_errs22){
vErrors.length = _errs22;
}
else {
vErrors = null;
}
}
}
}
if(data.sites !== undefined){
let data10 = data.sites;
if(Array.isArray(data10)){
if(data10.length > 12){
const err39 = {instancePath:instancePath+"/sites",schemaPath:"#/properties/sites/maxItems",keyword:"maxItems",params:{limit: 12},message:"must NOT have more than 12 items"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(data10.length < 1){
const err40 = {instancePath:instancePath+"/sites",schemaPath:"#/properties/sites/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
const len0 = data10.length;
for(let i0=0; i0<len0; i0++){
let data11 = data10[i0];
if(typeof data11 === "string"){
if(!pattern14.test(data11)){
const err41 = {instancePath:instancePath+"/sites/" + i0,schemaPath:"#/$defs/siteId/pattern",keyword:"pattern",params:{pattern: "^cl-[a-z0-9-]+$"},message:"must match pattern \""+"^cl-[a-z0-9-]+$"+"\""};
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
const err42 = {instancePath:instancePath+"/sites/" + i0,schemaPath:"#/$defs/siteId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
let i1 = data10.length;
let j0;
if(i1 > 1){
outer0:
for(;i1--;){
for(j0 = i1; j0--;){
if(func0(data10[i1], data10[j0])){
const err43 = {instancePath:instancePath+"/sites",schemaPath:"#/properties/sites/uniqueItems",keyword:"uniqueItems",params:{i: i1, j: j0},message:"must NOT have duplicate items (items ## "+j0+" and "+i1+" are identical)"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
break outer0;
}
}
}
}
}
else {
const err44 = {instancePath:instancePath+"/sites",schemaPath:"#/properties/sites/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(data.facts !== undefined){
let data12 = data.facts;
if(data12 && typeof data12 == "object" && !Array.isArray(data12)){
for(const key4 in data12){
const _errs34 = errors;
if(typeof key4 === "string"){
if(!pattern15.test(key4)){
const err45 = {instancePath:instancePath+"/facts",schemaPath:"#/$defs/factId/pattern",keyword:"pattern",params:{pattern: "^(site:cl-[a-z0-9-]+:([a-z_]+:(raw|sim|ratio|vs_mars)|similarity|confidence|stability|feasibility|rank)|mars:[a-z_]+|coverage:cl-[a-z0-9-]+|rank:gap:[0-9]{1,2}:[0-9]{1,2}|sens:[a-z_]+)$"},message:"must match pattern \""+"^(site:cl-[a-z0-9-]+:([a-z_]+:(raw|sim|ratio|vs_mars)|similarity|confidence|stability|feasibility|rank)|mars:[a-z_]+|coverage:cl-[a-z0-9-]+|rank:gap:[0-9]{1,2}:[0-9]{1,2}|sens:[a-z_]+)$"+"\"",propertyName:key4};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
else {
const err46 = {instancePath:instancePath+"/facts",schemaPath:"#/$defs/factId/type",keyword:"type",params:{type: "string"},message:"must be string",propertyName:key4};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
var valid10 = _errs34 === errors;
if(!valid10){
const err47 = {instancePath:instancePath+"/facts",schemaPath:"#/properties/facts/propertyNames",keyword:"propertyNames",params:{propertyName: key4},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
for(const key5 in data12){
let data13 = data12[key5];
if(typeof data13 === "string"){
if(func2(data13) > 80){
const err48 = {instancePath:instancePath+"/facts/" + key5.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/facts/additionalProperties/maxLength",keyword:"maxLength",params:{limit: 80},message:"must NOT have more than 80 characters"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
if(func2(data13) < 1){
const err49 = {instancePath:instancePath+"/facts/" + key5.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/facts/additionalProperties/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
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
const err50 = {instancePath:instancePath+"/facts/" + key5.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/facts/additionalProperties/type",keyword:"type",params:{type: "string"},message:"must be string"};
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
const err51 = {instancePath:instancePath+"/facts",schemaPath:"#/properties/facts/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
if(data.fact_kinds !== undefined){
let data14 = data.fact_kinds;
if(Array.isArray(data14)){
if(data14.length > 64){
const err52 = {instancePath:instancePath+"/fact_kinds",schemaPath:"#/properties/fact_kinds/maxItems",keyword:"maxItems",params:{limit: 64},message:"must NOT have more than 64 items"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
const len1 = data14.length;
for(let i2=0; i2<len1; i2++){
let data15 = data14[i2];
const _errs43 = errors;
let valid15 = false;
let passing1 = null;
const _errs44 = errors;
if(data15 && typeof data15 == "object" && !Array.isArray(data15)){
if(data15.kind === undefined){
const err53 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/0/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(data15.site_id === undefined){
const err54 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/0/required",keyword:"required",params:{missingProperty: "site_id"},message:"must have required property '"+"site_id"+"'"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
if(data15.criterion_id === undefined){
const err55 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/0/required",keyword:"required",params:{missingProperty: "criterion_id"},message:"must have required property '"+"criterion_id"+"'"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
for(const key6 in data15){
if(!(((key6 === "kind") || (key6 === "site_id")) || (key6 === "criterion_id"))){
const err56 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
}
if(data15.kind !== undefined){
let data16 = data15.kind;
if(!(((data16 === "limiting_factor") || (data16 === "best_of_n")) || (data16 === "saturates_rule"))){
const err57 = {instancePath:instancePath+"/fact_kinds/" + i2+"/kind",schemaPath:"#/properties/fact_kinds/items/oneOf/0/properties/kind/enum",keyword:"enum",params:{allowedValues: schema36.properties.fact_kinds.items.oneOf[0].properties.kind.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
if(data15.site_id !== undefined){
let data17 = data15.site_id;
if(typeof data17 === "string"){
if(!pattern14.test(data17)){
const err58 = {instancePath:instancePath+"/fact_kinds/" + i2+"/site_id",schemaPath:"#/$defs/siteId/pattern",keyword:"pattern",params:{pattern: "^cl-[a-z0-9-]+$"},message:"must match pattern \""+"^cl-[a-z0-9-]+$"+"\""};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
else {
const err59 = {instancePath:instancePath+"/fact_kinds/" + i2+"/site_id",schemaPath:"#/$defs/siteId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
}
if(data15.criterion_id !== undefined){
let data18 = data15.criterion_id;
if(!(((((((data18 === "slope") || (data18 === "terrain_roughness")) || (data18 === "local_relief")) || (data18 === "bare_ground_fraction")) || (data18 === "aridity_context")) || (data18 === "surface_temperature_variability")) || (data18 === "geologic_relevance"))){
const err60 = {instancePath:instancePath+"/fact_kinds/" + i2+"/criterion_id",schemaPath:"#/$defs/criterionId/enum",keyword:"enum",params:{allowedValues: schema37.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
}
else {
const err61 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
var _valid1 = _errs44 === errors;
if(_valid1){
valid15 = true;
passing1 = 0;
var props0 = true;
}
const _errs53 = errors;
if(data15 && typeof data15 == "object" && !Array.isArray(data15)){
if(data15.kind === undefined){
const err62 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/1/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
if(data15.criterion_id === undefined){
const err63 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/1/required",keyword:"required",params:{missingProperty: "criterion_id"},message:"must have required property '"+"criterion_id"+"'"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
for(const key7 in data15){
if(!((key7 === "kind") || (key7 === "criterion_id"))){
const err64 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key7},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
}
if(data15.kind !== undefined){
if("no_discrimination" !== data15.kind){
const err65 = {instancePath:instancePath+"/fact_kinds/" + i2+"/kind",schemaPath:"#/properties/fact_kinds/items/oneOf/1/properties/kind/const",keyword:"const",params:{allowedValue: "no_discrimination"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
}
if(data15.criterion_id !== undefined){
let data20 = data15.criterion_id;
if(!(((((((data20 === "slope") || (data20 === "terrain_roughness")) || (data20 === "local_relief")) || (data20 === "bare_ground_fraction")) || (data20 === "aridity_context")) || (data20 === "surface_temperature_variability")) || (data20 === "geologic_relevance"))){
const err66 = {instancePath:instancePath+"/fact_kinds/" + i2+"/criterion_id",schemaPath:"#/$defs/criterionId/enum",keyword:"enum",params:{allowedValues: schema37.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
}
}
else {
const err67 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
var _valid1 = _errs53 === errors;
if(_valid1 && valid15){
valid15 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid15 = true;
passing1 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs59 = errors;
if(data15 && typeof data15 == "object" && !Array.isArray(data15)){
if(data15.kind === undefined){
const err68 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/2/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
if(data15.criterion_id === undefined){
const err69 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/2/required",keyword:"required",params:{missingProperty: "criterion_id"},message:"must have required property '"+"criterion_id"+"'"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
if(data15.site_ids === undefined){
const err70 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/2/required",keyword:"required",params:{missingProperty: "site_ids"},message:"must have required property '"+"site_ids"+"'"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
for(const key8 in data15){
if(!(((key8 === "kind") || (key8 === "criterion_id")) || (key8 === "site_ids"))){
const err71 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/2/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key8},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
}
if(data15.kind !== undefined){
if("shared_regional_value" !== data15.kind){
const err72 = {instancePath:instancePath+"/fact_kinds/" + i2+"/kind",schemaPath:"#/properties/fact_kinds/items/oneOf/2/properties/kind/const",keyword:"const",params:{allowedValue: "shared_regional_value"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
}
if(data15.criterion_id !== undefined){
let data22 = data15.criterion_id;
if(!(((((((data22 === "slope") || (data22 === "terrain_roughness")) || (data22 === "local_relief")) || (data22 === "bare_ground_fraction")) || (data22 === "aridity_context")) || (data22 === "surface_temperature_variability")) || (data22 === "geologic_relevance"))){
const err73 = {instancePath:instancePath+"/fact_kinds/" + i2+"/criterion_id",schemaPath:"#/$defs/criterionId/enum",keyword:"enum",params:{allowedValues: schema37.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
}
if(data15.site_ids !== undefined){
let data23 = data15.site_ids;
if(Array.isArray(data23)){
if(data23.length < 2){
const err74 = {instancePath:instancePath+"/fact_kinds/" + i2+"/site_ids",schemaPath:"#/properties/fact_kinds/items/oneOf/2/properties/site_ids/minItems",keyword:"minItems",params:{limit: 2},message:"must NOT have fewer than 2 items"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
const len2 = data23.length;
for(let i3=0; i3<len2; i3++){
let data24 = data23[i3];
if(typeof data24 === "string"){
if(!pattern14.test(data24)){
const err75 = {instancePath:instancePath+"/fact_kinds/" + i2+"/site_ids/" + i3,schemaPath:"#/$defs/siteId/pattern",keyword:"pattern",params:{pattern: "^cl-[a-z0-9-]+$"},message:"must match pattern \""+"^cl-[a-z0-9-]+$"+"\""};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
}
else {
const err76 = {instancePath:instancePath+"/fact_kinds/" + i2+"/site_ids/" + i3,schemaPath:"#/$defs/siteId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
}
let i4 = data23.length;
let j1;
if(i4 > 1){
outer1:
for(;i4--;){
for(j1 = i4; j1--;){
if(func0(data23[i4], data23[j1])){
const err77 = {instancePath:instancePath+"/fact_kinds/" + i2+"/site_ids",schemaPath:"#/properties/fact_kinds/items/oneOf/2/properties/site_ids/uniqueItems",keyword:"uniqueItems",params:{i: i4, j: j1},message:"must NOT have duplicate items (items ## "+j1+" and "+i4+" are identical)"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
break outer1;
}
}
}
}
}
else {
const err78 = {instancePath:instancePath+"/fact_kinds/" + i2+"/site_ids",schemaPath:"#/properties/fact_kinds/items/oneOf/2/properties/site_ids/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
}
}
else {
const err79 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
var _valid1 = _errs59 === errors;
if(_valid1 && valid15){
valid15 = false;
passing1 = [passing1, 2];
}
else {
if(_valid1){
valid15 = true;
passing1 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs70 = errors;
if(data15 && typeof data15 == "object" && !Array.isArray(data15)){
if(data15.kind === undefined){
const err80 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/3/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
if(data15.site_id === undefined){
const err81 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/3/required",keyword:"required",params:{missingProperty: "site_id"},message:"must have required property '"+"site_id"+"'"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
if(data15.criterion_id === undefined){
const err82 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/3/required",keyword:"required",params:{missingProperty: "criterion_id"},message:"must have required property '"+"criterion_id"+"'"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
if(data15.direction === undefined){
const err83 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/3/required",keyword:"required",params:{missingProperty: "direction"},message:"must have required property '"+"direction"+"'"};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
for(const key9 in data15){
if(!((((key9 === "kind") || (key9 === "site_id")) || (key9 === "criterion_id")) || (key9 === "direction"))){
const err84 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/3/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key9},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
}
if(data15.kind !== undefined){
if("direction_vs_mars" !== data15.kind){
const err85 = {instancePath:instancePath+"/fact_kinds/" + i2+"/kind",schemaPath:"#/properties/fact_kinds/items/oneOf/3/properties/kind/const",keyword:"const",params:{allowedValue: "direction_vs_mars"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
}
if(data15.site_id !== undefined){
let data26 = data15.site_id;
if(typeof data26 === "string"){
if(!pattern14.test(data26)){
const err86 = {instancePath:instancePath+"/fact_kinds/" + i2+"/site_id",schemaPath:"#/$defs/siteId/pattern",keyword:"pattern",params:{pattern: "^cl-[a-z0-9-]+$"},message:"must match pattern \""+"^cl-[a-z0-9-]+$"+"\""};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
}
else {
const err87 = {instancePath:instancePath+"/fact_kinds/" + i2+"/site_id",schemaPath:"#/$defs/siteId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
}
if(data15.criterion_id !== undefined){
let data27 = data15.criterion_id;
if(!(((data27 === "slope") || (data27 === "terrain_roughness")) || (data27 === "local_relief"))){
const err88 = {instancePath:instancePath+"/fact_kinds/" + i2+"/criterion_id",schemaPath:"#/properties/fact_kinds/items/oneOf/3/properties/criterion_id/enum",keyword:"enum",params:{allowedValues: schema36.properties.fact_kinds.items.oneOf[3].properties.criterion_id.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
}
if(data15.direction !== undefined){
let data28 = data15.direction;
if(!(((data28 === "more_demanding") || (data28 === "less_demanding")) || (data28 === "similar"))){
const err89 = {instancePath:instancePath+"/fact_kinds/" + i2+"/direction",schemaPath:"#/properties/fact_kinds/items/oneOf/3/properties/direction/enum",keyword:"enum",params:{allowedValues: schema36.properties.fact_kinds.items.oneOf[3].properties.direction.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
}
}
else {
const err90 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf/3/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
var _valid1 = _errs70 === errors;
if(_valid1 && valid15){
valid15 = false;
passing1 = [passing1, 3];
}
else {
if(_valid1){
valid15 = true;
passing1 = 3;
if(props0 !== true){
props0 = true;
}
}
}
}
}
if(!valid15){
const err91 = {instancePath:instancePath+"/fact_kinds/" + i2,schemaPath:"#/properties/fact_kinds/items/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
else {
errors = _errs43;
if(vErrors !== null){
if(_errs43){
vErrors.length = _errs43;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err92 = {instancePath:instancePath+"/fact_kinds",schemaPath:"#/properties/fact_kinds/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
}
if(data.checks !== undefined){
let data29 = data.checks;
if(data29 && typeof data29 == "object" && !Array.isArray(data29)){
for(const key10 in data29){
const _errs81 = errors;
if(typeof key10 === "string"){
if(!pattern19.test(key10)){
const err93 = {instancePath:instancePath+"/checks",schemaPath:"#/properties/checks/propertyNames/pattern",keyword:"pattern",params:{pattern: "^check:cl-[a-z0-9-]+:[0-9]{1,2}$"},message:"must match pattern \""+"^check:cl-[a-z0-9-]+:[0-9]{1,2}$"+"\"",propertyName:key10};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
}
var valid29 = _errs81 === errors;
if(!valid29){
const err94 = {instancePath:instancePath+"/checks",schemaPath:"#/properties/checks/propertyNames",keyword:"propertyNames",params:{propertyName: key10},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
}
for(const key11 in data29){
let data30 = data29[key11];
if(typeof data30 === "string"){
if(func2(data30) > 400){
const err95 = {instancePath:instancePath+"/checks/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/checks/additionalProperties/maxLength",keyword:"maxLength",params:{limit: 400},message:"must NOT have more than 400 characters"};
if(vErrors === null){
vErrors = [err95];
}
else {
vErrors.push(err95);
}
errors++;
}
if(func2(data30) < 1){
const err96 = {instancePath:instancePath+"/checks/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/checks/additionalProperties/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err96];
}
else {
vErrors.push(err96);
}
errors++;
}
}
else {
const err97 = {instancePath:instancePath+"/checks/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/checks/additionalProperties/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err97];
}
else {
vErrors.push(err97);
}
errors++;
}
}
}
else {
const err98 = {instancePath:instancePath+"/checks",schemaPath:"#/properties/checks/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err98];
}
else {
vErrors.push(err98);
}
errors++;
}
}
if(data.unsupported !== undefined){
let data31 = data.unsupported;
if(Array.isArray(data31)){
if(data31.length > 8){
const err99 = {instancePath:instancePath+"/unsupported",schemaPath:"#/properties/unsupported/maxItems",keyword:"maxItems",params:{limit: 8},message:"must NOT have more than 8 items"};
if(vErrors === null){
vErrors = [err99];
}
else {
vErrors.push(err99);
}
errors++;
}
const len3 = data31.length;
for(let i5=0; i5<len3; i5++){
let data32 = data31[i5];
if(data32 && typeof data32 == "object" && !Array.isArray(data32)){
if(data32.phrase === undefined){
const err100 = {instancePath:instancePath+"/unsupported/" + i5,schemaPath:"#/properties/unsupported/items/required",keyword:"required",params:{missingProperty: "phrase"},message:"must have required property '"+"phrase"+"'"};
if(vErrors === null){
vErrors = [err100];
}
else {
vErrors.push(err100);
}
errors++;
}
if(data32.reason === undefined){
const err101 = {instancePath:instancePath+"/unsupported/" + i5,schemaPath:"#/properties/unsupported/items/required",keyword:"required",params:{missingProperty: "reason"},message:"must have required property '"+"reason"+"'"};
if(vErrors === null){
vErrors = [err101];
}
else {
vErrors.push(err101);
}
errors++;
}
for(const key12 in data32){
if(!((key12 === "phrase") || (key12 === "reason"))){
const err102 = {instancePath:instancePath+"/unsupported/" + i5,schemaPath:"#/properties/unsupported/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key12},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err102];
}
else {
vErrors.push(err102);
}
errors++;
}
}
if(data32.phrase !== undefined){
let data33 = data32.phrase;
if(typeof data33 === "string"){
if(func2(data33) > 120){
const err103 = {instancePath:instancePath+"/unsupported/" + i5+"/phrase",schemaPath:"#/properties/unsupported/items/properties/phrase/maxLength",keyword:"maxLength",params:{limit: 120},message:"must NOT have more than 120 characters"};
if(vErrors === null){
vErrors = [err103];
}
else {
vErrors.push(err103);
}
errors++;
}
if(func2(data33) < 1){
const err104 = {instancePath:instancePath+"/unsupported/" + i5+"/phrase",schemaPath:"#/properties/unsupported/items/properties/phrase/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err104];
}
else {
vErrors.push(err104);
}
errors++;
}
}
else {
const err105 = {instancePath:instancePath+"/unsupported/" + i5+"/phrase",schemaPath:"#/properties/unsupported/items/properties/phrase/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err105];
}
else {
vErrors.push(err105);
}
errors++;
}
}
if(data32.reason !== undefined){
let data34 = data32.reason;
if(!(((data34 === "not_measured") || (data34 === "out_of_scope")) || (data34 === "ambiguous"))){
const err106 = {instancePath:instancePath+"/unsupported/" + i5+"/reason",schemaPath:"#/properties/unsupported/items/properties/reason/enum",keyword:"enum",params:{allowedValues: schema36.properties.unsupported.items.properties.reason.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err106];
}
else {
vErrors.push(err106);
}
errors++;
}
}
}
else {
const err107 = {instancePath:instancePath+"/unsupported/" + i5,schemaPath:"#/properties/unsupported/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err107];
}
else {
vErrors.push(err107);
}
errors++;
}
}
}
else {
const err108 = {instancePath:instancePath+"/unsupported",schemaPath:"#/properties/unsupported/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err108];
}
else {
vErrors.push(err108);
}
errors++;
}
}
}
else {
const err109 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err109];
}
else {
vErrors.push(err109);
}
errors++;
}
validate21.errors = vErrors;
return errors === 0;
}
validate21.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateAiAnalysisEvent = validate22;
const schema46 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://analogos.cl/schemas/ai-analysis.schema.json","title":"AnalogOS · evento de análisis de IA (ai-analysis/1, una línea NDJSON)","description":"Cada línea del stream de /analyze (o del análisis pregenerado) es un objeto completo que valida contra este esquema. La IA escribe marcadores {{id}} en lugar de cifras: fuera de ellos no hay dígitos ni %. El cliente comprueba además que cada {{id}} exista en el paquete y esté en refs, la huella, los números escritos y el vocabulario prohibido (docs/UX_REDESIGN.md §5.4–§5.5).","oneOf":[{"$ref":"#/$defs/meta"},{"$ref":"#/$defs/stage"},{"$ref":"#/$defs/summary"},{"$ref":"#/$defs/insight"},{"$ref":"#/$defs/testSuggestion"},{"$ref":"#/$defs/tradeoff"},{"$ref":"#/$defs/robustnessNote"},{"$ref":"#/$defs/uncertainty"},{"$ref":"#/$defs/fieldPriority"},{"$ref":"#/$defs/analogNote"},{"$ref":"#/$defs/done"},{"$ref":"#/$defs/error"}],"$defs":{"siteId":{"type":"string","pattern":"^cl-[a-z0-9-]+$"},"criterionId":{"enum":["slope","terrain_roughness","local_relief","bare_ground_fraction","aridity_context","surface_temperature_variability","geologic_relevance"]},"refId":{"type":"string","pattern":"^(site:cl-[a-z0-9-]+:([a-z_]+:(raw|sim|ratio|vs_mars)|similarity|confidence|stability|feasibility|rank)|mars:[a-z_]+|coverage:cl-[a-z0-9-]+|rank:gap:[0-9]{1,2}:[0-9]{1,2}|sens:[a-z_]+|check:cl-[a-z0-9-]+:[0-9]{1,2})$"},"checkRef":{"type":"string","pattern":"^check:cl-[a-z0-9-]+:[0-9]{1,2}$"},"refs":{"type":"array","maxItems":12,"uniqueItems":true,"items":{"$ref":"#/$defs/refId"}},"tokenText":{"description":"Texto con marcadores {{id}}: sin dígitos ni % fuera de ellos; 280 caracteres como máximo.","type":"string","minLength":1,"maxLength":280,"pattern":"^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"},"meta":{"type":"object","additionalProperties":false,"required":["type","schema","engine","model","prompt_version","packet_hash"],"properties":{"type":{"const":"meta"},"schema":{"const":"ai-analysis/1"},"engine":{"enum":["lktron","pregenerated"]},"model":{"type":"string","minLength":1,"maxLength":120},"prompt_version":{"type":"string","pattern":"^[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$"},"packet_hash":{"type":"string","pattern":"^fnv1a64:[0-9a-f]{16}$"}}},"stage":{"type":"object","additionalProperties":false,"required":["type","stage"],"properties":{"type":{"const":"stage"},"stage":{"enum":["selecting_facts","writing"]}}},"summary":{"type":"object","additionalProperties":false,"required":["type","site_id","text","refs"],"properties":{"type":{"const":"summary"},"site_id":{"oneOf":[{"type":"null"},{"$ref":"#/$defs/siteId"}]},"text":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"}}},"insight":{"type":"object","additionalProperties":false,"required":["type","id","site_id","criterion_id","fact_kind","text","refs"],"properties":{"type":{"const":"insight"},"id":{"type":"string","pattern":"^i[0-9]{1,3}$"},"site_id":{"$ref":"#/$defs/siteId"},"criterion_id":{"$ref":"#/$defs/criterionId"},"fact_kind":{"enum":["limiting_factor","no_discrimination","shared_regional_value","direction_vs_mars","best_of_n","saturates_rule"]},"text":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"}}},"testSuggestion":{"type":"object","additionalProperties":false,"required":["type","site_id","text","refs"],"properties":{"type":{"const":"test_suggestion"},"site_id":{"$ref":"#/$defs/siteId"},"text":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"}}},"tradeoff":{"type":"object","additionalProperties":false,"required":["type","site_ids","text","refs"],"properties":{"type":{"const":"tradeoff"},"site_ids":{"type":"array","minItems":2,"maxItems":3,"uniqueItems":true,"items":{"$ref":"#/$defs/siteId"}},"text":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"}}},"robustnessNote":{"type":"object","additionalProperties":false,"required":["type","text","refs"],"properties":{"type":{"const":"robustness_note"},"text":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"}}},"uncertainty":{"type":"object","additionalProperties":false,"required":["type","text","refs"],"properties":{"type":{"const":"uncertainty"},"text":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"},"resolves_check":{"$ref":"#/$defs/checkRef"}}},"fieldPriority":{"type":"object","additionalProperties":false,"required":["type","site_id","check_ref","why","refs"],"properties":{"type":{"const":"field_priority"},"site_id":{"$ref":"#/$defs/siteId"},"check_ref":{"$ref":"#/$defs/checkRef"},"why":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"}}},"analogNote":{"type":"object","additionalProperties":false,"required":["type","analog_id","status","text"],"properties":{"type":{"const":"analog_note"},"analog_id":{"type":"string","pattern":"^[a-z0-9-]+$","maxLength":64},"status":{"const":"por_calcular"},"text":{"$ref":"#/$defs/tokenText"}}},"done":{"type":"object","additionalProperties":false,"required":["type","counts"],"properties":{"type":{"const":"done"},"counts":{"type":"object","propertyNames":{"enum":["summary","insight","test_suggestion","tradeoff","robustness_note","uncertainty","field_priority","analog_note"]},"additionalProperties":{"type":"integer","minimum":0,"maximum":64}}}},"error":{"type":"object","additionalProperties":false,"required":["type","code","message"],"properties":{"type":{"const":"error"},"code":{"enum":["timeout","invalid","unavailable"]},"message":{"type":"string","minLength":1,"maxLength":280}}}}};
const schema47 = {"type":"object","additionalProperties":false,"required":["type","schema","engine","model","prompt_version","packet_hash"],"properties":{"type":{"const":"meta"},"schema":{"const":"ai-analysis/1"},"engine":{"enum":["lktron","pregenerated"]},"model":{"type":"string","minLength":1,"maxLength":120},"prompt_version":{"type":"string","pattern":"^[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$"},"packet_hash":{"type":"string","pattern":"^fnv1a64:[0-9a-f]{16}$"}}};
const schema48 = {"type":"object","additionalProperties":false,"required":["type","stage"],"properties":{"type":{"const":"stage"},"stage":{"enum":["selecting_facts","writing"]}}};
const schema75 = {"type":"object","additionalProperties":false,"required":["type","counts"],"properties":{"type":{"const":"done"},"counts":{"type":"object","propertyNames":{"enum":["summary","insight","test_suggestion","tradeoff","robustness_note","uncertainty","field_priority","analog_note"]},"additionalProperties":{"type":"integer","minimum":0,"maximum":64}}}};
const schema76 = {"type":"object","additionalProperties":false,"required":["type","code","message"],"properties":{"type":{"const":"error"},"code":{"enum":["timeout","invalid","unavailable"]},"message":{"type":"string","minLength":1,"maxLength":280}}};
const schema49 = {"type":"object","additionalProperties":false,"required":["type","site_id","text","refs"],"properties":{"type":{"const":"summary"},"site_id":{"oneOf":[{"type":"null"},{"$ref":"#/$defs/siteId"}]},"text":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"}}};
const schema50 = {"type":"string","pattern":"^cl-[a-z0-9-]+$"};
const schema51 = {"description":"Texto con marcadores {{id}}: sin dígitos ni % fuera de ellos; 280 caracteres como máximo.","type":"string","minLength":1,"maxLength":280,"pattern":"^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"};
const pattern23 = new RegExp("^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$", "u");
const schema52 = {"type":"array","maxItems":12,"uniqueItems":true,"items":{"$ref":"#/$defs/refId"}};
const schema53 = {"type":"string","pattern":"^(site:cl-[a-z0-9-]+:([a-z_]+:(raw|sim|ratio|vs_mars)|similarity|confidence|stability|feasibility|rank)|mars:[a-z_]+|coverage:cl-[a-z0-9-]+|rank:gap:[0-9]{1,2}:[0-9]{1,2}|sens:[a-z_]+|check:cl-[a-z0-9-]+:[0-9]{1,2})$"};
const pattern24 = new RegExp("^(site:cl-[a-z0-9-]+:([a-z_]+:(raw|sim|ratio|vs_mars)|similarity|confidence|stability|feasibility|rank)|mars:[a-z_]+|coverage:cl-[a-z0-9-]+|rank:gap:[0-9]{1,2}:[0-9]{1,2}|sens:[a-z_]+|check:cl-[a-z0-9-]+:[0-9]{1,2})$", "u");

function validate24(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate24.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(Array.isArray(data)){
if(data.length > 12){
const err0 = {instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 12},message:"must NOT have more than 12 items"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
let data0 = data[i0];
if(typeof data0 === "string"){
if(!pattern24.test(data0)){
const err1 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/refId/pattern",keyword:"pattern",params:{pattern: "^(site:cl-[a-z0-9-]+:([a-z_]+:(raw|sim|ratio|vs_mars)|similarity|confidence|stability|feasibility|rank)|mars:[a-z_]+|coverage:cl-[a-z0-9-]+|rank:gap:[0-9]{1,2}:[0-9]{1,2}|sens:[a-z_]+|check:cl-[a-z0-9-]+:[0-9]{1,2})$"},message:"must match pattern \""+"^(site:cl-[a-z0-9-]+:([a-z_]+:(raw|sim|ratio|vs_mars)|similarity|confidence|stability|feasibility|rank)|mars:[a-z_]+|coverage:cl-[a-z0-9-]+|rank:gap:[0-9]{1,2}:[0-9]{1,2}|sens:[a-z_]+|check:cl-[a-z0-9-]+:[0-9]{1,2})$"+"\""};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
else {
const err2 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/refId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
let i1 = data.length;
let j0;
if(i1 > 1){
outer0:
for(;i1--;){
for(j0 = i1; j0--;){
if(func0(data[i1], data[j0])){
const err3 = {instancePath,schemaPath:"#/uniqueItems",keyword:"uniqueItems",params:{i: i1, j: j0},message:"must NOT have duplicate items (items ## "+j0+" and "+i1+" are identical)"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
break outer0;
}
}
}
}
}
else {
const err4 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
validate24.errors = vErrors;
return errors === 0;
}
validate24.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};


function validate23(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate23.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.site_id === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "site_id"},message:"must have required property '"+"site_id"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.text === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.refs === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "refs"},message:"must have required property '"+"refs"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "type") || (key0 === "site_id")) || (key0 === "text")) || (key0 === "refs"))){
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
if(data.type !== undefined){
if("summary" !== data.type){
const err5 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "summary"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.site_id !== undefined){
let data1 = data.site_id;
const _errs4 = errors;
let valid1 = false;
let passing0 = null;
const _errs5 = errors;
if(data1 !== null){
const err6 = {instancePath:instancePath+"/site_id",schemaPath:"#/properties/site_id/oneOf/0/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
var _valid0 = _errs5 === errors;
if(_valid0){
valid1 = true;
passing0 = 0;
}
const _errs7 = errors;
if(typeof data1 === "string"){
if(!pattern14.test(data1)){
const err7 = {instancePath:instancePath+"/site_id",schemaPath:"#/$defs/siteId/pattern",keyword:"pattern",params:{pattern: "^cl-[a-z0-9-]+$"},message:"must match pattern \""+"^cl-[a-z0-9-]+$"+"\""};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
else {
const err8 = {instancePath:instancePath+"/site_id",schemaPath:"#/$defs/siteId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var _valid0 = _errs7 === errors;
if(_valid0 && valid1){
valid1 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid1 = true;
passing0 = 1;
}
}
if(!valid1){
const err9 = {instancePath:instancePath+"/site_id",schemaPath:"#/properties/site_id/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
else {
errors = _errs4;
if(vErrors !== null){
if(_errs4){
vErrors.length = _errs4;
}
else {
vErrors = null;
}
}
}
}
if(data.text !== undefined){
let data2 = data.text;
if(typeof data2 === "string"){
if(func2(data2) > 280){
const err10 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(func2(data2) < 1){
const err11 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(!pattern23.test(data2)){
const err12 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/pattern",keyword:"pattern",params:{pattern: "^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"},message:"must match pattern \""+"^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"+"\""};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.refs !== undefined){
if(!(validate24(data.refs, {instancePath:instancePath+"/refs",parentData:data,parentDataProperty:"refs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
errors = vErrors.length;
}
}
}
else {
const err14 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
validate23.errors = vErrors;
return errors === 0;
}
validate23.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema54 = {"type":"object","additionalProperties":false,"required":["type","id","site_id","criterion_id","fact_kind","text","refs"],"properties":{"type":{"const":"insight"},"id":{"type":"string","pattern":"^i[0-9]{1,3}$"},"site_id":{"$ref":"#/$defs/siteId"},"criterion_id":{"$ref":"#/$defs/criterionId"},"fact_kind":{"enum":["limiting_factor","no_discrimination","shared_regional_value","direction_vs_mars","best_of_n","saturates_rule"]},"text":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"}}};
const schema56 = {"enum":["slope","terrain_roughness","local_relief","bare_ground_fraction","aridity_context","surface_temperature_variability","geologic_relevance"]};
const pattern25 = new RegExp("^i[0-9]{1,3}$", "u");

function validate27(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate27.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.id === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.site_id === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "site_id"},message:"must have required property '"+"site_id"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.criterion_id === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "criterion_id"},message:"must have required property '"+"criterion_id"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.fact_kind === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "fact_kind"},message:"must have required property '"+"fact_kind"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.text === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.refs === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "refs"},message:"must have required property '"+"refs"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key0 in data){
if(!(((((((key0 === "type") || (key0 === "id")) || (key0 === "site_id")) || (key0 === "criterion_id")) || (key0 === "fact_kind")) || (key0 === "text")) || (key0 === "refs"))){
const err7 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.type !== undefined){
if("insight" !== data.type){
const err8 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "insight"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.id !== undefined){
let data1 = data.id;
if(typeof data1 === "string"){
if(!pattern25.test(data1)){
const err9 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/pattern",keyword:"pattern",params:{pattern: "^i[0-9]{1,3}$"},message:"must match pattern \""+"^i[0-9]{1,3}$"+"\""};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
else {
const err10 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.site_id !== undefined){
let data2 = data.site_id;
if(typeof data2 === "string"){
if(!pattern14.test(data2)){
const err11 = {instancePath:instancePath+"/site_id",schemaPath:"#/$defs/siteId/pattern",keyword:"pattern",params:{pattern: "^cl-[a-z0-9-]+$"},message:"must match pattern \""+"^cl-[a-z0-9-]+$"+"\""};
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
const err12 = {instancePath:instancePath+"/site_id",schemaPath:"#/$defs/siteId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.criterion_id !== undefined){
let data3 = data.criterion_id;
if(!(((((((data3 === "slope") || (data3 === "terrain_roughness")) || (data3 === "local_relief")) || (data3 === "bare_ground_fraction")) || (data3 === "aridity_context")) || (data3 === "surface_temperature_variability")) || (data3 === "geologic_relevance"))){
const err13 = {instancePath:instancePath+"/criterion_id",schemaPath:"#/$defs/criterionId/enum",keyword:"enum",params:{allowedValues: schema56.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.fact_kind !== undefined){
let data4 = data.fact_kind;
if(!((((((data4 === "limiting_factor") || (data4 === "no_discrimination")) || (data4 === "shared_regional_value")) || (data4 === "direction_vs_mars")) || (data4 === "best_of_n")) || (data4 === "saturates_rule"))){
const err14 = {instancePath:instancePath+"/fact_kind",schemaPath:"#/properties/fact_kind/enum",keyword:"enum",params:{allowedValues: schema54.properties.fact_kind.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.text !== undefined){
let data5 = data.text;
if(typeof data5 === "string"){
if(func2(data5) > 280){
const err15 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(func2(data5) < 1){
const err16 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if(!pattern23.test(data5)){
const err17 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/pattern",keyword:"pattern",params:{pattern: "^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"},message:"must match pattern \""+"^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"+"\""};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
else {
const err18 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.refs !== undefined){
if(!(validate24(data.refs, {instancePath:instancePath+"/refs",parentData:data,parentDataProperty:"refs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
errors = vErrors.length;
}
}
}
else {
const err19 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
validate27.errors = vErrors;
return errors === 0;
}
validate27.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema58 = {"type":"object","additionalProperties":false,"required":["type","site_id","text","refs"],"properties":{"type":{"const":"test_suggestion"},"site_id":{"$ref":"#/$defs/siteId"},"text":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"}}};

function validate30(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate30.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.site_id === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "site_id"},message:"must have required property '"+"site_id"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.text === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.refs === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "refs"},message:"must have required property '"+"refs"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "type") || (key0 === "site_id")) || (key0 === "text")) || (key0 === "refs"))){
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
if(data.type !== undefined){
if("test_suggestion" !== data.type){
const err5 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "test_suggestion"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.site_id !== undefined){
let data1 = data.site_id;
if(typeof data1 === "string"){
if(!pattern14.test(data1)){
const err6 = {instancePath:instancePath+"/site_id",schemaPath:"#/$defs/siteId/pattern",keyword:"pattern",params:{pattern: "^cl-[a-z0-9-]+$"},message:"must match pattern \""+"^cl-[a-z0-9-]+$"+"\""};
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
const err7 = {instancePath:instancePath+"/site_id",schemaPath:"#/$defs/siteId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.text !== undefined){
let data2 = data.text;
if(typeof data2 === "string"){
if(func2(data2) > 280){
const err8 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(func2(data2) < 1){
const err9 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(!pattern23.test(data2)){
const err10 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/pattern",keyword:"pattern",params:{pattern: "^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"},message:"must match pattern \""+"^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"+"\""};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
else {
const err11 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.refs !== undefined){
if(!(validate24(data.refs, {instancePath:instancePath+"/refs",parentData:data,parentDataProperty:"refs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
errors = vErrors.length;
}
}
}
else {
const err12 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
validate30.errors = vErrors;
return errors === 0;
}
validate30.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema61 = {"type":"object","additionalProperties":false,"required":["type","site_ids","text","refs"],"properties":{"type":{"const":"tradeoff"},"site_ids":{"type":"array","minItems":2,"maxItems":3,"uniqueItems":true,"items":{"$ref":"#/$defs/siteId"}},"text":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"}}};

function validate33(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate33.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.site_ids === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "site_ids"},message:"must have required property '"+"site_ids"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.text === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.refs === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "refs"},message:"must have required property '"+"refs"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "type") || (key0 === "site_ids")) || (key0 === "text")) || (key0 === "refs"))){
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
if(data.type !== undefined){
if("tradeoff" !== data.type){
const err5 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "tradeoff"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.site_ids !== undefined){
let data1 = data.site_ids;
if(Array.isArray(data1)){
if(data1.length > 3){
const err6 = {instancePath:instancePath+"/site_ids",schemaPath:"#/properties/site_ids/maxItems",keyword:"maxItems",params:{limit: 3},message:"must NOT have more than 3 items"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data1.length < 2){
const err7 = {instancePath:instancePath+"/site_ids",schemaPath:"#/properties/site_ids/minItems",keyword:"minItems",params:{limit: 2},message:"must NOT have fewer than 2 items"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
let data2 = data1[i0];
if(typeof data2 === "string"){
if(!pattern14.test(data2)){
const err8 = {instancePath:instancePath+"/site_ids/" + i0,schemaPath:"#/$defs/siteId/pattern",keyword:"pattern",params:{pattern: "^cl-[a-z0-9-]+$"},message:"must match pattern \""+"^cl-[a-z0-9-]+$"+"\""};
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
const err9 = {instancePath:instancePath+"/site_ids/" + i0,schemaPath:"#/$defs/siteId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
let i1 = data1.length;
let j0;
if(i1 > 1){
outer0:
for(;i1--;){
for(j0 = i1; j0--;){
if(func0(data1[i1], data1[j0])){
const err10 = {instancePath:instancePath+"/site_ids",schemaPath:"#/properties/site_ids/uniqueItems",keyword:"uniqueItems",params:{i: i1, j: j0},message:"must NOT have duplicate items (items ## "+j0+" and "+i1+" are identical)"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
break outer0;
}
}
}
}
}
else {
const err11 = {instancePath:instancePath+"/site_ids",schemaPath:"#/properties/site_ids/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.text !== undefined){
let data3 = data.text;
if(typeof data3 === "string"){
if(func2(data3) > 280){
const err12 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(func2(data3) < 1){
const err13 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(!pattern23.test(data3)){
const err14 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/pattern",keyword:"pattern",params:{pattern: "^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"},message:"must match pattern \""+"^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"+"\""};
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
const err15 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.refs !== undefined){
if(!(validate24(data.refs, {instancePath:instancePath+"/refs",parentData:data,parentDataProperty:"refs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
errors = vErrors.length;
}
}
}
else {
const err16 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
validate33.errors = vErrors;
return errors === 0;
}
validate33.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema64 = {"type":"object","additionalProperties":false,"required":["type","text","refs"],"properties":{"type":{"const":"robustness_note"},"text":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"}}};

function validate36(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate36.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.text === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.refs === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "refs"},message:"must have required property '"+"refs"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "type") || (key0 === "text")) || (key0 === "refs"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.type !== undefined){
if("robustness_note" !== data.type){
const err4 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "robustness_note"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.text !== undefined){
let data1 = data.text;
if(typeof data1 === "string"){
if(func2(data1) > 280){
const err5 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(func2(data1) < 1){
const err6 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(!pattern23.test(data1)){
const err7 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/pattern",keyword:"pattern",params:{pattern: "^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"},message:"must match pattern \""+"^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"+"\""};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
else {
const err8 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.refs !== undefined){
if(!(validate24(data.refs, {instancePath:instancePath+"/refs",parentData:data,parentDataProperty:"refs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
errors = vErrors.length;
}
}
}
else {
const err9 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
validate36.errors = vErrors;
return errors === 0;
}
validate36.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema66 = {"type":"object","additionalProperties":false,"required":["type","text","refs"],"properties":{"type":{"const":"uncertainty"},"text":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"},"resolves_check":{"$ref":"#/$defs/checkRef"}}};
const schema68 = {"type":"string","pattern":"^check:cl-[a-z0-9-]+:[0-9]{1,2}$"};

function validate39(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate39.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.text === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.refs === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "refs"},message:"must have required property '"+"refs"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "type") || (key0 === "text")) || (key0 === "refs")) || (key0 === "resolves_check"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.type !== undefined){
if("uncertainty" !== data.type){
const err4 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "uncertainty"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.text !== undefined){
let data1 = data.text;
if(typeof data1 === "string"){
if(func2(data1) > 280){
const err5 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(func2(data1) < 1){
const err6 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(!pattern23.test(data1)){
const err7 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/pattern",keyword:"pattern",params:{pattern: "^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"},message:"must match pattern \""+"^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"+"\""};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
else {
const err8 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.refs !== undefined){
if(!(validate24(data.refs, {instancePath:instancePath+"/refs",parentData:data,parentDataProperty:"refs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
errors = vErrors.length;
}
}
if(data.resolves_check !== undefined){
let data3 = data.resolves_check;
if(typeof data3 === "string"){
if(!pattern19.test(data3)){
const err9 = {instancePath:instancePath+"/resolves_check",schemaPath:"#/$defs/checkRef/pattern",keyword:"pattern",params:{pattern: "^check:cl-[a-z0-9-]+:[0-9]{1,2}$"},message:"must match pattern \""+"^check:cl-[a-z0-9-]+:[0-9]{1,2}$"+"\""};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
else {
const err10 = {instancePath:instancePath+"/resolves_check",schemaPath:"#/$defs/checkRef/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
}
else {
const err11 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
validate39.errors = vErrors;
return errors === 0;
}
validate39.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema69 = {"type":"object","additionalProperties":false,"required":["type","site_id","check_ref","why","refs"],"properties":{"type":{"const":"field_priority"},"site_id":{"$ref":"#/$defs/siteId"},"check_ref":{"$ref":"#/$defs/checkRef"},"why":{"$ref":"#/$defs/tokenText"},"refs":{"$ref":"#/$defs/refs"}}};

function validate42(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate42.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.site_id === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "site_id"},message:"must have required property '"+"site_id"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.check_ref === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "check_ref"},message:"must have required property '"+"check_ref"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.why === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "why"},message:"must have required property '"+"why"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.refs === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "refs"},message:"must have required property '"+"refs"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
for(const key0 in data){
if(!(((((key0 === "type") || (key0 === "site_id")) || (key0 === "check_ref")) || (key0 === "why")) || (key0 === "refs"))){
const err5 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.type !== undefined){
if("field_priority" !== data.type){
const err6 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "field_priority"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.site_id !== undefined){
let data1 = data.site_id;
if(typeof data1 === "string"){
if(!pattern14.test(data1)){
const err7 = {instancePath:instancePath+"/site_id",schemaPath:"#/$defs/siteId/pattern",keyword:"pattern",params:{pattern: "^cl-[a-z0-9-]+$"},message:"must match pattern \""+"^cl-[a-z0-9-]+$"+"\""};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
else {
const err8 = {instancePath:instancePath+"/site_id",schemaPath:"#/$defs/siteId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.check_ref !== undefined){
let data2 = data.check_ref;
if(typeof data2 === "string"){
if(!pattern19.test(data2)){
const err9 = {instancePath:instancePath+"/check_ref",schemaPath:"#/$defs/checkRef/pattern",keyword:"pattern",params:{pattern: "^check:cl-[a-z0-9-]+:[0-9]{1,2}$"},message:"must match pattern \""+"^check:cl-[a-z0-9-]+:[0-9]{1,2}$"+"\""};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
else {
const err10 = {instancePath:instancePath+"/check_ref",schemaPath:"#/$defs/checkRef/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.why !== undefined){
let data3 = data.why;
if(typeof data3 === "string"){
if(func2(data3) > 280){
const err11 = {instancePath:instancePath+"/why",schemaPath:"#/$defs/tokenText/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(func2(data3) < 1){
const err12 = {instancePath:instancePath+"/why",schemaPath:"#/$defs/tokenText/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(!pattern23.test(data3)){
const err13 = {instancePath:instancePath+"/why",schemaPath:"#/$defs/tokenText/pattern",keyword:"pattern",params:{pattern: "^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"},message:"must match pattern \""+"^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"+"\""};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
else {
const err14 = {instancePath:instancePath+"/why",schemaPath:"#/$defs/tokenText/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.refs !== undefined){
if(!(validate24(data.refs, {instancePath:instancePath+"/refs",parentData:data,parentDataProperty:"refs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
errors = vErrors.length;
}
}
}
else {
const err15 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
validate42.errors = vErrors;
return errors === 0;
}
validate42.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema73 = {"type":"object","additionalProperties":false,"required":["type","analog_id","status","text"],"properties":{"type":{"const":"analog_note"},"analog_id":{"type":"string","pattern":"^[a-z0-9-]+$","maxLength":64},"status":{"const":"por_calcular"},"text":{"$ref":"#/$defs/tokenText"}}};

function validate45(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate45.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.analog_id === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "analog_id"},message:"must have required property '"+"analog_id"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.status === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.text === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "type") || (key0 === "analog_id")) || (key0 === "status")) || (key0 === "text"))){
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
if(data.type !== undefined){
if("analog_note" !== data.type){
const err5 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "analog_note"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.analog_id !== undefined){
let data1 = data.analog_id;
if(typeof data1 === "string"){
if(func2(data1) > 64){
const err6 = {instancePath:instancePath+"/analog_id",schemaPath:"#/properties/analog_id/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(!pattern5.test(data1)){
const err7 = {instancePath:instancePath+"/analog_id",schemaPath:"#/properties/analog_id/pattern",keyword:"pattern",params:{pattern: "^[a-z0-9-]+$"},message:"must match pattern \""+"^[a-z0-9-]+$"+"\""};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
else {
const err8 = {instancePath:instancePath+"/analog_id",schemaPath:"#/properties/analog_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.status !== undefined){
if("por_calcular" !== data.status){
const err9 = {instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "por_calcular"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.text !== undefined){
let data3 = data.text;
if(typeof data3 === "string"){
if(func2(data3) > 280){
const err10 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(func2(data3) < 1){
const err11 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(!pattern23.test(data3)){
const err12 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/pattern",keyword:"pattern",params:{pattern: "^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"},message:"must match pattern \""+"^(?:[^0-9%{}]|\\{\\{[a-z0-9_:.-]+\\}\\})*$"+"\""};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/text",schemaPath:"#/$defs/tokenText/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
}
else {
const err14 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
validate45.errors = vErrors;
return errors === 0;
}
validate45.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate22(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://analogos.cl/schemas/ai-analysis.schema.json" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate22.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/$defs/meta/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.schema === undefined){
const err1 = {instancePath,schemaPath:"#/$defs/meta/required",keyword:"required",params:{missingProperty: "schema"},message:"must have required property '"+"schema"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.engine === undefined){
const err2 = {instancePath,schemaPath:"#/$defs/meta/required",keyword:"required",params:{missingProperty: "engine"},message:"must have required property '"+"engine"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.model === undefined){
const err3 = {instancePath,schemaPath:"#/$defs/meta/required",keyword:"required",params:{missingProperty: "model"},message:"must have required property '"+"model"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.prompt_version === undefined){
const err4 = {instancePath,schemaPath:"#/$defs/meta/required",keyword:"required",params:{missingProperty: "prompt_version"},message:"must have required property '"+"prompt_version"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.packet_hash === undefined){
const err5 = {instancePath,schemaPath:"#/$defs/meta/required",keyword:"required",params:{missingProperty: "packet_hash"},message:"must have required property '"+"packet_hash"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
for(const key0 in data){
if(!((((((key0 === "type") || (key0 === "schema")) || (key0 === "engine")) || (key0 === "model")) || (key0 === "prompt_version")) || (key0 === "packet_hash"))){
const err6 = {instancePath,schemaPath:"#/$defs/meta/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.type !== undefined){
if("meta" !== data.type){
const err7 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/meta/properties/type/const",keyword:"const",params:{allowedValue: "meta"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.schema !== undefined){
if("ai-analysis/1" !== data.schema){
const err8 = {instancePath:instancePath+"/schema",schemaPath:"#/$defs/meta/properties/schema/const",keyword:"const",params:{allowedValue: "ai-analysis/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.engine !== undefined){
let data2 = data.engine;
if(!((data2 === "lktron") || (data2 === "pregenerated"))){
const err9 = {instancePath:instancePath+"/engine",schemaPath:"#/$defs/meta/properties/engine/enum",keyword:"enum",params:{allowedValues: schema47.properties.engine.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.model !== undefined){
let data3 = data.model;
if(typeof data3 === "string"){
if(func2(data3) > 120){
const err10 = {instancePath:instancePath+"/model",schemaPath:"#/$defs/meta/properties/model/maxLength",keyword:"maxLength",params:{limit: 120},message:"must NOT have more than 120 characters"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(func2(data3) < 1){
const err11 = {instancePath:instancePath+"/model",schemaPath:"#/$defs/meta/properties/model/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
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
const err12 = {instancePath:instancePath+"/model",schemaPath:"#/$defs/meta/properties/model/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.prompt_version !== undefined){
let data4 = data.prompt_version;
if(typeof data4 === "string"){
if(!pattern4.test(data4)){
const err13 = {instancePath:instancePath+"/prompt_version",schemaPath:"#/$defs/meta/properties/prompt_version/pattern",keyword:"pattern",params:{pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$"},message:"must match pattern \""+"^[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$"+"\""};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
else {
const err14 = {instancePath:instancePath+"/prompt_version",schemaPath:"#/$defs/meta/properties/prompt_version/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.packet_hash !== undefined){
let data5 = data.packet_hash;
if(typeof data5 === "string"){
if(!pattern10.test(data5)){
const err15 = {instancePath:instancePath+"/packet_hash",schemaPath:"#/$defs/meta/properties/packet_hash/pattern",keyword:"pattern",params:{pattern: "^fnv1a64:[0-9a-f]{16}$"},message:"must match pattern \""+"^fnv1a64:[0-9a-f]{16}$"+"\""};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
else {
const err16 = {instancePath:instancePath+"/packet_hash",schemaPath:"#/$defs/meta/properties/packet_hash/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
else {
const err17 = {instancePath,schemaPath:"#/$defs/meta/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs14 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err18 = {instancePath,schemaPath:"#/$defs/stage/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
if(data.stage === undefined){
const err19 = {instancePath,schemaPath:"#/$defs/stage/required",keyword:"required",params:{missingProperty: "stage"},message:"must have required property '"+"stage"+"'"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
for(const key1 in data){
if(!((key1 === "type") || (key1 === "stage"))){
const err20 = {instancePath,schemaPath:"#/$defs/stage/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data.type !== undefined){
if("stage" !== data.type){
const err21 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/stage/properties/type/const",keyword:"const",params:{allowedValue: "stage"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data.stage !== undefined){
let data7 = data.stage;
if(!((data7 === "selecting_facts") || (data7 === "writing"))){
const err22 = {instancePath:instancePath+"/stage",schemaPath:"#/$defs/stage/properties/stage/enum",keyword:"enum",params:{allowedValues: schema48.properties.stage.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
}
else {
const err23 = {instancePath,schemaPath:"#/$defs/stage/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
var _valid0 = _errs14 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs20 = errors;
if(!(validate23(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
errors = vErrors.length;
}
var _valid0 = _errs20 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs21 = errors;
if(!(validate27(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var _valid0 = _errs21 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = true;
}
}
const _errs22 = errors;
if(!(validate30(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate30.errors : vErrors.concat(validate30.errors);
errors = vErrors.length;
}
var _valid0 = _errs22 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props0 !== true){
props0 = true;
}
}
const _errs23 = errors;
if(!(validate33(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate33.errors : vErrors.concat(validate33.errors);
errors = vErrors.length;
}
var _valid0 = _errs23 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 5];
}
else {
if(_valid0){
valid0 = true;
passing0 = 5;
if(props0 !== true){
props0 = true;
}
}
const _errs24 = errors;
if(!(validate36(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate36.errors : vErrors.concat(validate36.errors);
errors = vErrors.length;
}
var _valid0 = _errs24 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 6];
}
else {
if(_valid0){
valid0 = true;
passing0 = 6;
if(props0 !== true){
props0 = true;
}
}
const _errs25 = errors;
if(!(validate39(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate39.errors : vErrors.concat(validate39.errors);
errors = vErrors.length;
}
var _valid0 = _errs25 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 7];
}
else {
if(_valid0){
valid0 = true;
passing0 = 7;
if(props0 !== true){
props0 = true;
}
}
const _errs26 = errors;
if(!(validate42(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate42.errors : vErrors.concat(validate42.errors);
errors = vErrors.length;
}
var _valid0 = _errs26 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 8];
}
else {
if(_valid0){
valid0 = true;
passing0 = 8;
if(props0 !== true){
props0 = true;
}
}
const _errs27 = errors;
if(!(validate45(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
errors = vErrors.length;
}
var _valid0 = _errs27 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 9];
}
else {
if(_valid0){
valid0 = true;
passing0 = 9;
if(props0 !== true){
props0 = true;
}
}
const _errs28 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err24 = {instancePath,schemaPath:"#/$defs/done/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data.counts === undefined){
const err25 = {instancePath,schemaPath:"#/$defs/done/required",keyword:"required",params:{missingProperty: "counts"},message:"must have required property '"+"counts"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
for(const key2 in data){
if(!((key2 === "type") || (key2 === "counts"))){
const err26 = {instancePath,schemaPath:"#/$defs/done/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data.type !== undefined){
if("done" !== data.type){
const err27 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/done/properties/type/const",keyword:"const",params:{allowedValue: "done"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
if(data.counts !== undefined){
let data9 = data.counts;
if(data9 && typeof data9 == "object" && !Array.isArray(data9)){
for(const key3 in data9){
const _errs35 = errors;
if(!((((((((key3 === "summary") || (key3 === "insight")) || (key3 === "test_suggestion")) || (key3 === "tradeoff")) || (key3 === "robustness_note")) || (key3 === "uncertainty")) || (key3 === "field_priority")) || (key3 === "analog_note"))){
const err28 = {instancePath:instancePath+"/counts",schemaPath:"#/$defs/done/properties/counts/propertyNames/enum",keyword:"enum",params:{allowedValues: schema75.properties.counts.propertyNames.enum},message:"must be equal to one of the allowed values",propertyName:key3};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
var valid7 = _errs35 === errors;
if(!valid7){
const err29 = {instancePath:instancePath+"/counts",schemaPath:"#/$defs/done/properties/counts/propertyNames",keyword:"propertyNames",params:{propertyName: key3},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
for(const key4 in data9){
let data10 = data9[key4];
if(!((typeof data10 == "number") && (!(data10 % 1) && !isNaN(data10)))){
const err30 = {instancePath:instancePath+"/counts/" + key4.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/$defs/done/properties/counts/additionalProperties/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(typeof data10 == "number"){
if(data10 > 64 || isNaN(data10)){
const err31 = {instancePath:instancePath+"/counts/" + key4.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/$defs/done/properties/counts/additionalProperties/maximum",keyword:"maximum",params:{comparison: "<=", limit: 64},message:"must be <= 64"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(data10 < 0 || isNaN(data10)){
const err32 = {instancePath:instancePath+"/counts/" + key4.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/$defs/done/properties/counts/additionalProperties/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
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
}
else {
const err33 = {instancePath:instancePath+"/counts",schemaPath:"#/$defs/done/properties/counts/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
}
else {
const err34 = {instancePath,schemaPath:"#/$defs/done/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
var _valid0 = _errs28 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 10];
}
else {
if(_valid0){
valid0 = true;
passing0 = 10;
if(props0 !== true){
props0 = true;
}
}
const _errs39 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err35 = {instancePath,schemaPath:"#/$defs/error/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if(data.code === undefined){
const err36 = {instancePath,schemaPath:"#/$defs/error/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
if(data.message === undefined){
const err37 = {instancePath,schemaPath:"#/$defs/error/required",keyword:"required",params:{missingProperty: "message"},message:"must have required property '"+"message"+"'"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
for(const key5 in data){
if(!(((key5 === "type") || (key5 === "code")) || (key5 === "message"))){
const err38 = {instancePath,schemaPath:"#/$defs/error/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data.type !== undefined){
if("error" !== data.type){
const err39 = {instancePath:instancePath+"/type",schemaPath:"#/$defs/error/properties/type/const",keyword:"const",params:{allowedValue: "error"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
if(data.code !== undefined){
let data12 = data.code;
if(!(((data12 === "timeout") || (data12 === "invalid")) || (data12 === "unavailable"))){
const err40 = {instancePath:instancePath+"/code",schemaPath:"#/$defs/error/properties/code/enum",keyword:"enum",params:{allowedValues: schema76.properties.code.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
if(data.message !== undefined){
let data13 = data.message;
if(typeof data13 === "string"){
if(func2(data13) > 280){
const err41 = {instancePath:instancePath+"/message",schemaPath:"#/$defs/error/properties/message/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(func2(data13) < 1){
const err42 = {instancePath:instancePath+"/message",schemaPath:"#/$defs/error/properties/message/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
else {
const err43 = {instancePath:instancePath+"/message",schemaPath:"#/$defs/error/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
}
else {
const err44 = {instancePath,schemaPath:"#/$defs/error/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
var _valid0 = _errs39 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 11];
}
else {
if(_valid0){
valid0 = true;
passing0 = 11;
if(props0 !== true){
props0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
if(!valid0){
const err45 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate22.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate22.evaluated = {"dynamicProps":true,"dynamicItems":false};

