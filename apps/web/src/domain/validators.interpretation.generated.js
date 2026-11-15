/* eslint-disable */
// GENERADO por scripts/build-validators.mjs desde contracts/*.schema.json. No editar a mano.
import * as __dep0 from 'ajv/dist/runtime/ucs2length.js'
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
